-- REMOVER USUÁRIO CRIADO INDEVIDAMENTE
-- Limpar dados do usuário vitorcosta@email.com que foi criado por engano

-- ============ REMOVER DADOS DO USUÁRIO ERRADO ============

DO $$
DECLARE
    wrong_user_id uuid;
    wrong_email text := 'vitorcosta@email.com';
    deleted_count integer := 0;
BEGIN
    -- Buscar ID do usuário errado
    SELECT id INTO wrong_user_id
    FROM public.profiles
    WHERE email = wrong_email;
    
    IF wrong_user_id IS NULL THEN
        RAISE NOTICE '✅ Usuário não encontrado para remover: %', wrong_email;
        RETURN;
    END IF;
    
    -- Remover order_items (depende de orders)
    DELETE FROM public.order_items
    WHERE order_id IN (
        SELECT id FROM public.orders WHERE user_id = wrong_user_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Order items removidos: %', deleted_count;
    
    -- Remover orders
    DELETE FROM public.orders WHERE user_id = wrong_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Orders removidos: %', deleted_count;
    
    -- Remover products
    DELETE FROM public.products WHERE menu_id IN (
        SELECT id FROM public.menus WHERE user_id = wrong_user_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Products removidos: %', deleted_count;
    
    -- Remover product_addons
    DELETE FROM public.product_addons
    WHERE group_id IN (
        SELECT id FROM public.product_addon_groups WHERE product_id IN (
            SELECT id FROM public.products WHERE menu_id IN (
                SELECT id FROM public.menus WHERE user_id = wrong_user_id
            )
        )
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Product addons removidos: %', deleted_count;
    
    -- Remover product_addon_groups
    DELETE FROM public.product_addon_groups
    WHERE product_id IN (
        SELECT id FROM public.products WHERE menu_id IN (
            SELECT id FROM public.menus WHERE user_id = wrong_user_id
        )
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Product addon groups removidos: %', deleted_count;
    
    -- Remover categories
    DELETE FROM public.categories WHERE menu_id IN (
        SELECT id FROM public.menus WHERE user_id = wrong_user_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Categories removidas: %', deleted_count;
    
    -- Remover menu_settings
    DELETE FROM public.menu_settings WHERE menu_id IN (
        SELECT id FROM public.menus WHERE user_id = wrong_user_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Menu settings removidos: %', deleted_count;
    
    -- Remover menus
    DELETE FROM public.menus WHERE user_id = wrong_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Menus removidos: %', deleted_count;
    
    -- Remover stores
    DELETE FROM public.stores WHERE owner_id = wrong_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Stores removidos: %', deleted_count;
    
    -- Remover user_roles
    DELETE FROM public.user_roles WHERE user_id = wrong_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ User roles removidos: %', deleted_count;
    
    -- Remover profile
    DELETE FROM public.profiles WHERE id = wrong_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Profile removido: %', deleted_count;
    
    -- Remover usuário do auth (opcional, se quiser limpar completamente)
    DELETE FROM auth.users WHERE email = wrong_email;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Auth user removido: %', deleted_count;
    
    RAISE NOTICE '✅ Usuário removido com sucesso: %', wrong_email;
    RAISE NOTICE '🆔 ID: %', wrong_user_id::text;
END $$;

-- ============ VERIFICAÇÃO FINAL ============

DO $$
DECLARE
    user_exists boolean;
BEGIN
    -- Verificar se usuário foi realmente removido
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = 'vitorcosta@email.com') INTO user_exists;
    
    RAISE NOTICE '=== VERIFICAÇÃO DE REMOÇÃO ===';
    RAISE NOTICE '👤 Usuário: vitorcosta@email.com';
    RAISE NOTICE '🗑️ Status: %', CASE WHEN user_exists THEN '❌ AINDA EXISTE' ELSE '✅ REMOVIDO COM SUCESSO' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 LIMPEZA CONCLUÍDA!';
    RAISE NOTICE '📋 Todos os dados do usuário foram removidos:';
    RAISE NOTICE '   • Profiles, User Roles, Stores';
    RAISE NOTICE '   • Menus, Menu Settings, Categories');
    RAISE NOTICE '   • Products, Product Addons, Product Addon Groups');
    RAISE NOTICE '   • Orders, Order Items');
    RAISE NOTICE '   • Auth users');
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema limpo e pronto para uso correto!';
    RAISE NOTICE '=== FIM ===';
END $$;
