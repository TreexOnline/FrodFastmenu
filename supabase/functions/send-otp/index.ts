import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const rawPhone = String(body.phone || "").trim();
    if (!rawPhone || rawPhone.replace(/\D/g, "").length < 10) {
      return new Response(
        JSON.stringify({ error: "Telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const phone = normalizePhone(rawPhone);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: máximo 1 envio por 60s para o mesmo telefone
    const { data: recent } = await admin
      .from("auth_otp_codes")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const elapsed = Date.now() - new Date(recent.created_at).getTime();
      if (elapsed < 60_000) {
        const wait = Math.ceil((60_000 - elapsed) / 1000);
        return new Response(
          JSON.stringify({ error: `Aguarde ${wait}s para reenviar`, wait_seconds: wait }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Verifica se telefone já está em uso (whatsapp_number em profiles)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("whatsapp_number", phone)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "Este número já possui uma conta. Faça login." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalida códigos anteriores não usados
    await admin
      .from("auth_otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("phone", phone)
      .is("used_at", null);

    const { error: insertErr } = await admin.from("auth_otp_codes").insert({
      phone,
      code,
      expires_at: expiresAt,
      ip_address: ip,
    });
    if (insertErr) throw insertErr;

    // Envia via Z-API
    const message =
      `🔐 *TreexMenu*\n\nSeu código de verificação: *${code}*\n\nVálido por 10 minutos.\nNão compartilhe este código com ninguém.`;

    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Z-API send failed", data);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar código no WhatsApp. Verifique o número.", details: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, expires_in: 600 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-otp error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
