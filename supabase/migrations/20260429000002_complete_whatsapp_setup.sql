-- ========================================
-- WHATSAPP AUTOMÁTICO - SETUP COMPLETO
-- ========================================
-- Este arquivo cria todas as tabelas e configurações
-- necessárias para o sistema WhatsApp Automático

-- ============ REMOVER ESTRUTURA ANTIGA ============
DROP TABLE IF EXISTS public.zapi_messages CASCADE;
DROP TABLE IF EXISTS public.zapi_settings CASCADE;

-- Remover índices e triggers relacionados
DROP TRIGGER IF EXISTS tg_zapi_settings_updated ON public.zapi_settings;
DROP INDEX IF EXISTS idx_zapi_settings_instance_id;

-- Remover políticas RLS
DROP POLICY IF EXISTS "Users manage own zapi settings" ON public.zapi_settings;

-- ============ CRIAR TABELAS NOVAS ============

-- Tabela de sessões WhatsApp (multi-cliente SaaS)
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_name varchar(50) NOT NULL DEFAULT 'default',
  phone varchar(20) NULL,
  status varchar(20) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'qr', 'error')),
  auth_path varchar(255) NULL,
  qr_code text NULL, -- QR code em base64
  profile_name varchar(100) NULL,
  last_activity timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, session_name)
);

-- Tabela de configurações de auto resposta
CREATE TABLE public.whatsapp_auto_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  cooldown_hours integer NOT NULL DEFAULT 24 CHECK (cooldown_hours IN (1, 6, 12, 24)),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id)
);

-- Tabela de logs de mensagens (para controle de cooldown)
CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_number varchar(20) NOT NULL,
  customer_name varchar(100) NULL,
  message_received text NULL,
  message_sent text NULL,
  last_sent_at timestamptz NULL,
  message_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, customer_number)
);

-- Tabela de estatísticas de uso (opcional, para analytics)
CREATE TABLE public.whatsapp_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  messages_received integer NOT NULL DEFAULT 0,
  messages_sent integer NOT NULL DEFAULT 0,
  unique_customers integer NOT NULL DEFAULT 0,
  connection_uptime_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, date)
);

-- ============ CONFIGURAÇÕES DE SEGURANÇA ============
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - whatsapp_sessions
CREATE POLICY "Users manage own whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- Políticas RLS - whatsapp_auto_messages
CREATE POLICY "Users manage own whatsapp_auto_messages"
  ON public.whatsapp_auto_messages FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- Políticas RLS - whatsapp_message_logs
CREATE POLICY "Users manage own whatsapp_message_logs"
  ON public.whatsapp_message_logs FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- Políticas RLS - whatsapp_analytics
CREATE POLICY "Users manage own whatsapp_analytics"
  ON public.whatsapp_analytics FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- ============ ÍNDICES OTIMIZADOS ============
