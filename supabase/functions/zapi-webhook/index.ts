// @ts-ignore
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(fn: (req: Request) => Promise<Response>): void;
};

// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const TREEXMENU_AI_API_KEY = Deno.env.get("TREEXMENU_AI_API_KEY")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sendText(to: string, message: string) {
  const url =
    `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone: to, message }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function aiReply(systemPrompt: string, userMsg: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TREEXMENU_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    console.log("AI failed", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  // Tentar diferentes formatos de resposta da API
  return json?.choices?.[0]?.message?.content ?? 
         json?.message?.content ?? 
         json?.content ?? 
         null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    console.log("zapi-webhook", JSON.stringify(body).slice(0, 500));

    const type = body?.type || body?.event;

    // ===== connection events =====
    if (type === "DisconnectedCallback" || body?.disconnected === true) {
      await admin.from("zapi_settings").update({
        is_connected: false,
        connection_status: "disconnected",
        last_status_at: new Date().toISOString(),
      }).eq("user_id", userId);
      return new Response("ok", { headers: corsHeaders });
    }

    if (type === "ConnectedCallback" || body?.connected === true) {
      await admin.from("zapi_settings").update({
        is_connected: true,
        connection_status: "connected",
        phone_number: body?.phone || null,
        last_status_at: new Date().toISOString(),
      }).eq("user_id", userId);
      return new Response("ok", { headers: corsHeaders });
    }

    // ===== message status callbacks (delivered/read/sent updates) =====
    // IMPORTANT: Z-API also sends status="RECEIVED" on incoming messages,
    // so we must only treat as status if explicit type or no message body.
    const hasMessageBody = !!(body?.text?.message || body?.image || body?.audio ||
      body?.video || body?.document || body?.location || body?.contact ||
      body?.sticker || body?.buttonsResponseMessage || body?.listResponseMessage);

    if (type === "MessageStatusCallback" && !hasMessageBody) {
      await admin.from("zapi_messages").insert({
        user_id: userId,
        direction: "status",
        status: body?.status || "unknown",
        wa_message_id: body?.ids?.[0] || body?.messageId || null,
        meta: body,
      });
      return new Response("ok", { headers: corsHeaders });
    }

    // ===== received message =====
    // Z-API ReceivedCallback: type="ReceivedCallback" OR has message body with fromMe=false
    const isReceived = type === "ReceivedCallback" ||
      (body?.fromMe === false && hasMessageBody);

    if (isReceived) {
      const fromMe = body?.fromMe === true;
      if (fromMe) return new Response("ok", { headers: corsHeaders });

      // Skip group messages
      if (body?.isGroup === true) {
        console.log("Skipping group message");
        return new Response("ok", { headers: corsHeaders });
      }

      const fromNumber = body?.phone || body?.from || null;
      const content = body?.text?.message ||
        (typeof body?.text === "string" ? body.text : null) ||
        body?.message ||
        body?.image?.caption || "";
      const waId = body?.messageId || body?.id || null;

      console.log("Incoming message", { fromNumber, content, waId });

      // dedupe
      if (waId) {
        const { data: existing } = await admin
          .from("zapi_messages")
          .select("id")
          .eq("user_id", userId)
          .eq("wa_message_id", waId)
          .maybeSingle();
        if (existing) {
          console.log("Duplicate message, skipping");
          return new Response("ok", { headers: corsHeaders });
        }
      }

      await admin.from("zapi_messages").insert({
        user_id: userId,
        direction: "in",
        from_number: fromNumber,
        content,
        wa_message_id: waId,
        status: "received",
        meta: body,
      });

      // Resposta automática fixa (sem IA)
      const { data: settings } = await admin
        .from("zapi_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("Auto-reply check", {
        connected: settings?.is_connected,
        hasFromNumber: !!fromNumber,
        hasContent: !!content,
      });

      // Envia resposta automática se WhatsApp estiver conectado
      if (settings?.is_connected && fromNumber && content && typeof content === "string") {
        // cooldown para não spammar (30 segundos fixo)
        const cooldown = 30;
        const since = new Date(Date.now() - cooldown * 1000).toISOString();
        const { data: recent } = await admin
          .from("zapi_messages")
          .select("id")
          .eq("user_id", userId)
          .eq("to_number", fromNumber)
          .eq("direction", "out")
          .gte("created_at", since)
          .limit(1);

        if (!recent || recent.length === 0) {
          // load profile para pegar nome do restaurante
          const { data: profile } = await admin
            .from("profiles")
            .select("restaurant_name")
            .eq("id", userId)
            .maybeSingle();
          const restaurantName = profile?.restaurant_name || "nosso restaurante";

          // load menu settings para pegar o link do cardápio
          const { data: menuSettings } = await admin
            .from("menu_settings")
            .select("slug")
            .eq("user_id", userId)
            .eq("is_default", true)
            .maybeSingle();

          // delay de 3 segundos para parecer natural
          await new Promise((r) => setTimeout(r, 3000));

          // Mensagem fixa com link do cardápio
          let reply = `Boa noite! 😊

Faça seu pedido pelo nosso cardápio digital 📱`;

          if (menuSettings?.slug) {
            // Usa o domínio correto baseado no restaurante
            const domain = `${menuSettings.slug}.treexonline.online`;
            reply += `\n\n🍔 https://${domain}/menu/${menuSettings.slug}`;
          } else {
            reply += `\n\nPor favor, entre em contato para receber nosso cardápio!`;
          }

          reply += `\n\nFicaremos felizes em atender! 🚀`;

          console.log("Sending auto-reply", { hasReply: !!reply, length: reply?.length });

          const sent = await sendText(fromNumber, reply);
          console.log("Sent reply", { ok: sent.ok });
          await admin.from("zapi_messages").insert({
            user_id: userId,
            direction: "out",
            to_number: fromNumber,
            content: reply,
            status: sent.ok ? "sent" : "failed",
            meta: sent.data,
          });
        } else {
          console.log("Auto-reply cooldown active, skipping");
        }
      }

      return new Response("ok", { headers: corsHeaders });
    }

    return new Response("ignored", { headers: corsHeaders });
  } catch (e) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 