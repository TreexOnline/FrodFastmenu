// COPIE E COLE ESTE CÓDIGO NO CONSOLE DO NAVEGADOR (F12) QUANDO ESTIVER NO DASHBOARD
(async function fixMascotySlug() {
  console.log("🔧 Iniciando correção do slug para MASCOTY LANCHES...");
  
  try {
    // Acessar Supabase através da janela global
    const supabase = window.supabase || (await import('@/integrations/supabase/client')).supabase;
    
    if (!supabase) {
      console.error("❌ Cliente Supabase não encontrado");
      alert("Erro: Cliente Supabase não encontrado. Recarregue a página e tente novamente.");
      return;
    }
    
    // 1. Buscar o cardápio pelo nome
    const { data: menu, error: findError } = await supabase
      .from("menus")
      .select("*")
      .ilike("name", "%MASCOTY LANCHES%")
      .single();
    
    if (findError || !menu) {
      console.error("❌ Cardápio não encontrado:", findError);
      alert("Cardápio MASCOTY LANCHES não encontrado!");
      return;
    }
    
    console.log("✅ Cardápio encontrado:", menu);
    
    // 2. Gerar slug válido
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
    };
    
    const newSlug = generateSlug(menu.name);
    console.log("📝 Slug gerado:", newSlug);
    
    // 3. Verificar se já tem slug
    if (menu.slug && menu.slug !== newSlug) {
      console.log("ℹ️ Cardápio já tem slug:", menu.slug);
      const updateAnyway = confirm(`Cardápio já tem slug: ${menu.slug}\n\nDeseja atualizar para: ${newSlug} ?`);
      if (!updateAnyway) return;
    }
    
    if (menu.slug === newSlug) {
      console.log("ℹ️ Cardápio já tem o slug correto:", menu.slug);
      alert(`Cardápio já tem o slug correto: ${menu.slug}\nURL: https://${menu.slug}.treexonline.online`);
      return;
    }
    
    // 4. Atualizar o cardápio
    const { data: updated, error: updateError } = await supabase
      .from("menus")
      .update({ slug: newSlug })
      .eq("id", menu.id)
      .select()
      .single();
    
    if (updateError) {
      console.error("❌ Erro ao atualizar:", updateError);
      alert("Erro ao atualizar o cardápio: " + updateError.message);
      return;
    }
    
    console.log("✅ Cardápio atualizado com sucesso!", updated);
    alert(`Slug corrigido com sucesso!\n\nNome: ${updated.name}\nSlug: ${updated.slug}\nURL: https://${updated.slug}.treexonline.online\n\nRecarregue a página para ver as mudanças.`);
    
    // Recarregar após 3 segundos
    setTimeout(() => {
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
    alert("Erro inesperado: " + error.message);
  }
})();
