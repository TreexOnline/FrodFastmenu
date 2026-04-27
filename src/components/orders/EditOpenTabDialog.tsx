/* ============================================================
   Editar Comanda Aberta
   - Edita dados do cliente / mesa / endereço / observações
   - Altera quantidade de itens existentes
   - Remove itens existentes
   - Adiciona novos itens (com baixa de estoque)
   - Recalcula total automaticamente
============================================================ */

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Plus, Minus, Trash2, ShoppingBag, Bike, Store, Utensils, User, Phone, MapPin, Save, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEditing } from "@/contexts/EditingContext";
import { Order, OrderItem } from "@/lib/salesAnalytics";
import { AddonGroup, CartItemAddon } from "@/lib/cart";
import { ProductAddonsPicker } from "./ProductAddonsPicker";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: Order | null;
  items: OrderItem[];
  onSaved?: () => void;
}

interface ProductLite {
  id: string; name: string; price: number; image_url: string | null;
  category_id: string | null;
}
interface CategoryLite { id: string; name: string; }

type EditableItem = {
  id?: string;          // id existente em order_items (se já estava na comanda)
  isNew?: boolean;      // true se for item novo a ser inserido
  product_id: string | null;
  product_name: string;
  base_name: string;    // nome do produto sem o sufixo de adicionais
  unit_price: number;   // preço base (sem adicionais)
  quantity: number;
  category_name: string | null;
  notes: string;
  addons: CartItemAddon[];
  removed?: boolean;    // marcado para deletar
  modified?: boolean;   // marcado quando notes/addons mudaram
};

const TYPE_LABEL: Record<string, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
  dine_in: "Mesa",
};

