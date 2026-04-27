import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { action: "set_banned"; user_id: string; banned: boolean }
  | {
      action: "set_plan";
      user_id: string;
      plan_active: boolean;
      plan_type?: string | null;
      months?: number | null; // duração; se omitido e plan_active=true => 1 mês
    }
  | {
      action: "set_whatsapp_addon";
      user_id: string;
      active: boolean;
      months?: number | null; // duração; se omitido e active=true => 1 mês
    };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = (await req.json()) as Action;
    if (!body || !body.action || !body.user_id) {
      return json({ error: "Invalid body" }, 400);
    }

    if (body.action === "set_banned") {
      // Bane ou desbane usuário no auth (banned_until = "100 years" / "none")
      const { error } = await admin.auth.admin.updateUserById(body.user_id, {
        ban_duration: body.banned ? "876000h" : "none",
      } as any);
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.action === "set_plan") {
      const months = body.months ?? (body.plan_active ? 1 : 0);
      let plan_expires_at: string | null = null;
      if (body.plan_active && months > 0) {
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        plan_expires_at = d.toISOString();
      }
      const { error } = await admin
        .from("profiles")
        .update({
          plan_active: body.plan_active,
          plan_type: body.plan_active ? body.plan_type ?? "monthly" : null,
          plan_expires_at,
        })
        .eq("id", body.user_id);
      if (error) throw error;
      return json({ ok: true, plan_expires_at });
    }

    if (body.action === "set_whatsapp_addon") {
      const months = body.months ?? (body.active ? 1 : 0);
      let whatsapp_addon_expires_at: string | null = null;
      if (body.active && months > 0) {
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        whatsapp_addon_expires_at = d.toISOString();
      }
      const { error } = await admin
        .from("profiles")
        .update({
          whatsapp_addon_active: body.active,
          whatsapp_addon_expires_at,
        })
        .eq("id", body.user_id);
      if (error) throw error;
      return json({ ok: true, whatsapp_addon_expires_at });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("admin-update-user error:", e);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
