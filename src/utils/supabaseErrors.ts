import { AuthError } from "@supabase/supabase-js";

export interface ErrorMapping {
  userMessage: string;
  developerMessage?: string;
  action?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Mapeamento completo de erros do Supabase Auth
const supabaseErrorMap: Record<string, ErrorMapping> = {
  // Erros de cadastro (SignUp)
  'user_already_exists': {
    userMessage: 'Este e-mail já está cadastrado. Faça login para continuar.',
    developerMessage: 'User already exists in auth.users',
    action: 'login',
    severity: 'medium'
  },
  'duplicate_email': {
    userMessage: 'Este e-mail já está cadastrado. Faça login para continuar.',
    developerMessage: 'Duplicate email address',
    action: 'login',
    severity: 'medium'
  },
  'email_address_invalid': {
    userMessage: 'O formato do e-mail é inválido. Verifique e tente novamente.',
    developerMessage: 'Invalid email address format',
    action: 'fix_email',
    severity: 'medium'
  },
  'password_too_short': {
    userMessage: 'A senha deve ter pelo menos 6 caracteres.',
    developerMessage: 'Password below minimum length',
    action: 'fix_password',
    severity: 'medium'
  },
  'weak_password': {
    userMessage: 'A senha é muito fraca. Use letras, números e caracteres especiais.',
    developerMessage: 'Password does not meet security requirements',
    action: 'fix_password',
    severity: 'medium'
  },

  // Erros de login (SignIn)
  'invalid_credentials': {
    userMessage: 'E-mail ou senha incorretos. Verifique seus dados.',
    developerMessage: 'Invalid login credentials',
    action: 'fix_credentials',
    severity: 'medium'
  },
  'invalid_login_credentials': {
    userMessage: 'E-mail ou senha incorretos. Verifique seus dados.',
    developerMessage: 'Invalid login credentials',
    action: 'fix_credentials',
    severity: 'medium'
  },
  'email_not_confirmed': {
    userMessage: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
    developerMessage: 'Email confirmation required',
    action: 'resend_confirmation',
    severity: 'high'
  },
  'email_not_verified': {
    userMessage: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
    developerMessage: 'Email verification required',
    action: 'resend_confirmation',
    severity: 'high'
  },

  // Erros de sessão
  'session_not_found': {
    userMessage: 'Sua sessão expirou. Faça login novamente.',
    developerMessage: 'Session not found or expired',
    action: 'relogin',
    severity: 'medium'
  },
  'session_expired': {
    userMessage: 'Sua sessão expirou. Faça login novamente.',
    developerMessage: 'Session has expired',
    action: 'relogin',
    severity: 'medium'
  },

  // Erros de rate limit
  'too_many_requests': {
    userMessage: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    developerMessage: 'Rate limit exceeded',
    action: 'wait',
    severity: 'high'
  },
  'rate_limit_exceeded': {
    userMessage: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    developerMessage: 'Rate limit exceeded',
    action: 'wait',
    severity: 'high'
  },

  // Erros de rede e conexão
  'network_error': {
    userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
    developerMessage: 'Network connectivity issue',
    action: 'check_network',
    severity: 'medium'
  },
  'timeout': {
    userMessage: 'A operação demorou muito. Tente novamente.',
    developerMessage: 'Request timeout',
    action: 'retry',
    severity: 'medium'
  },

  // Erros de permissão (RLS)
  'insufficient_permissions': {
    userMessage: 'Você não tem permissão para realizar esta operação.',
    developerMessage: 'Row Level Security (RLS) policy violation',
    action: 'contact_admin',
    severity: 'high'
  },
  'permission_denied': {
    userMessage: 'Você não tem permissão para realizar esta operação.',
    developerMessage: 'Permission denied',
    action: 'contact_admin',
    severity: 'high'
  },

  // Erros gerais
  'internal_server_error': {
    userMessage: 'Ocorreu um erro interno. Tente novamente em alguns instantes.',
    developerMessage: 'Internal server error',
    action: 'retry',
    severity: 'critical'
  },
  'service_unavailable': {
    userMessage: 'Serviço indisponível no momento. Tente novamente mais tarde.',
    developerMessage: 'Service temporarily unavailable',
    action: 'retry_later',
    severity: 'critical'
  },

  // Erros de redefinição de senha
  'reset_password_token_expired': {
    userMessage: 'O link de redefinição expirou. Solicite uma nova redefinição.',
    developerMessage: 'Password reset token expired',
    action: 'request_new',
    severity: 'medium'
  },
  'reset_password_token_invalid': {
    userMessage: 'Link de redefinição inválido. Solicite uma nova redefinição.',
    developerMessage: 'Invalid password reset token',
    action: 'request_new',
    severity: 'medium'
  }
};

// Mapeamento por código HTTP
const httpErrorMap: Record<number, ErrorMapping> = {
  400: {
    userMessage: 'Dados inválidos. Verifique as informações e tente novamente.',
    developerMessage: 'Bad Request - Invalid data format',
    action: 'fix_data',
    severity: 'medium'
  },
  401: {
    userMessage: 'Não autorizado. Faça login para continuar.',
    developerMessage: 'Unauthorized - Authentication required',
    action: 'login',
    severity: 'medium'
  },
  403: {
    userMessage: 'Acesso negado. Você não tem permissão para esta operação.',
    developerMessage: 'Forbidden - Insufficient permissions',
    action: 'contact_admin',
    severity: 'high'
  },
  429: {
    userMessage: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    developerMessage: 'Too Many Requests - Rate limit exceeded',
    action: 'wait',
    severity: 'high'
  },
  500: {
    userMessage: 'Erro interno do servidor. Tente novamente em alguns instantes.',
    developerMessage: 'Internal Server Error',
    action: 'retry',
    severity: 'critical'
  },
  502: {
    userMessage: 'Serviço temporariamente indisponível. Tente novamente.',
    developerMessage: 'Bad Gateway - Service unavailable',
    action: 'retry',
    severity: 'critical'
  },
  503: {
    userMessage: 'Serviço indisponível no momento. Tente novamente mais tarde.',
    developerMessage: 'Service Unavailable',
    action: 'retry_later',
    severity: 'critical'
  }
};

/**
 * Função principal para mapear erros do Supabase
 */
export function mapSupabaseError(error: any): ErrorMapping {
  // Log detalhado para debug
  console.group('🔍 [SUPABASE ERROR ANALYSIS]');
  console.error('Original Error:', error);
  
  // Extrair informações do erro
  const errorCode = error?.code || error?.error_code || error?.message?.split(':')[0]?.trim();
  const httpStatus = error?.status;
  const errorMessage = error?.message || error?.error_description || 'Unknown error';
  
  console.log('Error Code:', errorCode);
  console.log('HTTP Status:', httpStatus);
  console.log('Error Message:', errorMessage);
  
  let errorMapping: ErrorMapping;
  
  // Tentar mapear por código de erro específico do Supabase
  if (errorCode && supabaseErrorMap[errorCode]) {
    errorMapping = supabaseErrorMap[errorCode];
    console.log('✅ Mapped by Supabase code:', errorCode);
  }
  // Tentar mapear por código HTTP
  else if (httpStatus && httpErrorMap[httpStatus]) {
    errorMapping = httpErrorMap[httpStatus];
    console.log('✅ Mapped by HTTP status:', httpStatus);
  }
  // Tentar mapear por mensagem de erro (fallback)
  else if (errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();
    const foundEntry = Object.entries(supabaseErrorMap).find(([code, mapping]) => 
      lowerMessage.includes(code.toLowerCase()) || 
      lowerMessage.includes(mapping.developerMessage?.toLowerCase() || '')
    );
    
    if (foundEntry) {
      errorMapping = foundEntry[1];
      console.log('✅ Mapped by message pattern:', foundEntry[0]);
    } else {
      // Erro genérico
      errorMapping = {
        userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
        developerMessage: errorMessage,
        action: 'retry',
        severity: 'medium'
      };
      console.log('⚠️ Using generic error mapping');
    }
  } else {
    // Erro completamente desconhecido
    errorMapping = {
      userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
      developerMessage: 'Unknown error structure',
      action: 'retry',
      severity: 'medium'
    };
    console.log('❌ Unknown error - using fallback');
  }
  
  console.log('📋 Final Mapping:', errorMapping);
  console.groupEnd();
  
  return errorMapping;
}

/**
 * Função para log estruturado de erros de autenticação
 */
export function logAuthError(context: string, error: any, additionalData?: any) {
  const timestamp = new Date().toISOString();
  const errorMapping = mapSupabaseError(error);
  
  console.group(`🚨 [AUTH ERROR] ${context} - ${timestamp}`);
  console.error('Error Details:', error);
  console.log('Context:', context);
  console.log('Mapped Error:', errorMapping);
  console.log('Severity:', errorMapping.severity);
  console.log('Suggested Action:', errorMapping.action);
  
  if (additionalData) {
    console.log('Additional Data:', additionalData);
  }
  
  // Log específico para ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development Info:');
    console.log('- Error Code:', error?.code);
    console.log('- HTTP Status:', error?.status);
    console.log('- Full Message:', error?.message);
    console.log('- Stack Trace:', error?.stack);
  }
  
  console.groupEnd();
  
  // Em produção, poderia enviar para serviço de logging
  if (process.env.NODE_ENV === 'production' && errorMapping.severity === 'critical') {
    // TODO: Implementar envio para Sentry, LogRocket, etc.
    console.warn('🚨 Critical error detected - should be sent to logging service');
  }
}

/**
 * Função para verificar se o erro é recuperável
 */
export function isRecoverableError(error: any): boolean {
  const mapping = mapSupabaseError(error);
  const recoverableActions = ['retry', 'fix_email', 'fix_password', 'fix_credentials', 'check_network'];
  return recoverableActions.includes(mapping.action || '');
}

/**
 * Função para obter tempo de espera sugerido para rate limit
 */
export function getSuggestedWaitTime(error: any): number {
  const mapping = mapSupabaseError(error);
  if (mapping.action === 'wait') {
    // Para rate limit, sugerir espera progressiva
    return 60000; // 1 minuto
  }
  return 0;
}
