import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";

type Mode = "login" | "signup";
type Step = "phone" | "code" | "details";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const formatPhoneBR = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const normalizeForApi = (raw: string) => {
  const d = onlyDigits(raw);
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
};

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const phoneValid = useMemo(() => onlyDigits(phone).length >= 10, [phone]);

  // ---- LOGIN DESABILITADO ----
  // Login por telefone foi removido para usar apenas email real
  // Use AuthGmail.tsx para login com email real
  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("Login por telefone desabilitado. Use o login por email em AuthGmail.tsx");
    setLoading(false);
  };

  // ---- SIGNUP STEP 1: enviar código ----
  const sendCode = async () => {
    if (!phoneValid) return toast.error("Informe um telefone válido");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: normalizeForApi(phone) },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Falha ao enviar código");
        return;
      }
      toast.success("Código enviado no seu WhatsApp!");
      setStep("code");
      setResendIn(60);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  };

  // ---- SIGNUP STEP 2: validar código (avança para passo 3) ----
  const onCodeContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error("Digite os 6 dígitos do código");
    setStep("details");
  };

  // ---- SIGNUP STEP 3: criar conta ----
  const onCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) return toast.error("Informe seu nome");
    if (!restaurantName.trim() || restaurantName.trim().length < 2)
      return toast.error("Informe o nome do restaurante");
    if (password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: {
          phone: normalizeForApi(phone),
          code,
          password,
          full_name: fullName.trim(),
          restaurant_name: restaurantName.trim(),
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Falha ao criar conta");
        // Se for erro de código, volta pro passo do código
        if ((data?.error || "").toLowerCase().includes("código")) {
          setStep("code");
        }
        return;
      }

      // Se a edge function devolveu uma sessão, usa ela
      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else if (data?.internal_email) {
        // Fallback: faz login com a senha
        await supabase.auth.signInWithPassword({
          email: data.internal_email,
          password,
        });
      }
      toast.success("Conta criada! Você tem 15 dias grátis 🎉");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("phone");
    setCode("");
    setPassword("");
    setFullName("");
    setRestaurantName("");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel lateral */}
      <div className="hidden gradient-brand p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo imgClassName="h-24" />
        <div className="text-primary-foreground">
          <h2 className="text-balance text-4xl font-bold leading-tight">
            Cadastro 100% pelo WhatsApp.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Sem e-mail, sem complicação. Você recebe um código no WhatsApp e em segundos
            está com seu cardápio digital pronto.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} TreexMenu
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          {/* Cabeçalho dinâmico */}
          {mode === "login" ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
              <p className="mt-2 text-muted-foreground">
                Entre com seu WhatsApp e senha.
              </p>
            </>
          ) : step === "phone" ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Crie sua conta</h1>
              <p className="mt-2 text-muted-foreground">
                Vamos enviar um código no seu WhatsApp para confirmar.
              </p>
            </>
          ) : step === "code" ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Confirme o código</h1>
              <p className="mt-2 text-muted-foreground">
                Enviamos 6 dígitos para{" "}
                <span className="font-semibold text-foreground">{formatPhoneBR(phone)}</span>.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Quase lá!</h1>
              <p className="mt-2 text-muted-foreground">
                Complete seu cadastro para acessar o painel.
              </p>
            </>
          )}

          {/* LOGIN */}
          {mode === "login" && (
            <form onSubmit={onLogin} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={formatPhoneBR(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          )}

          {/* SIGNUP - PASSO 1: TELEFONE */}
          {mode === "signup" && step === "phone" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendCode();
              }}
              className="mt-8 space-y-4"
            >
              <div>
                <Label htmlFor="phone">Seu WhatsApp</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={formatPhoneBR(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enviaremos um código de verificação no seu WhatsApp.
                </p>
              </div>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Receber código no WhatsApp
                  </>
                )}
              </Button>
            </form>
          )}

          {/* SIGNUP - PASSO 2: CÓDIGO */}
          {mode === "signup" && step === "code" && (
            <form onSubmit={onCodeContinue} className="mt-8 space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                variant="cta"
                size="lg"
                className="w-full"
                disabled={code.length !== 6}
              >
                Continuar
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Trocar número
                </button>
                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  onClick={sendCode}
                  className="font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                >
                  {resendIn > 0 ? `Reenviar em ${resendIn}s` : "Reenviar código"}
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP - PASSO 3: DETALHES */}
          {mode === "signup" && step === "details" && (
            <form onSubmit={onCreateAccount} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="fullName">Seu nome</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maria Silva"
                />
              </div>
              <div>
                <Label htmlFor="restaurantName">Nome do restaurante</Label>
                <Input
                  id="restaurantName"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Burger House"
                />
              </div>
              <div>
                <Label htmlFor="password">Crie uma senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                variant="cta"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta grátis"}
              </Button>

              <button
                type="button"
                onClick={() => setStep("code")}
                className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            </form>
          )}

          {/* Trocar mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="font-semibold text-primary hover:underline"
                >
                  Entrar
                </button>
              </>
            ) : (
              <>
                Ainda não tem conta?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  Criar conta
                </button>
              </>
            )}
          </p>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
