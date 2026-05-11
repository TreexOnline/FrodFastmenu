import { useCallback } from 'react';
import { toast } from 'sonner';
import { CHECKOUT_ERRORS } from '../constants/checkout.constants';
import { validateEmail } from '../utils/format';
import { validateCardNumber, validateCVV, validateExpiryDate } from '../utils/validators';
import { CustomerData, CardData } from '../types/checkout.types';
import { Plan } from '@/services/paymentService';

export const useCheckoutValidation = () => {
  const validateForm = useCallback((
    selectedPlan: Plan | null,
    paymentMethod: 'pix' | 'credit_card',
    customerData: CustomerData,
    cardData: CardData
  ): boolean => {
    if (!selectedPlan) {
      toast.error(CHECKOUT_ERRORS.NO_PLAN_SELECTED);
      return false;
    }
    
    if (paymentMethod === 'credit_card') {
      if (!customerData.name || customerData.name.length < 3) {
        toast.error(CHECKOUT_ERRORS.INVALID_NAME);
        return false;
      }
      
      if (!customerData.document || customerData.document.length < 11) {
        toast.error(CHECKOUT_ERRORS.INVALID_DOCUMENT);
        return false;
      }
      
      if (!validateEmail(customerData.email)) {
        toast.error(CHECKOUT_ERRORS.INVALID_EMAIL);
        return false;
      }
      
      if (!validateCardNumber(cardData.number)) {
        toast.error(CHECKOUT_ERRORS.INVALID_CARD_NUMBER);
        return false;
      }
      
      if (!validateCVV(cardData.cvv)) {
        toast.error(CHECKOUT_ERRORS.INVALID_CVV);
        return false;
      }
      
      if (!validateExpiryDate(cardData.month, cardData.year)) {
        toast.error(CHECKOUT_ERRORS.INVALID_EXPIRY_DATE);
        return false;
      }
    }
    
    return true;
  }, []);

  return {
    validateForm
  };
};
