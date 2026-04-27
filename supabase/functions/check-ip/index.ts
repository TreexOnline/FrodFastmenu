// Edge function to capture the user's real IP and check signup eligibility.
// Public (no JWT required) so it can be called before signup.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "0.0.0.0";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action as "check" | "register" | undefined;
    const userId = body.user_id as string | undefined;
    const userAgent = req.headers.get("user-agent") || null;
    const fingerprint = (body.fingerprint as string) || null;

    // Call DB function to check if IP is blocked
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_ip_blocked`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ _ip: ip }),
    });
    const blocked = await checkRes.json();

    if (action === "register" && userId) {
      // Save IP to signup_ips and to profile
      await fetch(`${SUPABASE_URL}/rest/v1/signup_ips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: userId,
          ip_address: ip,
          user_agent: userAgent,
          fingerprint,
        }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ signup_ip: ip }),
      });
    }

    return new Response(JSON.stringify({ ip, blocked: blocked === true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-ip error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
