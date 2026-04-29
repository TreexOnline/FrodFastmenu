-- Criar estrutura completa para WhatsApp Auto Resposta
-- Sistema multi-cliente SaaS com Baileys

-- ============ whatsapp_sessions ============
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_name varchar(50) NOT NULL DEFAULT 'default',
  phone varchar(20) NULL,
  status varchar(20) NOT NULL DEFAULT 'disconnected', -- disconnected, connecting, connected, qr
  auth_path varchar(255) NULL,
  qr_code text NULL, -- QR code em base64
  profile_name varchar(100) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, session_name)
);

-- ============ whatsapp_auto_messages ============
CREATE TABLE public.whatsapp_auto_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  cooldown_hours integer NOT NULL DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id)
);

-- ============ whatsapp_message_logs ============
CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_number varchar(20) NOT NULL,
  customer_name varchar(100) NULL,
  message_received text NULL,
  message_sent text NULL,
  last_sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, customer_number)
);

-- ============ CONFIGURAÇÕES DE SEGURANÇA ============
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users manage own whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own whatsapp_auto_messages"
  ON public.whatsapp_auto_messages FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own whatsapp_message_logs"
  ON public.whatsapp_message_logs FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- Índices otimizados
CREATE INDEX idx_whatsapp_sessions_store_id ON public.whatsapp_sessions(store_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_auto_messages_store_id ON public.whatsapp_auto_messages(store_id);
CREATE INDEX idx_whatsapp_message_logs_store_id ON public.whatsapp_message_logs(store_id);
CREATE INDEX idx_whatsapp_message_logs_customer ON public.whatsapp_message_logs(store_id, customer_number);
CREATE INDEX idx_whatsapp_message_logs_last_sent ON public.whatsapp_message_logs(last_sent_at);

-- Triggers para updated_at
CREATE TRIGGER tg_whatsapp_sessions_updated
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_auto_messages_updated
  BEFORE UPDATE ON public.whatsapp_auto_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inserir configuração padrão para usuários existentes com addon ativo
INSERT INTO public.whatsapp_auto_messages (store_id, message_text, cooldown_hours)
SELECT 
  p.id,
  'Olá 👋 Seja bem vindo ao nosso atendimento!

🍔 Confira nosso cardápio:
https://seudominio.com/loja

Faça seu pedido por aqui 😄',
  24
FROM profiles p
WHERE p.whatsapp_addon_active = true
AND NOT EXISTS (
  SELECT 1 FROM public.whatsapp_auto_messages wam 
  WHERE wam.store_id = p.id
);
