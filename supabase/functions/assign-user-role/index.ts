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

    // 🔐 check admin - apenas admins podem atribuir roles
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Insufficient permissions" }, 403);
    }

    // Parse request body
    const body = await req.json();
    const { user_id, role, permissions } = body;

    if (!user_id || !role) {
      return json({ error: "user_id and role are required" }, 400);
    }

    // Validar role permitido
    const allowedRoles = ["admin", "user"];
    if (!allowedRoles.includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    // Impedir auto-atribuição de role admin
    if (user_id === userData.user.id && role === "admin") {
      return json({ error: "Cannot assign admin role to self" }, 400);
    }

    // Verificar se usuário já tem role
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existingRole) {
      // Atualizar role existente
      const { error } = await admin
        .from("user_roles")
        .update({ 
          role,
          permissions: permissions || {},
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user_id);

      if (error) {
        return json({ error: "Failed to update role" }, 500);
      }

      return json({ 
        success: true, 
        message: "Role updated successfully",
        role 
      });
    } else {
      // Inserir novo role
      const { error } = await admin
        .from("user_roles")
        .insert({
          user_id,
          role,
          permissions: permissions || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        return json({ error: "Failed to assign role" }, 500);
      }

      return json({ 
        success: true, 
        message: "Role assigned successfully",
        role 
      });
    }

  } catch (error) {
    console.error("Error in assign-user-role:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
