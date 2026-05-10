import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2, User, Store } from "lucide-react";

type Mode = "login" | "signup";
type Step = "email" | "details";

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const emailValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  // ---- LOGIN COM GMAIL ----
  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return toast.error("Informe um e-mail válido");
    if (password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error("E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  
  // ---- SIGNUP STEP 1: verificar e-mail ----
  const checkEmail = async () => {
    if (!emailValid) {
      return toast.error("Informe um e-mail válido");
    }
    // Avança diretamente para detalhes
    // Supabase vai validar email duplicado no signUp()
    setStep("details");
  };

  // ---- SIGNUP STEP 2: criar conta ----
  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Informe seu nome completo");
    if (!restaurantName.trim()) return toast.error("Informe o nome do restaurante");
    if (password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");

    setLoading(true);
    try {
      // 1. Apenas criar usuário no Supabase Auth
      // O resto (profile, menu, roles) será criado automaticamente pelo trigger
      // quando o usuário confirmar o e-mail
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            restaurant_name: restaurantName,
          },
        },
      });

      if (authError) throw authError;

      toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      
      // Redirecionar para login após cadastro bem-sucedido
      setMode("login");
      
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setStep("email");
    setEmail("");
    setPassword("");
    setFullName("");
    setRestaurantName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
        </div>

        {/* Cabeçalho dinâmico */}
        {mode === "login" ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
            <p className="mt-2 text-muted-foreground">
              Faça login na sua conta para gerenciar seu cardápio
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Criar nova conta</h1>
            <p className="mt-2 text-muted-foreground">
              Comece a gerenciar seu cardápio digital hoje mesmo
            </p>
          </>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <div className="space-y-6">
            
            {/* Formulário E-mail/Senha */}
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !emailValid || password.length < 6} className="w-full">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>
        )}

        {/* SIGNUP */}
        {mode === "signup" && (
          <>
            {step === "email" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={checkEmail}
                  disabled={loading || !emailValid}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </div>
            )}

            {step === "details" && (
              <form onSubmit={onSignup} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Seu Nome</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="João Silva"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                    <Input
                      id="restaurantName"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="Restaurante Sabores"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signupPassword">Senha</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !fullName.trim() || !restaurantName.trim() || password.length < 6}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>
            )}
          </>
        )}

        {/* Links */}
        <div className="text-center text-sm">
          {mode === "login" ? (
            <>
              Não tem conta?{" "}
              <button
                onClick={() => switchMode("signup")}
                className="font-semibold text-primary hover:underline"
              >
                Criar conta gratuita
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => switchMode("login")}
                className="font-semibold text-primary hover:underline"
              >
                Entrar
              </button>
            </>
          )}
        </div>

        {/* Voltar */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
