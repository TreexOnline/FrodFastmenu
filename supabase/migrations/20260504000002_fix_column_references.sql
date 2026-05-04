-- Script para corrigir referências de colunas inexistentes
-- Vamos verificar a estrutura real das tabelas e ajustar as policies

-- ============ VERIFICAÇÃO DE ESTRUTURA REAL ============
DO $$
DECLARE
    table_name text;
    column_name text;
    table_columns text;
BEGIN
    RAISE NOTICE '=== VERIFICANDO ESTRUTURA DAS TABELAS ===';
    
    -- Verificar estrutura de cada tabela importante
    FOR table_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('categories', 'menu_items', 'orders', 'stores', 'profiles', 'whatsapp_auto_messages')
    LOOP
        RAISE NOTICE '--- Tabela: % ---', table_name;
        
        table_columns := '';
        FOR column_name IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_name
            ORDER BY ordinal_position
        LOOP
            table_columns := table_columns || column_name || ', ';
        END LOOP;
        
        RAISE NOTICE 'Colunas: %', table_columns;
    END LOOP;
    
    RAISE NOTICE '=== FIM DA VERIFICAÇÃO ===';
END $$;

-- ============ REMOVER TODAS AS POLÍTICAS EXISTENTES ============
DROP POLICY IF EXISTS "Users manage own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own stores" ON public.stores;
DROP POLICY IF EXISTS "Users manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Users manage own menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Users manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Users manage own order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users manage own whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users manage own whatsapp_auto_messages" ON public.whatsapp_auto_messages;
DROP POLICY IF EXISTS "Users manage own whatsapp_message_logs" ON public.whatsapp_message_logs;
DROP POLICY IF EXISTS "Users manage own whatsapp_contacts_cooldown" ON public.whatsapp_contacts_cooldown;
DROP POLICY IF EXISTS "Users manage own menu_settings" ON public.menu_settings;
DROP POLICY IF EXISTS "Users manage own user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users manage own addon_library_groups" ON public.addon_library_groups;
DROP POLICY IF EXISTS "Users manage own addon_library_options" ON public.addon_library_options;
DROP POLICY IF EXISTS "Users manage own auth_otp_codes" ON public.auth_otp_codes;
DROP POLICY IF EXISTS "Users manage own inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users manage own inventory_movements" ON public.inventory_movements;

-- ============ CRIAR POLÍTICAS BASEADAS NA ESTRUTURA CORRETA ============

-- Verificar se a tabela profiles existe e tem coluna id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
            CREATE POLICY "Users manage own profiles"
              ON public.profiles FOR ALL
              USING (auth.uid() = id)
              WITH CHECK (auth.uid() = id);
            RAISE NOTICE '✅ Policy criada para profiles';
        ELSE
            RAISE NOTICE '❌ Tabela profiles não tem coluna id';
        END IF;
    END IF;
END $$;

-- Verificar se a tabela stores existe e tem coluna owner_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
            CREATE POLICY "Users manage own stores"
              ON public.stores FOR ALL
              USING (auth.uid() = owner_id)
              WITH CHECK (auth.uid() = owner_id);
            RAISE NOTICE '✅ Policy criada para stores';
        ELSE
            RAISE NOTICE '❌ Tabela stores não tem coluna owner_id';
        END IF;
    END IF;
END $$;

-- Verificar se a tabela categories existe e qual coluna de referência tem
DO $$
DECLARE
    ref_column text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
        -- Verificar se tem store_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'store_id') THEN
            ref_column := 'store_id';
        -- Verificar se tem user_id
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'user_id') THEN
            ref_column := 'user_id';
        ELSE
            RAISE NOTICE '❌ Tabela categories não tem coluna de referência (store_id ou user_id)';
            RETURN;
        END IF;
        
        -- Criar policy baseada na coluna encontrada
        IF ref_column = 'user_id' THEN
            CREATE POLICY "Users manage own categories"
              ON public.categories FOR ALL
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
            RAISE NOTICE '✅ Policy criada para categories (usando user_id)';
        ELSIF ref_column = 'store_id' THEN
            -- Verificar se stores tem owner_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
                CREATE POLICY "Users manage own categories"
                  ON public.categories FOR ALL
                  USING (
                    EXISTS (
                      SELECT 1 FROM public.stores
                      WHERE stores.id = categories.store_id
                      AND stores.owner_id = auth.uid()
                    )
                  )
                  WITH CHECK (
                    EXISTS (
                      SELECT 1 FROM public.stores
                      WHERE stores.id = categories.store_id
                      AND stores.owner_id = auth.uid()
                    )
                  );
                RAISE NOTICE '✅ Policy criada para categories (usando store_id)';
            ELSE
                RAISE NOTICE '❌ Não é possível criar policy para categories: stores não tem owner_id';
            END IF;
        END IF;
    END IF;
