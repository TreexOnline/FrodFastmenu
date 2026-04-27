/**
 * Componente para configurar listener de pedidos em tempo real
 * Pode ser usado globalmente no App ou em páginas específicas
 */

import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { toast } from 'sonner';

interface RealtimeOrderListenerProps {
  enabled?: boolean;
  showToast?: boolean;
}

export function RealtimeOrderListener({ 
  enabled = true, 
  showToast = true 
}: RealtimeOrderListenerProps) {
  const { user } = useAuth();

  // Callback quando novo pedido chega
  const handleNewOrder = (order: any) => {
    console.log('🔔 [LISTENER] Callback executado para novo pedido:', order.id);

    // Mostrar toast se habilitado
    if (showToast) {
      toast.success(`🔔 Novo pedido de ${order.customer_name || 'cliente'}!`, {
        duration: 6000,
        description: `Pedido #${order.id.slice(0, 8).toUpperCase()}`
      });
    }
  };

  // Configurar listener
  const { reconnect, getConnectionStatus, isListening } = useRealtimeOrders({
    userId: user?.id,
    onNewOrder: handleNewOrder,
    enabled: enabled && !!user?.id
  });

  // Log de status (remover em produção se desejar)
  console.log('📡 [LISTENER] Status:', {
    userId: user?.id,
    enabled,
    isListening,
    connectionStatus: getConnectionStatus()
  });

  return null; // Componente invisível, apenas para configuração
}
