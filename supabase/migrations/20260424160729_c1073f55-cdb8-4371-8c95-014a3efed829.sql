-- Drop old Meta tables
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.whatsapp_settings CASCADE;

-- ============ zapi_settings ============
CREATE TABLE public.zapi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Instância Z-API
  instance_id text,
  instance_token text,
  instance_name text,
  -- Status
  is_connected boolean NOT NULL DEFAULT false,
  connection_status text NOT NULL DEFAULT 'disconnected', -- disconnected | qr | connected | error
  phone_number text,
  profile_name text,
  last_status_at timestamptz,
  last_qr text, -- base64 image
  last_qr_at timestamptz,
  -- Notificações
  notify_confirmed_enabled boolean NOT NULL DEFAULT true,
  notify_confirmed_text text NOT NULL DEFAULT 'Olá {nome}! Seu pedido #{pedido} foi confirmado ✅\nTotal: {total}\nEm breve começaremos o preparo 🍔🔥',
  notify_preparing_enabled boolean NOT NULL DEFAULT true,
  notify_preparing_text text NOT NULL DEFAULT 'Seu pedido #{pedido} já está em preparo 👨‍🍳🔥\nAguarde só mais um pouquinho!',
  notify_ready_enabled boolean NOT NULL DEFAULT false,
  notify_ready_text text NOT NULL DEFAULT 'Seu pedido #{pedido} está pronto para retirada! 🛍️\nPode vir buscar.',
  notify_out_for_delivery_enabled boolean NOT NULL DEFAULT true,
  notify_out_for_delivery_text text NOT NULL DEFAULT 'Seu pedido #{pedido} saiu para entrega 🚚💨\nAguarde, já está a caminho!',
  notify_delivered_enabled boolean NOT NULL DEFAULT false,
  notify_delivered_text text NOT NULL DEFAULT 'Pedido #{pedido} entregue! ✔️\nEsperamos que aproveite. Obrigado pela preferência 💛',
  notify_cancelled_enabled boolean NOT NULL DEFAULT false,
  notify_cancelled_text text NOT NULL DEFAULT 'Olá {nome}, infelizmente seu pedido #{pedido} foi cancelado.\nEm caso de dúvidas, entre em contato.',
  -- IA
  ai_enabled boolean NOT NULL DEFAULT true,
  ai_system_prompt text,
  ai_cooldown_seconds integer NOT NULL DEFAULT 30,
  ai_min_delay_seconds integer NOT NULL DEFAULT 2,
  -- timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zapi_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own zapi settings"
  ON public.zapi_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_zapi_settings_instance_id ON public.zapi_settings(instance_id);

CREATE TRIGGER tg_zapi_settings_updated
  BEFORE UPDATE ON public.zapi_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ zapi_messages ============
CREATE TABLE public.zapi_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  direction text NOT NULL, -- in | out
  from_number text,
  to_number text,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  wa_message_id text,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | received | delivered | read
  error text,
  order_id uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zapi_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own zapi messages"
  ON public.zapi_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own zapi messages"
  ON public.zapi_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_zapi_messages_user_created ON public.zapi_messages(user_id, created_at DESC);
CREATE INDEX idx_zapi_messages_wa_id ON public.zapi_messages(wa_message_id);
CREATE INDEX idx_zapi_messages_from_user ON public.zapi_messages(user_id, from_number, created_at DESC);

-- ============ pg_net for trigger HTTP calls ============
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============ Trigger: notifica via Z-API quando pedido muda status ============
CREATE OR REPLACE FUNCTION public.notify_zapi_on_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text;
  service_key text;
  payload jsonb;
BEGIN
  -- só dispara em UPDATE de status, ou em INSERT (pedido novo)
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object('order_id', NEW.id, 'event', 'created', 'status', NEW.status);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object('order_id', NEW.id, 'event', 'status_changed', 'status', NEW.status, 'old_status', OLD.status);
  ELSE
    RETURN NEW;
  END IF;

  fn_url := 'https://ansxttqnhpmktxogvtki.supabase.co/functions/v1/zapi-notify-order';
  service_key := current_setting('app.settings.service_role_key', true);

  PERFORM extensions.http_post(
    url := fn_url,
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_zapi_on_order_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_orders_zapi_notify ON public.orders;
CREATE TRIGGER tg_orders_zapi_notify
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_zapi_on_order_change();