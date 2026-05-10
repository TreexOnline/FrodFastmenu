import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TrialStatus {
  user_id: string;
  is_trial: boolean;
  trial_active: boolean;
  trial_days_remaining: number | null;
  trial_ends_at: string | null;
}

export const useTrialStatus = () => {
  return useQuery({
    queryKey: ["trial-status"],
    queryFn: async (): Promise<TrialStatus | null> => {
      // Obter o usuário atual primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Usar uma consulta direta em vez de RPC que pode não estar no types
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          current_plan,
          plan_active,
          trial_started_at,
          trial_ends_at
        `)
        .eq('id', user.id)
        .single();
      
      if (error || !profile) {
        console.error("Error fetching trial status:", error);
        return null;
      }
      
      const isTrial = profile.current_plan === 'trial';
      const trialActive = isTrial && profile.plan_active && profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
      
      let trialDaysRemaining = null;
      if (profile.trial_ends_at) {
        const now = new Date();
        const trialEnd = new Date(profile.trial_ends_at);
        const diffTime = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      return {
        user_id: profile.id,
        is_trial: isTrial,
        trial_active: trialActive,
        trial_days_remaining: trialDaysRemaining,
        trial_ends_at: profile.trial_ends_at
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Atualizar a cada 10 minutos
  });
};
