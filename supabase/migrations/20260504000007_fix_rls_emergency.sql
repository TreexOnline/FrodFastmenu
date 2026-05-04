-- EMERGENCY FIX - Desabilitar RLS temporariamente para diagnóstico
-- Este script desabilita RLS para permitir acesso enquanto corrigimos as policies

-- ============ DIAGNÓSTICO DE ESTRUTURA ============

DO $$
DECLARE
    table_name text;
    column_name text;
    table_count integer := 0;
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DE ESTRUTURA DAS TABELAS ===';
    
    -- Verificar tabelas principais
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'stores', 'menus', 'orders', 'user_roles', 'categories', 'menu_items')
        ORDER BY tablename
    LOOP
        table_count := table_count + 1;
        
        RAISE NOTICE '';
        RAISE NOTICE '📋 TABELA: %', table_name;
        
        -- Listar colunas da tabela
        FOR column_name IN 
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = table_name
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📝 %', column_name;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total de tabelas verificadas: %', table_count;
    RAISE NOTICE '=== FIM DO DIAGNÓSTICO ===';
END $$;

-- ============ DESABILITAR RLS TEMPORARIAMENTE ============

-- Desabilitar RLS nas tabelas principais para permitir acesso
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions DISABLE ROW LEVEL SECURITY;

-- ============ LIMPAR POLICIES EXISTENTES ============

-- Remover todas as policies existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Store owners can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can update their stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can insert their stores" ON public.stores;
DROP POLICY IF EXISTS "Users can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can view their menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Store owners can manage their categories" ON public.categories;

-- ============ VERIFICAÇÃO FINAL ============

DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    RAISE NOTICE '=== STATUS RLS APÓS DESABILITAR ===';
    
    -- Verificar status do RLS
    SELECT relrowsecurity INTO rls_enabled 
    FROM pg_class 
    WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    RAISE NOTICE '🔒 RLS em profiles: %', CASE WHEN rls_enabled THEN '✅ ATIVADO' ELSE '❌ DESATIVADO' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 AÇÕES NECESSÁRIAS:';
    RAISE NOTICE '1. Verificar estrutura das tabelas no console do browser';
    RAISE NOTICE '2. Corrigir queries do frontend se necessário';
    RAISE NOTICE '3. Recriar RLS policies corretas';
    RAISE NOTICE '4. Reabilitar RLS após correção';
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS desabilitado temporariamente - Frontend deve funcionar agora!';
    RAISE NOTICE '=== FIM ===';
END $$;
