import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/singleton";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const Ctx = createContext<AuthCtx>({ 
  user: null, 
  session: null, 
  loading: true, 
  signOut: async () => {},
  refreshSession: async () => false
});

// Retry configuration for rate limiting
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// Exponential backoff helper
const getRetryDelay = (attempt: number) => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

// Retry wrapper with exponential backoff
const withRetry = async <T,>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (!error.message.includes('429') && !error.message.includes('Too Many Requests')) {
        throw error;
      }
      
      if (attempt === RETRY_CONFIG.maxRetries) {
        console.error(`Max retries exceeded for ${operationName}:`, lastError);
        throw lastError;
      }
      
      const delay = getRetryDelay(attempt);
      console.warn(`Retry ${attempt}/${RETRY_CONFIG.maxRetries} for ${operationName} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

export const ImprovedAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const authSubscriptionRef = useRef<any>(null);

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await withRetry(
        () => supabase.auth.refreshSession(),
        'refreshSession'
      );
      
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
      
      if (data.session && mountedRef.current) {
        setSession(data.session);
        setUser(data.session.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await withRetry(
        () => supabase.auth.signOut(),
        'signOut'
      );
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      if (mountedRef.current) {
        setSession(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    if (initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await withRetry(
          () => supabase.auth.getSession(),
          'getSession'
        );

        if (error) {
          console.error('Error getting session:', error);
        } else if (mountedRef.current) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        if (mountedRef.current) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      }
    );

    authSubscriptionRef.current = authSubscription;
    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (authSubscriptionRef.current?.subscription) {
        authSubscriptionRef.current.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth state:', { user: user?.email, loading, hasSession: !!session });
    }
  }, [user, loading, session]);

  return (
    <Ctx.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut, 
      refreshSession 
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useImprovedAuth = () => useContext(Ctx);
