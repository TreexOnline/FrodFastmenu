-- ATUALIZAR PERMISSÕES DO ADMIN PARA ACESSO TOTAL
-- Dar acesso completo ao admin para gerenciar usuários, planos e WhatsApp

-- ============ ATUALIZAR ROLE DO ADMIN PARA SUPER ADMIN ============

DO $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'admin@frodfast.com';
BEGIN
    -- Buscar ID do usuário admin
    SELECT id INTO admin_user_id
    FROM public.profiles
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuário admin não encontrado: %', admin_email;
        RETURN;
    END IF;
    
    -- Atualizar role para super_admin (se não existir)
    INSERT INTO public.user_roles (
        id,
        user_id,
        role,
        permissions,
        created_at,
        updated_at
    ) SELECT 
        gen_random_uuid() as id,
        admin_user_id as user_id,
        'super_admin' as role,
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
            "system_admin": true,
            "manage_plans": true,
            "manage_billing": true,
            "access_all_data": true,
            "bypass_restrictions": true
        }'::jsonb as permissions,
        now() as created_at,
        now() as updated_at
    ON CONFLICT (user_id) DO UPDATE SET
        role = 'super_admin',
        permissions = '{
            "manage_users": true,
            "manage_stores": true,
            "manage_categories": true,
            "manage_menu_items": true,
            "manage_orders": true,
            "manage_inventory": true,
            "manage_whatsapp": true,
            "manage_settings": true,
            "view_reports": true,
            "system_admin": true,
            "manage_plans": true,
            "manage_billing": true,
            "access_all_data": true,
            "bypass_restrictions": true
        }'::jsonb,
        updated_at = now();
    
    RAISE NOTICE '✅ Role super_admin configurado para admin';
    RAISE NOTICE '🔑 Permissões totais concedidas';
    RAISE NOTICE '📧 Email: %', admin_email;
    RAISE NOTICE '🆔 User ID: %', admin_user_id;
END $$;

-- ============ CRIAR FUNÇÃO PARA VERIFICAR SE ADMIN TEM ACESSO TOTAL ============

-- Esta função pode ser usada no frontend para verificar se admin tem super_admin
CREATE OR REPLACE FUNCTION public.check_admin_full_access()
RETURNS TABLE (
    has_full_access boolean,
    permissions jsonb
) AS $$
DECLARE
    current_user_id uuid := auth.uid();
    admin_permissions jsonb;
BEGIN
    -- Buscar permissões do usuário atual
    SELECT permissions INTO admin_permissions
    FROM public.user_roles
    WHERE user_id = current_user_id AND role = 'super_admin';
    
    RETURN QUERY
    SELECT 
        COALESCE(admin_permissions IS NOT NULL, false) as has_full_access,
        COALESCE(admin_permissions, '{}'::jsonb) as permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ CRIAR VIEWS PARA ADMIN ============

-- View para facilitar consulta de usuários com planos
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.restaurant_name,
    p.created_at,
    p.current_plan,
    p.plan_active,
    p.plan_expires_at,
    p.plan_type,
    p.trial_started_at,
    p.trial_ends_at,
    p.whatsapp_addon_active,
    p.whatsapp_addon_expires_at,
    ur.role,
    ur.permissions,
    ur.created_at as role_created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email IS NOT NULL
ORDER BY p.created_at DESC;

-- ============ VERIFICAÇÃO FINAL ============

DO $$
DECLARE
    admin_count integer;
    super_admin_count integer;
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DE ACESSO ADMIN ===';
    
    -- Contar usuários admin
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin';
    
    -- Contar super_admins
    SELECT COUNT(*) INTO super_admin_count
    FROM public.user_roles
    WHERE role = 'super_admin';
    
    RAISE NOTICE '👥 Total de admins: %', admin_count;
    RAISE NOTICE '🦸 Total de super_admins: %', super_admin_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Permissões de acesso total configuradas';
    RAISE NOTICE '🎯 Admin agora pode:';
    RAISE NOTICE '   • Gerenciar todos os usuários';
    RAISE NOTICE '   • Atribuir planos (gratuito/pago)';
    RAISE NOTICE '   • Liberar/bloquear WhatsApp';
    RAISE NOTICE '   • Acessar todos os dados do sistema';
    RAISE NOTICE '   • Configurar faturamento';
    RAISE NOTICE '   • Visualizar relatórios completos';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema pronto para gestão completa!';
    RAISE NOTICE '=== FIM ===';
END $$;
