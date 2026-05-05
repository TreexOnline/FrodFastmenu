// Configuração central da API WhatsApp Engine
// Facilita mudança de localhost para produção/VPS

// Detectar ambiente (development vs production)
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// URL base dinâmica baseada no ambiente
const baseURL = import.meta.env.VITE_WHATSAPP_API_URL || 
               (isDevelopment ? "http://localhost:3001" : "https://whatsmotor-production.up.railway.app");

export const WHATSAPP_API_CONFIG = {
  // URL base do WhatsApp Engine
  baseURL,
  
  // Endpoints da API
  endpoints: {
    connect: (userId: string) => `${baseURL}/api/whatsapp/connect/${userId}`,
    status: (userId: string) => `${baseURL}/api/whatsapp/status/${userId}`,
    qr: (userId: string) => `${baseURL}/api/whatsapp/qr/${userId}`,
    disconnect: (userId: string) => `${baseURL}/api/whatsapp/disconnect/${userId}`,
    reconnect: (userId: string) => `${baseURL}/api/whatsapp/reconnect/${userId}`,
    sessions: `${baseURL}/api/whatsapp/sessions`,
    health: `${baseURL}/api/whatsapp/health`,
    reconnectAll: `${baseURL}/api/whatsapp/reconnect-all`,
    cleanup: `${baseURL}/api/whatsapp/cleanup`
  },
  
  // Configurações de polling
  polling: {
    statusInterval: 3000, // 3 segundos
    qrInterval: 2000,      // 2 segundos
    maxRetries: 3,
    timeoutMs: 10000       // 10 segundos timeout
  },
  
  // Headers padrão
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Informações do ambiente para debug
  environment: {
    isDevelopment,
    mode: import.meta.env.MODE,
    apiURL: import.meta.env.VITE_WHATSAPP_API_URL || 'default'
  }
};

// Export para compatibilidade
export const WHATSAPP_API_URL = WHATSAPP_API_CONFIG.baseURL;
