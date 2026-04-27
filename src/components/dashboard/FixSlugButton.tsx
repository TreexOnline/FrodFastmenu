import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fixMascotyLanchesSlug } from "@/utils/fixMenuSlug";

export function FixSlugButton() {
  const [loading, setLoading] = useState(false);
  
  const handleFixSlug = async () => {
    setLoading(true);
    
    try {
      const result = await fixMascotyLanchesSlug();
      
      if (result.success) {
        if (result.existingSlug) {
          toast.success(`Cardápio já tem slug: ${result.existingSlug}`);
        } else {
          toast.success(`Slug corrigido! URL: ${result.url}`);
          // Recarregar a página para mostrar as mudanças
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        toast.error(`Erro ao corrigir slug: ${result.error}`);
      }
    } catch (error) {
      toast.error("Erro inesperado ao corrigir slug");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleFixSlug}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? "Corrigindo..." : "Corrigir Slug MASCOTY LANCHES"}
    </Button>
  );
}
