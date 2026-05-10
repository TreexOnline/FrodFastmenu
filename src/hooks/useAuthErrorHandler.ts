import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { mapSupabaseError, logAuthError, isRecoverableError, getSuggestedWaitTime } from '@/utils/supabaseErrors';

interface UseAuthErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  blockOnError?: boolean;
  retryOnError?: boolean;
}

interface AuthErrorState {
  hasError: boolean;
  error: any;
  errorMapping: any;
  isRetrying: boolean;
  retryCount: number;
  lastErrorTime: number;
}

export const useAuthErrorHandler = (options: UseAuthErrorHandlerOptions = {}) => {
  const {
    showToast = true,
    logToConsole = true,
    blockOnError = false,
    retryOnError = false
  } = options;

  const [errorState, setErrorState] = useState<AuthErrorState>({
    hasError: false,
    error: null,
    errorMapping: null,
    isRetrying: false,
    retryCount: 0,
    lastErrorTime: 0
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 segundo

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorMapping: null,
      isRetrying: false,
      retryCount: 0,
      lastErrorTime: 0
    });
  }, []);

  const handleError = useCallback(async (
    error: any,
    context: string,
    additionalData?: any
  ) => {
    // Log detalhado
    if (logToConsole) {
      logAuthError(context, error, additionalData);
    }

    // Mapear erro
    const errorMapping = mapSupabaseError(error);
    
    // Atualizar estado
    setErrorState(prev => ({
      ...prev,
      hasError: true,
      error,
      errorMapping,
      lastErrorTime: Date.now()
    }));

    // Mostrar toast para usuário
    if (showToast) {
      const message = errorMapping.userMessage;
      const description = errorMapping.severity === 'critical' 
        ? 'Erro crítico. Contate o suporte se persistir.' 
        : undefined;

      if (errorMapping.severity === 'critical') {
        toast.error(message, {
          description,
          duration: 8000,
          action: {
            label: 'Entendido',
            onClick: clearError
          }
        });
      } else if (errorMapping.severity === 'high') {
        toast.error(message, {
          description,
          duration: 6000,
          action: {
            label: errorMapping.action === 'resend_confirmation' ? 'Reenviar' : 'Entendido',
            onClick: () => {
              if (errorMapping.action === 'resend_confirmation') {
                // TODO: Implementar reenvio de confirmação
                console.log('TODO: Implementar reenvio de confirmação');
              }
              clearError();
            }
          }
        });
      } else {
        toast.error(message, {
          duration: 4000
        });
      }
    }

    // Tentar retry automático se configurado e erro for recuperável
    if (retryOnError && isRecoverableError(error) && errorState.retryCount < maxRetries) {
      const waitTime = getSuggestedWaitTime(error) || retryDelay * Math.pow(2, errorState.retryCount);
      
      console.log(`🔄 Auto-retry in ${waitTime}ms (attempt ${errorState.retryCount + 1}/${maxRetries})`);
      
      setErrorState(prev => ({
        ...prev,
        isRetrying: true,
        retryCount: prev.retryCount + 1
      }));

      retryTimeoutRef.current = setTimeout(() => {
        setErrorState(prev => ({
          ...prev,
          isRetrying: false
        }));
      }, waitTime);
    }

    return errorMapping;
  }, [showToast, logToConsole, retryOnError, errorState.retryCount, clearError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    additionalData?: any
  ): Promise<T | null> => {
    // Se está bloqueado por erro, não executar
    if (blockOnError && errorState.hasError) {
      console.warn('🚫 Operation blocked due to previous error');
      return null;
    }

    // Se está em retry, não executar múltiplas vezes
    if (errorState.isRetrying) {
      console.warn('🚫 Operation blocked - retry in progress');
      return null;
    }

    try {
      const result = await operation();
      
      // Se teve sucesso, limpar erro
      if (errorState.hasError) {
        clearError();
      }
      
      return result;
    } catch (error) {
      await handleError(error, context, additionalData);
      return null;
    }
  }, [blockOnError, errorState.hasError, errorState.isRetrying, handleError, clearError]);

  const resetRetryCount = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      retryCount: 0,
      isRetrying: false
    }));
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Auto cleanup on unmount
  useState(() => {
    return cleanup;
  });

  return {
    errorState,
    handleError,
    executeWithErrorHandling,
    clearError,
    resetRetryCount,
    cleanup,
    canRetry: errorState.retryCount < maxRetries && isRecoverableError(errorState.error),
    isBlocked: blockOnError && errorState.hasError
  };
};
