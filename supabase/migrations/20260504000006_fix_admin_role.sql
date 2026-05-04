-- Script para corrigir o papel do usuário admin
-- Verificar se o usuário admin@frodfast.com tem o role correto

-- ============ VERIFICAR E CORRIGIR ROLE DO ADMIN ============

-- Verificar se o usuário admin existe
DO $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'admin@frodfast.com';
    role_exists boolean;
    profile_exists boolean;
BEGIN
    -- Verificar se o perfil do admin existe
    SELECT id INTO admin_user_id
    FROM public.profiles
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuário admin não encontrado: %', admin_email;
        RETURN;
    END IF;
    
    -- Verificar se o role admin existe
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = admin_user_id 
        AND role = 'admin'
    ) INTO role_exists;
    
    IF NOT role_exists THEN
        -- Inserir role admin
        INSERT INTO public.user_roles (
            id,
            user_id,
            role,
            permissions,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            admin_user_id,
            'admin',
            '{
                "manage_users": true,
                "manage_stores": true,
                "manage_categories": true,
                "manage_menu_items": true,
                "manage_orders": true,
                "manage_inventory": true,
                "manage_whatsapp": true,
                "manage_settings": true,
                "view_reports": true,
                "system_admin": true
            }'::jsonb,
            now(),
            now()
        );
        
        RAISE NOTICE '✅ Role admin criado para o usuário: %', admin_email;
    ELSE
        RAISE NOTICE '✅ Role admin já existe para o usuário: %', admin_email;
    END IF;
    
    -- Verificação final
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = admin_user_id 
        AND role = 'admin'
    ) INTO role_exists;
    
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE email = admin_email
    ) INTO profile_exists;
    
    RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
    RAISE NOTICE '📧 Usuário admin: %', CASE WHEN profile_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '🔐 Role admin: %', CASE WHEN role_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '🆔 User ID: %', admin_user_id;
    RAISE NOTICE '=== FIM ===';
    
    IF profile_exists AND role_exists THEN
        RAISE NOTICE '🎉 Usuário admin configurado com sucesso!';
        RAISE NOTICE '🔑 A opção Admin deve aparecer no menu lateral';
    ELSE
        RAISE NOTICE '❌ Problema na configuração do usuário admin';
    END IF;
END $$;

-- ============ VERIFICAR TODOS OS USUÁRIOS E ROLES ============

DO $$
DECLARE
    user_record RECORD;
    user_count integer := 0;
    admin_count integer := 0;
BEGIN
    RAISE NOTICE '=== LISTA DE USUÁRIOS E ROLES ===';
    
    -- Contar usuários
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- Contar admins
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role = 'admin';
    
    RAISE NOTICE '📊 Total de usuários: %', user_count;
    RAISE NOTICE '👥 Total de admins: %', admin_count;
    
    -- Listar todos os usuários e seus roles
    FOR user_record IN 
        SELECT 
            p.id,
            p.email,
            p.full_name,
            COALESCE(ur.role, 'sem_role') as user_role
        FROM public.profiles p
        LEFT JOIN public.user_roles ur ON p.id = ur.user_id
        ORDER BY p.created_at DESC
    LOOP
        RAISE NOTICE '👤 % | % | % | %', 
            user_record.id::text,
            COALESCE(user_record.email, 'sem_email'),
            COALESCE(user_record.full_name, 'sem_nome'),
            user_record.user_role;
    END LOOP;
    
    RAISE NOTICE '=== FIM DA LISTA ===';
END $$;
