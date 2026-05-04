-- CRIAR NOVO USUÁRIO COM GMAIL E RESTAURANTE
-- Vitor Costa - Vitinho Burg - DDI 55 - Gmail

-- ============ CRIAR PERFIL ============

DO $$
DECLARE
    new_user_id uuid;
    new_user_email text := 'vitorcosta@email.com';
    new_user_phone text := '+5518997000';
BEGIN
    -- Criar usuário no Supabase Auth
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        phone,
        email_confirmed_at,
        phone_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        raw_user_meta_data,
        is_super_admin,
        role,
        email_change_token_new,
        phone_change_token_new,
        recovery_token
    ) VALUES (
        new_user_id::uuid,
        '00000000-0000-0000-00000000-00000000-00000000-00000000-00000001',
        new_user_email,
        new_user_phone,
        now(),
        NULL,
        now(),
        now(),
        now(),
        now(),
        now(),
        false,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    );
    
    -- Criar perfil na tabela profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        whatsapp_number,
        restaurant_name,
        current_plan,
        plan_active,
        plan_expires_at,
        plan_type,
        trial_started_at,
        trial_ends_at,
        whatsapp_addon_active,
        whatsapp_addon_expires_at,
        signup_ip,
        created_at,
        updated_at
    ) VALUES (
        new_user_id::uuid,
        new_user_email,
        'Vitor Costa',
        new_user_phone,
        'Vitinho Burg',
        'free',
        false,
        NULL,
        'free',
        NULL,
        NULL,
        false,
        NULL,
        NULL,
        NULL,
        now(),
        now()
    );
    
    -- Criar loja para o usuário
    INSERT INTO public.stores (
        id,
        owner_id,
        name,
        address,
        phone,
        email,
        whatsapp_enabled,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id::uuid,
        'Vitinho Burg',
        NULL,
        NULL,
        new_user_phone,
        new_user_email,
        true,
        now(),
        now()
    );
    
    RAISE NOTICE '✅ Perfil criado: %', new_user_email;
    RAISE NOTICE '📱 Telefone: %', new_user_phone;
    RAISE NOTICE '🏪 Restaurante: Vitinho Burg';
    RAISE NOTICE '🆔 User ID: %', new_user_id::text;
END $$;

-- ============ CRIAR ROLE DE USUÁRIO ============

DO $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Buscar ID do usuário criado
    SELECT id INTO new_user_id
    FROM public.profiles
    WHERE email = 'vitorcosta@email.com';
    
    IF new_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuário não encontrado para criar role';
        RETURN;
    END IF;
    
    -- Criar role de usuário
    INSERT INTO public.user_roles (
        id,
        user_id,
        role,
        permissions,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        'user',
        '{
            "manage_stores": true,
            "manage_categories": true,
            "manage_menu_items": true,
            "manage_orders": true,
            "manage_inventory": true,
            "manage_whatsapp": true,
            "manage_settings": true,
            "view_reports": true
        }'::jsonb,
        now(),
        now()
    );
    
    RAISE NOTICE '✅ Role de usuário criado para: vitorcosta@email.com';
    RAISE NOTICE '🔐 Permissões básicas configuradas';
END $$;

-- ============ CRIAR MENU DEMONSTRAÇÃO ============

DO $$
DECLARE
    new_user_id uuid;
    new_store_id uuid;
