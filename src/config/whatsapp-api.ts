// Configuração da API do WhatsApp Engine (Evolution API - Railway)
export const WHATSAPP_API_BASE_URL = 'https://bot-zap-production-9534.up.railway.app/api/sessions';

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
    
    const data = await response.json();
    
    // Tratar novo formato de resposta Evolution API
    if (data.success) {
      return data;
    } else {
      throw new Error(data.error || 'Connection failed');
    }
  },

  // GET /qr/{userId}
  getQr: async (userId: string) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/qr/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar QR: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Tratar novo formato de resposta Evolution API
    if (data.success) {
      return data;
    } else {
      throw new Error(data.error || 'QR generation failed');
    }
  },

  // GET /status/{userId}
  getStatus: async (userId: string) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/status/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Tratar novo formato de resposta Evolution API
    if (data.success) {
      return data;
    } else {
      throw new Error(data.error || 'Status check failed');
    }
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
    
    const data = await response.json();
    
    // Tratar novo formato de resposta Evolution API
    if (data.success) {
      return data;
    } else {
      throw new Error(data.error || 'Disconnect failed');
    }
  },

  // POST /save-config/{userId}
  saveConfig: async (userId: string, message_text: string, cooldown_hours: number, is_active: boolean) => {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/save-config/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_text,
        cooldown_hours,
        is_active
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao salvar configuração: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Tratar novo formato de resposta Evolution API
    if (data.success) {
      return data;
    } else {
      throw new Error(data.error || 'Config save failed');
    }
  },
};
