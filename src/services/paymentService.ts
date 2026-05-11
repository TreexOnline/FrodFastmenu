import { supabase } from '@/integrations/supabase/client';

// Configuração da API TreexPay via proxy seguro
const TREEXPAY_API_URL = 'https://kfujkvihymclesabqmsz.supabase.co/functions/v1/treexpay-proxy';

// Interface para persistência do checkout
interface CheckoutState {
  selectedPlan?: string;
  paymentMethod?: 'pix' | 'credit_card';
  currentStep?: string;
  generatedPix?: {
    payment_id?: string;
    pix_code?: string;
    qr_code?: string;
    amount?: number;
    plan_id?: string;
    status?: string;
    expires_at?: string;
    created_at?: string;
  };
  timestamp?: string;
}

// Funções de persistência
const CheckoutPersistence = {
  // Salvar estado do checkout
  save(state: Partial<CheckoutState>) {
    try {
      const currentState = CheckoutPersistence.get();
      const updatedState = { ...currentState, ...state, timestamp: new Date().toISOString() };
      localStorage.setItem('frodfast_checkout', JSON.stringify(updatedState));
    } catch (error) {
      console.error('Erro ao salvar estado do checkout:', error);
    }
  },

  // Obter estado do checkout
  get(): CheckoutState {
    try {
      const stored = localStorage.getItem('frodfast_checkout');
      if (!stored) return {};
      
      const state = JSON.parse(stored);
      // Validar se o estado não está muito antigo (24 horas)
      if (state.timestamp) {
        const storedTime = new Date(state.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - storedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          CheckoutPersistence.clear();
          return {};
        }
      }
      
      return state;
    } catch (error) {
      console.error('Erro ao obter estado do checkout:', error);
      return {};
    }
  },

  // Limpar estado do checkout
  clear() {
    try {
      localStorage.removeItem('frodfast_checkout');
    } catch (error) {
      console.error('Erro ao limpar estado do checkout:', error);
    }
  },

  // Validar integridade do PIX
  validatePixIntegrity(pixData: CheckoutState['generatedPix']): boolean {
    if (!pixData || !pixData.payment_id) return false;
    
    // Validar tempo de expiração (removida validação de usuário para permitir persistência)
    if (pixData.expires_at) {
      const expiryTime = new Date(pixData.expires_at);
      const now = new Date();
      return now < expiryTime;
    }
    
    return false;
  },

  // Limpar PIX expirados automaticamente
  cleanupExpiredPix() {
    const state = CheckoutPersistence.get();
    if (state.generatedPix && !CheckoutPersistence.validatePixIntegrity(state.generatedPix)) {
      console.log('Limpando PIX expirado:', state.generatedPix.payment_id);
      CheckoutPersistence.save({ generatedPix: undefined });
    }
  }
};

// Exportar CheckoutPersistence para uso em outros módulos
export { CheckoutPersistence };

// Tipos para a API
export interface PaymentRequest {
  amount: number;
  paymentMethod?: 'pix' | 'credit_card';
  description?: string;
  customer_email?: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
  installments?: number;
  idempotency_key?: string;
  customer?: {
    name: string;
    document: string;
    email?: string;
    phone?: string;
    ip?: string;
  };
  card?: {
    number: string;
    cvv: string;
    month: string;
    year: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface PaymentResponse {
  id: string;
  external_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled' | 'expired';
  payment_method: 'pix' | 'credit_card';
  description?: string;
  pix_code?: string;
  qr_code?: string;
  expires_at?: string;
  provider: string;
  created_at: string;
  paid_at?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  duration: 'monthly' | 'trimester' | 'annual';
  features: string[];
  menuLimit: number;
  popular?: boolean;
}

// Planos disponíveis
export const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: 14800,
    duration: 'monthly',
    features: [
      'Até 2 cardápios',
      'Produtos ilimitados',
      'Categorias ilimitadas',
      'Adicionais ilimitados',
      'Suporte por email',
      'QR Code personalizado'
    ],
    menuLimit: 2
  },
  {
    id: 'combo',
    name: 'Plano Combo',
    price: 38000,
    duration: 'trimester',
    features: [
      'Até 5 cardápios',
      'Tudo do Mensal',
      'Suporte prioritário',
      'Sem renovação automática'
    ],
    menuLimit: 5,
    popular: true
  },
  {
    id: 'annual',
    name: 'Plano Anual',
    price: 114800,
    duration: 'annual',
    features: [
      'Até 5 cardápios',
      'Tudo do Combo',
      'Atendimento dedicado',
      'Acesso antecipado a novidades'
    ],
    menuLimit: 5
  }
];

