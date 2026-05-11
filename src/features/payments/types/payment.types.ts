export interface PaymentRequest {
  planId: string;
  description: string;
  customerData?: {
    name: string;
    document: string;
    email: string;
    phone: string;
  };
  cardData?: {
    number: string;
    cvv: string;
    month: string;
    year: string;
    firstName: string;
    lastName: string;
  };
  installments?: number;
  metadata?: Record<string, any>;
  idempotencyKey: string;
  signal?: AbortSignal;
}

export interface PaymentResponse {
  id: string;
  pix_code?: string;
  qr_code?: string;
  amount: number;
  status: string;
  expires_at?: string;
  created_at: string;
  payment_method: 'pix' | 'credit_card';
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  badge?: string;
  popular?: boolean;
}

export interface CheckoutState {
  selectedPlan?: string;
  paymentMethod?: 'pix' | 'credit_card';
  currentStep?: string;
  generatedPix?: PaymentResponse;
  timestamp?: number;
}

export type PaymentStatus = 'pending' | 'gerando' | 'confirmado' | 'expirado' | 'erro' | 'cancelado' | 'timeout' | 'erro_conexao' | 'provider_offline' | 'rate_limit';

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
