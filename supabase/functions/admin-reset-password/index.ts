import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function generatePassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  let out = "";
  const rnd = new Uint32Array(length);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < length; i++) out += chars[rnd[i] % chars.length];
  return out;
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

    if (!authHeader) {
      return json({ error: "Missing auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 🔐 user client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userErr } =
      await userClient.auth.getUser();

    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 🔐 admin client
    const admin = createClient(supabaseUrl, serviceKey);

    // 🔐 check admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Forbidden" }, 403);
    }

    // 📦 body
    const body = await req.json().catch(() => ({}));
    const user_id: string = body.user_id;
    const customPassword: string | undefined = body.password;

    if (!user_id) {
      return json({ error: "user_id required" }, 400);
    }

    // 🔥 VALIDATIONS
    if (customPassword && customPassword.length < 6) {
      return json({ error: "Senha deve ter ao menos 6 caracteres" }, 400);
    }

    // 🔑 Generate or use custom password
    const newPassword =
      customPassword && customPassword.length >= 6
        ? customPassword
        : generatePassword(12);

    console.log(`Resetando senha do usuário ${user_id}...`);

    // 🔄 Update user password
    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, {
      password: newPassword,
    });

    if (updErr) {
      console.error("Erro ao atualizar senha:", updErr);
      return json({ error: "Erro ao resetar senha" }, 500);
    }

    console.log(`Senha do usuário ${user_id} atualizada com sucesso`);
    return json({ ok: true, new_password: newPassword });
  } catch (err) {
    console.error("admin-reset-password error:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});
