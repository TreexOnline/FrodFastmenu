import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/useAccess";
import { BlockedAccess } from "@/components/BlockedAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowDown,
  ArrowUp,
  History,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ChefHat,
  Wine,
  Link2,
  ChevronsUpDown,
  Check,
  Sparkles,
  PencilLine,
} from "lucide-react";
import { toast } from "sonner";

type ItemKind = "kitchen" | "beverage";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  cost_per_unit: number | null;
  block_sale_when_empty: boolean;
  kind: ItemKind;
}

interface Movement {
  id: string;
  item_id: string;
  movement_type: "in" | "out";
  quantity: number;
  reason: string | null;
  created_at: string;
}

interface ProductLite {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  category: string | null;
}

interface CategoryLite {
  id: string;
  name: string;
}

/**
 * Detecção flexível de categorias de bebidas.
 * Normaliza acentos, faz match por palavras-chave/substring.
 */
const BEVERAGE_KEYWORDS = [
  "bebida",
  "bebidas",
  "drink",
  "drinks",
  "refri",
  "refrigerante",
  "refrigerantes",
  "suco",
  "sucos",
  "cerveja",
  "cervejas",
  "chopp",
  "chope",
  "vinho",
  "vinhos",
  "agua",
  "aguas",
  "cafe",
  "cafes",
  "cha",
  "chas",
  "coquetel",
  "coqueteis",
  "coquetelaria",
  "drinque",
  "drinques",
  "long neck",
  "longneck",
  "energetico",
  "energeticos",
  "isotonico",
  "isotonicos",
  "smoothie",
  "smoothies",
  "milkshake",
  "shake",
  "shakes",
  "vitamina",
  "vitaminas",
  "liquido",
  "liquidos",
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const isBeverageCategoryName = (name: string | null | undefined): boolean => {
  if (!name) return false;
  const n = normalize(name);
  return BEVERAGE_KEYWORDS.some((kw) => n.includes(kw));
};

const UNITS = [
  { value: "un", label: "Unidade (un)" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "L", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
];

type StatusFilter = "all" | "low" | "out";
type SortBy = "name" | "qty";

const getStatus = (it: InventoryItem) => {
  if (it.current_quantity <= 0) return "out" as const;
  if (it.current_quantity <= it.min_quantity) return "low" as const;
  return "ok" as const;
};

const StatusBadge = ({ item }: { item: InventoryItem }) => {
  const s = getStatus(item);
  if (s === "out") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <XCircle className="h-3 w-3" /> Esgotado
      </span>
    );
  }
  if (s === "low") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" /> Baixo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> Normal
    </span>
  );
};

