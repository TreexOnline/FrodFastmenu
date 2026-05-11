-- Migration: Adicionar configurações para webhook
-- Data: 11/05/2026

-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.app_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Inserir configuração inicial do webhook
INSERT INTO public.app_settings (key, value, description) VALUES 
('webhook_secret', 'your_webhook_secret_here', 'Chave secreta para validação de webhook do TreexPay'),
('webhook_enabled', 'true', 'Status do webhook (enabled/disabled)');

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_created_at ON public.app_settings(created_at);

-- Habilitar RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Apenas usuários autenticados podem ver configurações
CREATE POLICY "Users can view app settings" ON public.app_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas sistema pode atualizar configurações
CREATE POLICY "System can update app settings" ON public.app_settings
    FOR UPDATE USING (
        -- Verifica se é uma chamada do sistema
        current_setting('app.settings.webhook_key') IS NOT NULL
    );

-- Comentários
COMMENT ON TABLE public.app_settings IS 'Configurações do sistema FrodFast';
COMMENT ON COLUMN public.app_settings.key IS 'Chave da configuração';
COMMENT ON COLUMN public.app_settings.value IS 'Valor da configuração';
COMMENT ON COLUMN public.app_settings.description IS 'Descrição da configuração';