CREATE INDEX idx_whatsapp_sessions_store_id ON public.whatsapp_sessions(store_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_sessions_last_activity ON public.whatsapp_sessions(last_activity);

CREATE INDEX idx_whatsapp_auto_messages_store_id ON public.whatsapp_auto_messages(store_id);
CREATE INDEX idx_whatsapp_auto_messages_active ON public.whatsapp_auto_messages(is_active);

CREATE INDEX idx_whatsapp_message_logs_store_id ON public.whatsapp_message_logs(store_id);
CREATE INDEX idx_whatsapp_message_logs_customer ON public.whatsapp_message_logs(store_id, customer_number);
CREATE INDEX idx_whatsapp_message_logs_last_sent ON public.whatsapp_message_logs(last_sent_at);
CREATE INDEX idx_whatsapp_message_logs_created_at ON public.whatsapp_message_logs(created_at);

CREATE INDEX idx_whatsapp_analytics_store_id ON public.whatsapp_analytics(store_id);
CREATE INDEX idx_whatsapp_analytics_date ON public.whatsapp_analytics(date);

-- ============ TRIGGERS AUTOMÁTICOS ============
CREATE TRIGGER tg_whatsapp_sessions_updated
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_auto_messages_updated
  BEFORE UPDATE ON public.whatsapp_auto_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_analytics_updated
  BEFORE UPDATE ON public.whatsapp_analytics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FUNÇÕES ÚTEIS ============

-- Função para limpar logs antigos (manutenção)
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_logs(days_to_keep integer DEFAULT 90)
RETURNS void AS $$
BEGIN
  DELETE FROM public.whatsapp_message_logs 
  WHERE created_at < now() - interval '1 day' * days_to_keep;
  
  RAISE NOTICE 'Logs antigos removidos: %', ROW_COUNT();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar analytics diariamente
CREATE OR REPLACE FUNCTION update_whatsapp_analytics()
RETURNS void AS $$
BEGIN
  INSERT INTO public.whatsapp_analytics (store_id, date, messages_received, messages_sent, unique_customers)
  SELECT 
    store_id,
    current_date,
    COUNT(*) FILTER (WHERE message_received IS NOT NULL),
    COUNT(*) FILTER (WHERE message_sent IS NOT NULL),
    COUNT(DISTINCT customer_number)
  FROM public.whatsapp_message_logs
  WHERE date(created_at) = current_date
  GROUP BY store_id
  ON CONFLICT (store_id, date) DO UPDATE SET
    messages_received = EXCLUDED.messages_received,
    messages_sent = EXCLUDED.messages_sent,
    unique_customers = EXCLUDED.unique_customers,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ DADOS INICIAIS ============
-- Inserir configuração padrão para usuários existentes com addon ativo
INSERT INTO public.whatsapp_auto_messages (store_id, message_text, cooldown_hours, is_active)
SELECT 
  p.id,
  'Olá 👋 Seja bem vindo ao nosso atendimento!

🍔 Confira nosso cardápio completo:
https://seudominio.com/loja

📱 Faça seu pedido diretamente pelo nosso site!

Agradecemos o contato! 😊',
  24,
  true
FROM profiles p
WHERE p.whatsapp_addon_active = true
AND NOT EXISTS (
  SELECT 1 FROM public.whatsapp_auto_messages wam 
  WHERE wam.store_id = p.id
);

-- Criar analytics para hoje para usuários ativos
INSERT INTO public.whatsapp_analytics (store_id, date)
SELECT 
  p.id,
  current_date
FROM profiles p
WHERE p.whatsapp_addon_active = true
AND NOT EXISTS (
  SELECT 1 FROM public.whatsapp_analytics wa 
  WHERE wa.store_id = p.id AND wa.date = current_date
);

-- ============ VIEWS ÚTEIS ============

-- View para status consolidado do WhatsApp
CREATE OR REPLACE VIEW whatsapp_status_summary AS
SELECT 
  s.store_id,
  s.status as connection_status,
  s.phone,
  s.profile_name,
  s.last_activity,
  am.is_active as auto_reply_active,
  am.cooldown_hours,
  CASE 
    WHEN s.status = 'connected' AND am.is_active THEN 'full_active'
    WHEN s.status = 'connected' THEN 'connected_only'
    WHEN am.is_active THEN 'configured_only'
    ELSE 'inactive'
  END as overall_status,
  COUNT(ml.id) as messages_today
FROM public.whatsapp_sessions s
LEFT JOIN public.whatsapp_auto_messages am ON s.store_id = am.store_id
LEFT JOIN public.whatsapp_message_logs ml ON s.store_id = ml.store_id 
  AND date(ml.created_at) = current_date
GROUP BY s.store_id, s.status, s.phone, s.profile_name, s.last_activity, am.is_active, am.cooldown_hours;

-- ============ COMENTÁRIOS E DOCUMENTAÇÃO ============
COMMENT ON TABLE public.whatsapp_sessions IS 'Sessões WhatsApp por cliente - SaaS multi-tenant';
COMMENT ON TABLE public.whatsapp_auto_messages IS 'Configurações de auto resposta por cliente';
COMMENT ON TABLE public.whatsapp_message_logs IS 'Logs de mensagens para controle de cooldown';
COMMENT ON TABLE public.whatsapp_analytics IS 'Estatísticas de uso do WhatsApp';

COMMENT ON COLUMN public.whatsapp_sessions.status IS 'Status: disconnected, connecting, connected, qr, error';
COMMENT ON COLUMN public.whatsapp_sessions.auth_path IS 'Caminho dos arquivos de autenticação Baileys';
COMMENT ON COLUMN public.whatsapp_sessions.qr_code IS 'QR Code em base64 para exibição';
COMMENT ON COLUMN public.whatsapp_auto_messages.cooldown_hours IS 'Cooldown: 1, 6, 12 ou 24 horas';
COMMENT ON COLUMN public.whatsapp_message_logs.last_sent_at IS 'Controle de cooldown por cliente';

-- ============ VERIFICAÇÃO FINAL ============
DO $$
DECLARE
  table_count integer;
BEGIN
  -- Verificar se todas as tabelas foram criadas
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('whatsapp_sessions', 'whatsapp_auto_messages', 'whatsapp_message_logs', 'whatsapp_analytics');
  
  IF table_count = 4 THEN
    RAISE NOTICE '✅ WhatsApp Automático: Todas as tabelas criadas com sucesso!';
    RAISE NOTICE '📊 Tabelas: whatsapp_sessions, whatsapp_auto_messages, whatsapp_message_logs, whatsapp_analytics';
    RAISE NOTICE '🔒 RLS policies aplicadas';
    RAISE NOTICE '📈 Índices otimizados criados';
    RAISE NOTICE '⚡ Triggers e funções prontas';
  ELSE
    RAISE EXCEPTION '❌ Erro: Apenas % tabelas criadas (esperado: 4)', table_count;
  END IF;
END $$;