const Inventory = () => {
  const { user } = useAuth();
  const access = useAccess();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Aba principal: cozinha vs bebidas
  const [kindTab, setKindTab] = useState<ItemKind>("kitchen");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  // Item dialog (cozinha)
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "un",
    current_quantity: "0",
    min_quantity: "0",
    cost_per_unit: "",
    block_sale_when_empty: false,
  });

  // Beverage dialog
  const [bevOpen, setBevOpen] = useState(false);
  const [bevEditing, setBevEditing] = useState<InventoryItem | null>(null);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [linkedProductIds, setLinkedProductIds] = useState<Record<string, string>>({}); // inventory_item_id -> product_id
  const [bevForm, setBevForm] = useState({
    productId: "",
    name: "",
    cost_per_unit: "",
    current_quantity: "0",
    min_quantity: "0",
    block_sale_when_empty: false,
  });
  const [bevPickerOpen, setBevPickerOpen] = useState(false);
  const [bevManualMode, setBevManualMode] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<"in" | "out">("in");
  const [movementQty, setMovementQty] = useState("");
  const [movementReason, setMovementReason] = useState("");

  // History dialog
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar estoque");
    } else {
      setItems((data || []) as InventoryItem[]);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    if (!user) return;
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, category, category_id")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id),
    ]);
    setCategories((cats || []) as CategoryLite[]);
    setProducts((prods || []) as ProductLite[]);
  };

  const loadBeverageLinks = async () => {
    if (!user) return;
    // Receitas 1:1 (quantidade=1) representam o vínculo bebida->produto
    const { data } = await supabase
      .from("product_recipes")
      .select("product_id, inventory_item_id, quantity_per_unit")
      .eq("user_id", user.id);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => {
      if (Number(r.quantity_per_unit) === 1) {
        map[r.inventory_item_id] = r.product_id;
      }
    });
    setLinkedProductIds(map);
  };

  useEffect(() => {
    load();
    loadProducts();
    loadBeverageLinks();
    if (!user) return;
    const ch = supabase
      .channel("inventory-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `user_id=eq.${user.id}` },
        () => loadProducts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `user_id=eq.${user.id}` },
        () => loadProducts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_recipes", filter: `user_id=eq.${user.id}` },
        () => loadBeverageLinks(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const visibleItems = useMemo(() => items.filter((i) => i.kind === kindTab), [items, kindTab]);

  const filtered = useMemo(() => {
    let list = visibleItems.slice();
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    if (statusFilter !== "all") list = list.filter((i) => getStatus(i) === statusFilter);
    list.sort((a, b) => {
      if (sortBy === "qty") return a.current_quantity - b.current_quantity;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [visibleItems, search, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = visibleItems.length;
    const low = visibleItems.filter((i) => getStatus(i) === "low").length;
    const out = visibleItems.filter((i) => getStatus(i) === "out").length;
    return { total, low, out };
  }, [visibleItems]);

  // ---------- DETECÇÃO INTELIGENTE DE BEBIDAS ----------
  const beverageCategoryIds = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => {
      if (isBeverageCategoryName(c.name)) set.add(c.id);
    });
    return set;
  }, [categories]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const beverageProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.category_id && beverageCategoryIds.has(p.category_id)) return true;
      if (p.category && isBeverageCategoryName(p.category)) return true;
      return false;
    });
  }, [products, beverageCategoryIds]);

  const beverageProductsByCategory = useMemo(() => {
    const groups = new Map<string, ProductLite[]>();
    beverageProducts.forEach((p) => {
      const catName =
        (p.category_id && categoryNameById.get(p.category_id)) || p.category || "Bebidas";
      if (!groups.has(catName)) groups.set(catName, []);
      groups.get(catName)!.push(p);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [beverageProducts, categoryNameById]);

  // ---------- COZINHA ----------
  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      unit: "un",
      current_quantity: "0",
      min_quantity: "0",
      cost_per_unit: "",
      block_sale_when_empty: false,
    });
    setOpen(true);
  };

  const openEdit = (it: InventoryItem) => {
    setEditing(it);
    setForm({
      name: it.name,
      unit: it.unit,
      current_quantity: String(it.current_quantity),
      min_quantity: String(it.min_quantity),
      cost_per_unit: it.cost_per_unit != null ? String(it.cost_per_unit) : "",
      block_sale_when_empty: it.block_sale_when_empty,
    });
    setOpen(true);
  };

  const saveItem = async () => {
    if (!user) return;
    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome do item");
      return;
    }
    const payload = {
      user_id: user.id,
      name,
      unit: form.unit,
      current_quantity: Math.max(0, Number(form.current_quantity) || 0),
      min_quantity: Math.max(0, Number(form.min_quantity) || 0),
      cost_per_unit: form.cost_per_unit === "" ? null : Number(form.cost_per_unit),
      block_sale_when_empty: form.block_sale_when_empty,
      kind: "kitchen" as ItemKind,
    };
    if (editing) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", editing.id);
      if (error) return toast.error("Erro ao salvar item");
      toast.success("Item atualizado");
    } else {
      const { error } = await supabase.from("inventory_items").insert(payload);
      if (error) return toast.error("Erro ao criar item");
      toast.success("Item criado");
    }
    setOpen(false);
    load();
  };

  // ---------- BEBIDA ----------
  const openNewBeverage = () => {
    setBevEditing(null);
    setBevManualMode(false);
    setBevForm({
      productId: "",
      name: "",
      cost_per_unit: "",
      current_quantity: "0",
      min_quantity: "0",
      block_sale_when_empty: true,
    });
    setBevOpen(true);
  };

  const openEditBeverage = (it: InventoryItem) => {
    setBevEditing(it);
    const linkedPid = linkedProductIds[it.id] || "";
    setBevManualMode(!linkedPid);
    setBevForm({
      productId: linkedPid,
      name: it.name,
      cost_per_unit: it.cost_per_unit != null ? String(it.cost_per_unit) : "",
      current_quantity: String(it.current_quantity),
      min_quantity: String(it.min_quantity),
      block_sale_when_empty: it.block_sale_when_empty,
    });
    setBevOpen(true);
  };

  // IDs de produtos já vinculados (excluindo o item em edição)
  const usedProductIds = useMemo(() => {
    const set = new Set<string>();
    Object.entries(linkedProductIds).forEach(([itemId, pid]) => {
      if (!bevEditing || itemId !== bevEditing.id) set.add(pid);
    });
    return set;
  }, [linkedProductIds, bevEditing]);

  const handleBevProductChange = (pid: string) => {
    const prod = products.find((p) => p.id === pid);
    setBevForm((f) => ({
      ...f,
      productId: pid,
      name: prod?.name ?? f.name,
    }));
    setBevManualMode(false);
    setBevPickerOpen(false);
  };

  const enableBevManualMode = () => {
    setBevManualMode(true);
    setBevForm((f) => ({ ...f, productId: "", name: bevEditing?.name && !linkedProductIds[bevEditing?.id || ""] ? f.name : "" }));
    setBevPickerOpen(false);
  };

  const saveBeverage = async () => {
    if (!user) return;
    const name = bevForm.name.trim();
    if (!name) {
      toast.error("Informe o nome da bebida");
      return;
    }

    const payload = {
      user_id: user.id,
      name,
      unit: "un",
      current_quantity: Math.max(0, Number(bevForm.current_quantity) || 0),
      min_quantity: Math.max(0, Number(bevForm.min_quantity) || 0),
      cost_per_unit: bevForm.cost_per_unit === "" ? null : Number(bevForm.cost_per_unit),
      block_sale_when_empty: bevForm.block_sale_when_empty,
      kind: "beverage" as ItemKind,
    };

    let inventoryItemId: string;

    if (bevEditing) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", bevEditing.id);
      if (error) return toast.error("Erro ao salvar bebida");
      inventoryItemId = bevEditing.id;
    } else {
      const { data: created, error } = await supabase
        .from("inventory_items")
        .insert(payload)
        .select("id")
        .single();
      if (error || !created) return toast.error("Erro ao criar bebida");
      inventoryItemId = created.id;
    }

    // Sincroniza vínculo (receita 1:1) com o produto
    const previousProductId = bevEditing ? linkedProductIds[bevEditing.id] : undefined;
    const newProductId = bevForm.productId || undefined;

    if (previousProductId && previousProductId !== newProductId) {
      // Remove receita antiga
      await supabase
        .from("product_recipes")
        .delete()
        .eq("user_id", user.id)
        .eq("inventory_item_id", inventoryItemId)
        .eq("product_id", previousProductId);
    }

    if (newProductId && newProductId !== previousProductId) {
      const { error: recErr } = await supabase.from("product_recipes").insert({
        user_id: user.id,
        product_id: newProductId,
        inventory_item_id: inventoryItemId,
        quantity_per_unit: 1,
      });
      if (recErr) {
        toast.error("Bebida salva, mas falhou ao vincular ao produto");
      }
    }

    toast.success(bevEditing ? "Bebida atualizada" : "Bebida adicionada");
    setBevOpen(false);
    load();
    loadBeverageLinks();
  };

  // ---------- COMUM ----------
  const deleteItem = async (it: InventoryItem) => {
    if (!confirm(`Excluir "${it.name}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", it.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Item excluído");
    load();
    loadBeverageLinks();
  };

  const openMovement = (it: InventoryItem, type: "in" | "out") => {
    setMovementItem(it);
    setMovementType(type);
    setMovementQty("");
    setMovementReason("");
  };

  const submitMovement = async () => {
    if (!user || !movementItem) return;
    const qty = Number(movementQty);
    if (!qty || qty <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    if (movementType === "out" && qty > movementItem.current_quantity) {
      toast.error("Quantidade maior que o estoque atual");
      return;
    }
    const { error } = await supabase.from("inventory_movements").insert({
      user_id: user.id,
      item_id: movementItem.id,
      movement_type: movementType,
      quantity: qty,
      reason: movementReason.trim() || null,
    });
    if (error) return toast.error("Erro ao registrar movimentação");
    toast.success(movementType === "in" ? "Entrada registrada" : "Saída registrada");
    setMovementItem(null);
    load();
  };

  const openHistory = async (it: InventoryItem) => {
    setHistoryItem(it);
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("item_id", it.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setMovements((data || []) as Movement[]);
  };

  if (access.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!access.hasAccess) {
    return (
      <div className="p-4 sm:p-8">
        <BlockedAccess />
      </div>
    );
  }

  const isBev = kindTab === "beverage";

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle seus insumos e dê baixa automática a cada pedido.
          </p>
        </div>
        {isBev ? (
          <Button onClick={openNewBeverage} variant="brand" size="lg" className="gap-2">
            <Plus className="h-4 w-4" /> Nova bebida
          </Button>
        ) : (
          <Button onClick={openNew} variant="brand" size="lg" className="gap-2">
            <Plus className="h-4 w-4" /> Novo item
          </Button>
        )}
      </div>

      {/* Kind Tabs */}
      <Tabs value={kindTab} onValueChange={(v) => setKindTab(v as ItemKind)}>
        <TabsList className="h-11 p-1">
          <TabsTrigger value="kitchen" className="gap-2 px-4">
            <ChefHat className="h-4 w-4" /> Cozinha
          </TabsTrigger>
          <TabsTrigger value="beverage" className="gap-2 px-4">
            <Wine className="h-4 w-4" /> Bebidas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {isBev ? <Wine className="h-5 w-5 text-primary" /> : <Package className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {isBev ? "Bebidas cadastradas" : "Itens cadastrados"}
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estoque baixo</div>
              <div className="text-2xl font-bold">{stats.low}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Esgotados</div>
              <div className="text-2xl font-bold">{stats.out}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isBev ? "Buscar bebida..." : "Buscar item..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="low">Baixo</TabsTrigger>
              <TabsTrigger value="out">Esgotado</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Ordenar: Nome</SelectItem>
              <SelectItem value="qty">Ordenar: Quantidade</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              {isBev ? (
                <Wine className="h-7 w-7 text-muted-foreground" />
              ) : (
                <Package className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {isBev ? "Nenhuma bebida cadastrada" : "Nenhum item encontrado"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {visibleItems.length === 0
                ? isBev
                  ? "Comece adicionando sua primeira bebida."
                  : "Comece adicionando seu primeiro item de estoque."
                : "Ajuste os filtros ou crie um novo item."}
            </p>
            {isBev ? (
              <Button onClick={openNewBeverage} variant="brand" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Nova bebida
              </Button>
            ) : (
              <Button onClick={openNew} variant="brand" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Novo item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((it) => {
            const linkedProductId = linkedProductIds[it.id];
            const linkedProduct = linkedProductId
              ? products.find((p) => p.id === linkedProductId)
              : null;
            return (
              <Card key={it.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Mínimo: {it.min_quantity} {it.unit}
                        {it.cost_per_unit != null && (
                          <> · Custo: R$ {Number(it.cost_per_unit).toFixed(2)}</>
                        )}
                      </div>
                      {isBev && linkedProduct && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Link2 className="h-3 w-3" /> {linkedProduct.name}
                        </div>
                      )}
                    </div>
                    <StatusBadge item={it} />
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums">
                      {Number(it.current_quantity).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-sm text-muted-foreground">{it.unit}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openMovement(it, "in")}>
                      <ArrowUp className="h-3.5 w-3.5" /> Entrada
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openMovement(it, "out")}>
                      <ArrowDown className="h-3.5 w-3.5" /> Saída
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => openHistory(it)}>
                      <History className="h-3.5 w-3.5" /> Histórico
                    </Button>
                    <div className="ml-auto flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => (isBev ? openEditBeverage(it) : openEdit(it))}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteItem(it)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New / edit item (cozinha) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do item</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Pão de hambúrguer"
                maxLength={80}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade atual</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.001"
                  value={form.current_quantity}
                  onChange={(e) => setForm({ ...form, current_quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estoque mínimo</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.001"
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>Custo por unidade (R$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Opcional"
                  value={form.cost_per_unit}
                  onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Bloquear venda quando zerar</div>
                <div className="text-xs text-muted-foreground">
                  Produtos que dependem deste item ficam indisponíveis.
                </div>
              </div>
              <Switch
                checked={form.block_sale_when_empty}
                onCheckedChange={(v) => setForm({ ...form, block_sale_when_empty: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem} variant="brand">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New / edit beverage */}
      <Dialog open={bevOpen} onOpenChange={setBevOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{bevEditing ? "Editar bebida" : "Nova bebida"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Seletor inteligente de produto */}
            <div>
              <Label>Vincular a um produto do cardápio</Label>

              {bevManualMode ? (
                <div className="mt-1 flex items-center justify-between rounded-lg border border-dashed bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <PencilLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cadastro manual (sem vínculo)</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBevManualMode(false);
                      setBevPickerOpen(true);
                    }}
                  >
                    Vincular produto
                  </Button>
                </div>
              ) : (
                <Popover open={bevPickerOpen} onOpenChange={setBevPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={bevPickerOpen}
                      className="mt-1 w-full justify-between font-normal"
                    >
                      {bevForm.productId ? (
                        <span className="flex items-center gap-2 truncate">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">
                            {products.find((p) => p.id === bevForm.productId)?.name ||
                              "Produto selecionado"}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Sparkles className="h-4 w-4" />
                          Sugestões automáticas de bebidas
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar bebida..." />
                      <CommandList>
                        <CommandEmpty>
                          {beverageProducts.length === 0
                            ? "Nenhuma categoria de bebidas detectada no cardápio."
                            : "Nenhum produto encontrado."}
                        </CommandEmpty>

                        {beverageProductsByCategory.map(([catName, prods]) => (
                          <CommandGroup key={catName} heading={catName}>
                            {prods.map((p) => {
                              const used = usedProductIds.has(p.id);
                              const selected = bevForm.productId === p.id;
                              return (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.name} ${catName}`}
                                  disabled={used && !selected}
                                  onSelect={() => !used && handleBevProductChange(p.id)}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Check
                                      className={`h-4 w-4 shrink-0 ${
                                        selected ? "opacity-100 text-primary" : "opacity-0"
                                      }`}
                                    />
                                    <span className="truncate">{p.name}</span>
                                  </div>
                                  {used && !selected && (
                                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      vinculado
                                    </span>
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        ))}

                        <CommandGroup heading="Outras opções">
                          <CommandItem onSelect={enableBevManualMode} value="__manual__">
                            <PencilLine className="mr-2 h-4 w-4" />
                            Sem vínculo (digitar manualmente)
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {bevForm.productId && !bevManualMode && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    Vinculado a <strong>{products.find((p) => p.id === bevForm.productId)?.name}</strong> · cada venda baixa 1 unidade
                  </span>
                </div>
              )}

              {!bevForm.productId && !bevManualMode && beverageProducts.length === 0 && categories.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Crie uma categoria como <em>Bebidas</em>, <em>Sucos</em> ou <em>Refrigerantes</em> no cardápio para ver sugestões automáticas.
                </p>
              )}
            </div>

            <div>
              <Label>Nome da bebida</Label>
              <Input
                value={bevForm.name}
                onChange={(e) => setBevForm({ ...bevForm, name: e.target.value })}
                placeholder="Ex: Coca-Cola lata 350ml"
                maxLength={80}
                disabled={!!bevForm.productId && !bevManualMode}
              />
              {!!bevForm.productId && !bevManualMode && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Nome herdado do produto vinculado.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Custo por unidade (R$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Ex: 3,50"
                  value={bevForm.cost_per_unit}
                  onChange={(e) => setBevForm({ ...bevForm, cost_per_unit: e.target.value })}
                />
              </div>
              <div>
                <Label>Quantidade atual</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  value={bevForm.current_quantity}
                  onChange={(e) => setBevForm({ ...bevForm, current_quantity: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Estoque mínimo</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={bevForm.min_quantity}
                onChange={(e) => setBevForm({ ...bevForm, min_quantity: e.target.value })}
              />
            </div>

            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Bloquear venda quando zerar</div>
                <div className="text-xs text-muted-foreground">
                  Quando a bebida acabar, o produto fica indisponível no cardápio.
                </div>
              </div>
              <Switch
                checked={bevForm.block_sale_when_empty}
                onCheckedChange={(v) => setBevForm({ ...bevForm, block_sale_when_empty: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBevOpen(false)}>Cancelar</Button>
            <Button onClick={saveBeverage} variant="brand">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement */}
      <Dialog open={!!movementItem} onOpenChange={(o) => !o && setMovementItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {movementType === "in" ? "Entrada de estoque" : "Saída de estoque"}
            </DialogTitle>
          </DialogHeader>
          {movementItem && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="font-medium">{movementItem.name}</div>
                <div className="text-xs text-muted-foreground">
                  Atual: {movementItem.current_quantity} {movementItem.unit}
                </div>
              </div>
              <div>
                <Label>Quantidade ({movementItem.unit})</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.001"
                  autoFocus
                  value={movementQty}
                  onChange={(e) => setMovementQty(e.target.value)}
                />
              </div>
              <div>
                <Label>Motivo (opcional)</Label>
                <Input
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === "in" ? "Ex: Reposição fornecedor" : "Ex: Ajuste / perda"}
                  maxLength={120}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementItem(null)}>Cancelar</Button>
            <Button onClick={submitMovement} variant="brand">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={!!historyItem} onOpenChange={(o) => !o && setHistoryItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico — {historyItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {movements.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma movimentação registrada.
              </div>
            ) : (
              <ul className="space-y-2">
                {movements.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
                        m.movement_type === "in"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {m.movement_type === "in" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {m.movement_type === "in" ? "Entrada" : "Saída"} de {m.quantity}{" "}
                        {historyItem?.unit}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.reason || "—"} · {new Date(m.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