END $$;

-- Verificar se a tabela menu_items existe e qual coluna de referência tem
DO $$
DECLARE
    ref_column text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items' AND table_schema = 'public') THEN
        -- Verificar se tem store_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'store_id') THEN
            ref_column := 'store_id';
        -- Verificar se tem user_id
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'user_id') THEN
            ref_column := 'user_id';
        ELSE
            RAISE NOTICE '❌ Tabela menu_items não tem coluna de referência (store_id ou user_id)';
            RETURN;
        END IF;
        
        -- Criar policy baseada na coluna encontrada
        IF ref_column = 'user_id' THEN
            CREATE POLICY "Users manage own menu_items"
              ON public.menu_items FOR ALL
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
            RAISE NOTICE '✅ Policy criada para menu_items (usando user_id)';
        ELSIF ref_column = 'store_id' THEN
            -- Verificar se stores tem owner_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
                CREATE POLICY "Users manage own menu_items"
                  ON public.menu_items FOR ALL
                  USING (
                    EXISTS (
                      SELECT 1 FROM public.stores
                      WHERE stores.id = menu_items.store_id
                      AND stores.owner_id = auth.uid()
                    )
                  )
                  WITH CHECK (
                    EXISTS (
                      SELECT 1 FROM public.stores
                      WHERE stores.id = menu_items.store_id
                      AND stores.owner_id = auth.uid()
                    )
                  );
                RAISE NOTICE '✅ Policy criada para menu_items (usando store_id)';
            ELSE
                RAISE NOTICE '❌ Não é possível criar policy para menu_items: stores não tem owner_id';
            END IF;
        END IF;
    END IF;
END $$;

-- Verificar se a tabela orders existe e qual coluna de referência tem
DO $$
DECLARE
    ref_column text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        -- Verificar se tem store_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'store_id') THEN
            ref_column := 'store_id';
        -- Verificar se tem user_id
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
            ref_column := 'user_id';
        ELSE
            RAISE NOTICE '❌ Tabela orders não tem coluna de referência (store_id ou user_id)';
            RETURN;
        END IF;
        
        -- Criar policy baseada na coluna encontrada
        IF ref_column = 'user_id' THEN
            CREATE POLICY "Users manage own orders"
              ON public.orders FOR ALL
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
            RAISE NOTICE '✅ Policy criada para orders (usando user_id)';
        ELSIF ref_column = 'store_id' THEN
            -- Verificar se stores tem owner_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
                CREATE POLICY "Users manage own orders"
                  ON public.orders FOR ALL
                  USING (
                    EXISTS (
                      SELECT 1 FROM public.stores
                      WHERE stores.id = orders.store_id
                      AND stores.owner_id = auth.uid()
                    )
                  )
                  WITH CHECK (
                    EXISTS (
                      SELECT 1 FROM public.stores
                      WHERE stores.id = orders.store_id
                      AND stores.owner_id = auth.uid()
                    )
                  );
                RAISE NOTICE '✅ Policy criada para orders (usando store_id)';
            ELSE
                RAISE NOTICE '❌ Não é possível criar policy para orders: stores não tem owner_id';
            END IF;
        END IF;
    END IF;
END $$;

-- Verificar se a tabela whatsapp_auto_messages existe e tem user_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_auto_messages' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_auto_messages' AND column_name = 'user_id') THEN
            CREATE POLICY "Users manage own whatsapp_auto_messages"
              ON public.whatsapp_auto_messages FOR ALL
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
            RAISE NOTICE '✅ Policy criada para whatsapp_auto_messages';
        ELSE
            RAISE NOTICE '❌ Tabela whatsapp_auto_messages não tem coluna user_id';
        END IF;
    END IF;
END $$;

-- Verificar se a tabela whatsapp_sessions existe e tem user_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sessions' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_sessions' AND column_name = 'user_id') THEN
            CREATE POLICY "Users manage own whatsapp_sessions"
              ON public.whatsapp_sessions FOR ALL
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
            RAISE NOTICE '✅ Policy criada para whatsapp_sessions';
        ELSE
            RAISE NOTICE '❌ Tabela whatsapp_sessions não tem coluna user_id';
        END IF;
    END IF;
END $$;

-- ============ RESUMO FINAL ============
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '=== RESUMO FINAL ===';
    RAISE NOTICE 'Total de policies criadas: %', policy_count;
    RAISE NOTICE '=== FIM ===';
END $$;
