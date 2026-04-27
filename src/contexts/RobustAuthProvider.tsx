import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/supabaseClient";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  error: null,
  signOut: async () => {},
  refreshSession: async () => false,
  clearError: () => {},
});

// Configuração de retry com circuit breaker
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_CONFIG = {
  maxFailures: 3,
  resetTimeout: 30000, // 30 segundos
  retryDelays: [1000, 2000, 4000], // Exponential backoff
};

class AuthCircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Se circuit breaker está aberto, verificar se pode resetar
    if (this.state.isOpen) {
      if (Date.now() - this.state.lastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
        this.state.isOpen = false;
        this.state.failures = 0;
      } else {
        throw new Error('Auth circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      // Reset em caso de sucesso
      this.state.failures = 0;
      this.state.isOpen = false;
      return result;
    } catch (error) {
      this.state.failures++;
      this.state.lastFailure = Date.now();

      if (this.state.failures >= CIRCUIT_BREAKER_CONFIG.maxFailures) {
        this.state.isOpen = true;
      }

      throw error;
    }
  }

  reset() {
    this.state = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };
  }
}

// Singleton do circuit breaker
const authCircuitBreaker = new AuthCircuitBreaker();

export const RobustAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para evitar race conditions
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Função de refresh com circuit breaker
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;

    try {
      const { data, error } = await authCircuitBreaker.execute(() =>
        supabase.auth.refreshSession()
      );

      if (error) {
        if (mountedRef.current) {
          setError(error.message);
        }
        return false;
      }

      if (data.session && mountedRef.current) {
        setSession(data.session);
        setUser(data.session.user);
        setError(null);
        return true;
      }

      return false;
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to refresh session');
      }
      return false;
    }
  }, []);

  // Função de sign out robusta
  const signOut = useCallback(async () => {
    try {
      await authCircuitBreaker.execute(() => supabase.auth.signOut());
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      if (mountedRef.current) {
        setSession(null);
        setUser(null);
        setError(null);
        // Limpar localStorage como fallback
        localStorage.removeItem('supabase.auth.token');
      }
    }
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Inicialização segura da autenticação
  useEffect(() => {
    // Prevenir múltiplas inicializações
    if (initializingRef.current || initialized) {
      return;
    }

    initializingRef.current = true;

    const initializeAuth = async () => {
      try {
        // Resetar circuit breaker ao iniciar
        authCircuitBreaker.reset();

        // Obter sessão atual com circuit breaker
        const { data: { session: currentSession }, error } = await authCircuitBreaker.execute(() =>
          supabase.auth.getSession()
        );

        if (error) {
          if (mountedRef.current) {
            setError(error.message);
            // Se erro for de sessão inválida, limpar localStorage
            if (error.message.includes('Invalid') || error.message.includes('expired')) {
              localStorage.removeItem('supabase.auth.token');
            }
          }
        } else if (mountedRef.current) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setError(null);
        }
      } catch (error) {
        if (mountedRef.current) {
          setError(error instanceof Error ? error.message : 'Failed to initialize auth');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }
    };

    // Configurar listener de mudanças de estado (APENAS UM)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        if (mountedRef.current) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          setInitialized(true);
          setError(null);
          
          // Resetar circuit breaker em mudanças de estado
          authCircuitBreaker.reset();
        }
      }
    );

    subscriptionRef.current = subscription;

    // Inicializar auth
    initializeAuth();

    // Cleanup completo
    return () => {
      mountedRef.current = false;
      
      if (subscriptionRef.current?.subscription) {
        subscriptionRef.current.subscription.unsubscribe();
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [initialized]);

  // Auto-retry para erros temporários
  useEffect(() => {
    if (error && initialized) {
      // Tentar refresh automático para certos erros
      if (error.includes('429') || error.includes('Too Many Requests') || error.includes('refresh')) {
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            refreshSession();
          }
        }, 5000);
      }
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [error, initialized, refreshSession]);

  // Debug logs em desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth state:', {
        user: user?.email,
        loading,
        initialized,
        hasSession: !!session,
        error,
      });
    }
  }, [user, loading, initialized, session, error]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    initialized,
    error,
    signOut,
    refreshSession,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useRobustAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useRobustAuth must be used within a RobustAuthProvider');
  }
  return context;
};
