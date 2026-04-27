ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_addon_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_addon_expires_at timestamp with time zone;