export const CHECKOUT_ERRORS = {
  NO_PLAN_SELECTED: 'Selecione um plano',
  INVALID_NAME: 'Nome completo é obrigatório',
  INVALID_DOCUMENT: 'CPF/CNPJ inválido',
  INVALID_EMAIL: 'Email inválido',
  INVALID_CARD_NUMBER: 'Número do cartão inválido',
  INVALID_CVV: 'CVV inválido',
  INVALID_EXPIRY_DATE: 'Data de validade inválida',
  PAYMENT_TIMEOUT: 'Tempo de resposta excedido. Tente novamente.',
  CONNECTION_ERROR: 'Erro de conexão. Verifique sua internet.',
  PROVIDER_OFFLINE: 'Provedor de pagamento indisponível. Tente novamente em alguns minutos.',
  RATE_LIMIT: 'Muitas tentativas. Aguarde alguns minutos.',
  GENERIC_ERROR: 'Erro ao processar pagamento. Tente novamente.'
} as const;

export const CHECKOUT_STEPS = {
  PLAN_SELECTION: 'plan_selection',
  PAYMENT_METHOD: 'payment_method',
  PAYMENT_FORM: 'payment_form'
} as const;

export const PAYMENT_PROCESSING_STATUS = {
  GENERATING: 'gerando',
  TIMEOUT: 'timeout',
  CONNECTION_ERROR: 'erro_conexao',
  PROVIDER_OFFLINE: 'provider_offline',
  RATE_LIMIT: 'rate_limit',
  ERROR: 'erro'
} as const;

export const CHECKOUT_MESSAGES = {
  GENERATING_PIX: 'Gerando PIX...',
  PROCESSING_PAYMENT: 'Processando pagamento...',
  PAYMENT_RECOVERED: 'Recuperamos seu pagamento pendente',
  EXPIRES_IN: 'Expira em:',
  GENERATE_NEW_PIX: 'Gerar Novo PIX'
} as const;

export const SUPPORT_WHATSAPP = {
  PHONE: '5518991913165',
  MESSAGE: 'Olá! Estou com dúvidas no checkout do FrodFast.',
  URL: 'https://wa.me/5518991913165?text=Ol%C3%A1!%20Estou%20com%20d%C3%BAvidas%20no%20checkout%20do%20FrodFast.'
} as const;
