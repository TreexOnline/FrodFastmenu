import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccessInfo {
  loading: boolean;
  hasAccess: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  planType: string | null;
  planActive: boolean;
  planExpiresAt: Date | null;
}

const DEFAULT: AccessInfo = {
  loading: true,
  hasAccess: false,
  isTrial: false,
  trialDaysLeft: 0,
  trialEndsAt: null,
  planType: null,
  planActive: false,
  planExpiresAt: null,
};

export const useAccess = (): AccessInfo => {
  const { user } = useAuth();
  const [info, setInfo] = useState<AccessInfo>(DEFAULT);

  useEffect(() => {
    if (!user) {
      setInfo({ ...DEFAULT, loading: false });
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("trial_started_at,trial_ends_at,current_plan,plan_active,plan_expires_at,created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const now = Date.now();
        const trialEnds = data?.trial_ends_at
          ? new Date(data.trial_ends_at)
          : data?.created_at
            ? new Date(new Date(data.created_at).getTime() + 15 * 86_400_000)
            : null;
        const planExpires = data?.plan_expires_at ? new Date(data.plan_expires_at) : null;
        const planActive = !!data?.plan_active && (!planExpires || planExpires.getTime() > now);
        const trialActive = !!trialEnds && trialEnds.getTime() > now;
        const trialDaysLeft = trialEnds
          ? Math.max(0, Math.ceil((trialEnds.getTime() - now) / 86_400_000))
          : 0;
        setInfo({
          loading: false,
          hasAccess: planActive || trialActive,
          isTrial: !planActive && trialActive,
          trialDaysLeft,
          trialEndsAt: trialEnds,
          planType: data?.current_plan ?? null,
          planActive,
          planExpiresAt: planExpires,
        });
      });
    return () => {
      active = false;
    };
  }, [user]);

  return info;
};