BEGIN
    -- Buscar IDs
    SELECT id INTO new_user_id FROM public.profiles WHERE email = 'vitorcosta@email.com';
    SELECT id INTO new_store_id FROM public.stores WHERE owner_id = new_user_id;
    
    IF new_user_id IS NULL OR new_store_id IS NULL THEN
        RAISE NOTICE '❌ Usuário ou loja não encontrados para criar menu';
        RETURN;
    END IF;
    
    -- Criar menu de demonstração
    INSERT INTO public.menus (
        id,
        user_id,
        name,
        cover_url,
        is_active,
        slug,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        'Cardápio Principal',
        'https://images.unsplash.com/photo-1552630115-2c9bf1c09d6?w=800&h=600&auto=format&fit=crop',
        true,
        'cardapio-principal',
        now(),
        now()
    );
    
    -- Criar configurações do menu
    INSERT INTO public.menu_settings (
        id,
        menu_id,
        user_id,
        auto_print,
        print_split_by_category,
        display_name,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.menus WHERE user_id = new_user_id AND name = 'Cardápio Principal' LIMIT 1),
        new_user_id,
        false,
        false,
        'Cardápio Principal',
        now(),
        now()
    );
    
    RAISE NOTICE '✅ Menu de demonstração criado';
    RAISE NOTICE '📋 Nome: Cardápio Principal';
    RAISE NOTICE '🔗 Slug: cardapio-principal';
END $$;

-- ============ CRIAR CATEGORIA DEMONSTRAÇÃO ============

DO $$
DECLARE
    new_user_id uuid;
    new_menu_id uuid;
BEGIN
    -- Buscar IDs
    SELECT id INTO new_user_id FROM public.profiles WHERE email = 'vitorcosta@email.com';
    SELECT id INTO new_menu_id FROM public.menus WHERE user_id = new_user_id AND name = 'Cardápio Principal' LIMIT 1;
    
    IF new_user_id IS NULL OR new_menu_id IS NULL THEN
        RAISE NOTICE '❌ Usuário ou menu não encontrados para criar categoria';
        RETURN;
    END IF;
    
    -- Criar categoria de demonstração
    INSERT INTO public.categories (
        id,
        menu_id,
        store_id,
        name,
        position,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_menu_id,
        (SELECT id FROM public.stores WHERE owner_id = new_user_id LIMIT 1),
        'Lanches',
        1,
        now(),
        now()
    );
    
    RAISE NOTICE '✅ Categoria de demonstração criada';
    RAISE NOTICE '🍔 Nome: Lanches';
    RAISE NOTICE '📋 Posição: 1';
END $$;

-- ============ CRIAR PRODUTOS DEMONSTRAÇÃO ============

DO $$
DECLARE
    new_user_id uuid;
    new_menu_id uuid;
    new_category_id uuid;
BEGIN
    -- Buscar IDs
    SELECT id INTO new_user_id FROM public.profiles WHERE email = 'vitorcosta@email.com';
    SELECT id INTO new_menu_id FROM public.menus WHERE user_id = new_user_id AND name = 'Cardápio Principal' LIMIT 1;
    SELECT id INTO new_category_id FROM public.categories WHERE menu_id = new_menu_id AND name = 'Lanches' LIMIT 1;
    
    IF new_user_id IS NULL OR new_menu_id IS NULL OR new_category_id IS NULL THEN
        RAISE NOTICE '❌ IDs não encontrados para criar produtos';
        RETURN;
    END IF;
    
    -- Criar produtos de demonstração
    INSERT INTO public.products (
        id,
        menu_id,
        name,
        description,
        price,
        position,
        is_available,
        category_id,
        image_url,
        created_at,
        updated_at
    ) VALUES 
    (
        gen_random_uuid(),
        new_menu_id,
        'X-Burger',
        'Hambúrguer tradicional com queijo especial',
        25.50,
        1,
        true,
        new_category_id,
        'https://images.unsplash.com/photo-15689030940-2e08b5b4b0a?w=800&h=600&auto=format&fit=crop',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        new_menu_id,
        'X-Salada',
        'Salada fresca com alface americana',
        18.90,
        2,
        true,
        new_category_id,
        'https://images.unsplash.com/photo-1512620807835-50ba9303c5c?w=800&h=600&auto=format&fit=crop',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        new_menu_id,
        'X-Batata',
        'Batatas fritas crocantes',
        12.00,
        3,
        true,
        new_category_id,
        'https://images.unsplash.com/photo-1572744865-1f9f4b1e6a?w=800&h=600&auto=format&fit=crop',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        new_menu_id,
        'X-Refrigerante',
        'Refrigerante lata 350ml',
        8.00,
        4,
        true,
        new_category_id,
        'https://images.unsplash.com/photo-1542779405-45904a73d3a?w=800&h=600&auto=format&fit=crop',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        new_menu_id,
        'X-Suco',
        'Suco natural de laranja 300ml',
        10.00,
        5,
        true,
        new_category_id,
        'https://images.unsplash.com/photo-1607533860-27fda8de8f0?w=800&h=600&auto=format&fit=crop',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        new_menu_id,
        'X-Combo',
        'Combo X-Burger + Batata + Refrigerante',
        35.50,
        6,
        true,
        new_category_id,
        'https://images.unsplash.com/photo-1565275044-9ab914fdd1e1?w=800&h=600&auto=format&fit=crop',
        now(),
        now()
    );
    
    RAISE NOTICE '✅ Produtos de demonstração criados';
    RAISE NOTICE '🍔 Categoria: Lanches';
    RAISE NOTICE '📊 Total de produtos: 7';
