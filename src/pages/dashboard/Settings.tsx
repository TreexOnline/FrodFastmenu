import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User as UserIcon,
  Store,
  Shield,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Save,
  KeyRound,
} from "lucide-react";

/** Aplica máscara (DDD) 9 9999-9999 / (DDD) 9999-9999 a partir dos dígitos. */
const maskWhatsapp = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // 9 dígitos no celular: (XX) 9 XXXX-XXXX
  return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const Settings = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("perfil");

  // Perfil + Restaurante
  const [form, setForm] = useState({ full_name: "", restaurant_name: "", whatsapp_number: "" });
  const [whatsDisplay, setWhatsDisplay] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Senha
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const wa = data.whatsapp_number || "";
          setForm({
            full_name: data.full_name || "",
            restaurant_name: data.restaurant_name || "",
            whatsapp_number: wa,
          });
          setWhatsDisplay(wa ? maskWhatsapp(wa) : "");
        }
      });
  }, [user]);

  // Validações em tempo real
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Informe seu nome";
    if (!form.restaurant_name.trim()) e.restaurant_name = "Informe o nome do restaurante";
    if (form.whatsapp_number) {
      const d = onlyDigits(form.whatsapp_number);
      if (d.length < 10 || d.length > 11) e.whatsapp = "WhatsApp inválido (10 ou 11 dígitos com DDD)";
    }
    return e;
  }, [form]);

  const pwdErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (pwd.next && pwd.next.length < 8) e.next = "Mínimo 8 caracteres";
    if (pwd.next && !/[A-Za-z]/.test(pwd.next)) e.next = "Inclua ao menos uma letra";
    if (pwd.next && !/\d/.test(pwd.next)) e.next = "Inclua ao menos um número";
    if (pwd.confirm && pwd.next !== pwd.confirm) e.confirm = "As senhas não coincidem";
    return e;
  }, [pwd]);

  const profileValid = Object.keys(errors).length === 0 && !!form.full_name && !!form.restaurant_name;
  const pwdValid =
    !!pwd.current &&
    !!pwd.next &&
    !!pwd.confirm &&
    Object.keys(pwdErrors).length === 0 &&
    pwd.next === pwd.confirm;

  const saveProfile = async () => {
    if (!user || !profileValid) return;
    setSavingProfile(true);
    setProfileSaved(false);
    const payload = {
      full_name: form.full_name.trim(),
      restaurant_name: form.restaurant_name.trim(),
      whatsapp_number: onlyDigits(form.whatsapp_number) || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Configurações salvas com sucesso");
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
    setSavingProfile(false);
  };

  const changePassword = async () => {
    if (!user || !pwdValid) return;
    setSavingPwd(true);
    // Reautentica para validar a senha atual
    const { error: reauth } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: pwd.current,
    });
    if (reauth) {
      toast.error("Senha atual incorreta");
      setSavingPwd(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso");
      setPwd({ current: "", next: "", confirm: "" });
    }
    setSavingPwd(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus dados pessoais, do restaurante e segurança da conta.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="perfil" className="gap-2">
            <UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="restaurante" className="gap-2">
            <Store className="h-4 w-4" /> <span className="hidden sm:inline">Restaurante</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="h-4 w-4" /> <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
        </TabsList>

        {/* PERFIL */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 via-card to-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Informações pessoais</CardTitle>
                  <p className="text-xs text-muted-foreground">Como você é identificado dentro do sistema.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <FieldGroup label="Seu nome" error={errors.full_name} icon={UserIcon}>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ex: Carlos Souza"
                  className="h-11 pl-10"
                />
              </FieldGroup>

              <ActionBar
                saving={savingProfile}
                saved={profileSaved}
                disabled={!profileValid}
                onClick={saveProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESTAURANTE */}
        <TabsContent value="restaurante" className="space-y-4">
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 via-card to-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Dados do restaurante</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Aparecem para seus clientes nos cardápios e pedidos.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <FieldGroup label="Nome do restaurante" error={errors.restaurant_name} icon={Store}>
                <Input
                  value={form.restaurant_name}
                  onChange={(e) =>
                    setForm({ ...form, restaurant_name: e.target.value.toUpperCase() })
                  }
                  placeholder="EX: BURGUER HOUSE"
                  className="h-11 pl-10 font-semibold uppercase tracking-wide"
                />
              </FieldGroup>

              <FieldGroup
                label="WhatsApp padrão"
                error={errors.whatsapp}
                icon={Phone}
                hint="Cada cardápio pode ter um WhatsApp próprio."
              >
                <Input
                  value={whatsDisplay}
                  onChange={(e) => {
                    const masked = maskWhatsapp(e.target.value);
                    setWhatsDisplay(masked);
                    setForm({ ...form, whatsapp_number: onlyDigits(masked) });
                  }}
                  placeholder="(11) 9 9999-9999"
                  inputMode="numeric"
                  className="h-11 pl-10 tabular-nums"
                />
              </FieldGroup>

              <ActionBar
                saving={savingProfile}
                saved={profileSaved}
                disabled={!profileValid}
                onClick={saveProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEGURANÇA */}
        <TabsContent value="seguranca" className="space-y-4">
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 via-card to-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Alterar senha</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Use uma senha forte com pelo menos 8 caracteres, letras e números.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <FieldGroup label="Senha atual" icon={Lock}>
                <PasswordInput
                  value={pwd.current}
                  onChange={(v) => setPwd({ ...pwd, current: v })}
                  show={showPwd.current}
                  onToggle={() => setShowPwd({ ...showPwd, current: !showPwd.current })}
                  placeholder="••••••••"
                />
              </FieldGroup>

              <FieldGroup label="Nova senha" icon={Lock} error={pwdErrors.next}>
                <PasswordInput
                  value={pwd.next}
                  onChange={(v) => setPwd({ ...pwd, next: v })}
                  show={showPwd.next}
                  onToggle={() => setShowPwd({ ...showPwd, next: !showPwd.next })}
                  placeholder="Mínimo 8 caracteres"
                />
                {pwd.next && !pwdErrors.next && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Senha forte
                  </p>
                )}
              </FieldGroup>

              <FieldGroup label="Confirmar nova senha" icon={Lock} error={pwdErrors.confirm}>
                <PasswordInput
                  value={pwd.confirm}
                  onChange={(v) => setPwd({ ...pwd, confirm: v })}
                  show={showPwd.confirm}
                  onToggle={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })}
                  placeholder="Repita a nova senha"
                />
              </FieldGroup>

              <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                <Button
                  variant="cta"
                  size="lg"
                  onClick={changePassword}
                  disabled={!pwdValid || savingPwd}
                  className="min-w-[180px]"
                >
                  {savingPwd ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Alterando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" /> Alterar senha
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const FieldGroup = ({
  label,
  icon: Icon,
  error,
  hint,
  children,
}: {
  label: string;
  icon?: any;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      {children}
    </div>
    {error ? (
      <p className="text-[11px] font-medium text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const PasswordInput = ({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) => (
  <>
    <Input
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="new-password"
      className="h-11 pl-10 pr-10"
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </>
);

const ActionBar = ({
  saving,
  saved,
  disabled,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  disabled: boolean;
  onClick: () => void;
}) => (
  <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
    {saved && (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-4 w-4" /> Salvo
      </span>
    )}
    <Button variant="cta" size="lg" onClick={onClick} disabled={disabled || saving} className="min-w-[180px]">
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" /> Salvar alterações
        </>
      )}
    </Button>
  </div>
);

export default Settings;
