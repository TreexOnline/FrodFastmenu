import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache de conexões WebSocket por store_id
const connections = new Map<string, WebSocket>()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()
    const storeId = url.searchParams.get('store_id')

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'store_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader)

    if (authError || !user || user.id !== storeId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'connect':
        return handleWebSocketConnection(req, storeId, supabase)
      case 'broadcast':
        return handleBroadcast(req, storeId, supabase)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: any) {
    console.error('WebSocket error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleWebSocketConnection(req: Request, storeId: string, supabase: any) {
  const { socket, response } = Deno.upgradeWebSocket(req)
  
  // Armazenar conexão
  connections.set(storeId, socket)
  
  // Enviar status atual
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('store_id', storeId)
    .single()
  
  if (session) {
    socket.send(JSON.stringify({
      type: 'status',
      data: {
        connected: session.status === 'connected',
        status: session.status,
        phone: session.phone,
        profileName: session.profile_name,
        qr: session.qr_code
      }
    }))
  }
  
  // Lidar com mensagens
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      
      if (message.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }))
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  }
  
  // Limpar conexão ao fechar
  socket.onclose = () => {
    connections.delete(storeId)
  }
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error)
    connections.delete(storeId)
  }
  
  return response
}

async function handleBroadcast(req: Request, storeId: string, supabase: any) {
  try {
    const { type, data } = await req.json()
    
    // Enviar para conexão específica
    const socket = connections.get(storeId)
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }))
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Broadcast error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Broadcast error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Função para broadcast de atualizações (chamada pelo backend principal)
export function broadcastUpdate(storeId: string, type: string, data: any) {
  const socket = connections.get(storeId)
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }))
  }
}
