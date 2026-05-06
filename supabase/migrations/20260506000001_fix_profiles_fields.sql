-- Adicionar campos que estão faltando na tabela profiles
-- Esses campos são necessários para o UserManagement.tsx funcionar corretamente

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS restaurant_name varchar(255) NULL,
ADD COLUMN IF NOT EXISTS current_plan varchar(50) NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS plan_type varchar(50) NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS whatsapp_addon_expires_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS signup_ip varchar(45) NULL;

-- Adicionar campo whatsapp_enabled na tabela stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;

-- Atualizar profiles existentes para ter valores padrão
UPDATE public.profiles 
SET 
    restaurant_name = COALESCE(restaurant_name, 'Meu Restaurante'),
    current_plan = COALESCE(current_plan, 'free'),
    plan_active = COALESCE(plan_active, false),
    plan_type = COALESCE(plan_type, 'free')
WHERE restaurant_name IS NULL OR current_plan IS NULL OR plan_type IS NULL;

-- Criar a view admin_users_view se não existir
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

-- Adicionar comentários sobre os novos campos
COMMENT ON COLUMN public.profiles.restaurant_name IS 'Nome do restaurante do usuário';
COMMENT ON COLUMN public.profiles.current_plan IS 'Plano atual do usuário (free, basic, premium, enterprise)';
COMMENT ON COLUMN public.profiles.plan_active IS 'Se o plano está ativo';
COMMENT ON COLUMN public.profiles.plan_expires_at IS 'Data de expiração do plano';
COMMENT ON COLUMN public.profiles.plan_type IS 'Tipo do plano';
COMMENT ON COLUMN public.profiles.trial_started_at IS 'Início do período de teste';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Fim do período de teste';
COMMENT ON COLUMN public.profiles.whatsapp_addon_expires_at IS 'Data de expiração do add-on WhatsApp';
COMMENT ON COLUMN public.profiles.signup_ip IS 'IP used during signup';
COMMENT ON COLUMN public.stores.whatsapp_enabled IS 'Se o WhatsApp está habilitado para esta loja';
