import { useCallback } from 'react';
import { toast } from 'sonner';
import { CHECKOUT_ERRORS, PAYMENT_PROCESSING_STATUS } from '../constants/checkout.constants';
import { CustomerData, CardData } from '../types/checkout.types';
import { Plan } from '@/services/paymentService';

export const usePaymentProcessor = (
  generatePixPayment: Function,
  setPaymentStatus: Function,
  setGlobalLoading: Function
) => {
  const handlePayment = useCallback(async (
    selectedPlan: Plan | null,
    paymentMethod: 'pix' | 'credit_card',
    customerData: CustomerData,
    cardData: CardData
  ) => {
    if (!selectedPlan) {
      toast.error(CHECKOUT_ERRORS.NO_PLAN_SELECTED);
      return;
    }
    
    setGlobalLoading(true);
    setPaymentStatus(PAYMENT_PROCESSING_STATUS.GENERATING);
    
    try {
      await generatePixPayment(paymentMethod, customerData, cardData);
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      
      if (error.message?.includes('timeout')) {
        toast.error(CHECKOUT_ERRORS.PAYMENT_TIMEOUT);
        setPaymentStatus(PAYMENT_PROCESSING_STATUS.TIMEOUT);
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error(CHECKOUT_ERRORS.CONNECTION_ERROR);
        setPaymentStatus(PAYMENT_PROCESSING_STATUS.CONNECTION_ERROR);
      } else if (error.message?.includes('provider')) {
        toast.error(CHECKOUT_ERRORS.PROVIDER_OFFLINE);
        setPaymentStatus(PAYMENT_PROCESSING_STATUS.PROVIDER_OFFLINE);
      } else if (error.message?.includes('rate limit')) {
        toast.error(CHECKOUT_ERRORS.RATE_LIMIT);
        setPaymentStatus(PAYMENT_PROCESSING_STATUS.RATE_LIMIT);
      } else {
        toast.error(CHECKOUT_ERRORS.GENERIC_ERROR);
        setPaymentStatus(PAYMENT_PROCESSING_STATUS.ERROR);
      }
      
    } finally {
      setGlobalLoading(false);
    }
  }, [generatePixPayment, setPaymentStatus, setGlobalLoading]);

  return {
    handlePayment
  };
};