export function EditOpenTabDialog({ open, onOpenChange, order, items, onSaved }: Props) {
  const { user } = useAuth();
  const { setIsEditingOrder } = useEditing();

  // Form fields
  const [orderType, setOrderType] = useState<string>("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Itens da comanda (existentes + novos)
  const [editItems, setEditItems] = useState<EditableItem[]>([]);

  // Catálogo p/ adicionar novos
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [search, setSearch] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [productPicker, setProductPicker] = useState<ProductLite | null>(null);

  // Controla estado de edição
  useEffect(() => {
    setIsEditingOrder(open);
  }, [open, setIsEditingOrder]);

  // Carrega dados quando abrir
  useEffect(() => {
    if (!open || !order) return;
    setOrderType((order as any).order_type || "dine_in");
    setCustomerName(order.customer_name || "");
    setCustomerPhone(order.customer_phone || "");
    setCustomerAddress(order.customer_address || "");
    setTableNumber((order as any).table_number || "");
    setNotes(order.notes || "");

    const existing: EditableItem[] = items
      .filter((it) => it.order_id === order.id)
      .map((it) => {
        const rawAddons = ((it as any).addons || []) as any[];
        const addons: CartItemAddon[] = Array.isArray(rawAddons)
          ? rawAddons.map((a: any) => ({
              group_id: a.group_id || "",
              group_name: a.group_name || "",
              option_id: a.option_id || "",
              option_name: a.option_name || "",
              price: Number(a.price) || 0,
              quantity: Number(a.quantity) || 1,
            }))
          : [];
        const addonsTotal = addons.reduce(
          (acc, a) => acc + a.price * Math.max(1, a.quantity),
          0,
        );
        const totalUnit = Number(it.unit_price);
        // unit_price salvo já inclui adicionais; separamos para edição
        const baseUnit = Math.max(0, totalUnit - addonsTotal);
        // base_name = product_name sem o sufixo "(addon1, addon2)"
        const suffix = addons.length ? ` (${addons.map((a) => a.option_name).join(", ")})` : "";
        const baseName = suffix && it.product_name.endsWith(suffix)
          ? it.product_name.slice(0, -suffix.length)
          : it.product_name;
        return {
          id: it.id,
          product_id: it.product_id,
          product_name: it.product_name,
          base_name: baseName,
          unit_price: baseUnit,
          quantity: it.quantity,
          category_name: (it as any).category_name || null,
          notes: ((it as any).notes as string | null) || "",
          addons,
        };
      });
    setEditItems(existing);
    setSearch("");
  }, [open, order, items]);

  // Carrega catálogo do menu da comanda
  useEffect(() => {
    if (!open || !order) return;
    setLoadingCatalog(true);
    (async () => {
      const [{ data: ps }, { data: cs }] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,price,image_url,category_id")
          .eq("menu_id", (order as any).menu_id)
          .eq("is_available", true)
          .order("position"),
        supabase.from("categories").select("id,name").eq("menu_id", (order as any).menu_id).order("position"),
      ]);
      setProducts((ps || []) as any);
      setCategories((cs || []) as any);
      setLoadingCatalog(false);
    })();
  }, [open, order]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const grouped = useMemo(() => {
    const out: Array<{ id: string; name: string; items: ProductLite[] }> = [];
    categories.forEach((c) => {
      const list = filteredProducts.filter((p) => p.category_id === c.id);
      if (list.length) out.push({ id: c.id, name: c.name, items: list });
    });
    const orphans = filteredProducts.filter(
      (p) => !p.category_id || !categories.find((c) => c.id === p.category_id),
    );
    if (orphans.length) out.push({ id: "__other__", name: "Outros", items: orphans });
    return out;
  }, [filteredProducts, categories]);

  const visibleItems = editItems.filter((it) => !it.removed);
  const itemUnitTotal = (it: EditableItem) =>
    it.unit_price + it.addons.reduce((a, x) => a + x.price * Math.max(1, x.quantity), 0);
  const total = useMemo(
    () => visibleItems.reduce((s, it) => s + itemUnitTotal(it) * it.quantity, 0),
    [visibleItems],
  );

  const addProduct = (p: ProductLite, addons: CartItemAddon[], qty: number, itemNotes: string) => {
    const catName = p.category_id ? categories.find((c) => c.id === p.category_id)?.name || null : null;
    setEditItems((prev) => {
      // Se já existe um item idêntico (mesmo produto, mesmo addons, mesma obs) e não removido, incrementa
      const addonsKey = JSON.stringify(addons.sort((a, b) => a.option_id.localeCompare(b.option_id)));
      const idx = prev.findIndex(
        (it) => !it.removed && it.product_id === p.id && 
                JSON.stringify(it.addons.sort((a, b) => a.option_id.localeCompare(b.option_id))) === addonsKey &&
                it.notes === itemNotes
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
        return copy;
      }
      return [
        ...prev,
        {
          isNew: true,
          product_id: p.id,
          product_name: p.name + (addons.length ? ` (${addons.map((a) => a.option_name).join(", ")})` : ""),
          base_name: p.name,
          unit_price: Number(p.price) || 0,
          quantity: qty,
          category_name: catName,
          notes: itemNotes,
          addons,
        },
      ];
    });
    toast.success(`${p.name} adicionado`);
  };

  const addNewProduct = async (p: ProductLite) => {
    // Verifica se há grupos de adicionais; se sim, abre picker, senão adiciona direto
    const { data: groups } = await supabase
      .from("product_addon_groups")
      .select("id")
      .eq("product_id", p.id)
      .limit(1);
    
    if ((groups || []).length > 0) {
      setProductPicker(p);
    } else {
      addProduct(p, [], 1, "");
    }
  };

  const inc = (i: number) =>
    setEditItems((prev) => prev.map((it, k) => (k === i ? { ...it, quantity: it.quantity + 1 } : it)));
  const dec = (i: number) =>
    setEditItems((prev) =>
      prev.map((it, k) => (k === i ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)),
    );
  const remove = (i: number) =>
    setEditItems((prev) => {
      const it = prev[i];
      // Itens novos: tira da lista. Itens existentes: marca como removed (para DELETE).
      if (it.isNew) return prev.filter((_, k) => k !== i);
      return prev.map((x, k) => (k === i ? { ...x, removed: true } : x));
    });

  const save = async () => {
    if (!user || !order) return;
    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (visibleItems.length === 0) {
      toast.error("A comanda precisa ter ao menos um item");
      return;
    }

    setSubmitting(true);
    try {
      const isTable = orderType === "dine_in";

      // 1) Atualiza dados do pedido
      const { error: upErr } = await supabase
        .from("orders")
        .update({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          customer_address: orderType === "delivery" ? customerAddress.trim() || null : null,
          notes: null,
          order_type: orderType,
          table_number: isTable ? (tableNumber.trim() || null) : null,
          total_amount: total,
        })
        .eq("id", order.id);
      if (upErr) throw upErr;

      // 2) Deleta itens removidos (e estorna estoque desses itens)
      const removedItems = editItems.filter((it) => it.removed && it.id);
      if (removedItems.length) {
        // Estorno de estoque dos itens removidos
        const productIds = Array.from(
          new Set(removedItems.map((it) => it.product_id).filter(Boolean) as string[]),
        );
        if (productIds.length) {
          const { data: recipes } = await supabase
            .from("product_recipes")
            .select("product_id, inventory_item_id, quantity_per_unit")
            .in("product_id", productIds);
          const movs: any[] = [];
          for (const it of removedItems) {
            const rs = (recipes || []).filter((r: any) => r.product_id === it.product_id);
            for (const r of rs) {
              movs.push({
                user_id: user.id,
                item_id: r.inventory_item_id,
                movement_type: "in",
                quantity: Number(r.quantity_per_unit) * it.quantity,
                reason: "Estorno por remoção de item da comanda",
                order_id: order.id,
              });
            }
          }
          if (movs.length) await supabase.from("inventory_movements").insert(movs);
        }

        const ids = removedItems.map((it) => it.id!) as string[];
        const { error: dErr } = await supabase.from("order_items").delete().in("id", ids);
        if (dErr) throw dErr;
      }

      // 3) Atualiza itens existentes (quantidade, addons, observações, nome composto)
      const originalById = new Map(items.map((i) => [i.id, i]));
      const updates = editItems.filter((it) => !it.removed && it.id);
      const qtyDeltas: Array<{ product_id: string; delta: number }> = [];
      for (const it of updates) {
        const orig = originalById.get(it.id!);
        if (!orig) continue;
        const composedName =
          it.base_name + (it.addons.length ? ` (${it.addons.map((a) => a.option_name).join(", ")})` : "");
        const unitTotal = itemUnitTotal(it);
        const newNotes = it.notes?.trim() ? it.notes.trim() : null;
        const oldNotes = ((orig as any).notes as string | null) || null;
        const needsUpdate =
          orig.quantity !== it.quantity ||
          Number(orig.unit_price) !== unitTotal ||
          orig.product_name !== composedName ||
          JSON.stringify((orig as any).addons || []) !== JSON.stringify(it.addons) ||
          oldNotes !== newNotes;
        if (needsUpdate) {
          await supabase
            .from("order_items")
            .update({
              product_name: composedName,
              quantity: it.quantity,
              unit_price: unitTotal,
              subtotal: unitTotal * it.quantity,
              addons: it.addons as any,
              notes: newNotes,
            } as any)
            .eq("id", it.id!);
          if (it.product_id && orig.quantity !== it.quantity) {
            qtyDeltas.push({ product_id: it.product_id, delta: it.quantity - orig.quantity });
          }
        }
      }

      // Ajusta estoque para mudanças de quantidade dos itens existentes
      if (qtyDeltas.length) {
        const productIds = Array.from(new Set(qtyDeltas.map((d) => d.product_id)));
        const { data: recipes } = await supabase
          .from("product_recipes")
          .select("product_id, inventory_item_id, quantity_per_unit")
          .in("product_id", productIds);
        const movs: any[] = [];
        for (const d of qtyDeltas) {
          const rs = (recipes || []).filter((r: any) => r.product_id === d.product_id);
          for (const r of rs) {
            const qty = Math.abs(Number(r.quantity_per_unit) * d.delta);
            if (qty <= 0) continue;
            movs.push({
              user_id: user.id,
              item_id: r.inventory_item_id,
              movement_type: d.delta > 0 ? "out" : "in",
              quantity: qty,
              reason:
                d.delta > 0
                  ? "Ajuste por aumento de quantidade na comanda"
                  : "Estorno por redução de quantidade na comanda",
              order_id: order.id,
            });
          }
        }
        if (movs.length) await supabase.from("inventory_movements").insert(movs);
      }

      // 4) Insere itens novos
      const newItems = editItems.filter((it) => it.isNew && !it.removed);
      if (newItems.length) {
        const inserts = newItems.map((it) => {
          const composedName =
            it.base_name + (it.addons.length ? ` (${it.addons.map((a) => a.option_name).join(", ")})` : "");
          const unitTotal = itemUnitTotal(it);
          return {
            order_id: order.id,
            product_id: it.product_id,
            product_name: composedName,
            quantity: it.quantity,
            unit_price: unitTotal,
            subtotal: unitTotal * it.quantity,
            category_name: it.category_name,
            addons: it.addons as any,
            notes: it.notes?.trim() ? it.notes.trim() : null,
          };
        });
        const { error: iErr } = await supabase.from("order_items").insert(inserts);
        if (iErr) throw iErr;

        // Baixa de estoque dos novos itens
        const productIds = Array.from(
          new Set(newItems.map((it) => it.product_id).filter(Boolean) as string[]),
        );
        if (productIds.length) {
          const { data: recipes } = await supabase
            .from("product_recipes")
            .select("product_id, inventory_item_id, quantity_per_unit")
            .in("product_id", productIds);
          const movs: any[] = [];
          for (const it of newItems) {
            const rs = (recipes || []).filter((r: any) => r.product_id === it.product_id);
            for (const r of rs) {
              movs.push({
                user_id: user.id,
                item_id: r.inventory_item_id,
                movement_type: "out",
                quantity: Number(r.quantity_per_unit) * it.quantity,
                reason: "Baixa por item adicionado na edição da comanda",
                order_id: order.id,
              });
            }
          }
          if (movs.length) await supabase.from("inventory_movements").insert(movs);
        }
      }

      toast.success("Comanda atualizada!");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar comanda");
    } finally {
      setSubmitting(false);
    }
  };

  const editingItem = editingIdx !== null ? editItems[editingIdx] : null;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-3xl flex-col overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border bg-gradient-to-r from-sky-500/10 to-card px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg font-display">
            <ShoppingBag className="h-5 w-5 text-sky-600" />
            {order && (order as any).is_open_tab ? "Editar comanda aberta" : "Editar pedido"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Altere itens, quantidades, dados do cliente e observações.
          </p>
        </SheetHeader>

        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr,360px]">
          {/* Coluna esquerda: catálogo p/ adicionar produtos */}
          <div className="flex flex-col overflow-hidden border-r border-border">
            <div className="border-b border-border bg-muted/20 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto para adicionar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingCatalog ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : grouped.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum produto disponível.
                </div>
              ) : (
                <div className="space-y-5">
                  {grouped.map((g) => (
                    <div key={g.id}>
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {g.name}
                      </div>
                      <div className="space-y-2">
                        {g.items.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addNewProduct(p)}
                            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{p.name}</div>
                              <div className="text-xs text-muted-foreground">R$ {Number(p.price).toFixed(2)}</div>
                            </div>
                            <Plus className="h-4 w-4 text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita: dados + itens da comanda */}
          <div className="flex flex-col overflow-hidden bg-muted/20">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Tipo de pedido */}
              <div className="grid grid-cols-3 gap-1.5">
                {(["delivery", "pickup", "dine_in"] as const).map((t) => {
                  const Icon = t === "delivery" ? Bike : t === "pickup" ? Store : Utensils;
                  const sel = orderType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-[11px] font-semibold transition ${
                        sel ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {TYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>

              {orderType === "dine_in" && (
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Utensils className="mr-1 inline h-3 w-3" /> Mesa (opcional)
                  </Label>
                  <Input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ex: 5"
                    maxLength={20}
                    className="mt-1 h-9"
                  />
                </div>
              )}

              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="mr-1 inline h-3 w-3" /> Cliente <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="mt-1 h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Phone className="mr-1 inline h-3 w-3" /> Telefone
                </Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="mt-1 h-9"
                />
              </div>

              {orderType === "delivery" && (
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" /> Endereço de entrega
                  </Label>
                  <Textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={2}
                    placeholder="Rua, número, bairro, complemento..."
                    className="mt-1 resize-none text-sm"
                  />
                </div>
              )}

              {/* Itens da comanda */}
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Itens da comanda ({visibleItems.reduce((a, b) => a + b.quantity, 0)})
                </div>
                {visibleItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
                    A comanda está vazia. Adicione itens à esquerda.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editItems.map((it, i) =>
                      it.removed ? null : (
                        <div key={(it.id || `new-${i}`)} className="rounded-lg border border-border bg-card p-2.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold">
                                {it.base_name}
                                {it.isNew && (
                                  <span className="ml-1.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                    Novo
                                  </span>
                                )}
                                {it.modified && !it.isNew && (
                                  <span className="ml-1.5 rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-700 dark:text-sky-300">
                                    Editado
                                  </span>
                                )}
                              </div>
                              {it.addons.length > 0 && (
                                <div className="text-[11px] text-muted-foreground">
                                  + {it.addons.map((a) => a.option_name).join(", ")}
                                </div>
                              )}
                              {it.notes && (
                                <div className="text-[11px] italic text-muted-foreground">
                                  Obs: {it.notes}
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground">
                                R$ {itemUnitTotal(it).toFixed(2)} cada
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {it.product_id && (
                                <button
                                  onClick={() => setEditingIdx(i)}
                                  className="rounded-md p-1 text-sky-600 hover:bg-sky-500/10"
                                  title="Editar adicionais e observações"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button onClick={() => remove(i)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
                              <button onClick={() => dec(i)} className="flex h-6 w-6 items-center justify-center rounded-full bg-background">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold">{it.quantity}</span>
                              <button onClick={() => inc(i)} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-sm font-bold">
                              R$ {(itemUnitTotal(it) * it.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-2 text-sm">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">R$ {total.toFixed(2)}</span>
              </div>
              <Button
                variant="cta"
                className="w-full"
                disabled={submitting}
                onClick={save}
              >
                <Save className="h-4 w-4" />
                {submitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {editingItem && (
      <ItemEditorDialog
        open={editingIdx !== null}
        onOpenChange={(o) => !o && setEditingIdx(null)}
        item={editingItem}
        onConfirm={(addons, newNotes) => {
          setEditItems((prev) =>
            prev.map((it, k) =>
              k === editingIdx
                ? { ...it, addons, notes: newNotes, modified: true }
                : it,
            ),
          );
          setEditingIdx(null);
        }}
      />
    )}

    {/* Picker de adicionais para novos produtos */}
    {productPicker && (
      <ProductAddonsPicker
        product={productPicker}
        onClose={() => setProductPicker(null)}
        onConfirm={(addons, qty, itemNotes) => {
          addProduct(productPicker, addons, qty, itemNotes);
          setProductPicker(null);
        }}
      />
    )}
    </>
  );
}

/* ============================================================
   Sub-dialog: Editar item da comanda
   - Carrega os grupos de adicionais do produto
   - Pré-seleciona os adicionais atuais
   - Permite alterar e mudar a observação
============================================================ */
function ItemEditorDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: EditableItem;
  onConfirm: (addons: CartItemAddon[], notes: string) => void;
}) {
  const [groups, setGroups] = useState<AddonGroup[] | null>(null);
  const [selected, setSelected] = useState<Record<string, Record<string, number>>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !item.product_id) return;
    setNotes(item.notes || "");
    // Pré-popula seleções a partir dos addons atuais do item
    const seed: Record<string, Record<string, number>> = {};
    for (const a of item.addons) {
      if (!a.group_id || !a.option_id) continue;
      seed[a.group_id] = seed[a.group_id] || {};
      seed[a.group_id][a.option_id] = a.quantity || 1;
    }
    setSelected(seed);

    (async () => {
      const { data: gs } = await supabase
        .from("product_addon_groups")
        .select("*")
        .eq("product_id", item.product_id!)
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
          is_required: g.is_required, max_selections: g.max_selections,
          options: opts.map((o: any) => ({
            id: o.id, name: o.name, price: Number(o.price) || 0,
            default_quantity: Number(o.default_quantity) || 1,
          })),
        };
      });
      setGroups(built);
    })();
  }, [open, item]);

  const toggle = (g: AddonGroup, optId: string) => {
    setSelected((cur) => {
      const groupSel = { ...(cur[g.id] || {}) };
      if (g.selection_type === "single") {
        return { ...cur, [g.id]: { [optId]: 1 } };
      }
      if (groupSel[optId]) delete groupSel[optId];
      else {
        const max = g.max_selections;
        const total = Object.keys(groupSel).length;
        if (max && total >= max) return cur;
        groupSel[optId] = 1;
      }
      return { ...cur, [g.id]: groupSel };
    });
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

  const newUnit =
    item.unit_price + addonsOut.reduce((a, b) => a + b.price * Math.max(1, b.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar — {item.base_name}</DialogTitle>
        </DialogHeader>
        {!groups ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                Este produto não tem grupos de adicionais.
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {g.name}
                      {g.is_required && <span className="ml-1 text-xs text-rose-500">*obrigatório</span>}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {g.selection_type === "single" ? "Escolha 1" : `Até ${g.max_selections || g.options.length}`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {g.options.map((o) => {
                      const sel = !!selected[g.id]?.[o.id];
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggle(g, o.id)}
                          className={`flex w-full items-center justify-between rounded-md border-2 px-2.5 py-1.5 text-sm transition ${
                            sel ? "border-primary bg-primary/10" : "border-border bg-background"
                          }`}
                        >
                          <span>{o.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {o.price > 0 ? `+ R$ ${o.price.toFixed(2)}` : "Grátis"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Observações deste item
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: sem cebola, ponto da carne..."
                className="mt-1 resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-sm">
              <span className="text-muted-foreground">Novo preço unitário</span>
              <span className="font-bold text-primary">R$ {newUnit.toFixed(2)}</span>
            </div>

            <Button
              variant="cta"
              className="w-full"
              disabled={missing}
              onClick={() => onConfirm(addonsOut, notes)}
            >
              Salvar alterações do item
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
