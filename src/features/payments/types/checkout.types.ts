export interface CustomerData {
  name: string;
  document: string;
  email: string;
  phone: string;
}

export interface CardData {
  number: string;
  cvv: string;
  month: string;
  year: string;
  firstName: string;
  lastName: string;
}

export interface CheckoutState {
  selectedPlan: Plan | null;
  paymentMethod: 'pix' | 'credit_card';
  loading: boolean;
  globalLoading: boolean;
  customerData: CustomerData;
  cardData: CardData;
}

export interface CheckoutFormErrors {
  name?: string;
  document?: string;
  email?: string;
  cardNumber?: string;
  cvv?: string;
  expiryDate?: string;
}

export interface PaymentProcessingResult {
  success: boolean;
  error?: string;
  errorType?: string;
}

export interface CheckoutPersistence {
  selectedPlan: string;
  paymentMethod?: 'pix' | 'credit_card';
  currentStep: 'plan_selection' | 'payment_method' | 'payment_form';
}

import { Plan } from '@/services/paymentService';
