-- Tabela de configurações do WhatsApp por usuário
CREATE TABLE public.whatsapp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  display_phone_number TEXT,
  verified_name TEXT,
  last_verified_at TIMESTAMPTZ,
  -- Bot de IA
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_system_prompt TEXT,
  ai_min_delay_seconds INTEGER NOT NULL DEFAULT 2,
  ai_cooldown_seconds INTEGER NOT NULL DEFAULT 30,
  -- Mensagens automáticas
  notify_confirmed_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_confirmed_text TEXT NOT NULL DEFAULT 'Olá {nome}! Seu pedido #{pedido} foi confirmado ✅
Total: {total}
Em breve começaremos o preparo 🍔🔥',
  notify_preparing_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_preparing_text TEXT NOT NULL DEFAULT 'Seu pedido #{pedido} já está em preparo 👨‍🍳🔥
Aguarde só mais um pouquinho!',
  notify_ready_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_ready_text TEXT NOT NULL DEFAULT 'Seu pedido #{pedido} está pronto para retirada! 🛍️
Pode vir buscar.',
  notify_out_for_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_out_for_delivery_text TEXT NOT NULL DEFAULT 'Seu pedido #{pedido} saiu para entrega 🚚💨
Aguarde, já está a caminho!',
  notify_delivered_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_delivered_text TEXT NOT NULL DEFAULT 'Pedido #{pedido} entregue! ✔️
Esperamos que aproveite. Obrigado pela preferência 💛',
  notify_cancelled_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_cancelled_text TEXT NOT NULL DEFAULT 'Olá {nome}, infelizmente seu pedido #{pedido} foi cancelado.
Em caso de dúvidas, entre em contato.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own whatsapp_settings"
  ON public.whatsapp_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_wa_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Histórico de mensagens
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  to_number TEXT,
  from_number TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  wa_message_id TEXT UNIQUE,
  order_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_user_created ON public.whatsapp_messages (user_id, created_at DESC);
CREATE INDEX idx_wa_messages_from ON public.whatsapp_messages (user_id, from_number, created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Realtime para mensagens (futuro chat ao vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_settings;