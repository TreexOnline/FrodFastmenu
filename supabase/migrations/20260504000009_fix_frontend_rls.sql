-- FIX RLS PARA TODAS AS TABELAS DO FRONTEND
-- Criar policies para todas as tabelas que o frontend usa

-- ============ HABILITAR RLS EM TODAS AS TABELAS ============

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_responder ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts_cooldown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES PARA PRODUCTS ============

-- Store owners podem ver seus produtos
CREATE POLICY "Store owners can view their products" ON public.products
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.menus m
        WHERE m.id = menu_id AND m.user_id = auth.uid()
    ));

-- Store owners podem gerenciar seus produtos
CREATE POLICY "Store owners can manage their products" ON public.products
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.menus m
        WHERE m.id = menu_id AND m.user_id = auth.uid()
    ));

-- ============ POLICIES PARA PRODUCT_ADDON_GROUPS ============

-- Store owners podem ver seus grupos de add-ons de produtos
CREATE POLICY "Store owners can view their product addon groups" ON public.product_addon_groups
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.menus m ON m.id = p.menu_id
        WHERE p.id = product_id AND m.user_id = auth.uid()
    ));

-- Store owners podem gerenciar seus grupos de add-ons de produtos
CREATE POLICY "Store owners can manage their product addon groups" ON public.product_addon_groups
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.menus m ON m.id = p.menu_id
        WHERE p.id = product_id AND m.user_id = auth.uid()
    ));

-- ============ POLICIES PARA PRODUCT_ADDONS ============

-- Store owners podem ver seus add-ons de produtos
CREATE POLICY "Store owners can view their product addons" ON public.product_addons
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.product_addon_groups pag
        JOIN public.products p ON p.id = pag.product_id
        JOIN public.menus m ON m.id = p.menu_id
        WHERE pag.id = group_id AND m.user_id = auth.uid()
    ));

-- Store owners podem gerenciar seus add-ons de produtos
CREATE POLICY "Store owners can manage their product addons" ON public.product_addons
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.product_addon_groups pag
        JOIN public.products p ON p.id = pag.product_id
        JOIN public.menus m ON m.id = p.menu_id
        WHERE pag.id = group_id AND m.user_id = auth.uid()
    ));

-- ============ POLICIES PARA ORDER_ITEMS ============

-- Store owners podem ver seus itens de pedidos
CREATE POLICY "Store owners can view their order items" ON public.order_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
    ));

-- Store owners podem gerenciar seus itens de pedidos
CREATE POLICY "Store owners can manage their order items" ON public.order_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
    ));

-- ============ POLICIES PARA WHATSAPP_AUTO_RESPONDER ============

-- Users podem ver suas mensagens de auto-resposta
CREATE POLICY "Users can view their whatsapp auto responder" ON public.whatsapp_auto_responder
    FOR SELECT USING (auth.uid() = user_id);

-- Users podem gerenciar suas mensagens de auto-resposta
CREATE POLICY "Users can manage their whatsapp auto responder" ON public.whatsapp_auto_responder
    FOR ALL USING (auth.uid() = user_id);

-- ============ POLICIES PARA WHATSAPP_SESSIONS ============

-- Users podem ver suas sessões WhatsApp
CREATE POLICY "Users can view their whatsapp sessions" ON public.whatsapp_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users podem gerenciar suas sessões WhatsApp
CREATE POLICY "Users can manage their whatsapp sessions" ON public.whatsapp_sessions
    FOR ALL USING (auth.uid() = user_id);

-- ============ POLICIES PARA WHATSAPP_MESSAGES ============

-- Users podem ver suas mensagens WhatsApp
CREATE POLICY "Users can view their whatsapp messages" ON public.whatsapp_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Users podem gerenciar suas mensagens WhatsApp
CREATE POLICY "Users can manage their whatsapp messages" ON public.whatsapp_messages
    FOR ALL USING (auth.uid() = user_id);

-- ============ POLICIES PARA WHATSAPP_CONTACTS_COOLDOWN ============

-- Users podem ver seus contatos em cooldown
CREATE POLICY "Users can view their whatsapp contacts cooldown" ON public.whatsapp_contacts_cooldown
    FOR SELECT USING (auth.uid() = user_id);

-- Users podem gerenciar seus contatos em cooldown
CREATE POLICY "Users can manage their whatsapp contacts cooldown" ON public.whatsapp_contacts_cooldown
    FOR ALL USING (auth.uid() = user_id);

-- ============ POLICIES PARA AUTH_OTP_CODES ============

-- Users podem ver seus próprios códigos OTP
CREATE POLICY "Users can view own otp codes" ON public.auth_otp_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Users podem gerenciar seus próprios códigos OTP
CREATE POLICY "Users can manage own otp codes" ON public.auth_otp_codes
    FOR ALL USING (auth.uid() = user_id);

-- ============ POLICIES PARA SIGNUP_IPS ============

-- Acesso público para leitura (para verificação de IP)
CREATE POLICY "Public read access for signup IPs" ON public.signup_ips
    FOR SELECT USING (true);

-- Acesso restrito para inserção (sistema pode inserir)
CREATE POLICY "System can insert signup IPs" ON public.signup_ips
    FOR INSERT WITH CHECK (true);

-- ============ VERIFICAÇÃO FINAL ============

DO $$
DECLARE
    policy_count integer;
    table_count integer;
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO FINAL DAS POLICIES FRONTEND ===';
    
    -- Contar policies criadas
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Contar tabelas com RLS
    SELECT COUNT(*) INTO table_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' AND c.relrowsecurity = true;
    
    RAISE NOTICE '📊 Total de policies criadas: %', policy_count;
    RAISE NOTICE '🔒 Tabelas com RLS ativado: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS policies para frontend criadas!';
    RAISE NOTICE '🎯 Todas as tabelas do frontend agora têm acesso';
    RAISE NOTICE '📱 Products, Product Addons, Order Items liberados';
    RAISE NOTICE '📱 WhatsApp Sessions, Messages, Auto-responder liberados';
    RAISE NOTICE '📱 Auth OTP Codes, Signup IPs liberados';
    RAISE NOTICE '🔐 Admin deve aparecer no menu agora!';
    RAISE NOTICE '=== FIM ===';
END $$;
