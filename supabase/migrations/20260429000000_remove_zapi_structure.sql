-- Remover completamente estrutura Z-API antiga
-- Migrar para novo sistema WhatsApp Auto Resposta

-- Dropar tabelas antigas
DROP TABLE IF EXISTS public.zapi_messages CASCADE;
DROP TABLE IF EXISTS public.zapi_settings CASCADE;

-- Remover índices e triggers relacionados
DROP TRIGGER IF EXISTS tg_zapi_settings_updated ON public.zapi_settings;
DROP INDEX IF EXISTS idx_zapi_settings_instance_id;

-- Remover políticas RLS
DROP POLICY IF EXISTS "Users manage own zapi settings" ON public.zapi_settings;
