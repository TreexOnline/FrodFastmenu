// ⚠️ EDGE FUNCTION DESABILITADA POR VULNERABILIDADES CRÍTICAS
// 
// VULNERABILIDADES IDENTIFICADAS:
// 1. SUPABASE_SERVICE_ROLE_KEY exposta (acesso total ao banco)
// 2. Sem validação de respostas da RPC
// 3. Spoofing de IP possível
// 4. Sem rate limiting
// 5. Tratamento de erros inexistente
// 6. SQL injection potencial
// 7. Endpoint público sem autenticação
//
// RISCO: COMPROMETIMENTO TOTAL DO SISTEMA

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getClientIp(req: Request): string {
  // Multiple IP detection methods with validation
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const xRealIp = req.headers.get("x-real-ip");
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const xClientIp = req.headers.get("x-client-ip");
  const xOriginalFor = req.headers.get("x-original-for");
  
  // Validate IP format
  const isValidIp = (ip: string | null) => {
    if (!ip) return false;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // Return first valid IP with priority
  if (cfConnectingIp && isValidIp(cfConnectingIp)) return cfConnectingIp;
  if (xRealIp && isValidIp(xRealIp)) return xRealIp;
  if (xClientIp && isValidIp(xClientIp)) return xClientIp;
  if (xOriginalFor && isValidIp(xOriginalFor)) return xOriginalFor;
  if (xForwardedFor) {
    const forwardedIps = xForwardedFor.split(",").map(ip => ip.trim());
    for (const ip of forwardedIps) {
      if (isValidIp(ip)) return ip;
    }
  }
  
  // Fallback to localhost for development
  return "127.0.0.1";
}

function validateRequest(body: any, action: string): { valid: boolean; error?: string } {
  // Validate action
  if (!action || !["check", "register"].includes(action)) {
    return { valid: false, error: "Invalid action" };
  }

  // Validate user_id format
  if (action === "register" && body.user_id) {
    const userId = String(body.user_id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return { valid: false, error: "Invalid user_id format" };
    }
  }

  // Validate fingerprint
  if (body.fingerprint && typeof body.fingerprint !== "string") {
    return { valid: false, error: "Invalid fingerprint format" };
  }

  return { valid: true };
}

function checkRateLimit(ip: string, action: string): { allowed: boolean; resetTime?: number } {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = action === "check" ? 10 : 5; // Different limits per action

  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      resetTime: record.resetTime 
    };
  }

  record.count++;
  return { allowed: true };
}

async function safeFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error("[CHECK-IP] Fetch error:", error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const startTime = Date.now();
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown";
    
    // Parse body safely
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("[CHECK-IP] JSON parse error:", error);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const action = body.action as "check" | "register" | undefined;
    const userId = body.user_id as string | undefined;
    const fingerprint = (body.fingerprint as string) || null;

    // Validate request
    const validation = validateRequest(body, action || "");
    if (!validation.valid) {
      console.error("[CHECK-IP] Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(ip, action || "");
    if (!rateLimit.allowed) {
      console.error("[CHECK-IP] Rate limit exceeded:", { ip, action });
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString()
          } 
        }
      );
    }

    // Use anonymous client for IP check (no admin access)
    const supabase = createClient(SUPABASE_URL, ANON_KEY);

    // Call DB function to check if IP is blocked
    const checkRes = await safeFetch(`${SUPABASE_URL}/rest/v1/rpc/is_ip_blocked`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({ _ip: ip }),
    });

    if (!checkRes.ok) {
      console.error("[CHECK-IP] IP check failed:", checkRes.status);
      throw new Error("IP check service unavailable");
    }

    const checkData = await checkRes.json();
    
    // Validate response structure
    if (typeof checkData !== 'object' || checkData === null) {
      console.error("[CHECK-IP] Invalid response from is_ip_blocked");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blocked = checkData.blocked === true;

    // Log structured data
    console.log("[CHECK-IP] Request processed:", {
      timestamp: new Date().toISOString(),
      ip,
      userAgent: userAgent.substring(0, 200), // Truncate for logs
      action,
      userId: userId ? userId.substring(0, 8) + "..." : undefined,
      fingerprint: fingerprint ? fingerprint.substring(0, 16) + "..." : undefined,
      blocked,
      processingTime: Date.now() - startTime,
      rateLimitRemaining: rateLimit.allowed ? undefined : rateLimit.resetTime! - Date.now()
    });

    if (action === "register" && userId && !blocked) {
      try {
        // Save IP to signup_ips with proper validation
        await safeFetch(`${SUPABASE_URL}/rest/v1/signup_ips`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            user_id: userId,
            ip_address: ip,
            user_agent: userAgent.substring(0, 500), // Limit length
            fingerprint,
            created_at: new Date().toISOString()
          }),
        });

        // Update profile with proper encoding
        await safeFetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ 
            signup_ip: ip,
            updated_at: new Date().toISOString()
          }),
        });

        console.log("[CHECK-IP] User registered successfully:", { userId, ip });
      } catch (error) {
        console.error("[CHECK-IP] Registration failed:", error);
        // Don't expose internal errors to client
        return new Response(
          JSON.stringify({ error: "Registration failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ 
      ip, 
      blocked: blocked === true,
      rateLimitRemaining: rateLimit.allowed ? undefined : rateLimit.resetTime! - Date.now(),
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      }
    });

  } catch (error: any) {
    console.error("[CHECK-IP] Unexpected error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        requestId: crypto.randomUUID() // For debugging
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
