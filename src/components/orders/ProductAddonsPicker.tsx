import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Minus } from "lucide-react";
import { AddonGroup, CartItemAddon } from "@/lib/cart";

interface ProductLite {
  id: string; 
  name: string; 
  price: number; 
  image_url: string | null;
  category_id: string | null;
  description: string | null;
}

interface Props {
  product: ProductLite;
  onClose: () => void;
  onConfirm: (addons: CartItemAddon[], qty: number, notes: string) => void;
}

export function ProductAddonsPicker({
  product,
  onClose,
  onConfirm,
}: Props) {
  const [groups, setGroups] = useState<AddonGroup[] | null>(null);
  const [selected, setSelected] = useState<Record<string, Record<string, number>>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const { data: gs } = await supabase
        .from("product_addon_groups")
        .select("*")
        .eq("product_id", product.id)
        .order("position");
      const productGroupIds = (gs || []).filter((g: any) => !g.library_group_id).map((g: any) => g.id);
      const libraryGroupIds = (gs || []).filter((g: any) => !!g.library_group_id).map((g: any) => g.library_group_id);
      const [{ data: po }, { data: lo }] = await Promise.all([
        productGroupIds.length
          ? supabase.from("product_addons").select("*").in("group_id", productGroupIds).eq("is_available", true).order("position")
          : Promise.resolve({ data: [] as any[] }),
        libraryGroupIds.length
          ? supabase.from("addon_library_options").select("*").in("library_group_id", libraryGroupIds).eq("is_available", true).order("position")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const built: AddonGroup[] = (gs || []).map((g: any) => {
        const opts = g.library_group_id
          ? (lo || []).filter((o: any) => o.library_group_id === g.library_group_id)
          : (po || []).filter((o: any) => o.group_id === g.id);
        return {
          id: g.id, name: g.name, selection_type: g.selection_type,
          is_required: g.max_selections === 1 ? false : g.is_required, max_selections: g.max_selections,
          options: opts.map((o: any) => ({
            id: o.id, name: o.name, price: Number(o.price) || 0,
            default_quantity: Number(o.default_quantity) || 1,
          })),
        };
      });
      setGroups(built);
    })();
  }, [product.id]);

  const updateQuantity = (g: AddonGroup, optId: string, delta: number) => {
    setSelected((cur) => {
      const groupSel = { ...(cur[g.id] || {}) };
      const currentQty = groupSel[optId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (g.selection_type === "single") {
        // Para seleção única, sempre define como 1 ou 0
        return { ...cur, [g.id]: newQty > 0 ? { [optId]: 1 } : {} };
      }
      
      if (newQty === 0) {
        delete groupSel[optId];
      } else {
        // Verificar se não excede o máximo de seleções (considerando diferentes itens)
        const max = g.max_selections;
        const total = Object.keys(groupSel).length;
        if (max && total >= max && !groupSel[optId]) return cur;
        groupSel[optId] = newQty;
      }
      return { ...cur, [g.id]: groupSel };
    });
  };

  const toggle = (g: AddonGroup, optId: string) => {
    const currentQty = selected[g.id]?.[optId] || 0;
    if (currentQty > 0) {
      updateQuantity(g, optId, -currentQty); // Remove tudo
    } else {
      updateQuantity(g, optId, 1); // Adiciona 1
    }
  };

  const addonsOut: CartItemAddon[] = useMemo(() => {
    if (!groups) return [];
    const out: CartItemAddon[] = [];
    for (const g of groups) {
      const sel = selected[g.id] || {};
      for (const o of g.options) {
        if (sel[o.id]) {
          out.push({
            group_id: g.id, group_name: g.name, option_id: o.id,
            option_name: o.name, price: o.price, quantity: sel[o.id],
          });
        }
      }
    }
    return out;
  }, [groups, selected]);

  const missing = useMemo(() => {
    if (!groups) return false;
    return groups.some((g) => g.is_required && Object.keys(selected[g.id] || {}).length === 0);
  }, [groups, selected]);

  const totalPrice = (Number(product.price) + addonsOut.reduce((a, b) => a + b.price * b.quantity, 0)) * qty;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        {!groups ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold text-sm">
                    {g.name}
                    {g.is_required && <span className="ml-1 text-xs text-rose-500">*obrigatório</span>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {g.selection_type === "single" ? "Escolha 1" : `Até ${g.max_selections || g.options.length}`}
                  </span>
                </div>
                <div className="space-y-1">
                  {g.options.map((o) => {
                    const qty = selected[g.id]?.[o.id] || 0;
                    const sel = qty > 0;
                    return (
                      <div
                        key={o.id}
                        className={`flex w-full items-center justify-between rounded-md border-2 px-2.5 py-1.5 text-sm transition ${
                          sel ? "border-primary bg-primary/10" : "border-border bg-background"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(g, o.id)}
                          className="flex-1 text-left"
                        >
                          <span>{o.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {o.price > 0 ? `+ R$ ${o.price.toFixed(2)}` : "Grátis"}
                          </span>
                        </button>
                        {sel && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(g, o.id, -1);
                              }}
                              className="h-5 w-5 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-semibold min-w-[16px] text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(g, o.id, 1);
                              }}
                              className="h-5 w-5 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observação para este item (opcional)"
              className="resize-none text-sm leading-relaxed"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantidade</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQty(qty + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</div>
                <div className="mt-1 text-lg font-bold text-primary">
                  R$ {totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
            <Button
              variant="cta"
              className="flex-1"
              disabled={missing}
              onClick={() => onConfirm(addonsOut, qty, notes)}
            >
              Adicionar — R$ {totalPrice.toFixed(2)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
