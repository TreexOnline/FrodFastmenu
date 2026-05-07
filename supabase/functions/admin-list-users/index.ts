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

    // 📋 Lista todos os usuários do auth
    console.log("Listando usuários do auth...");
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    
    if (listErr) {
      console.error("Erro ao listar usuários:", listErr);
      return json({ error: "Erro ao listar usuários" }, 500);
    }
    
    console.log(`Total de usuários no auth: ${list.users.length}`);

    // 📋 Pega perfis e roles
    console.log("Buscando perfis...");
    const { data: profiles, error: profilesError } = await admin.from("profiles").select("*");
    if (profilesError) {
      console.error("Erro ao buscar perfis:", profilesError);
    }
    console.log(`Total de perfis: ${profiles?.length || 0}`);
    
    console.log("Buscando roles...");
    const { data: roles, error: rolesError } = await admin.from("user_roles").select("user_id, role");
    if (rolesError) {
      console.error("Erro ao buscar roles:", rolesError);
    }
    console.log(`Total de roles: ${roles?.length || 0}`);

    // 🔄 Processa dados
    const profilesById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    const users = list.users.map((u: any) => {
      const p: any = profilesById.get(u.id);
      // ✅ PRIORIZAR EMAIL REAL DO PROFILE, SÓ USAR AUTH SE NÃO TIVER
      const profileEmail = p?.email;
      const authEmail = u.email;
      const isFakeEmail = authEmail?.includes('@phone.app') || authEmail?.includes('@phone.treexmenu.app');
      const displayEmail = profileEmail && !isFakeEmail ? profileEmail : (isFakeEmail ? 'Email não informado' : authEmail);
      
      return {
        id: u.id,
        email: displayEmail,
        phone: p?.whatsapp_number ?? p?.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: p?.full_name ?? null,
        restaurant_name: p?.restaurant_name ?? null,
        plan_active: p?.plan_active ?? false,
        plan_type: p?.plan_type ?? null,
        plan_expires_at: p?.plan_expires_at ?? null,
        trial_ends_at: p?.trial_ends_at ?? null,
        whatsapp_addon_active: p?.whatsapp_addon_active ?? false,
        whatsapp_addon_expires_at: p?.whatsapp_addon_expires_at ?? null,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        banned_until: u.banned_until ?? null,
        roles: rolesByUser.get(u.id) ?? [],
      };
    });

    console.log(`Retornando ${users.length} usuários processados`);

    return json({ users });
  } catch (err) {
    console.error("admin-list-users error:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});
