import { supabase } from '@/integrations/supabase/client';

// Configuração da API TreexPay via proxy seguro
const TREEXPAY_PROXY_URL = 'https://fhwfonispezljglrclia.supabase.co/functions/v1/treexpay-proxy';

// Tipos para a API
export interface PaymentRequest {
  amount: number;
  paymentMethod?: 'pix' | 'credit_card';
  description?: string;
  customer_email?: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
  installments?: number;
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
  duration: 'monthly' | 'annual';
  features: string[];
  menuLimit: number;
  popular?: boolean;
}

// Planos disponíveis
export const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: 49.90,
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
    price: 89.90,
    duration: 'monthly',
    features: [
      'Até 5 cardápios',
      'Produtos ilimitados',
      'Categorias ilimitadas',
      'Adicionais ilimitados',
      'Suporte prioritário',
      'QR Code personalizado',
      'Relatórios avançados',
      'Exportação de dados'
    ],
    menuLimit: 5,
    popular: true
  },
  {
    id: 'annual',
    name: 'Plano Anual',
    price: 899.90,
    duration: 'annual',
    features: [
      'Até 5 cardápios',
      'Produtos ilimitados',
      'Categorias ilimitadas',
      'Adicionais ilimitados',
      'Suporte dedicado',
      'QR Code personalizado',
      'Relatórios avançados',
      'Exportação de dados',
      '12 meses pelo preço de 10',
      'API Access'
    ],
    menuLimit: 5
  }
];

class PaymentService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${TREEXPAY_PROXY_URL}/${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Criar pagamento PIX
   */
  async createPixPayment(
    amount: number,
    description: string,
    customerEmail: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResponse> {
    return this.makeRequest<PaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        paymentMethod: 'pix',
        description,
        customer_email: customerEmail,
        webhook_url: `${window.location.origin}/api/payment-webhook`,
        metadata: {
          ...metadata,
          source: 'frodfast_web',
          timestamp: new Date().toISOString()
        }
      }),
    });
  }

  /**
   * Criar pagamento com cartão de crédito
   */
  async createCreditCardPayment(
    amount: number,
    description: string,
    customer: PaymentRequest['customer'],
    card: PaymentRequest['card'],
    installments: number = 1,
    metadata?: Record<string, any>
  ): Promise<PaymentResponse> {
    return this.makeRequest<PaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        paymentMethod: 'credit_card',
        description,
        installments,
        customer: {
          ...customer,
          ip: this.getClientIP(), // Adiciona IP real para anti-fraude
        },
        card: {
          ...card,
          firstName: card.firstName || customer.name?.split(' ')[0],
          lastName: card.lastName || customer.name?.split(' ').slice(1).join(' ')
        },
        webhook_url: `${window.location.origin}/api/payment-webhook`,
        metadata: {
          ...metadata,
          source: 'frodfast_web',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }),
    });
  }

  /**
   * Consultar status do pagamento
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    return this.makeRequest<PaymentResponse>(`/payments/${paymentId}`);
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
    
    return this.makeRequest<PaymentResponse[]>(`/payments?${params}`);
  }

  /**
   * Obter IP real do cliente (anti-fraude)
   */
  private getClientIP(): string {
    // Em produção, isso viria do backend ou de um serviço de IP detection
    // Por enquanto, usa um placeholder
    return '0.0.0.0';
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

    // Validação data de expiração
    if (month && year) {
      const expiryDate = new Date(year, month - 1);
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
      .single();

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
      .eq('payment_id', paymentId)
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
