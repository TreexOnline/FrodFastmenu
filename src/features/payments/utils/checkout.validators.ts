import { validateEmail as validateEmailFormat } from './format';
import { validateCardNumber, validateCVV, validateExpiryDate } from './validators';
import { CHECKOUT_ERRORS } from '../constants/checkout.constants';
import { CustomerData, CardData } from '../types/checkout.types';
import { Plan } from '@/services/paymentService';

export const validateCheckoutForm = (
  selectedPlan: Plan | null,
  paymentMethod: 'pix' | 'credit_card',
  customerData: CustomerData,
  cardData: CardData
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!selectedPlan) {
    errors.push(CHECKOUT_ERRORS.NO_PLAN_SELECTED);
  }
  
  if (paymentMethod === 'credit_card') {
    if (!customerData.name || customerData.name.length < 3) {
      errors.push(CHECKOUT_ERRORS.INVALID_NAME);
    }
    
    if (!customerData.document || customerData.document.length < 11) {
      errors.push(CHECKOUT_ERRORS.INVALID_DOCUMENT);
    }
    
    if (!validateEmailFormat(customerData.email)) {
      errors.push(CHECKOUT_ERRORS.INVALID_EMAIL);
    }
    
    if (!validateCardNumber(cardData.number)) {
      errors.push(CHECKOUT_ERRORS.INVALID_CARD_NUMBER);
    }
    
    if (!validateCVV(cardData.cvv)) {
      errors.push(CHECKOUT_ERRORS.INVALID_CVV);
    }
    
    if (!validateExpiryDate(cardData.month, cardData.year)) {
      errors.push(CHECKOUT_ERRORS.INVALID_EXPIRY_DATE);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getPaymentErrorMessage = (error: any): string => {
  if (error.message?.includes('timeout')) {
    return CHECKOUT_ERRORS.PAYMENT_TIMEOUT;
  } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return CHECKOUT_ERRORS.CONNECTION_ERROR;
  } else if (error.message?.includes('provider')) {
    return CHECKOUT_ERRORS.PROVIDER_OFFLINE;
  } else if (error.message?.includes('rate limit')) {
    return CHECKOUT_ERRORS.RATE_LIMIT;
  } else {
    return CHECKOUT_ERRORS.GENERIC_ERROR;
  }
};

export const getPaymentErrorType = (error: any): string => {
  if (error.message?.includes('timeout')) {
    return 'timeout';
  } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'erro_conexao';
  } else if (error.message?.includes('provider')) {
    return 'provider_offline';
  } else if (error.message?.includes('rate limit')) {
    return 'rate_limit';
  } else {
    return 'erro';
  }
};
