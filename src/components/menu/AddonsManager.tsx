import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Library, Link2, Unlink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MoneyInput } from "@/components/ui/money-input";
import { QuantityInput } from "@/components/ui/quantity-input";

interface AddonOptionRow {
  id: string;
  group_id: string;
  name: string;
  price: number | null;
  default_quantity: number | null;
  position: number;
  _new?: boolean;
}

interface AddonGroupRow {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  max_selections: number | null;
  position: number;
  library_group_id: string | null;
  _open?: boolean;
  _new?: boolean;
  options: AddonOptionRow[];
}

interface LibraryGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  max_selections: number | null;
  options_count?: number;
}

interface Props {
  productId: string;
  userId: string;
}

export function AddonsManager({ productId, userId }: Props) {
  const [groups, setGroups] = useState<AddonGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryGroup[]>([]);
  const [librarySelected, setLibrarySelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data: g } = await supabase
      .from("product_addon_groups")
      .select("*")
      .eq("product_id", productId)
      .order("position");
    const productGroupIds = (g || []).filter((x: any) => !x.library_group_id).map((x: any) => x.id);
    const { data: o } = productGroupIds.length
      ? await supabase.from("product_addons").select("*").in("group_id", productGroupIds).order("position")
      : { data: [] as any[] };
    const groupsWithOptions: AddonGroupRow[] = (g || []).map((row: any) => ({
      ...row,
      _open: false,
      options: row.library_group_id
        ? []
        : (o || []).filter((x: any) => x.group_id === row.id).map((x: any) => ({
            ...x,
            default_quantity: Number(x.default_quantity) || 1,
          })),
    }));
    setGroups(groupsWithOptions);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [productId]);

  const loadLibrary = async () => {
    const { data: libGroups } = await supabase
      .from("addon_library_groups")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    const ids = (libGroups || []).map((g: any) => g.id);
    const { data: libOpts } = ids.length
      ? await supabase.from("addon_library_options").select("library_group_id").in("library_group_id", ids)
      : { data: [] as any[] };
    const counts: Record<string, number> = {};
    (libOpts || []).forEach((o: any) => {
      counts[o.library_group_id] = (counts[o.library_group_id] || 0) + 1;
    });
    setLibrary(
      (libGroups || []).map((g: any) => ({ ...g, options_count: counts[g.id] || 0 })),
    );
  };

  const openLibraryDialog = async () => {
    setLibrarySelected(new Set());
    await loadLibrary();
    setLibraryDialogOpen(true);
  };

  const importFromLibrary = async () => {
    if (librarySelected.size === 0) {
      toast.error("Selecione pelo menos um grupo");
      return;
    }
    try {
      const rows = Array.from(librarySelected).map((libId, idx) => {
        const lib = library.find((l) => l.id === libId);
        return {
          product_id: productId,
          user_id: userId,
          library_group_id: libId,
          name: lib?.name || "Grupo",
          selection_type: lib?.selection_type || "single",
          is_required: lib?.is_required || false,
          max_selections: lib?.max_selections,
          position: groups.length + idx,
        };
      });
      const { error } = await supabase.from("product_addon_groups").insert(rows);
      if (error) throw error;
      toast.success("Grupos importados");
      setLibraryDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar");
    }
  };

  const detachFromLibrary = async (groupId: string) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g || !g.library_group_id) return;
    if (!confirm("Personalizar este grupo apenas para este produto? Você poderá editar as opções sem afetar a biblioteca.")) return;
    try {
      // Carrega opções atuais da biblioteca
      const { data: libOpts, error: e1 } = await supabase
        .from("addon_library_options")
        .select("*")
        .eq("library_group_id", g.library_group_id)
        .order("position");
      if (e1) throw e1;

      // Desvincula da biblioteca
      const { error: e2 } = await supabase
        .from("product_addon_groups")
        .update({ library_group_id: null })
        .eq("id", groupId);
      if (e2) throw e2;

      // Clona opções para product_addons
      if (libOpts && libOpts.length > 0) {
        const rows = libOpts.map((o: any, idx: number) => ({
          group_id: groupId,
          user_id: userId,
          name: o.name,
          price: Number(o.price) || 0,
          default_quantity: Math.max(1, Number(o.default_quantity) || 1),
          position: idx,
          is_available: o.is_available,
        }));
        const { error: e3 } = await supabase.from("product_addons").insert(rows);
        if (e3) throw e3;
      }

      toast.success("Grupo personalizado para este produto");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao personalizar");
    }
  };

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: productId,
        user_id: userId,
        name: "",
        selection_type: "single",
        is_required: false,
        max_selections: null,
        position: prev.length,
        library_group_id: null,
        _open: true,
        _new: true,
        options: [],
      },
    ]);
  };

  const updateGroup = (id: string, patch: Partial<AddonGroupRow>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const deleteGroup = async (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    const isLinked = !!g.library_group_id;
    const msg = isLinked
      ? "Desvincular este grupo da biblioteca para este produto?"
      : "Excluir este grupo de adicionais?";
    if (!confirm(msg)) return;
    if (!g._new) {
      const { error } = await supabase.from("product_addon_groups").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setGroups((prev) => prev.filter((x) => x.id !== id));
    toast.success(isLinked ? "Grupo removido do produto" : "Grupo removido");
  };

  const addOption = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: [
                ...g.options,
                {
                  id: crypto.randomUUID(),
                  group_id: groupId,
                  name: "",
                  price: null,
                  default_quantity: null,
                  position: g.options.length,
                  _new: true,
                },
              ],
            }
          : g,
      ),
    );
  };

  const updateOption = (groupId: string, optionId: string, patch: Partial<AddonOptionRow>) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) }
          : g,
      ),
    );
  };

  const deleteOption = async (groupId: string, optionId: string) => {
    const g = groups.find((x) => x.id === groupId);
    const o = g?.options.find((x) => x.id === optionId);
    if (!o) return;
    if (!o._new) {
      const { error } = await supabase.from("product_addons").delete().eq("id", optionId);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g,
      ),
    );
  };

  // Guarda síncrona (ref) + estado para impedir múltiplos saves em paralelo.
  // O ref evita race condition entre cliques rapidíssimos antes do React
  // atualizar o estado `saving`.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    if (savingRef.current) return; // já está salvando — ignora cliques extras
    for (const g of groups) {
      if (!g.library_group_id && !g.name.trim()) {
        toast.error("Todo grupo precisa de nome");
        return;
      }
    }
    savingRef.current = true;
    setSaving(true);
    try {
      // Otimização: coletar todas as operações para fazer em lote
      const groupInserts: any[] = [];
      const groupUpdates: any[] = [];
      const optionInserts: any[] = [];
      const optionUpdates: any[] = [];
      
      // Preparar operações em lote
      for (const g of groups) {
        // grupos vinculados à biblioteca não são editáveis aqui
        if (g.library_group_id) continue;
        
        const groupPayload = {
          product_id: g.product_id,
          user_id: g.user_id,
          name: g.name.trim(),
          selection_type: g.selection_type,
          is_required: g.is_required,
          max_selections: g.max_selections,
          position: g.position,
        };
        
        if (g._new) {
          groupInserts.push({ ...groupPayload, _tempId: g.id });
        } else {
          groupUpdates.push({ ...groupPayload, id: g.id });
        }

        for (const o of g.options) {
          if (!o.name.trim()) continue;
          const optionPayload = {
            group_id: g._new ? '_tempId' : g.id, // será substituído após insert
            user_id: userId,
            name: o.name.trim(),
            price: Number(o.price) || 0,
            default_quantity: Math.max(1, Number(o.default_quantity) || 1),
            position: o.position,
            _tempGroupId: g.id,
            _tempOptionId: o.id,
          };
          
          if (o._new) {
            optionInserts.push(optionPayload);
          } else {
            optionUpdates.push({ ...optionPayload, id: o.id, group_id: g.id });
          }
        }
      }

      // Executar operações em lote
      let groupIdMap: Record<string, string> = {};
      
      // Inserir grupos novos em lote
      if (groupInserts.length > 0) {
        const { data: insertedGroups, error } = await supabase
          .from("product_addon_groups")
          .insert(groupInserts.map(g => ({ product_id: g.product_id, user_id: g.user_id, name: g.name, selection_type: g.selection_type, is_required: g.is_required, max_selections: g.max_selections, position: g.position })))
          .select("id");
        
        if (error) throw error;
        
        // Mapear IDs temporários para IDs reais
        insertedGroups?.forEach((group: any, index: number) => {
          groupIdMap[groupInserts[index]._tempId] = group.id;
        });
      }

      // Atualizar grupos existentes em lote
      if (groupUpdates.length > 0) {
        const { error } = await supabase
          .from("product_addon_groups")
          .upsert(groupUpdates);
        if (error) throw error;
      }

      // Preparar opções com IDs de grupo corretos
      const finalOptionInserts = optionInserts.map(opt => ({
        group_id: groupIdMap[opt._tempGroupId] || opt.group_id,
        user_id: opt.user_id,
        name: opt.name,
        price: opt.price,
        default_quantity: opt.default_quantity,
        position: opt.position,
      }));

      // Inserir opções novas em lote
      if (finalOptionInserts.length > 0) {
        const { error } = await supabase
          .from("product_addons")
          .insert(finalOptionInserts);
        if (error) throw error;
      }

      // Atualizar opções existentes em lote
      if (optionUpdates.length > 0) {
        const { error } = await supabase
          .from("product_addons")
          .upsert(optionUpdates);
        if (error) throw error;
      }

      // Atualizar estado local com IDs reais
      groups.forEach(g => {
        if (g._new && groupIdMap[g.id]) {
          g.id = groupIdMap[g.id];
          g._new = false;
        }
        g.options.forEach(o => {
          if (o._new) {
            o._new = false;
          }
        });
      });

      toast.success("Adicionais salvos");
      // Otimização: não recarrega o cardápio inteiro, apenas atualiza o estado local
      // await load(); // Removido para evitar lentidão
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-4 text-sm text-muted-foreground">Carregando adicionais…</div>;
  }

  const linkedLibraryIds = new Set(
    groups.filter((g) => !!g.library_group_id).map((g) => g.library_group_id as string),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Adicionais</h4>
          <p className="text-xs text-muted-foreground">
            Crie grupos como "Extras", "Molhos" ou reutilize grupos da sua biblioteca.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={openLibraryDialog}>
            <Library className="h-3.5 w-3.5" /> Biblioteca
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addGroup}>
            <Plus className="h-3.5 w-3.5" /> Grupo
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          Nenhum grupo de adicionais. Use a biblioteca ou crie um novo grupo.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isLinked = !!g.library_group_id;
            return (
              <div
                key={g.id}
                className={`rounded-lg border bg-card ${isLinked ? "border-primary/40 bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => updateGroup(g.id, { _open: !g._open })}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                    aria-label="Expandir"
                  >
                    {g._open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isLinked ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-semibold">{g.name}</span>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Da biblioteca
                      </span>
                    </div>
                  ) : (
                    <Input
                      value={g.name}
                      onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                      placeholder="Nome do grupo (ex: Extras)"
                      className="flex-1"
                    />
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteGroup(g.id)}
                    aria-label={isLinked ? "Desvincular grupo" : "Remover grupo"}
                  >
                    {isLinked ? <Unlink className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>

                {!isLinked && g._open && (
                  <div className="animate-accordion-down space-y-3 border-t border-border p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs">Tipo de seleção</Label>
                        <Select
                          value={g.selection_type}
                          onValueChange={(v: any) => updateGroup(g.id, { selection_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Única</SelectItem>
                            <SelectItem value="multiple">Múltipla</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Máx. seleções (múltipla)</Label>
                        <QuantityInput
                          value={g.max_selections}
                          onValueChange={(v) => updateGroup(g.id, { max_selections: v })}
                          min={1}
                          disabled={g.selection_type === "single"}
                          placeholder="Sem limite"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch
                          checked={g.is_required}
                          onCheckedChange={(v) => updateGroup(g.id, { is_required: v })}
                        />
                        <Label className="text-xs">Obrigatório</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_90px_110px_auto] items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Opção</span>
                        <span>Qtd. padrão</span>
                        <span>Preço</span>
                        <span />
                      </div>
                      {g.options.map((o) => (
                        <div key={o.id} className="grid grid-cols-[1fr_90px_110px_auto] items-center gap-2">
                          <Input
                            value={o.name}
                            onChange={(e) => updateOption(g.id, o.id, { name: e.target.value })}
                            placeholder="Opção (ex: Bacon)"
                          />
                          <QuantityInput
                            value={o.default_quantity}
                            onValueChange={(v) => updateOption(g.id, o.id, { default_quantity: v })}
                            min={1}
                            placeholder="1"
                          />
                          <MoneyInput
                            value={o.price}
                            onValueChange={(v) => updateOption(g.id, o.id, { price: v })}
                            placeholder="0,00"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteOption(g.id, o.id)}
                            aria-label="Remover opção"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" onClick={() => addOption(g.id)}>
                        <Plus className="h-3.5 w-3.5" /> Opção
                      </Button>
                    </div>
                  </div>
                )}

                {isLinked && g._open && (
                  <div className="animate-accordion-down flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card p-3 text-xs text-muted-foreground">
                    <span>
                      Vinculado à <strong>Biblioteca</strong>. Mudanças lá refletem em todos os produtos.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => detachFromLibrary(g.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Personalizar para este produto
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" variant="cta" className="w-full" onClick={saveAll} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar adicionais"}
      </Button>

      {/* Dialog: importar da biblioteca */}
      <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar grupos da biblioteca</DialogTitle>
          </DialogHeader>
          {library.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sua biblioteca está vazia. Crie grupos reutilizáveis em <strong>Configurações → Biblioteca de adicionais</strong>.
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {library.map((lib) => {
                const alreadyLinked = linkedLibraryIds.has(lib.id);
                const checked = librarySelected.has(lib.id);
                return (
                  <label
                    key={lib.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${
                      alreadyLinked
                        ? "cursor-not-allowed bg-muted/40 opacity-60"
                        : checked
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={alreadyLinked}
                        checked={checked}
                        onChange={(e) => {
                          setLibrarySelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(lib.id);
                            else next.delete(lib.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="text-sm font-semibold">{lib.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {lib.options_count} opções · {lib.selection_type === "single" ? "Única" : "Múltipla"}
                          {lib.is_required && " · obrigatório"}
                        </div>
                      </div>
                    </div>
                    {alreadyLinked && (
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        Já vinculado
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLibraryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={importFromLibrary} disabled={librarySelected.size === 0}>
              Importar {librarySelected.size > 0 && `(${librarySelected.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
