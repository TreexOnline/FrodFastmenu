import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_API_CONFIG } from "@/config/whatsappApi";

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phone: string | null;
  profileName: string | null;
  qr: string | null;
}

export function useWhatsAppWebSocket() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  const qrPollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Debouncing refs para evitar race conditions
  const lastQRCallRef = useRef<number>(0);
  const qrDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timestamps para controle de expiração
  const qrTimestampRef = useRef<number>(0);
  const QR_EXPIRY_TIME = 60000; // 60 segundos para QR expirar

  // Função para fazer requisição à API com timeout
  const apiRequest = async (url: string, options?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WHATSAPP_API_CONFIG.polling.timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...WHATSAPP_API_CONFIG.headers,
          ...options?.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Obter status atual do WhatsApp
  const refreshStatus = async () => {
    if (!user) return;
    
    try {
      const response = await apiRequest(WHATSAPP_API_CONFIG.endpoints.status(user.id));
      
      if (response.success && response.data) {
        const data: WhatsAppStatus = response.data;
        
        setConnected(data.connected);
        setStatus(data.status);
        setPhone(data.phone);
        setProfileName(data.profileName);
        setQrCode(data.qr);
        
        console.log('📱 WhatsApp status updated:', {
          connected: data.connected,
          status: data.status,
          phone: data.phone
        });
      }
    } catch (error) {
      console.error('❌ Error fetching WhatsApp status:', error);
    }
  };

  // Obter QR code atual
  const refreshQR = async () => {
    if (!user) return;
    
    // Debouncing - evitar múltiplas chamadas simultâneas
    const now = Date.now();
    if (now - lastQRCallRef.current < 1000) { // 1 segundo de debounce
      console.log('🔄 QR request debounced');
      return;
    }
    lastQRCallRef.current = now;
    
    // Limpar debounce anterior
    if (qrDebounceRef.current) {
      clearTimeout(qrDebounceRef.current);
    }
    
    // Debounce de 500ms para evitar race conditions
    qrDebounceRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Fetching QR code for user:', user.id);
        const response = await apiRequest(WHATSAPP_API_CONFIG.endpoints.qr(user.id));
        
        if (response.success && response.data) {
          const now = Date.now();
          
          // Verificar se QR expirou (mais de 60 segundos)
          if (qrTimestampRef.current && (now - qrTimestampRef.current > QR_EXPIRY_TIME)) {
            console.log('⏰ QR Code expired, forcing refresh');
            qrTimestampRef.current = now;
            setQrCode(response.data.qr);
            console.log('✅ QR Code refreshed (expired)');
            return;
          }
          
          // Verificar se QR é diferente do atual (evitar atualizações desnecessárias)
          if (response.data.qr !== qrCode) {
            setQrCode(response.data.qr);
            qrTimestampRef.current = now; // Atualizar timestamp
            console.log('✅ QR Code updated successfully');
          } else {
            console.log('🔄 QR Code unchanged, skipping update');
          }
        }
      } catch (error) {
        console.error('❌ Error fetching QR code:', error);
      }
    }, 500);
  };

  // Iniciar conexão WhatsApp
  const connectWhatsApp = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('🚀 Starting WhatsApp connection for user:', user.id);
      console.log('👤 User object:', user);
      console.log('🆔 User ID:', user?.id);
      console.log('🔗 Endpoint URL:', WHATSAPP_API_CONFIG.endpoints.connect(user?.id));
      console.log('🌐 Base URL:', WHATSAPP_API_CONFIG.baseURL);
      
      // 🔍 VERIFICAR ESTADO ATUAL PRIMEIRO
      console.log('🔍 Checking current WhatsApp status...');
      const currentStatus = await apiRequest(WHATSAPP_API_CONFIG.endpoints.status(user.id));
      
      if (currentStatus.success && currentStatus.data) {
        const { connected, status, qr } = currentStatus.data;
        
        // 🟢 JÁ ESTÁ CONECTADO
        if (connected && status === 'connected') {
          console.log('🟢 WhatsApp already connected - no action needed');
          setConnected(true);
          setStatus('connected');
          setPhone(currentStatus.data.phone);
          setProfileName(currentStatus.data.profileName);
          setQrCode(null);
          return;
        }
        
        // 🟡 JÁ TEM QR VÁLIDO
        if ((status === 'qr' || status === 'connecting') && qr) {
          console.log('🟡 Reusing existing QR code');
          setConnected(false);
          setStatus(status);
          setQrCode(qr);
          return;
        }
        
        // 🟡 ESTÁ CONECTANDO MAS SEM QR
        if (status === 'connecting' && !qr) {
          console.log('🟡 Connection in progress, requesting new QR...');
          const qrResponse = await apiRequest(WHATSAPP_API_CONFIG.endpoints.qr(user.id));
          if (qrResponse.success && qrResponse.data?.qr) {
            setQrCode(qrResponse.data.qr);
            setStatus('qr');
            return;
          }
        }
      }
      
      // 🔴 NÃO EXISTE OU ESTÁ DESCONECTADO - CONECTAR NORMALMENTE
      console.log('🔴 No valid session found - starting new connection');
      const response = await apiRequest(WHATSAPP_API_CONFIG.endpoints.connect(user.id), {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      if (response.success) {
        console.log('✅ WhatsApp connection started');
        setStatus('connecting');
        
        // Iniciar polling imediato
        await refreshStatus();
        await refreshQR();
      } else {
        throw new Error(response.error || 'Failed to start connection');
      }
    } catch (error) {
      console.error('❌ Error connecting WhatsApp:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Desconectar WhatsApp
  const disconnectWhatsApp = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('🔌 Disconnecting WhatsApp for user:', user.id);
      
      const response = await apiRequest(WHATSAPP_API_CONFIG.endpoints.disconnect(user.id), {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      if (response.success) {
        console.log('✅ WhatsApp disconnected');
        setConnected(false);
        setStatus('disconnected');
        setPhone(null);
        setProfileName(null);
        setQrCode(null);
      } else {
        throw new Error(response.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('❌ Error disconnecting WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configurar polling de status
  const setupStatusPolling = () => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
    }
    
    // Intervalo dinâmico baseado no status
    const interval = (status === 'connected') ? 10000 : WHATSAPP_API_CONFIG.polling.statusInterval;
    
    statusPollingRef.current = setInterval(() => {
      refreshStatus();
    }, interval);
  };

  // Configurar polling de QR (apenas quando necessário)
  const setupQRPolling = () => {
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
    }
    
    // Parar QR polling quando já está conectado
    if (status === 'connected') {
      console.log('🛑 QR polling stopped - WhatsApp already connected');
      return;
    }
    
    // Polling de QR apenas quando status é 'qr' ou 'connecting'
    if (status === 'qr' || status === 'connecting') {
      qrPollingRef.current = setInterval(() => {
        refreshQR();
      }, WHATSAPP_API_CONFIG.polling.qrInterval);
    }
  };

  // Limpar todos os polling
  const clearPolling = () => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
    
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Efeito para configurar polling baseado no status
  useEffect(() => {
    if (!user) return;
    
    setupStatusPolling();
    setupQRPolling();
    
    return () => {
      clearPolling();
    };
  }, [status, user]);

  // Efeito para carregar status inicial quando usuário estiver disponível
  useEffect(() => {
    if (user) {
      refreshStatus();
    } else {
      // Resetar estado quando não há usuário
      setConnected(false);
      setStatus('disconnected');
      setPhone(null);
      setProfileName(null);
      setQrCode(null);
      setLoading(false);
      clearPolling();
    }
  }, [user]);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  return {
    connected,
    status,
    qrCode,
    phone,
    profileName,
    loading,
    connectWhatsApp,
    disconnectWhatsApp,
    refreshStatus
  };
}

// Configurações de polling
const polling = {
  statusInterval: 30000,  // 30 segundos
  qrInterval: 10000,       // 10 segundos
  maxRetries: 3,
  timeoutMs: 30000       // 30 segundos timeout
};
