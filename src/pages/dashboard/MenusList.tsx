import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/useAccess";
import { BlockedAccess } from "@/components/BlockedAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Eye, ExternalLink, UtensilsCrossed, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QrCodeDialog } from "@/components/menu/QrCodeDialog";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { generateSlug } from "@/lib/slugGenerator";

interface Menu {
  id: string;
  name: string;
  cover_url: string | null;
  is_active: boolean;
  slug: string;
}

const PLAN_LIMITS: Record<string, number> = {
  monthly: 2,
  combo: 5,
  annual: 5,
};
const TRIAL_LIMIT = 1;

const getMenuLimit = (planActive: boolean, planType: string | null, isTrial: boolean) => {
  if (planActive && planType && PLAN_LIMITS[planType] !== undefined) {
    return PLAN_LIMITS[planType];
  }
  if (isTrial) return TRIAL_LIMIT;
  return 0;
};

const getPlanLabel = (planActive: boolean, planType: string | null, isTrial: boolean) => {
  if (planActive) {
    if (planType === "annual") return "Plano Anual";
    if (planType === "combo") return "Plano Combo";
    return "Plano Mensal";
  }
  if (isTrial) return "Período de teste";
  return "Sem plano ativo";
};

const MenusList = () => {
  const { user } = useAuth();
  const access = useAccess();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrMenu, setQrMenu] = useState<Menu | null>(null);

  // Função para obter URL segura do cardápio
  const getMenuUrl = (menu: Menu): string => {
    // NUNCA usar ID como subdomínio
    if (!menu.slug) {
      console.error("❌ [MenusList] Tentativa de gerar URL sem slug:", menu);
      return "#"; // Retorna safe fallback
    }
    
    // Verificar se o slug parece com ID (previne bugs)
    const idPattern = /^[a-f0-9]{8,}$/i;
    if (idPattern.test(menu.slug)) {
      console.error("❌ [MenusList] Slug parece ID, usando fallback:", menu.slug);
      return "#";
    }
    
    return `https://${menu.slug}.treexonline.online`;
  };

  // Função para corrigir cardápios sem slug
  const fixMenuSlug = async (menu: Menu): Promise<Menu> => {
    if (menu.slug) return menu;
    
    console.log("🔧 [MenusList] Cardápio sem slug, corrigindo:", menu.name, menu.id);
    const newSlug = generateSlug(menu.name);
    
    const { data: updated, error } = await supabase
      .from("menus")
      .update({ slug: newSlug })
      .eq("id", menu.id)
      .select()
      .single();
      
    if (error) {
      console.error("❌ [MenusList] Erro ao corrigir slug:", error);
      return menu;
    }
    
    console.log("✅ [MenusList] Slug corrigido:", newSlug);
    return updated as Menu;
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("menus")
      .select("id,name,cover_url,is_active,slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    
    // Simples: apenas carrega os dados, sem correção automática
    setMenus(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Mantém a lista de cardápios sincronizada em tempo real.
  useRealtimeRefresh({
    channelKey: `menus-list-rt-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: [{ table: "menus", filter: user ? `user_id=eq.${user.id}` : undefined }],
    onChange: load,
  });

  const maxMenus = getMenuLimit(access.planActive, access.planType, access.isTrial);
  const planLabel = getPlanLabel(access.planActive, access.planType, access.isTrial);
  const limitReached = menus.length >= maxMenus;

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    if (limitReached) {
      toast.error(
        `Você atingiu o limite de ${maxMenus} cardápio${maxMenus === 1 ? "" : "s"} do ${planLabel}. Faça upgrade para criar mais.`,
      );
      return;
    }
    setCreating(true);
    
    // Gerar slug a partir do nome
    const slug = generateSlug(newName.trim());
    console.log("🔧 [MenusList] Criando cardápio:", { name: newName.trim(), slug });
    
    const { data, error } = await supabase
      .from("menus")
      .insert({ 
        user_id: user.id, 
        name: newName.trim(),
        slug: slug
      })
      .select()
      .single();
      
    if (error) {
      console.error("❌ [MenusList] Erro ao criar cardápio:", error);
      toast.error(error.message);
    } else {
      console.log("✅ [MenusList] Cardápio criado com sucesso:", data);
      // create default settings row
      await supabase.from("menu_settings").insert({ menu_id: data.id, user_id: user.id });
      toast.success("Cardápio criado!");
      setNewName("");
      setOpen(false);
      load();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cardápio? Todos os produtos serão removidos.")) return;
    const { error } = await supabase.from("menus").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Cardápio excluído."); load(); }
  };

  const toggleActive = async (m: Menu) => {
    const { error } = await supabase.from("menus").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) toast.error(error.message);
    else load();
  };

  if (!access.loading && !access.hasAccess) {
    return <BlockedAccess />;
  }

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Cardápios</h1>
          <p className="text-muted-foreground">Gerencie seus cardápios digitais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={limitReached}>
              <Plus className="mr-2 h-4 w-4" />
              Novo cardápio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo cardápio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do cardápio</Label>
                <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Hamburgueria" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} variant="cta" className="flex-1" disabled={creating}>
                  {creating ? "Criando..." : "Criar"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : menus.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
          <UtensilsCrossed className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Nenhum cardápio criado</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Crie seu primeiro cardápio para começar a vender online.
          </p>
          <Button onClick={() => setOpen(true)} variant="cta" className="mt-6">
            <Plus /> Criar primeiro cardápio
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((m) => (
            <div
              key={m.id}
              className="group flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30"
            >
              {/* Cover wrapper with side padding so background shows on top edges */}
              <div className="px-3 pt-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl bg-muted">
                  {m.cover_url ? (
                    <img
                      src={m.cover_url}
                      alt={m.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center gradient-brand">
                      <UtensilsCrossed className="h-10 w-10 text-primary-foreground/70" />
                    </div>
                  )}
                  {/* Status badge floating on cover */}
                  <div className="absolute left-3 top-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md ${
                        m.is_active
                          ? "bg-emerald-500/90 text-white"
                          : "bg-background/80 text-muted-foreground border border-border"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          m.is_active ? "bg-white animate-pulse" : "bg-muted-foreground"
                        }`}
                      />
                      {m.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold tracking-tight">{m.name}</h3>
                  </div>
                  <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                </div>

                {/* Action area */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Button asChild variant="cta" size="sm" className="flex items-center justify-center gap-1.5">
                    <Link to={`/dashboard/cardapio/${m.id}`} className="flex items-center justify-center gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex items-center justify-center gap-1.5">
                    <a href={getMenuUrl(m)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQrMenu(m)} className="flex items-center justify-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5" /> QR
                  </Button>
                </div>

                {/* Secondary actions */}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const subdomainUrl = getMenuUrl(m);
                      if (subdomainUrl !== "#") {
                        navigator.clipboard.writeText(subdomainUrl);
                        toast.success("Link copiado!");
                      } else {
                        toast.error("Cardápio sem slug válido. Crie um novo cardápio para corrigir.");
                      }
                    }}
                  >
                    <ExternalLink className="!size-3.5" /> Copiar link
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(m.id)}
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Excluir cardápio"
                  >
                    <Trash2 className="!size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrMenu && (
        <QrCodeDialog
          open={!!qrMenu}
          onOpenChange={(o) => !o && setQrMenu(null)}
          url={getMenuUrl(qrMenu)}
          restaurantName={qrMenu.name}
        />
      )}
  </div>
  );
};

export default MenusList;
