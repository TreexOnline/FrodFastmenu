import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (!digits) return null;
  // assume Brazil if 10/11 digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function applyTemplate(
  tpl: string,
  vars: Record<string, string>,
) {
  return tpl
    .replace(/\{nome\}/gi, vars.nome ?? "")
    .replace(/\{pedido\}/gi, vars.pedido ?? "")
    .replace(/\{total\}/gi, vars.total ?? "")
    .replace(/\{status\}/gi, vars.status ?? "");
}

const STATUS_MAP: Record<
  string,
  { enabledKey: string; textKey: string }
> = {
  confirmed: {
    enabledKey: "notify_confirmed_enabled",
    textKey: "notify_confirmed_text",
  },
  preparing: {
    enabledKey: "notify_preparing_enabled",
    textKey: "notify_preparing_text",
  },
  ready: {
    enabledKey: "notify_ready_enabled",
    textKey: "notify_ready_text",
  },
  out_for_delivery: {
    enabledKey: "notify_out_for_delivery_enabled",
    textKey: "notify_out_for_delivery_text",
  },
  delivered: {
    enabledKey: "notify_delivered_enabled",
    textKey: "notify_delivered_text",
  },
  cancelled: {
    enabledKey: "notify_cancelled_enabled",
    textKey: "notify_cancelled_text",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const orderId = body.order_id;
    const event = body.event;
    const newStatus = body.status;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: "order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("zapi_settings")
      .select("*")
      .eq("user_id", order.user_id)
      .maybeSingle();

    if (!settings || !settings.is_connected) {
      return new Response(
        JSON.stringify({ skipped: "instance not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // determine which template to use
    let statusKey = newStatus;
    if (event === "created") {
      statusKey = "confirmed";
    }

    const map = STATUS_MAP[statusKey];
    if (!map) {
      return new Response(JSON.stringify({ skipped: "unknown status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings[map.enabledKey]) {
      return new Response(JSON.stringify({ skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tpl = settings[map.textKey];
    const phone = normalizePhone(order.customer_phone);
    if (!phone) {
      return new Response(JSON.stringify({ skipped: "no phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = applyTemplate(tpl, {
      nome: order.customer_name?.split(" ")?.[0] ?? "cliente",
      pedido: order.id.slice(0, 8).toUpperCase(),
      total: fmtBRL(Number(order.total_amount || 0)),
      status: statusKey,
    });

    const url =
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json().catch(() => ({}));

    await admin.from("zapi_messages").insert({
      user_id: order.user_id,
      direction: "out",
      to_number: phone,
      content: message,
      status: res.ok ? "sent" : "failed",
      order_id: orderId,
      meta: { event, status: statusKey, response: data },
      error: res.ok ? null : JSON.stringify(data),
    });

    return new Response(JSON.stringify({ ok: res.ok, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-order error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