class PaymentService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint
      ? `${TREEXPAY_API_URL}/${endpoint}`
      : TREEXPAY_API_URL;
    
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 segundo
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            ...options.headers,
          },
        });

        if (response.ok) {
          return response.json();
        }

        // Parse error for retry logic
        const error = await response.json().catch(() => ({}));
        lastError = error;

        // Retry only for specific errors
        const shouldRetry = 
          response.status === 408 || // Timeout
          response.status === 429 || // Rate limit
          response.status === 500 || // Internal server error
          response.status === 502 || // Bad gateway
          response.status === 503;   // Service unavailable

        if (!shouldRetry || attempt === MAX_RETRIES) {
          throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        lastError = error;
        
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        
        // Wait before retry
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  /**
   * Criar pagamento PIX
   */
  async createPixPayment(
    planId: string,
    description: string,
    customerEmail: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    // Buscar preço do plano
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    return this.makeRequest<PaymentResponse>('payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: plan.price / 100, // Converter centavos para reais
        paymentMethod: 'pix',
        description,
        customer_email: customerEmail,
        webhook_url: 'https://kfujkvihymclesabqmsz.supabase.co/functions/v1/payment-webhook',
        metadata: {
          ...metadata,
          source: 'frodfast_web',
          timestamp: new Date().toISOString()
        },
        idempotency_key: idempotencyKey
      }),
    });
  }

  /**
   * Criar pagamento com cartão de crédito
   */
  async createCreditCardPayment(
    planId: string,
    description: string,
    customer: {
      name: string;
      document: string;
      email?: string;
      phone?: string;
    },
    card: {
      number: string;
      cvv: string;
      month: string;
      year: string;
      firstName?: string;
      lastName?: string;
    },
    installments: number,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    // Buscar preço do plano
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    return this.makeRequest<PaymentResponse>('payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: plan.price / 100, // Converter centavos para reais
        paymentMethod: 'credit_card',
        description,
        installments,
        customer: {
          ...customer,
        },
        card: {
          ...card,
          firstName: card.firstName || customer.name?.split(' ')[0],
          lastName: card.lastName || customer.name?.split(' ').slice(1).join(' ')
        },
        webhook_url: 'https://kfujkvihymclesabqmsz.supabase.co/functions/v1/payment-webhook',
        metadata: {
          ...metadata,
          source: 'frodfast_web',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        idempotency_key: idempotencyKey
      }),
    });
  }

  /**
   * Consultar status do pagamento
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    return this.makeRequest<PaymentResponse>(`payments/${paymentId}`);
  }

  /**
   * Listar pagamentos
   */
  async listPayments(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaymentResponse[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(status && { status })
    });
    
    return this.makeRequest<PaymentResponse[]>(`payments?${params}`);
  }

  
  /**
   * Validar dados do cartão
   */
  validateCard(card: PaymentRequest['card']): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validação número do cartão
    const cardNumber = card.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      errors.push('Número do cartão inválido');
    }

    // Validação CVV
    if (!card.cvv || card.cvv.length < 3 || card.cvv.length > 4) {
      errors.push('CVV inválido');
    }

    // Validação mês
    const month = parseInt(card.month);
    if (!month || month < 1 || month > 12) {
      errors.push('Mês de validade inválido');
    }

    // Validação ano
    const year = parseInt(card.year);
    const currentYear = new Date().getFullYear();
    if (!year || year < currentYear || year > currentYear + 10) {
      errors.push('Ano de validade inválido');
    }

    // Validação data de expiração - usar último dia do mês
    if (month && year) {
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const expiryDate = new Date(year, month - 1, lastDayOfMonth, 23, 59, 59);
      const now = new Date();
      if (expiryDate < now) {
        errors.push('Cartão expirado');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validar CPF
   */
  validateCPF(cpf: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const cleanCPF = cpf.replace(/\D/g, '');

    if (!cleanCPF || cleanCPF.length !== 11) {
      errors.push('CPF deve ter 11 dígitos');
      return { isValid: false, errors };
    }

    // Verificar sequências inválidas
    const invalidSequences = [
      '00000000000', '11111111111', '22222222222', '33333333333',
      '44444444444', '55555555555', '66666666666', '77777777777',
      '88888888888', '99999999999'
    ];

    if (invalidSequences.includes(cleanCPF)) {
      errors.push('CPF inválido');
      return { isValid: false, errors };
    }

    // Cálculo de validação do CPF
    let sum = 0;
    let remainder = 0;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    remainder = remainder === 10 || remainder === 11 ? 0 : remainder;

    if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
      errors.push('CPF inválido');
      return { isValid: false, errors };
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    remainder = remainder === 10 || remainder === 11 ? 0 : remainder;

    if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
      errors.push('CPF inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Salvar pedido no banco local
   */
  async savePaymentOrder(
    userId: string,
    planId: string,
    paymentId: string,
    amount: number,
    status: string
  ) {
    // Validar resposta da API antes de salvar
    if (!paymentId) {
      console.error('Resposta inválida da API:', paymentId);
      throw new Error('API não retornou ID do pagamento');
    }

    const { data, error } = await supabase
      .from('payment_orders')
      .insert({
        user_id: userId,
        plan_id: planId,
        payment_id: paymentId,
        amount,
        status,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Erro ao salvar pedido:', error);
      throw error;
    }

    return data;
  }

  /**
   * Atualizar status do pedido
   */
  async updatePaymentOrder(paymentId: string, status: string) {
    const { data, error } = await supabase
      .from('payment_orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pedido:', error);
      throw error;
    }

    return data;
  }
}

export const paymentService = new PaymentService();
