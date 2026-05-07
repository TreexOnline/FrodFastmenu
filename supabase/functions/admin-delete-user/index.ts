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
    const { user_id } = body;

    if (!user_id) {
      return json({ error: "user_id required" }, 400);
    }

    // 🛡️ self-deletion protection
    if (userData.user.id === user_id) {
      return json({ error: "Você não pode excluir sua própria conta" }, 400);
    }

    // 🗑️ Delete user from auth (cascades to profiles, roles, stores)
    console.log(`Deletando usuário ${user_id}...`);
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    
    if (delErr) {
      console.error("Erro ao deletar usuário:", delErr);
      return json({ error: "Erro ao excluir usuário" }, 500);
    }

    console.log(`Usuário ${user_id} excluído com sucesso`);
    return json({ ok: true });
  } catch (err) {
    console.error("admin-delete-user error:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});
