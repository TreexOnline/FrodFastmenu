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

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
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

    const email = String(body.email ?? "").trim();
    const rawPhone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const restaurantName = String(
      body.restaurant_name ?? ""
    ).trim();

    // 🔥 VALIDATIONS
    if (!email || !email.includes("@")) {
      return json({ error: "Email inválido" }, 400);
    }

    if (!rawPhone || rawPhone.replace(/\D/g, "").length < 10) {
      return json({ error: "Telefone inválido" }, 400);
    }

    if (password.length < 6) {
      return json(
        { error: "Senha deve ter ao menos 6 caracteres" },
        400
      );
    }

    if (!fullName || !restaurantName) {
      return json(
        { error: "Campos obrigatórios faltando" },
        400
      );
    }

    const phone = normalizePhone(rawPhone);

    // 🔍 duplicate check
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return json(
        { error: "Já existe conta com esse email" },
        409
      );
    }

    // 👤 CREATE AUTH USER
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone,
        user_metadata: {
          full_name: fullName,
          restaurant_name: restaurantName,
          phone,
        },
      });

    if (createErr || !created?.user) {
      console.error("create user error:", createErr);

      return json(
        { error: "Erro ao criar usuário" },
        500
      );
    }

    const userId = created.user.id;

    // 👤 PROFILE
    const { error: profileError } = await admin
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name: fullName,
        restaurant_name: restaurantName,
        phone,
      });

    if (profileError) {
      console.error("profile error:", profileError);

      await admin.auth.admin.deleteUser(userId);

      return json(
        { error: "Erro ao criar profile" },
        500
      );
    }

    // 🔐 ROLE
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "user",
      });

    if (roleError) {
      console.error("role error:", roleError);

      await admin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await admin.auth.admin.deleteUser(userId);

      return json(
        { error: "Erro ao criar role" },
        500
      );
    }

    // 🏪 STORE
    const { error: storeError } = await admin
      .from("stores")
      .insert({
        owner_id: userId,
        name: restaurantName,
        phone,
        email,
        phone_enabled: true,
      });

    if (storeError) {
      console.error("store error:", storeError);

      await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      await admin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await admin.auth.admin.deleteUser(userId);

      return json(
        { error: "Erro ao criar loja" },
        500
      );
    }

    return json({
      ok: true,
      user_id: userId,
      email,
      phone,
    });
  } catch (err) {
    console.error("function error:", err);

    return json(
      { error: "Erro interno" },
      500
    );
  }
});