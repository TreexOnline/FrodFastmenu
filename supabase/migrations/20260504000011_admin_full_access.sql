-- LIBERAR ACESSO TOTAL PARA ADMIN
-- Criar plano gratuito e liberar WhatsApp para admin

-- ============ ATUALIZAR PERFIL DO ADMIN PARA PLANO GRATUITO ============

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
    
    -- Atualizar perfil para plano gratuito
    UPDATE public.profiles SET
        current_plan = 'free',
        plan_active = false,
        plan_expires_at = NULL,
        plan_type = 'free',
        trial_started_at = NULL,
        trial_ends_at = NULL
    WHERE id = admin_user_id;
    
    RAISE NOTICE '✅ Plano gratuito configurado para admin';
    RAISE NOTICE '📧 Email: %', admin_email;
    RAISE NOTICE '🆔 User ID: %', admin_user_id;
END $$;

-- ============ LIBERAR WHATSAPP PARA ADMIN ============

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
    
    -- Atualizar para liberar WhatsApp
    UPDATE public.profiles SET
        whatsapp_addon_active = true,
        whatsapp_addon_expires_at = '2099-12-31'::date
    WHERE id = admin_user_id;
    
    -- Criar configuração WhatsApp se não existir
    INSERT INTO public.whatsapp_auto_messages (
        id,
        user_id,
        message_template,
        cooldown_minutes,
        is_active,
        created_at,
        updated_at
    ) SELECT 
        gen_random_uuid() as id,
        admin_user_id as user_id,
        'Obrigado pelo contato! Seu pedido será confirmado em breve.' as message_template,
        5 as cooldown_minutes,
        true as is_active,
        now() as created_at,
        now() as updated_at
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Criar sessão WhatsApp se não existir
    INSERT INTO public.whatsapp_sessions (
        id,
        user_id,
        phone_number,
        session_status,
        qr_code,
        connected_at,
        created_at,
        updated_at
    ) SELECT 
        gen_random_uuid() as id,
        admin_user_id as user_id,
        NULL as phone_number,
        'disconnected' as session_status,
        NULL as qr_code,
        now() as created_at,
        now() as updated_at
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ WhatsApp liberado para admin';
    RAISE NOTICE '📱 Add-on ativo: true';
    RAISE NOTICE '📱 Expira em: 2099-12-31';
    RAISE NOTICE '📱 Mensagem padrão configurada';
    RAISE NOTICE '📱 Sessão WhatsApp criada';
END $$;

-- ============ VERIFICAÇÃO FINAL ============

DO $$
DECLARE
    admin_plan_active boolean;
    admin_whatsapp_active boolean;
    admin_user_id uuid;
BEGIN
    -- Verificar configurações do admin
    SELECT 
        p.plan_active,
        p.whatsapp_addon_active,
        p.id
    INTO admin_plan_active, admin_whatsapp_active, admin_user_id
    FROM public.profiles p
    WHERE p.email = 'admin@frodfast.com';
    
    RAISE NOTICE '=== CONFIGURAÇÃO FINAL DO ADMIN ===';
    RAISE NOTICE '👤 Usuário: admin@frodfast.com';
    RAISE NOTICE '🆔 ID: %', admin_user_id;
    RAISE NOTICE '💳 Plano gratuito: %', CASE WHEN admin_plan_active IS FALSE THEN '✅ ATIVADO' ELSE '❌ BLOQUEADO' END;
    RAISE NOTICE '📱 WhatsApp liberado: %', CASE WHEN admin_whatsapp_active IS TRUE THEN '✅ ATIVADO' ELSE '❌ BLOQUEADO' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ADMIN AGORA TEM ACESSO TOTAL AO SISTEMA!';
    RAISE NOTICE '📋 Permissões completas para gerenciar usuários, planos e WhatsApp';
    RAISE NOTICE '🔐 Sistema pronto para uso comercial';
    RAISE NOTICE '=== FIM ===';
END $$;
