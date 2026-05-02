// ========================================
// ❌ EDGE FUNCTION DESATIVADA
// ========================================
// Esta Edge Function foi desativada em favor do novo WhatsApp Engine Node.js
// Localizado em: /whatsapp-engine/
//
// O novo sistema usa:
// - Node.js persistente (não serverless)
// - API REST em vez de WebSocket
// - Sessões Baileys mantidas em memória
// - Auth state persistente em disco
//
// Para usar o novo sistema:
// 1. cd whatsapp-engine
// 2. npm install
// 3. npm start
//
// Frontend agora consome: http://localhost:3001/api/whatsapp/...
//
// MANTER ESTE ARQUIVO COMO HISTÓRICO
// ========================================

serve(() => {
  return new Response(
    JSON.stringify({ 
      error: 'Edge Function desativada',
      message: 'Use o novo WhatsApp Engine em /whatsapp-engine/',
      status: 410 
    }),
    { 
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    }
  )
})
