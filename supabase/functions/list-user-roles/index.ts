import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // 🔐 check admin - apenas admins podem listar roles
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Insufficient permissions" }, 403);
    }

    // Parse request body para filtros
    const body = await req.json();
    const { user_id, role, limit = 50, offset = 0 } = body;

    // Construir query base
    let query = admin
      .from("user_roles")
      .select(`
        user_id,
        role,
        permissions,
        created_at,
        updated_at,
        profiles!inner (
          id,
          email,
          full_name,
          phone
        )
      `);

    // Aplicar filtros se fornecidos
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    if (role) {
      query = query.eq("role", role);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    // Executar query
    const { data, error } = await query;

    if (error) {
      return json({ error: "Failed to fetch roles" }, 500);
    }

    // Contar total para paginação
    let countQuery = admin
      .from("user_roles")
      .select("id", { count: "exact", head: true });

    if (user_id) {
      countQuery = countQuery.eq("user_id", user_id);
    }

    if (role) {
      countQuery = countQuery.eq("role", role);
    }

    const { count } = await countQuery;

    return json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error("Error in list-user-roles:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
