import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/slugGenerator";

/**
 * Script para corrigir slug do cardápio "MASCOTY LANCHES"
 */
export async function fixMascotyLanchesSlug() {
  console.log("🔧 [FixMenuSlug] Iniciando correção do cardápio MASCOTY LANCHES...");
  
  try {
    // 1. Buscar o cardápio pelo nome
    const { data: menu, error: findError } = await supabase
      .from("menus")
      .select("*")
      .ilike("name", "%MASCOTY LANCHES%")
      .single();
    
    if (findError || !menu) {
      console.error("❌ [FixMenuSlug] Cardápio não encontrado:", findError);
      return { success: false, error: "Cardápio não encontrado" };
    }
    
    console.log("✅ [FixMenuSlug] Cardápio encontrado:", menu.name, "ID:", menu.id);
    
    // 2. Gerar slug válido
    const newSlug = generateSlug(menu.name);
    console.log("📝 [FixMenuSlug] Slug gerado:", newSlug);
    
    // 3. Verificar se já tem slug
    if (menu.slug) {
      console.log("ℹ️ [FixMenuSlug] Cardápio já tem slug:", menu.slug);
      return { success: true, existingSlug: menu.slug };
    }
    
    // 4. Atualizar com o novo slug
    const { data: updated, error: updateError } = await supabase
      .from("menus")
      .update({ slug: newSlug })
      .eq("id", menu.id)
      .select()
      .single();
    
    if (updateError) {
      console.error("❌ [FixMenuSlug] Erro ao atualizar:", updateError);
      return { success: false, error: updateError };
    }
    
    console.log("✅ [FixMenuSlug] Cardápio atualizado com sucesso!");
    console.log("🔗 [FixMenuSlug] URL do cardápio:", `https://${newSlug}.treexonline.online`);
    
    return { 
      success: true, 
      menu: updated,
      url: `https://${newSlug}.treexonline.online`
    };
    
  } catch (error) {
    console.error("❌ [FixMenuSlug] Erro inesperado:", error);
    return { success: false, error };
  }
}
