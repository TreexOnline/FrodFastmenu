import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone || ""));
    const code = String(body.code || "").trim();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim();
    const restaurantName = String(body.restaurant_name || "").trim();

    if (!phone || !code || !password || !fullName || !restaurantName) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter ao menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca código mais recente
    const { data: otp } = await admin
      .from("auth_otp_codes")
      .select("*")
      .eq("phone", phone)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) {
      return new Response(
        JSON.stringify({ error: "Código não encontrado. Solicite um novo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (otp.attempts >= 5) {
      await admin.from("auth_otp_codes").update({ used_at: new Date().toISOString() }).eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Solicite um novo código." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (otp.code !== code) {
      await admin
        .from("auth_otp_codes")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Código incorreto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cria o usuário no Supabase Auth com email "fake" interno baseado no telefone
    // (necessário porque Auth exige email OU phone provider; usar phone provider exigiria SMS configurado)
    const internalEmail = `${phone}@phone.treexmenu.app`;

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
      // Se já existe (corrida), retorna erro amigável
      if (createErr?.message?.includes("already") || createErr?.message?.includes("registered")) {
        return new Response(
          JSON.stringify({ error: "Este número já possui uma conta." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw createErr ?? new Error("Falha ao criar usuário");
    }

    // Marca código como usado
    await admin
      .from("auth_otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otp.id);

    // Gera sessão para o usuário recém-criado (login automático)
    const { data: signInData, error: signInErr } = await admin.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (signInErr || !signInData.session) {
      // Conta criada mas sessão falhou — frontend pode tentar login manual
      return new Response(
        JSON.stringify({ ok: true, user_id: created.user.id, session: null, internal_email: internalEmail }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: created.user.id,
        session: signInData.session,
        internal_email: internalEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-otp error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
