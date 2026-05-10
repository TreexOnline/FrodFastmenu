-- Migration: Criar tabela de pedidos de pagamento
-- Data: 10/05/2026

-- Criar tabela de pedidos de pagamento
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id text NOT NULL,
    payment_id text NOT NULL UNIQUE,
    amount numeric(10,2) NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    payment_method text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    paid_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id ON public.payment_orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at);

-- Habilitar RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Usuários podem ver seus próprios pedidos
CREATE POLICY "Users can view their payment orders" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios pedidos
CREATE POLICY "Users can insert their payment orders" ON public.payment_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios pedidos
CREATE POLICY "Users can update their payment orders" ON public.payment_orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Sistema (webhook) pode atualizar status dos pedidos
CREATE POLICY "System can update payment status" ON public.payment_orders
    FOR UPDATE USING (
        -- Verifica se é uma chamada do sistema (via webhook)
        -- Em produção, isso deve usar uma chave de API ou serviço dedicado
        current_setting('app.settings.webhook_key') IS NOT NULL
    );

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_payment_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_orders_updated_at
    BEFORE UPDATE ON public.payment_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_orders_updated_at();

-- Comentários
COMMENT ON TABLE public.payment_orders IS 'Tabela de pedidos de pagamento dos usuários';
COMMENT ON COLUMN public.payment_orders.user_id IS 'ID do usuário que fez o pedido';
COMMENT ON COLUMN public.payment_orders.plan_id IS 'ID do plano contratado (monthly, combo, annual)';
COMMENT ON COLUMN public.payment_orders.payment_id IS 'ID do pagamento na TreexPay';
COMMENT ON COLUMN public.payment_orders.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN public.payment_orders.status IS 'Status do pagamento (pending, paid, failed, canceled, expired)';
COMMENT ON COLUMN public.payment_orders.payment_method IS 'Método de pagamento (pix, credit_card)';
COMMENT ON COLUMN public.payment_orders.paid_at IS 'Data em que o pagamento foi confirmado';
COMMENT ON COLUMN public.payment_orders.metadata IS 'Dados adicionais do pagamento';
