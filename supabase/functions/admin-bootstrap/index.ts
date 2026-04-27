// One-shot function: criava a conta admin inicial.
// DESATIVADA por segurança: a senha hardcoded foi removida e a função sempre
// retorna 410 Gone. O admin já existe e gerenciamento futuro deve ser feito
// pelas funções admin-* autenticadas.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Esta função foi desativada por segurança.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
