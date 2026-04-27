import { useRobustAuth } from '@/contexts/RobustAuthProvider';

// Hook simplificado para status de autenticação
export const useAuthStatus = () => {
  const { user, session, loading, initialized, error } = useRobustAuth();
  
  return {
    isAuthenticated: !!user && !!session,
    user,
    session,
    loading,
    initialized,
    error,
    isReady: initialized && !loading,
  };
};
