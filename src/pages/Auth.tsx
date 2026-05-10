import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useAuthErrorHandler } from "@/hooks/useAuthErrorHandler";
import { useDebouncedCallback, usePreventDoubleClick } from "@/hooks/useDebounce";
import { ArrowLeft, Mail, Loader2, User, Store, Lock } from "lucide-react";

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

  // Hooks para tratamento de erros e prevenção de múltiplos submits
  const authErrorHandler = useAuthErrorHandler({
    showToast: true,
    logToConsole: true,
    blockOnError: false,
    retryOnError: false
  });

  const { isDisabled, preventDoubleClick } = usePreventDoubleClick(2000);

  // Debounce para validação de email
  const debouncedEmailCheck = useDebouncedCallback(
    () => setStep("details"),
    { delay: 500 }
  );

  const emailValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  // ---- LOGIN ----
  const onLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!emailValid) {
      toast.error("Informe um e-mail válido");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }

    setLoading(true);
    
    const result = await authErrorHandler.executeWithErrorHandling(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Sucesso - redirecionar para dashboard
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard", { replace: true });
        
        return data;
      },
      "LOGIN",
      { email: email.replace(/(.{2}).*(@.*)/, "$1***$2") } // Mascarar email no log
    );

    setLoading(false);
    
    if (!result) {
      // Erro já foi tratado pelo handler
      return;
    }

  }, [emailValid, password, email, authErrorHandler, navigate]);

  // ---- SIGNUP STEP 1: verificar e-mail ----
  const checkEmail = useCallback(() => {
    if (!emailValid) {
      toast.error("Informe um e-mail válido");
      return;
    }
    
    // Avança para detalhes com debounce
    debouncedEmailCheck();
    
    // Feedback visual
    toast.success("E-mail válido! Continue preenchendo seus dados.");
  }, [emailValid, debouncedEmailCheck]);

  // ---- SIGNUP STEP 2: criar conta ----
  const onSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos submits
    if (isDisabled) {
      console.warn('🚫 Multiple submit attempts blocked');
      return;
    }
    
    // Validações
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }
    if (!restaurantName.trim()) {
      toast.error("Informe o nome do restaurante");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }

    setLoading(true);
    
    preventDoubleClick(() => {
      // Lógica principal com tratamento de erros
      authErrorHandler.executeWithErrorHandling(
        async () => {
          console.log('🚀 Starting signup process for:', email.replace(/(.{2}).*(@.*)/, "$1***$2"));
          
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

          console.log('✅ Signup successful - confirmation email sent');
          
          // Sucesso
          toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
          
          // Redirecionar para login após cadastro bem-sucedido
          setTimeout(() => {
            setMode("login");
            setStep("email");
            // Limpar formulário
            setFullName("");
            setRestaurantName("");
            setPassword("");
          }, 2000);
          
          return authData;
        },
        "SIGNUP",
        { 
          email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
          restaurantName,
          hasFullName: !!fullName.trim()
        }
      ).then((result) => {
        setLoading(false);
        
        if (!result) {
          // Erro já foi tratado pelo handler
          console.log('❌ Signup failed - error handled by authErrorHandler');
        } else {
          console.log('✅ Signup completed successfully');
        }
      });
    });
    
  }, [fullName, restaurantName, password, email, isDisabled, preventDoubleClick, authErrorHandler]);

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
          <h1 className="text-2xl font-bold text-primary">FrodFast</h1>
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
