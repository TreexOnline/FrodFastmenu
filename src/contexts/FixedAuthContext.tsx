import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ 
  user: null, 
  session: null, 
  loading: true, 
  signOut: async () => {}
});

export const FixedAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs para evitar race conditions
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
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
    // Evitar múltiplas inicializações
    if (initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    // Obter sessão atual APENAS UMA VEZ
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Se erro for de sessão inválida, limpar localStorage
          if (error.message.includes('Invalid') || error.message.includes('expired')) {
            localStorage.removeItem('supabase.auth.token');
          }
        } else if (mountedRef.current) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
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
        }
      }
    );

    // Inicializar auth
    initializeAuth();

    // Cleanup completo
    return () => {
      mountedRef.current = false;
      if (subscription?.subscription) {
        subscription.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <Ctx.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
