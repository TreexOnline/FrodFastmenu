import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Boxes, Info } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_quantity: number;
}

interface Recipe {
  id: string;
  inventory_item_id: string;
  quantity_per_unit: number;
}

interface Props {
  productId: string;
}

export const RecipeManager = ({ productId }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState("1");

  const load = async () => {
    if (!user || !productId) return;
    setLoading(true);
    const [itemsRes, recipesRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("id,name,unit,current_quantity")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("product_recipes")
        .select("id,inventory_item_id,quantity_per_unit")
        .eq("product_id", productId),
    ]);
    if (!itemsRes.error) setItems((itemsRes.data || []) as InventoryItem[]);
    if (!recipesRes.error) setRecipes((recipesRes.data || []) as Recipe[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId]);

  const usedIds = new Set(recipes.map((r) => r.inventory_item_id));
  const available = items.filter((i) => !usedIds.has(i.id));

  const addRecipe = async () => {
    if (!user || !newItemId) {
      toast.error("Selecione um insumo");
      return;
    }
    const qty = Number(newQty);
    if (!qty || qty <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    const { error } = await supabase.from("product_recipes").insert({
      user_id: user.id,
      product_id: productId,
      inventory_item_id: newItemId,
      quantity_per_unit: qty,
    });
    if (error) return toast.error("Erro ao vincular insumo");
    setNewItemId("");
    setNewQty("1");
    setAdding(false);
    load();
  };

  const updateQty = async (recipeId: string, qty: number) => {
    if (!qty || qty <= 0) return;
    await supabase.from("product_recipes").update({ quantity_per_unit: qty }).eq("id", recipeId);
  };

  const removeRecipe = async (recipeId: string) => {
    const { error } = await supabase.from("product_recipes").delete().eq("id", recipeId);
    if (error) return toast.error("Erro ao remover");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm">
        <Boxes className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground mb-2">
          Nenhum item de estoque cadastrado.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/estoque">Ir para Estoque</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Defina quanto deste produto consome cada insumo. A baixa é automática a cada pedido confirmado.
        </span>
      </div>

      {recipes.length > 0 && (
        <ul className="space-y-1.5">
          {recipes.map((r) => {
            const item = items.find((i) => i.id === r.inventory_item_id);
            if (!item) return null;
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Atual: {item.current_quantity} {item.unit}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  defaultValue={r.quantity_per_unit}
                  onBlur={(e) => updateQty(r.id, Number(e.target.value))}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeRecipe(r.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">Insumo</Label>
            <Select value={newItemId} onValueChange={setNewItemId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    Todos os insumos já vinculados
                  </div>
                ) : (
                  available.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Label className="text-xs">Qtd</Label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button size="sm" variant="brand" onClick={addRecipe}>Adicionar</Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          disabled={available.length === 0}
          className="w-full gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {available.length === 0 ? "Todos os insumos vinculados" : "Vincular insumo"}
        </Button>
      )}
    </div>
  );
};
