// admin-create-user: cria um novo restaurante (usuário comum) a partir do painel admin.
// Recebe phone, password, full_name, restaurant_name. Apenas admins podem chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: "Missing environment variables" }, 500);
    }

    // Valida quem chama
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

    // Body
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const restaurantName = String(body.restaurant_name ?? "").trim();

    if (!rawPhone || rawPhone.replace(/\D/g, "").length < 10) {
      return json({ error: "Telefone inválido" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Senha deve ter ao menos 6 caracteres" }, 400);
    }
    if (!fullName || fullName.length > 120) {
      return json({ error: "Nome do responsável é obrigatório (até 120 caracteres)" }, 400);
    }
    if (!restaurantName || restaurantName.length > 120) {
      return json({ error: "Nome do restaurante é obrigatório (até 120 caracteres)" }, 400);
    }

    const phone = normalizePhone(rawPhone);
    const internalEmail = `${phone}@phone.treexmenu.app`;

    // Telefone já em uso?
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("whatsapp_number", phone)
      .maybeSingle();
    if (existing) {
      return json({ error: "Já existe uma conta com este telefone" }, 409);
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      phone,
      user_metadata: {
        full_name: fullName,
        restaurant_name: restaurantName,
        whatsapp_number: phone,
      },
    });

    if (createErr || !created.user) {
      if (
        createErr?.message?.toLowerCase().includes("already") ||
        createErr?.message?.toLowerCase().includes("registered")
      ) {
        return json({ error: "Este número já possui uma conta" }, 409);
      }
      console.error("admin-create-user createErr", createErr);
      return json({ error: "Falha ao criar usuário" }, 500);
    }

    return json({
      ok: true,
      user_id: created.user.id,
      phone,
      internal_email: internalEmail,
    });
  } catch (e) {
    console.error("admin-create-user error", e);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});
