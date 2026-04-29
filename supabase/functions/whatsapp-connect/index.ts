import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { makeWASocket, useMultiFileAuthState } from "https://esm.sh/@whiskeysockets/baileys@6.7.9"
import { randomBytes } from "https://deno.land/std@0.168.0/crypto/mod.ts"
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

// Tipos para as interfaces
interface WhatsAppSession {
  id: string
  store_id: string
  session_name: string
  phone: string | null
  status: string
  auth_path: string | null
  qr_code: string | null
  profile_name: string | null
  created_at: string
  updated_at: string
}

interface AutoMessage {
  id: string
  store_id: string
  message_text: string
  cooldown_hours: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Message {
  key: {
    remoteJid?: string
    fromMe: boolean
    id: string
  }
  message?: {
    conversation?: string
    extendedTextMessage?: {
      text?: string
    }
  }
}

interface ConnectionUpdate {
  qr?: Uint8Array
  connection?: 'open' | 'close' | 'connecting'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache de sessões por store_id
const sessions = new Map<string, any>()
const qrCodes = new Map<string, string>()

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (action) {
      case 'connect':
        return handleConnect(req, supabase, user.id)
      case 'disconnect':
        return handleDisconnect(req, supabase, user.id)
      case 'status':
        return handleStatus(req, supabase, user.id)
      case 'save-config':
        return handleSaveConfig(req, supabase, user.id)
      case 'get-config':
        return handleGetConfig(req, supabase, user.id)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleConnect(req: Request, supabase: any, userId: string) {
  try {
    // Verificar se já existe uma sessão
    const { data: existingSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('store_id', userId)
      .single()

    if (existingSession && existingSession.status === 'connected') {
      return new Response(
        JSON.stringify({ 
          connected: true, 
          phone: existingSession.phone,
          profileName: existingSession.profile_name 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar ou atualizar sessão
    const sessionId = randomBytes(16).toString('hex')
    const authPath = `./auth/${userId}_${sessionId}`

    const sessionData: Partial<WhatsAppSession> = {
      store_id: userId,
      session_name: 'default',
      status: 'connecting',
      auth_path: authPath,
      updated_at: new Date().toISOString()
    }

    let session: WhatsAppSession
    if (existingSession) {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .update(sessionData)
        .eq('id', existingSession.id)
        .select()
        .single()
      session = data
    } else {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .insert(sessionData)
        .select()
        .single()
      session = data
    }

    // Iniciar conexão com Baileys
    await startWhatsAppSession(session, supabase)

    // Retornar status inicial
    return new Response(
      JSON.stringify({ 
        connected: false, 
        status: 'connecting',
        sessionId: session.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Connect error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Connection error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function startWhatsAppSession(session: WhatsAppSession, supabase: any) {
  try {
    // Criar pasta de autenticação se não existir
    try {
      await Deno.mkdir('./auth', { recursive: true })
    } catch (e) {
      // Pasta já existe
    }

    const { state, saveCreds } = await useMultiFileAuthState(session.auth_path!)

    const sock = makeWASocket({
      authState: state,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      retryRequestDelayMs: 100,
      keepAliveIntervalMs: 30000,
      browser: ['TreexMenu', 'Chrome', '96.0.4664.110']
    })

    // Guardar sessão no cache
    sessions.set(session.store_id, sock)

    // Event handlers
    sock.ev.on('connection.update', async (update: ConnectionUpdate) => {
      console.log('Connection update:', update)
      
      if (update.qr) {
        // QR Code disponível
        const qrDataUrl = `data:image/png;base64,${Buffer.from(update.qr).toString('base64')}`
        qrCodes.set(session.store_id, qrDataUrl)
        
        // Atualizar no banco
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'qr',
            qr_code: qrDataUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)

        // Broadcast via WebSocket
        await broadcastToWebSocket(session.store_id, 'qr_update', { qr: qrDataUrl })
      }

      if (update.connection === 'open') {
        // Conectado com sucesso
        const authInfo = sock.user!
        
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'connected',
            phone: authInfo.id?.replace('@s.whatsapp.net', '') || null,
            profile_name: authInfo.name || null,
            qr_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)

        // Limpar QR code
        qrCodes.delete(session.store_id)

        // Broadcast via WebSocket
        await broadcastToWebSocket(session.store_id, 'connection_update', {
          connected: true,
          status: 'connected',
          phone: authInfo.id?.replace('@s.whatsapp.net', '') || null,
          profileName: authInfo.name || null,
          qr: null
        })
      }

      if (update.connection === 'close') {
        // Desconectado
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)

        // Broadcast via WebSocket
        await broadcastToWebSocket(session.store_id, 'connection_update', {
          connected: false,
          status: 'disconnected',
          phone: null,
          profileName: null,
          qr: null
        })
      }
    })

    sock.ev.on('creds.update', saveCreds)

    // Handler para mensagens
    sock.ev.on('messages.upsert', async (m: any) => {
      const message: Message = m.messages[0]
      if (!message.message) return

      // Ignorar mensagens de grupos
      if (message.key.remoteJid?.endsWith('@g.us')) return

      // Ignorar mensagens enviadas pelo próprio usuário
      if (message.key.fromMe) return

      await handleIncomingMessage(message, session.store_id, supabase, sock)
    })

  } catch (error: any) {
    console.error('Session error:', error)
    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id)
  }
}

async function handleIncomingMessage(message: Message, storeId: string, supabase: any, sock: any) {
  try {
    console.log('📨 Received message:', {
      storeId,
      from: message.key.remoteJid,
      fromMe: message.key.fromMe,
      messageType: Object.keys(message.message || {}),
      content: message.message?.conversation || message.message?.extendedTextMessage?.text || 'No text'
    })

    // Ignorar mensagens de grupos
    if (message.key.remoteJid?.endsWith('@g.us')) {
      console.log('📢 Ignoring group message')
      return
    }

    // Ignorar mensagens enviadas pelo próprio usuário
    if (message.key.fromMe) {
      console.log('🙋‍♂️ Ignoring own message')
      return
    }

    // Obter configuração de auto resposta
    const { data: autoMessage, error: configError } = await supabase
      .from('whatsapp_auto_messages')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .single()

    if (configError || !autoMessage) {
      console.log('❌ No auto message configuration found for store:', storeId, configError)
      return
    }

    console.log('✅ Auto message config found:', {
      messageText: autoMessage.message_text.substring(0, 50) + '...',
      cooldownHours: autoMessage.cooldown_hours,
      isActive: autoMessage.is_active
    })

    // Verificar cooldown
    const customerNumber = message.key.remoteJid?.replace('@s.whatsapp.net', '')
    const { data: lastMessage, error: cooldownError } = await supabase
      .from('whatsapp_message_logs')
      .select('last_sent_at')
      .eq('store_id', storeId)
      .eq('customer_number', customerNumber)
      .single()

    if (lastMessage?.last_sent_at) {
      const cooldownHours = autoMessage.cooldown_hours
      const cooldownTime = new Date(lastMessage.last_sent_at)
      cooldownTime.setHours(cooldownTime.getHours() + cooldownHours)
      
      if (new Date() < cooldownTime) {
        console.log('⏰ Message in cooldown for customer:', customerNumber, 'Next reply at:', cooldownTime)
        return // Ainda em cooldown
      }
    }

    // Enviar resposta automática
    console.log('📤 Sending auto reply to:', customerNumber)
    console.log('📝 Message content:', autoMessage.message_text)
    
    try {
      await sock.sendMessage(customerNumber + '@s.whatsapp.net', {
        text: autoMessage.message_text
      })
      console.log('✅ Message sent successfully!')
    } catch (sendError) {
      console.error('❌ Failed to send message:', sendError)
      throw sendError
    }

    // Registrar log
    const messageContent = message.message?.conversation || message.message?.extendedTextMessage?.text || ''
    
    const { error: logError } = await supabase
      .from('whatsapp_message_logs')
      .upsert({
        store_id: storeId,
        customer_number: customerNumber,
        message_received: messageContent,
        message_sent: autoMessage.message_text,
        last_sent_at: new Date().toISOString()
      }, {
        onConflict: 'store_id,customer_number'
      })

    if (logError) {
      console.error('❌ Failed to log message:', logError)
    } else {
      console.log('📝 Message logged successfully')
    }

    console.log('🎉 Auto reply process completed for:', customerNumber)

  } catch (error: any) {
    console.error('💥 Message handling error:', error)
  }
}

async function handleDisconnect(req: Request, supabase: any, userId: string) {
  try {
    // Desconectar sessão Baileys
    const sock = sessions.get(userId)
    if (sock) {
      sock.end()
      sessions.delete(userId)
    }

    // Limpar QR code
    qrCodes.delete(userId)

    // Atualizar status no banco
    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('store_id', userId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Disconnect error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Disconnect error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleStatus(req: Request, supabase: any, userId: string) {
  try {
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('store_id', userId)
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          status: 'disconnected' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se há QR code atual
    let qrCode = session.qr_code
    if (qrCodes.has(userId)) {
      qrCode = qrCodes.get(userId)
    }

    return new Response(
      JSON.stringify({
        connected: session.status === 'connected',
        status: session.status,
        phone: session.phone,
        profileName: session.profile_name,
        qr: qrCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Status error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Status error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleSaveConfig(req: Request, supabase: any, userId: string) {
  try {
    const { message_text, cooldown_hours, is_active } = await req.json()

    const { data, error } = await supabase
      .from('whatsapp_auto_messages')
      .upsert({
        store_id: userId,
        message_text,
        cooldown_hours: cooldown_hours || 24,
        is_active: is_active !== false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'store_id'
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Save config error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Save config error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetConfig(req: Request, supabase: any, userId: string) {
  try {
    const { data: autoMessage } = await supabase
      .from('whatsapp_auto_messages')
      .select('*')
      .eq('store_id', userId)
      .single()

    return new Response(
      JSON.stringify({ data: autoMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Get config error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Get config error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Função para broadcast via WebSocket
async function broadcastToWebSocket(storeId: string, type: string, data: any) {
  try {
    await supabase.functions.invoke('whatsapp-websocket/broadcast', {
      body: { store_id: storeId, type, data }
    })
  } catch (error) {
    console.error('WebSocket broadcast error:', error)
  }
}
