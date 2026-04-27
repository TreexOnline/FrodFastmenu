CREATE TABLE public.auth_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_otp_codes_phone ON public.auth_otp_codes(phone);
CREATE INDEX idx_auth_otp_codes_expires_at ON public.auth_otp_codes(expires_at);

ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- No public policies: apenas service role (edge functions) acessa esta tabela.
-- RLS habilitado sem policies = bloqueia tudo para clientes anon/authenticated.

-- Adicionar coluna phone em profiles (caso ainda não exista lógica)
-- whatsapp_number já existe e será usado como phone.