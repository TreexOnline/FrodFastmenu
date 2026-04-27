import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WhatsappAddonInfo {
  loading: boolean;
  active: boolean;
  expiresAt: Date | null;
}

export const useWhatsappAddon = (): WhatsappAddonInfo => {
  const { user } = useAuth();
  const [info, setInfo] = useState<WhatsappAddonInfo>({
    loading: true,
    active: false,
    expiresAt: null,
  });

  useEffect(() => {
    if (!user) {
      setInfo({ loading: false, active: false, expiresAt: null });
      return;
    }
    let alive = true;
    supabase
      .from("profiles")
      .select("whatsapp_addon_active,whatsapp_addon_expires_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const expires = data?.whatsapp_addon_expires_at
          ? new Date(data.whatsapp_addon_expires_at)
          : null;
        const active =
          !!data?.whatsapp_addon_active &&
          (!expires || expires.getTime() > Date.now());
        setInfo({ loading: false, active, expiresAt: expires });
      });
    return () => {
      alive = false;
    };
  }, [user]);

  return info;
};
