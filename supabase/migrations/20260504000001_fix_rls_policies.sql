-- Correção das Policies RLS para seguir a estrutura correta
-- Relacionamento: auth.uid() (profiles.id) → stores.owner_id → store_id nas tabelas

-- ============ REMOVER POLÍTICAS INCORRETAS ============
DROP POLICY IF EXISTS "Users manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Users manage own menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Users manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Users manage own order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users manage own menu_settings" ON public.menu_settings;
DROP POLICY IF EXISTS "Users manage own addon_library_groups" ON public.addon_library_groups;
DROP POLICY IF EXISTS "Users manage own addon_library_options" ON public.addon_library_options;
DROP POLICY IF EXISTS "Users manage own inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users manage own inventory_movements" ON public.inventory_movements;

-- ============ POLÍTICAS CORRETAS PARA TABELAS COM store_id ============

-- Categories: Usuários podem gerenciar categorias das suas lojas
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

-- Menu Items: Usuários podem gerenciar itens do cardápio das suas lojas
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

-- Orders: Usuários podem gerenciar pedidos das suas lojas
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

-- Order Items: Usuários podem gerenciar itens dos pedidos das suas lojas
CREATE POLICY "Users manage own order_items"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = orders.store_id
        AND stores.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = orders.store_id
        AND stores.owner_id = auth.uid()
      )
    )
  );

-- Menu Settings: Usuários podem gerenciar configurações do cardápio das suas lojas
CREATE POLICY "Users manage own menu_settings"
  ON public.menu_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = menu_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = menu_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Addon Library Groups: Usuários podem gerenciar grupos de addons das suas lojas
CREATE POLICY "Users manage own addon_library_groups"
  ON public.addon_library_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = addon_library_groups.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = addon_library_groups.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Addon Library Options: Usuários podem gerenciar opções de addons das suas lojas
CREATE POLICY "Users manage own addon_library_options"
  ON public.addon_library_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.addon_library_groups
      WHERE addon_library_groups.id = addon_library_options.group_id
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = addon_library_groups.store_id
        AND stores.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.addon_library_groups
      WHERE addon_library_groups.id = addon_library_options.group_id
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = addon_library_groups.store_id
        AND stores.owner_id = auth.uid()
      )
    )
  );

-- Inventory Items: Usuários podem gerenciar itens de estoque das suas lojas
CREATE POLICY "Users manage own inventory_items"
  ON public.inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = inventory_items.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = inventory_items.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Inventory Movements: Usuários podem gerenciar movimentações de estoque das suas lojas
CREATE POLICY "Users manage own inventory_movements"
  ON public.inventory_movements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = inventory_movements.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = inventory_movements.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- ============ POLÍTICAS PARA TABELAS DIRETAS (sem store_id) ============

-- Profiles: Usuários gerenciam apenas seu próprio perfil
CREATE POLICY "Users manage own profiles"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Stores: Usuários gerenciam apenas suas próprias lojas
CREATE POLICY "Users manage own stores"
  ON public.stores FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- User Roles: Usuários gerenciam apenas seus próprios papéis
CREATE POLICY "Users manage own user_roles"
  ON public.user_roles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WhatsApp Sessions: Usuários gerenciam apenas suas próprias sessões
CREATE POLICY "Users manage own whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WhatsApp Auto Messages: Usuários gerenciam apenas suas próprias mensagens automáticas
CREATE POLICY "Users manage own whatsapp_auto_messages"
  ON public.whatsapp_auto_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WhatsApp Message Logs: Usuários gerenciam apenas seus próprios logs
CREATE POLICY "Users manage own whatsapp_message_logs"
  ON public.whatsapp_message_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WhatsApp Contacts Cooldown: Usuários gerenciam apenas seus próprios contatos
CREATE POLICY "Users manage own whatsapp_contacts_cooldown"
  ON public.whatsapp_contacts_cooldown FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auth OTP Codes: Usuários gerenciam apenas seus próprios códigos
CREATE POLICY "Users manage own auth_otp_codes"
  ON public.auth_otp_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ VERIFICAÇÃO DE ESTRUTURA ============

-- Verificar se todas as colunas referenciadas existem
DO $$
DECLARE
    table_name text;
    column_name text;
    missing_columns text[] := '{}';
BEGIN
    -- Verificar colunas em categorias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'store_id') THEN
        missing_columns := array_append(missing_columns, 'categories.store_id');
    END IF;
    
    -- Verificar colunas em menu_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'store_id') THEN
        missing_columns := array_append(missing_columns, 'menu_items.store_id');
    END IF;
    
    -- Verificar colunas em orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'store_id') THEN
        missing_columns := array_append(missing_columns, 'orders.store_id');
    END IF;
    
    -- Verificar colunas em stores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
        missing_columns := array_append(missing_columns, 'stores.owner_id');
    END IF;
    
    -- Verificar colunas em whatsapp_auto_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_auto_messages' AND column_name = 'user_id') THEN
        missing_columns := array_append(missing_columns, 'whatsapp_auto_messages.user_id');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Colunas ausentes detectadas: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Todas as colunas referenciadas existem';
    END IF;
END $$;