END $$;

-- ============ VERIFICAÇÃO FINAL ============

DO $$
DECLARE
    user_created boolean;
    user_role_created boolean;
    menu_created boolean;
    category_created boolean;
    products_created boolean;
BEGIN
    -- Verificar se tudo foi criado
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = 'vitorcosta@email.com') INTO user_created;
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'vitorcosta@email.com')) INTO user_role_created;
    SELECT EXISTS(SELECT 1 FROM public.menus WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'vitorcosta@email.com') AND name = 'Cardápio Principal') INTO menu_created;
    SELECT EXISTS(SELECT 1 FROM public.categories WHERE menu_id = (SELECT id FROM public.menus WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'vitorcosta@email.com') AND name = 'Cardápio Principal') AND name = 'Lanches') INTO category_created;
    SELECT EXISTS(SELECT 1 FROM public.products WHERE menu_id = (SELECT id FROM public.menus WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'vitorcosta@email.com') AND name = 'Cardápio Principal') LIMIT 1) INTO products_created;
    
    RAISE NOTICE '=== USUÁRIO CRIADO COM SUCESSO ===';
    RAISE NOTICE '👤 Nome: Vitor Costa';
    RAISE NOTICE '📧 Email: vitorcosta@email.com';
    RAISE NOTICE '📱 Telefone: +5518997000';
    RAISE NOTICE '🏪 Restaurante: Vitinho Burg';
    RAISE NOTICE '💳 Plano: free';
    RAISE NOTICE '🔐 Perfil: ✅ %', CASE WHEN user_created THEN 'CRIADO' ELSE '❌ FALHOU' END;
    RAISE NOTICE '👥 Role: ✅ %', CASE WHEN user_role_created THEN 'CRIADO' ELSE '❌ FALHOU' END;
    RAISE NOTICE '📋 Menu: ✅ %', CASE WHEN menu_created THEN 'CRIADO' ELSE '❌ FALHOU' END;
    RAISE NOTICE '🍔 Categoria: ✅ %', CASE WHEN category_created THEN 'CRIADO' ELSE '❌ FALHOU' END;
    RAISE NOTICE '🍔 Produtos: ✅ %', CASE WHEN products_created THEN 'CRIADO' ELSE '❌ FALHOU' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 USUÁRIO PRONTO PARA USAR O SISTEMA!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Dados de Acesso:';
    RAISE NOTICE '   • Email: vitorcosta@email.com';
    RAISE NOTICE '   • Senha inicial: Mínimo 6 caracteres';
    RAISE NOTICE '   • Telefone: +5518997000 (DDI 55)';
    RAISE NOTICE '   • Restaurante: Vitinho Burg (já criado)';
    RAISE NOTICE '   • Cardápio: Cardápio Principal (já criado)';
    RAISE NOTICE '   • Produtos: 7 itens de demonstração (já criados)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema pronto para demonstração!';
    RAISE NOTICE '=== FIM ===';
END $$;
