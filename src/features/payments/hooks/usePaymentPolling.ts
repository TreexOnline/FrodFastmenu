import { useEffect, useRef, useCallback } from 'react';
import { paymentService, PaymentResponse } from '@/services/paymentService';
import { CheckoutPersistence } from '@/services/paymentService';
import { toast } from 'sonner';

interface UsePaymentPollingProps {
  payment: PaymentResponse | null;
  paymentStatus: string;
  onStatusChange: (status: string) => void;
  onConfirmed?: () => void;
  onExpired?: () => void;
  onFailed?: () => void;
}

export const usePaymentPolling = ({
  payment,
  paymentStatus,
  onStatusChange,
  onConfirmed,
  onExpired,
  onFailed
}: UsePaymentPollingProps) => {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!payment?.id || paymentStatus === 'confirmado' || paymentStatus === 'expirado') {
      return;
    }

    const startPolling = () => {
      cleanupPolling();
      
      const interval = setInterval(async () => {
        try {
          const status = await paymentService.getPaymentStatus(payment.id);
          
          if (status.status === 'paid') {
            onStatusChange('confirmado');
            CheckoutPersistence.clear();
            cleanupPolling();
            toast.success('Pagamento confirmado!');
            onConfirmed?.();
            
          } else if (status.status === 'expired') {
            onStatusChange('expirado');
            CheckoutPersistence.save({ generatedPix: undefined });
            cleanupPolling();
            onExpired?.();
            
          } else if (status.status === 'failed') {
            onStatusChange('erro');
            cleanupPolling();
            toast.error('Falha no pagamento. Tente novamente.');
            onFailed?.();
            
          } else {
            onStatusChange(status.status || 'pending');
          }
          
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5000);
      
      pollingIntervalRef.current = interval;
    };

    const timeout = setTimeout(startPolling, 2000);
    
    return () => {
      clearTimeout(timeout);
      cleanupPolling();
    };
  }, [payment?.id, paymentStatus, onStatusChange, onConfirmed, onExpired, onFailed, cleanupPolling]);

  return {
    cleanupPolling
  };
};
