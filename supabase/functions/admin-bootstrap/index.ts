// One-shot function: criava a conta admin inicial.
// DESATIVADA por segurança: a senha hardcoded foi removida e a função sempre
// retorna 410 Gone. O admin já existe e gerenciamento futuro deve ser feito
// pelas funções admin-* autenticadas.
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
  
  console.log("admin-bootstrap function called - but it's disabled");
  
  return json({
    ok: false,
    error: "Esta função foi desativada por segurança.",
  }, 410);
});
