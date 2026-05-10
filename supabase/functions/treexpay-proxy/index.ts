import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TREEXPAY_API_URL = /removi para subir no git.
const API_KEY = /removi paraa subir no git
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PATCH, OPTIONS',
}

interface ProxyRequest {
  method: string;
  path: string;
  body?: any;
  headers?: Record<string, string>;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // Extrair método e caminho da requisição
    // /treexpay-proxy/payments -> POST /payments
    // /treexpay-proxy/payments/123 -> GET /payments/123
    
    const method = req.method
    const apiPath = pathParts.slice(1).join('/') // Remove 'treexpay-proxy'
    
    if (!apiPath) {
      return new Response(
        JSON.stringify({ error: 'Invalid path' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Construir URL da API TreexPay
    const targetUrl = `${TREEXPAY_API_URL}/${apiPath}`
    
    console.log(`Proxy: ${method} ${targetUrl}`)

    // Preparar headers para a API TreexPay
    const proxyHeaders: Record<string, string> = {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    }

    // Copiar headers relevantes da requisição original
    if (req.headers) {
      for (const [key, value] of req.headers.entries()) {
        if (key.toLowerCase().startsWith('content-') || 
            key.toLowerCase().startsWith('accept-') ||
            key.toLowerCase() === 'user-agent') {
          proxyHeaders[key] = value
        }
      }
    }

    // Fazer a requisição para a API TreexPay
    let body: any = undefined
    if (method !== 'GET' && req.body) {
      try {
        body = await req.json()
      } catch (error) {
        console.error('Erro ao parsear body:', error)
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Fazer requisição para API TreexPay
    const response = await fetch(targetUrl, {
      method,
      headers: proxyHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // Obter resposta
    const responseData = await response.text()
    
    // Preparar headers de resposta
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': response.headers.get('content-type') || 'application/json',
    }

    // Copiar headers relevantes da resposta
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().startsWith('content-') || 
          key.toLowerCase().startsWith('cache-')) {
        responseHeaders[key] = value
      }
    }

    console.log(`Proxy Response: ${response.status} ${apiPath}`)

    // Retornar resposta da API
    return new Response(responseData, {
      status: response.status,
      headers: responseHeaders,
    })

  } catch (error: any) {
    console.error('Erro no proxy:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})
