// SCRIPT PARA CORRIGIR SLUG DO MASCOTY LANCHES
// Copie e cole este código no console do navegador quando estiver logado no dashboard

(async function fixMascotySlug() {
  console.log("🔧 Iniciando correção do slug para MASCOTY LANCHES...");
  
  try {
    // Acessar o cliente Supabase global (disponível no app)
    const { data: menu, error } = await window.supabase
      .from("menus")
      .select("*")
      .ilike("name", "%MASCOTY LANCHES%")
      .single();
    
    if (error || !menu) {
      console.error("❌ Cardápio não encontrado:", error);
      alert("Cardápio MASCOTY LANCHES não encontrado!");
      return;
    }
    
    console.log("✅ Cardápio encontrado:", menu);
    
    // Gerar slug válido
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
    
    // Verificar se já tem slug
    if (menu.slug) {
      console.log("ℹ️ Cardápio já tem slug:", menu.slug);
      alert(`Cardápio já tem slug: ${menu.slug}\nURL: https://${menu.slug}.treexonline.online`);
      return;
    }
    
    // Atualizar o cardápio
    const { data: updated, error: updateError } = await window.supabase
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
    
    console.log("✅ Cardápio atualizado com sucesso!");
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
