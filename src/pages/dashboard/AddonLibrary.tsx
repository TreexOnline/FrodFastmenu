import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Library } from "lucide-react";
import { toast } from "sonner";
import { MoneyInput } from "@/components/ui/money-input";
import { QuantityInput } from "@/components/ui/quantity-input";

interface OptionRow {
  id: string;
  library_group_id: string;
  name: string;
  price: number | null;
  default_quantity: number | null;
  position: number;
  _new?: boolean;
}

interface GroupRow {
  id: string;
  user_id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  max_selections: number | null;
  position: number;
  _open?: boolean;
  _new?: boolean;
  options: OptionRow[];
}

interface AddonLibraryProps {
  embedded?: boolean;
}

export default function AddonLibrary({ embedded = false }: AddonLibraryProps = {}) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: g } = await supabase
      .from("addon_library_groups")
      .select("*")
      .eq("user_id", user.id)
      .order("position");
    const ids = (g || []).map((x: any) => x.id);
    const { data: o } = ids.length
      ? await supabase
          .from("addon_library_options")
          .select("*")
          .in("library_group_id", ids)
          .order("position")
      : { data: [] as any[] };
    const built: GroupRow[] = (g || []).map((row: any) => ({
      ...row,
      _open: false,
      options: (o || [])
        .filter((x: any) => x.library_group_id === row.id)
        .map((x: any) => ({
          ...x,
          default_quantity: Number(x.default_quantity) || 1,
        })),
    }));
    setGroups(built);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const addGroup = () => {
    if (!user) return;
    setGroups((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: "",
        selection_type: "single",
        is_required: false,
        max_selections: null,
        position: prev.length,
        _open: true,
        _new: true,
        options: [],
      },
    ]);
  };

  const updateGroup = (id: string, patch: Partial<GroupRow>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const deleteGroup = async (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    if (
      !confirm(
        "Excluir este grupo da biblioteca? Os produtos vinculados perderão a referência.",
      )
    )
      return;
    if (!g._new) {
      const { error } = await supabase.from("addon_library_groups").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setGroups((prev) => prev.filter((x) => x.id !== id));
    toast.success("Grupo removido da biblioteca");
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
                  library_group_id: groupId,
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

  const updateOption = (groupId: string, optionId: string, patch: Partial<OptionRow>) => {
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
      const { error } = await supabase.from("addon_library_options").delete().eq("id", optionId);
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

  // Guarda contra cliques múltiplos no botão Salvar — evita inserir grupos
  // duplicados se o usuário clicar várias vezes seguidas.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    if (!user) return;
    if (savingRef.current) return;
    for (const g of groups) {
      if (!g.name.trim()) {
        toast.error("Todo grupo precisa de nome");
        return;
      }
    }
    savingRef.current = true;
    setSaving(true);
    try {
      for (const g of groups) {
        const groupPayload = {
          user_id: user.id,
          name: g.name.trim(),
          selection_type: g.selection_type,
          is_required: g.is_required,
          max_selections: g.max_selections,
          position: g.position,
        };
        let groupId = g.id;
        if (g._new) {
          const { data, error } = await supabase
            .from("addon_library_groups")
            .insert(groupPayload)
            .select("id")
            .single();
          if (error) throw error;
          groupId = data.id;
          g.id = groupId;
          g._new = false;
        } else {
          const { error } = await supabase
            .from("addon_library_groups")
            .update(groupPayload)
            .eq("id", g.id);
          if (error) throw error;
        }
        for (const o of g.options) {
          if (!o.name.trim()) continue;
          const optionPayload = {
            library_group_id: groupId,
            user_id: user.id,
            name: o.name.trim(),
            price: Number(o.price) || 0,
            default_quantity: Math.max(1, Number(o.default_quantity) || 1),
            position: o.position,
          };
          if (o._new) {
            const { data, error } = await supabase
              .from("addon_library_options")
              .insert(optionPayload)
              .select("id")
              .single();
            if (error) throw error;
            o.id = data.id;
            o._new = false;
          } else {
            const { error } = await supabase
              .from("addon_library_options")
              .update(optionPayload)
              .eq("id", o.id);
            if (error) throw error;
          }
        }
      }
      toast.success("Biblioteca salva");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? "" : "container-app py-6"}>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/5 via-card to-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">
                Biblioteca de adicionais
              </h3>
              <p className="text-xs text-muted-foreground">
                Crie grupos reutilizáveis (ex: "Molhos", "Extras") e vincule a vários produtos.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addGroup}>
              <Plus className="h-4 w-4" /> Novo grupo
            </Button>
            <Button variant="cta" onClick={saveAll} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar tudo"}
            </Button>
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Library className="h-7 w-7" />
              </div>
              <p className="font-display text-base font-semibold">Sua biblioteca está vazia</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crie um grupo de adicionais para reutilizar entre vários produtos.
              </p>
              <Button variant="cta" className="mt-5" onClick={addGroup}>
                <Plus className="h-4 w-4" /> Criar primeiro grupo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/30"
                >
                  {/* Group header */}
                  <div className="flex items-center gap-2 border-b border-border bg-muted/20 p-3">
                    <button
                      type="button"
                      onClick={() => updateGroup(g.id, { _open: !g._open })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      aria-label={g._open ? "Recolher" : "Expandir"}
                    >
                      {g._open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <Input
                      value={g.name}
                      onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                      placeholder="Nome do grupo (ex: Molhos)"
                      className="h-10 flex-1 border-transparent bg-card font-display text-base font-semibold tracking-tight focus-visible:border-input"
                    />
                    {!g._new && (
                      <span className="hidden shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary sm:inline-flex">
                        {g.options.length} {g.options.length === 1 ? "opção" : "opções"}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteGroup(g.id)}
                      aria-label="Excluir grupo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {g._open && (
                    <div className="space-y-5 p-5">
                      {/* Settings row */}
                      <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Tipo de seleção
                          </Label>
                          <Select
                            value={g.selection_type}
                            onValueChange={(v: any) => updateGroup(g.id, { selection_type: v })}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Única</SelectItem>
                              <SelectItem value="multiple">Múltipla</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Máx. seleções
                          </Label>
                          <QuantityInput
                            value={g.max_selections}
                            onValueChange={(v) => updateGroup(g.id, { max_selections: v })}
                            min={1}
                            disabled={g.selection_type === "single"}
                            placeholder="Sem limite"
                            className="h-10"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3">
                            <span className="text-xs font-semibold">Obrigatório</span>
                            <Switch
                              checked={g.is_required}
                              onCheckedChange={(v) => updateGroup(g.id, { is_required: v })}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-[1fr_90px_120px_auto] items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Opção</span>
                          <span>Qtd. padrão</span>
                          <span>Preço</span>
                          <span />
                        </div>
                        {g.options.length === 0 && (
                          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                            Nenhuma opção. Clique em "Adicionar opção" abaixo.
                          </p>
                        )}
                        {g.options.map((o) => (
                          <div
                            key={o.id}
                            className="grid grid-cols-[1fr_90px_120px_auto] items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/30"
                          >
                            <Input
                              value={o.name}
                              onChange={(e) => updateOption(g.id, o.id, { name: e.target.value })}
                              placeholder="Opção (ex: Bacon)"
                              className="h-9 border-transparent bg-transparent font-medium focus-visible:border-input focus-visible:bg-card"
                            />
                            <QuantityInput
                              value={o.default_quantity}
                              onValueChange={(v) => updateOption(g.id, o.id, { default_quantity: v })}
                              min={1}
                              placeholder="1"
                              className="h-9 text-center"
                            />
                            <MoneyInput
                              value={o.price}
                              onValueChange={(v) => updateOption(g.id, o.id, { price: v })}
                              placeholder="0,00"
                              className="h-9 font-semibold"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteOption(g.id, o.id)}
                              aria-label="Excluir opção"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addOption(g.id)}
                          className="w-full border-dashed"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar opção
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
