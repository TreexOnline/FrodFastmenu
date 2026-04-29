import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWhatsAppWebSocket() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = async () => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Obter token JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Criar URL WebSocket com autenticação
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/functions/v1/whatsapp-websocket/connect?store_id=${user.id}`;
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WhatsApp WebSocket connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Enviar token de autenticação
        socket.send(JSON.stringify({
          type: 'auth',
          token: session.access_token
        }));
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'status':
              setStatus(message.data);
              setQrCode(message.data.qr);
              break;
            case 'qr_update':
              setQrCode(message.data.qr);
              break;
            case 'connection_update':
              setStatus(message.data);
              break;
            case 'pong':
              // Keep-alive response
              break;
            default:
              console.log('Unknown WebSocket message:', message);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WhatsApp WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        socketRef.current = null;

        // Tentar reconectar automaticamente
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect WebSocket (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'User disconnected');
      socketRef.current = null;
    }
    
    setConnected(false);
    setStatus(null);
    setQrCode(null);
    reconnectAttemptsRef.current = 0;
  };

  const sendPing = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  // Keep-alive ping every 30 segundos
  useEffect(() => {
    const pingInterval = setInterval(() => {
      sendPing();
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  // Conectar quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user]);

  // Limpar reconexão ao desmontar
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connected,
    status,
    qrCode,
    connect,
    disconnect,
    sendPing
  };
}
