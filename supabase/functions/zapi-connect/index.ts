import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}`;

async function zapiGet(path: string) {
  const res = await fetch(`${ZAPI_BASE}${path}`, {
    headers: { "Client-Token": ZAPI_CLIENT_TOKEN },
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ensure settings row exists
    let { data: settings } = await admin
      .from("zapi_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings) {
      const { data: created } = await admin
        .from("zapi_settings")
        .insert({
          user_id: userId,
          instance_id: ZAPI_INSTANCE_ID,
          instance_token: ZAPI_INSTANCE_TOKEN,
        })
        .select()
        .single();
      settings = created ?? {
        user_id: userId,
        last_qr_at: null,
        phone_number: null,
        profile_name: null,
      } as typeof settings;
    } else if (!settings.instance_id) {
      await admin
        .from("zapi_settings")
        .update({
          instance_id: ZAPI_INSTANCE_ID,
          instance_token: ZAPI_INSTANCE_TOKEN,
        })
        .eq("user_id", userId);
    }

    // 1) check status
    const statusRes = await zapiGet("/status");
    const connected = !!(statusRes.data && (statusRes.data as any).connected);
    const smartphoneConnected = !!(statusRes.data &&
      (statusRes.data as any).smartphoneConnected);

    let qrImage: string | null = null;
    let phoneNumber: string | null = null;
    let profileName: string | null = null;

    if (connected) {
      // get phone info
      const me = await zapiGet("/me");
      if (me.ok && me.data) {
        // Tenta pegar o número real, fallback para ID apenas se não encontrar
        const data = me.data as any;
        phoneNumber = data.phone || data.number || data.fullNumber || null;
        profileName = data.name || data.pushname || null;
        
        // Se ainda for ID numérico, tenta buscar informações mais detalhadas
        if (phoneNumber && /^\d+$/.test(phoneNumber) && phoneNumber.length < 20) {
          profileName = "WhatsApp Business";
        }
      }
    } else {
      // request QR as image (base64)
      const qr = await zapiGet("/qr-code/image");
      if (qr.ok && qr.data) {
        const value = (qr.data as any).value || (qr.data as any).qrCode ||
          (qr.data as any).image;
        if (value) {
          qrImage = value.startsWith("data:")
            ? value
            : `data:image/png;base64,${value}`;
        }
      }
    }

    await admin
      .from("zapi_settings")
      .update({
        is_connected: connected,
        connection_status: connected ? "connected" : "disconnected",
        last_status_at: new Date().toISOString(),
        last_qr: qrImage,
        last_qr_at: qrImage ? new Date().toISOString() : settings?.last_qr_at ?? null,
        phone_number: phoneNumber ?? settings?.phone_number ?? null,
        profile_name: profileName ?? settings?.profile_name ?? null,
      })
      .eq("user_id", userId);

    // try to set webhooks (idempotent)
    try {
      const webhookUrl =
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/zapi-webhook?user_id=${userId}`;
      await fetch(`${ZAPI_BASE}/update-webhook-received`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({ value: webhookUrl }),
      });
      await fetch(`${ZAPI_BASE}/update-webhook-message-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({ value: webhookUrl }),
      });
      await fetch(`${ZAPI_BASE}/update-webhook-disconnected`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({ value: webhookUrl }),
      });
    } catch (e) {
      console.log("webhook setup failed", e);
    }

    return new Response(
      JSON.stringify({
        connected,
        smartphoneConnected,
        qr: qrImage,
        phone: phoneNumber,
        profileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("zapi-connect error", e);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
