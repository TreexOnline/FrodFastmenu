import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Trash2,
  KeyRound,
  Shield,
  Copy,
  Users,
  LogOut,
  Ban,
  CheckCircle2,
  Crown,
  Bot,
  UserPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  restaurant_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  plan_active: boolean;
  plan_type: string | null;
  plan_expires_at: string | null;
  trial_ends_at: string | null;
  whatsapp_addon_active: boolean;
  whatsapp_addon_expires_at: string | null;
  banned: boolean;
  banned_until: string | null;
  roles: string[];
}

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [customPwd, setCustomPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const [generatedPwd, setGeneratedPwd] = useState<string | null>(null);
  const [planTarget, setPlanTarget] = useState<AdminUser | null>(null);
  const [planType, setPlanType] = useState<string>("monthly");
  const [planMonths, setPlanMonths] = useState<number>(1);
  const [planSaving, setPlanSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [addonTarget, setAddonTarget] = useState<AdminUser | null>(null);
  const [addonMonths, setAddonMonths] = useState<number>(1);
  const [addonSaving, setAddonSaving] = useState(false);

  // Criar novo usuário
  const [createOpen, setCreateOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRestaurant, setNewRestaurant] = useState("");
  const [creating, setCreating] = useState(false);

  // Verifica admin
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (data) {
        setIsAdmin(true);
      } else {
        toast.error("Acesso restrito ao administrador");
        navigate("/dashboard");
      }
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    if (error) {
      toast.error("Falha ao carregar usuários");
    } else {
      setUsers((data as any)?.users ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: confirmDelete.id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao excluir");
    } else {
      toast.success("Usuário excluído");
      setUsers((u) => u.filter((x) => x.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-reset-password",
      {
        body: {
          user_id: resetTarget.id,
          password: customPwd.length >= 6 ? customPwd : undefined,
        },
      }
    );
    setResetting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao resetar senha");
    } else {
      setGeneratedPwd((data as any).new_password);
      toast.success("Senha alterada");
    }
  };

  const closeReset = () => {
    setResetTarget(null);
    setCustomPwd("");
    setGeneratedPwd(null);
  };

  const handleToggleBan = async (u: AdminUser) => {
    setTogglingId(u.id);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: { action: "set_banned", user_id: u.id, banned: !u.banned },
    });
    setTogglingId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao atualizar usuário");
      return;
    }
    toast.success(u.banned ? "Usuário ativado" : "Usuário desativado");
    setUsers((arr) =>
      arr.map((x) => (x.id === u.id ? { ...x, banned: !u.banned } : x))
    );
  };

  const openPlanDialog = (u: AdminUser) => {
    setPlanType(u.plan_type ?? "monthly");
    setPlanMonths(1);
    setPlanTarget(u);
  };

  const openAddonDialog = (u: AdminUser) => {
    setAddonMonths(1);
    setAddonTarget(u);
  };

  const handleSaveAddon = async (active: boolean) => {
    if (!addonTarget) return;
    setAddonSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        action: "set_whatsapp_addon",
        user_id: addonTarget.id,
        active,
        months: active ? addonMonths : 0,
      },
    });
    setAddonSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao atualizar adicional");
      return;
    }
    toast.success(active ? "Adicional WhatsApp ativado" : "Adicional WhatsApp removido");
    const newExpires = (data as any)?.whatsapp_addon_expires_at ?? null;
    setUsers((arr) =>
      arr.map((x) =>
        x.id === addonTarget.id
          ? {
              ...x,
              whatsapp_addon_active: active,
              whatsapp_addon_expires_at: newExpires,
            }
          : x,
      ),
    );
    setAddonTarget(null);
  };

  const handleSavePlan = async (activate: boolean) => {
    if (!planTarget) return;
    setPlanSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        action: "set_plan",
        user_id: planTarget.id,
        plan_active: activate,
        plan_type: activate ? planType : null,
        months: activate ? planMonths : 0,
      },
    });
    setPlanSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao atualizar plano");
      return;
    }
    toast.success(activate ? "Plano concedido" : "Plano removido");
    const newExpires = (data as any)?.plan_expires_at ?? null;
    setUsers((arr) =>
      arr.map((x) =>
        x.id === planTarget.id
          ? {
              ...x,
              plan_active: activate,
              plan_type: activate ? planType : null,
              plan_expires_at: newExpires,
            }
          : x
      )
    );
    setPlanTarget(null);
  };

  const handleCreateUser = async () => {
    if (!newPhone.trim() || newPassword.length < 6 || !newFullName.trim() || !newRestaurant.trim()) {
      toast.error("Preencha todos os campos. Senha mínima de 6 caracteres.");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        phone: newPhone.trim(),
        password: newPassword,
        full_name: newFullName.trim(),
        restaurant_name: newRestaurant.trim(),
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Falha ao criar usuário");
      return;
    }
    toast.success("Usuário criado com sucesso!");
    setCreateOpen(false);
    setNewPhone("");
    setNewPassword("");
    setNewFullName("");
    setNewRestaurant("");
    loadUsers();
  };

  // Oculta administradores da lista — admin não deve ver/excluir a si mesmo
  const visibleUsers = users.filter((u) => !u.roles.includes("admin"));

  const filtered = visibleUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.phone ?? "").toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.restaurant_name ?? "").toLowerCase().includes(q)
    );
  });

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="container-app flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-primary-foreground shadow-brand">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Administração do site
              </h1>
              <p className="text-xs text-muted-foreground">
                Painel restrito · TreexMenu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Ir ao Painel
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total de usuários
                </p>
                <p className="text-2xl font-bold">{visibleUsers.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Planos ativos
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {visibleUsers.filter((u) => u.plan_active).length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Em período de teste
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {
                visibleUsers.filter(
                  (u) =>
                    !u.plan_active &&
                    u.trial_ends_at &&
                    new Date(u.trial_ends_at) > new Date()
                ).length
              }
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, restaurante…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recarregar"}
            </Button>
            <Button variant="cta" size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Restaurante</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((u) => {
                  const isAdminRow = u.roles.includes("admin");
                  const isSelf = u.id === user?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">
                              {u.full_name || "—"}
                              {isAdminRow && (
                                <Badge className="ml-2 bg-primary/15 text-primary hover:bg-primary/20">
                                  Admin
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {u.phone || "—"}
                      </TableCell>
                      <TableCell>{u.restaurant_name || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {u.plan_active ? (
                            <div>
                              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                                {u.plan_type === "annual"
                                  ? "Anual"
                                  : u.plan_type === "combo"
                                    ? "Combo"
                                    : "Mensal"}
                              </Badge>
                              {u.plan_expires_at && (
                                <div className="mt-1 space-y-0.5">
                                  <p className="text-[10px] text-muted-foreground">
                                    expira em {new Date(u.plan_expires_at).toLocaleDateString("pt-BR")}
                                  </p>
                                  {(() => {
                                    const daysLeft = Math.ceil((new Date(u.plan_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                      <p className={`text-[10px] font-medium ${
                                        daysLeft <= 7 ? 'text-red-600' : 
                                        daysLeft <= 30 ? 'text-amber-600' : 
                                        'text-emerald-600'
                                      }`}>
                                        {daysLeft > 0 ? `${daysLeft} dias restantes` : 'expirado'}
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                Trial
                              </Badge>
                              {u.trial_ends_at && (
                                <div className="mt-1 space-y-0.5">
                                  <p className="text-[10px] text-muted-foreground">
                                    expira em {new Date(u.trial_ends_at).toLocaleDateString("pt-BR")}
                                  </p>
                                  {(() => {
                                    const daysLeft = Math.ceil((new Date(u.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                      <p className={`text-[10px] font-medium ${
                                        daysLeft <= 3 ? 'text-red-600' : 
                                        daysLeft <= 7 ? 'text-amber-600' : 
                                        'text-blue-600'
                                      }`}>
                                        {daysLeft > 0 ? `${daysLeft} dias restantes` : 'expirado'}
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                          {u.whatsapp_addon_active && (
                            <div>
                              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                                <Bot className="mr-1 h-3 w-3" />
                                IA WhatsApp
                              </Badge>
                              {u.whatsapp_addon_expires_at && (
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  addon expira em {new Date(u.whatsapp_addon_expires_at).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.banned ? (
                          <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">
                            Desativado
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Gerenciar plano"
                            onClick={() => openPlanDialog(u)}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={
                              u.whatsapp_addon_active
                                ? "Adicional WhatsApp/IA ativo"
                                : "Liberar adicional WhatsApp/IA"
                            }
                            onClick={() => openAddonDialog(u)}
                            className={
                              u.whatsapp_addon_active
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            }
                          >
                            <Bot className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Alterar senha"
                            onClick={() => setResetTarget(u)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={u.banned ? "Ativar usuário" : "Desativar usuário"}
                            disabled={isSelf || togglingId === u.id}
                            onClick={() => handleToggleBan(u)}
                            className={
                              u.banned ? "text-emerald-600" : "text-amber-600"
                            }
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.banned ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Excluir usuário"
                            onClick={() => setConfirmDelete(u)}
                            disabled={isSelf}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Confirmar exclusão */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente <b>{confirmDelete?.full_name || confirmDelete?.email}</b>{" "}
              e todos os dados vinculados (cardápios, pedidos, estoque).
              Não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset senha */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && closeReset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha do usuário</DialogTitle>
            <DialogDescription>
              {resetTarget?.full_name || resetTarget?.email}. Defina uma nova
              senha ou deixe em branco para gerar uma aleatória segura.
            </DialogDescription>
          </DialogHeader>

          {generatedPwd ? (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Nova senha
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                  {generatedPwd}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPwd);
                    toast.success("Copiada");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Envie esta senha ao usuário com segurança. Ele já pode usar agora.
              </p>
            </div>
          ) : (
            <Input
              type="text"
              placeholder="Nova senha (mín. 6 caracteres) — deixe vazio p/ gerar"
              value={customPwd}
              onChange={(e) => setCustomPwd(e.target.value)}
            />
          )}

          <DialogFooter>
            {generatedPwd ? (
              <Button onClick={closeReset}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeReset}>
                  Cancelar
                </Button>
                <Button onClick={handleReset} disabled={resetting}>
                  {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gerenciar plano */}
      <Dialog open={!!planTarget} onOpenChange={(o) => !o && setPlanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              Gerenciar Plano
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <div className="font-medium">{planTarget?.full_name || planTarget?.email}</div>
                <div className="text-xs text-muted-foreground">
                  {planTarget?.restaurant_name && `Restaurante: ${planTarget.restaurant_name}`}
                </div>
                
                {/* Status atual */}
                <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Status Atual
                  </div>
                  {planTarget?.plan_active ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                          {planTarget.plan_type === "annual"
                            ? "Anual"
                            : planTarget.plan_type === "combo"
                              ? "Combo"
                              : "Mensal"}
                        </Badge>
                        {planTarget.plan_expires_at && (() => {
                          const daysLeft = Math.ceil((new Date(planTarget.plan_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <span className={`text-xs font-medium ${
                              daysLeft <= 7 ? 'text-red-600' : 
                              daysLeft <= 30 ? 'text-amber-600' : 
                              'text-emerald-600'
                            }`}>
                              {daysLeft > 0 ? `${daysLeft} dias` : 'expirado'}
                            </span>
                          );
                        })()}
                      </div>
                      {planTarget.plan_expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Expira em {new Date(planTarget.plan_expires_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Trial
                      </Badge>
                      {planTarget?.trial_ends_at && (() => {
                        const daysLeft = Math.ceil((new Date(planTarget.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <div className="mt-1">
                            <p className="text-xs text-muted-foreground">
                              Expira em {new Date(planTarget.trial_ends_at).toLocaleDateString("pt-BR")}
                            </p>
                            <p className={`text-xs font-medium ${
                              daysLeft <= 3 ? 'text-red-600' : 
                              daysLeft <= 7 ? 'text-amber-600' : 
                              'text-blue-600'
                            }`}>
                              {daysLeft > 0 ? `${daysLeft} dias restantes` : 'expirado'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de plano
              </label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    <div className="flex items-center justify-between w-full">
                      <span>Mensal</span>
                      <span className="text-muted-foreground">R$ 148/mês</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="combo">
                    <div className="flex items-center justify-between w-full">
                      <span>Combo</span>
                      <span className="text-muted-foreground">R$ 380/3 meses</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="annual">
                    <div className="flex items-center justify-between w-full">
                      <span>Anual</span>
                      <span className="text-muted-foreground">R$ 1.148/ano</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duração (meses)
              </label>
              <Input
                type="number"
                min={1}
                max={36}
                value={planMonths}
                onChange={(e) => setPlanMonths(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Quantos meses de acesso a partir de hoje.
                {planType === "monthly" && planMonths > 1 && ` (${planMonths} × R$ 148 = R$ ${(planMonths * 148).toLocaleString('pt-BR')})`}
                {planType === "combo" && planMonths > 3 && ` (${Math.ceil(planMonths/3)} × R$ 380 = R$ ${(Math.ceil(planMonths/3) * 380).toLocaleString('pt-BR')})`}
                {planType === "annual" && planMonths > 12 && ` (${Math.ceil(planMonths/12)} × R$ 1.148 = R$ ${(Math.ceil(planMonths/12) * 1148).toLocaleString('pt-BR')})`}
              </p>
            </div>

            {/* Preview da nova data de expiração */}
            {planMonths > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Nova data de expiração
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {(() => {
                    const newDate = new Date();
                    newDate.setMonth(newDate.getMonth() + planMonths);
                    return newDate.toLocaleDateString("pt-BR", {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric'
                    });
                  })()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {planTarget?.plan_active && (
              <Button
                variant="outline"
                onClick={() => handleSavePlan(false)}
                disabled={planSaving}
                className="text-destructive hover:text-destructive"
              >
                <Crown className="mr-2 h-4 w-4" />
                Remover plano
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setPlanTarget(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSavePlan(true)} disabled={planSaving}>
                {planSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Crown className="mr-2 h-4 w-4" />
                {planTarget?.plan_active ? "Atualizar plano" : "Conceder plano"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adicional WhatsApp / IA */}
      <Dialog open={!!addonTarget} onOpenChange={(o) => !o && setAddonTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Adicional Atendente IA (WhatsApp)
            </DialogTitle>
            <DialogDescription>
              {addonTarget?.full_name || addonTarget?.email}
              {addonTarget?.whatsapp_addon_active &&
                addonTarget?.whatsapp_addon_expires_at && (
                  <span className="mt-1 block text-xs">
                    Atualmente <b>ativo</b> · expira em{" "}
                    {new Date(
                      addonTarget.whatsapp_addon_expires_at,
                    ).toLocaleDateString("pt-BR")}
                  </span>
                )}
              {addonTarget?.whatsapp_addon_active &&
                !addonTarget?.whatsapp_addon_expires_at && (
                  <span className="mt-1 block text-xs">
                    Atualmente <b>ativo</b> (sem data de expiração)
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-semibold text-foreground">
                Libera o painel de WhatsApp do usuário
              </p>
              <p className="mt-1 text-muted-foreground">
                Inclui conexão por QR Code, notificações automáticas de pedido
                e atendente IA respondendo no WhatsApp.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duração (meses)
              </label>
              <Input
                type="number"
                min={1}
                max={36}
                value={addonMonths}
                onChange={(e) =>
                  setAddonMonths(Math.max(1, Number(e.target.value) || 1))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Quantos meses de acesso ao adicional a partir de hoje.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {addonTarget?.whatsapp_addon_active && (
              <Button
                variant="outline"
                onClick={() => handleSaveAddon(false)}
                disabled={addonSaving}
                className="text-destructive hover:text-destructive"
              >
                Remover adicional
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setAddonTarget(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleSaveAddon(true)}
                disabled={addonSaving}
              >
                {addonSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {addonTarget?.whatsapp_addon_active
                  ? "Atualizar adicional"
                  : "Liberar adicional"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar novo usuário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Criar novo restaurante
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo usuário com telefone e senha. Ele poderá entrar
              no painel e configurar o próprio cardápio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do responsável
              </label>
              <Input
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Ex: João da Silva"
                maxLength={120}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do restaurante
              </label>
              <Input
                value={newRestaurant}
                onChange={(e) => setNewRestaurant(e.target.value)}
                placeholder="Ex: Hamburgueria do João"
                maxLength={120}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Telefone (com DDD)
              </label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={20}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Será usado para login. DDI 55 adicionado automaticamente.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha inicial
              </label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Envie a senha ao usuário com segurança. Ele pode alterá-la depois.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button variant="cta" onClick={handleCreateUser} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
