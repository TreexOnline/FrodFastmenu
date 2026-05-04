// Configuração da API do WhatsApp Engine (Railway)
export const WHATSAPP_API_BASE_URL = 'https://sistema-zap-production.up.railway.app/api/whatsapp';

// Helper para fazer requisições à API do WhatsApp Engine
export const whatsappApi = {
  // POST /connect/{userId}
  connect: async (userId: string) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/connect/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao conectar: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  // GET /qr/{userId}
  getQr: async (userId: string) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/qr/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar QR: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  // GET /status/{userId}
  getStatus: async (userId: string) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/status/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar status: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  // POST /disconnect/{userId}
  disconnect: async (userId: string) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/disconnect/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao desconectar: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
};
