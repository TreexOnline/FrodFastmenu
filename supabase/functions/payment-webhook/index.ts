import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-treex-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WebhookPayload {
  event: string;
  payment: {
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    paid_at?: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      )
    }

    // Verificar assinatura do webhook (em produção)
    const signature = req.headers.get('x-treex-signature')
    if (!signature) {
      console.warn('Webhook sem assinatura')
      // Em produção, retornar erro aqui
      // return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Parse body
    const body: WebhookPayload = await req.json()
    console.log('Webhook recebido:', body)

    // Validar payload
    if (!body.event || !body.payment) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Processar apenas eventos de pagamento
    if (body.event !== 'payment.paid') {
      console.log('Evento ignorado:', body.event)
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { status: 200, headers: corsHeaders }
      )
    }

    const { payment } = body

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar pedido de pagamento
    const { data: paymentOrder, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('payment_id', payment.id)
      .single()

    if (orderError || !paymentOrder) {
      console.error('Pedido não encontrado:', payment.id)
      return new Response(
        JSON.stringify({ error: 'Payment order not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Verificar se já foi processado
    if (paymentOrder.status === 'paid') {
      console.log('Pagamento já processado:', payment.id)
      return new Response(
        JSON.stringify({ message: 'Already processed' }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        paid_at: payment.paid_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentOrder.id)

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Atualizar plano do usuário
    const planDuration = paymentOrder.plan_id === 'annual' ? 'annual' : 'monthly'
    const planExpiresAt = planDuration === 'annual' 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        current_plan: paymentOrder.plan_id,
        plan_active: true,
        plan_type: paymentOrder.plan_id,
        plan_expires_at: planExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentOrder.user_id)

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Enviar e-mail de confirmação (opcional)
    // TODO: Implementar envio de e-mail

    console.log('✅ Pagamento processado com sucesso:', {
      paymentId: payment.id,
      userId: paymentOrder.user_id,
      planId: paymentOrder.plan_id,
      amount: payment.amount
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment processed successfully'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
