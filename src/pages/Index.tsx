import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  MessageCircle,
  Bot,
  QrCode,
  ShoppingBag,
  Bell,
  Boxes,
  Printer,
  BarChart3,
  Clock,
  ClipboardList,
  Layers,
  Smartphone,
  Palette,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  Calendar,
  TrendingUp,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import heroMockup from "@/assets/hero-mockup.png";
import { useAuth } from "@/contexts/AuthContext";
import { useSubdomain } from "@/hooks/useSubdomain";
import { getMenuBySlug } from "@/lib/subdomainMenu";

const SIGNUP_URL = "/auth?mode=signup";


const plans = [
  {
    name: "Plano Mensal",
    price: "R$ 148",
    period: "/mês",
    note: "Cobrado mensalmente",
    savings: 0,
    features: [
      "Cardápios ilimitados",
      "Pedidos via WhatsApp",
      "Controle de estoque",
      "Comandas e agendamento",
      "Relatório de vendas",
      "Suporte por email",
    ],
    highlight: false,
    cta: "Assinar Mensal",
  },
  {
    name: "Plano Combo",
    price: "R$ 380",
    period: "/3 meses",
    note: "Equivale a R$ 126,66/mês",
    savings: 64,
    features: [
      "Tudo do plano Mensal",
      "Economia trimestral",
      "Suporte prioritário",
      "Sem renovação automática",
    ],
    highlight: false,
    cta: "Assinar Trimestral",
  },
  {
    name: "Plano Anual",
    price: "R$ 1.148",
    period: "/ano",
    note: "Equivale a R$ 95,66/mês",
    savings: 628,
    features: [
      "Tudo do plano Combo",
      "Maior economia",
      "Atendimento dedicado",
      "Acesso antecipado a novidades",
    ],
    highlight: true,
    cta: "Assinar Anual",
  },
];

// Animated counter that counts up when scrolled into view
const CountUp = ({ value, duration = 1400 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              // easeOutCubic
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(value * eased));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString("pt-BR")}</span>;
};

const faqs = [
  {
    q: "Como funciona o cadastro?",
    a: "Você informa seu e-mail, cria uma senha e pronto. Cadastro simples e rápido, sem complicação. 15 dias grátis para testar tudo.",
  },
  {
    q: "Como o cliente faz o pedido?",
    a: "O cliente escaneia o QR Code da mesa ou acessa o link do cardápio, escolhe os produtos, define forma de entrega e finaliza. O pedido cai no seu painel e ele recebe atualizações no WhatsApp automaticamente.",
  },
  {
    q: "A IA realmente atende sozinha?",
    a: "Sim. Nossa IA entende mensagens com erros de português, gírias e abreviações. Ela responde dúvidas sobre cardápio, preço, entrega e ajuda o cliente a fazer o pedido. Você pode personalizar a personalidade dela.",
  },
  {
    q: "Preciso de impressora térmica?",
    a: "Não é obrigatório, mas se tiver, configuramos a impressão automática a cada pedido novo. Pode até imprimir cupons separados para cozinha e bar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Cancela direto pelo painel, sem multa, sem burocracia.",
  },
  {
    q: "Funciona em qualquer celular?",
    a: "Sim. Tanto o painel do dono quanto o cardápio do cliente funcionam 100% pelo navegador, em qualquer celular, tablet ou computador.",
  },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { subdomain, slug, isSubdomain } = useSubdomain();
  const [subdomainLoading, setSubdomainLoading] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Redirecionamento para dashboard se usuário logado
  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  // Lógica de subdomínio
  useEffect(() => {
    if (!isSubdomain || !slug) return;

    const loadSubdomainMenu = async () => {
      setSubdomainLoading(true);
      setSubdomainError(null);

      try {
        const menu = await getMenuBySlug(slug.search);
        
        if (menu) {
          // Redirecionar para o cardápio encontrado usando o slug correto do banco
          navigate(`/menu/${menu.slug}`, { replace: true });
        } else {
          setSubdomainError('Cardápio não encontrado');
        }
      } catch (error) {
        console.error('Erro ao carregar cardápio do subdomínio:', error);
        setSubdomainError('Erro ao carregar cardápio');
      } finally {
        setSubdomainLoading(false);
      }
    };

    loadSubdomainMenu();
  }, [isSubdomain, slug, navigate]);

  // Se está carregando subdomínio, mostrar loading
  if (subdomainLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Carregando cardápio...</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Estamos preparando seu cardápio personalizado.
        </p>
      </div>
    );
  }

  // Se houver erro no subdomínio, mostrar página de erro
  if (subdomainError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Cardápio não encontrado</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Não encontramos um cardápio para <strong>"{typeof slug?.original === 'string' ? slug?.original : 'desconhecido'}"</strong>. 
          Verifique o endereço ou entre em contato com o restaurante.
        </p>
        <div className="mt-6 space-y-2">
          <Button asChild variant="outline">
            <a href="https://treexonline.online">Ir para TreexMenu</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-soft" />
        <div className="absolute -top-24 -right-24 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="container-app grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Novo: IA atende seus clientes no WhatsApp 24/7
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Seu restaurante <span className="text-primary">automatizado</span> do cardápio ao WhatsApp.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
              Cardápio digital com QR Code, pedidos online, controle de estoque, comandas, impressão automática e uma IA que atende seus clientes pelo WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild variant="cta" size="xl">
                <Link to={SIGNUP_URL}>
                  Teste 15 dias grátis <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <a href="#recursos">Ver recursos</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Sem cartão de crédito
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Cadastro pelo WhatsApp
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Suporte em português
              </span>
            </div>
          </div>

          <div className="relative animate-fade-in">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-2xl" />
            <img
              src={heroMockup}
              alt="Cardápio digital TreexMenu exibido em smartphone"
              width={1280}
              height={1024}
              className="mx-auto w-full max-w-md rounded-2xl shadow-premium lg:max-w-none"
            />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-y border-border/60 bg-card/50 py-10">
        <div className="container-app grid grid-cols-1 gap-12 text-center md:grid-cols-3 md:gap-8 lg:gap-16">
          {[
            { value: 35, prefix: "+", suffix: "", l: "Restaurantes ativos" },
            { value: 100, prefix: "", suffix: "%", l: "Satisfação dos clientes" },
            { value: 24, prefix: "", suffix: "/7", l: "Integração com WhatsApp" },
          ].map((s) => (
            <div key={s.l} className="group">
              <div className="bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-3xl font-extrabold tracking-tight text-transparent tabular-nums sm:text-4xl">
                {s.prefix}
                <CountUp value={s.value} duration={1800} />
                {s.suffix}
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DESTAQUE IA */}
      <section className="py-20 lg:py-28">
        <div className="container-app">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 lg:p-14">
            <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

            <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  <Zap className="h-3.5 w-3.5" />
                  O grande diferencial
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Uma IA que atende seus clientes <span className="text-primary">como um humano</span>.
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Esqueça responder a mesma pergunta 50 vezes por dia. Nossa IA entende erros de português, gírias e abreviações, responde dúvidas sobre cardápio, ajuda o cliente a pedir e fica online 24 horas.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Entende mensagens com erros e gírias",
                    "Personalizável: você define a personalidade",
                    "Responde sobre preços, cardápio, entrega e horário",
                    "Funciona junto com o atendimento manual",
                  ].map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button asChild variant="cta" size="lg">
                    <Link to={SIGNUP_URL}>
                      Quero a IA atendendo <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Mock conversa WhatsApp */}
              <div className="relative">
                <div className="rounded-2xl border border-border bg-background p-4 shadow-premium">
                  <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Atendente IA</div>
                      <div className="text-xs text-muted-foreground">online agora</div>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">
                      tem xsalada hj?
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                      Oi! Tem sim 🍔 X-Salada sai por R$ 22,90.<br />
                      Quer pedir?
                    </div>
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">
                      qro 2, manda em casa
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                      Fechado! Me passa seu endereço pra eu calcular a entrega 🛵
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — Bento Grid */}
      <section id="recursos" className="relative bg-card/40 py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Recursos completos
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              Tudo que faltava no seu restaurante,{" "}
              <span className="text-primary">numa plataforma só</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Do QR Code da mesa até o relatório de fechamento — sem precisar de mil
              ferramentas, mil mensalidades, mil senhas.
            </p>
          </div>

          {/* Grid uniforme — todos os cards do mesmo tamanho */}
          <div className="mx-auto mt-16 grid max-w-6xl auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* CARD 1: QR Code */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              <div className="relative flex h-full flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-brand">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">Cardápio digital com QR Code</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Cliente escaneia, escolhe e pede em segundos — sem app, sem cadastro.
                </p>
                <div className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-background p-3 pt-3">
                  <div className="grid h-14 w-14 shrink-0 grid-cols-5 grid-rows-5 gap-0.5 rounded-md bg-foreground p-1">
                    {[1,1,1,0,1,1,0,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1,0,1].map((c, i) => (
                      <div key={i} className={c ? "rounded-[1px] bg-background" : "bg-foreground"} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] text-muted-foreground">treexmenu.app/menu/</div>
                    <div className="truncate font-mono text-xs font-semibold">seu-restaurante</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                      <Check className="h-2.5 w-2.5" /> Ativo
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: IA destaque */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 transition-all hover:border-primary/60 hover:shadow-brand">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-brand">
                    <Bot className="h-6 w-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full gradient-cta px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground shadow-cta">
                    <Zap className="h-3 w-3" /> Destaque
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">IA atendente no WhatsApp 24/7</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Responde sozinha, entende gírias e ajuda a fechar pedido.
                </p>
                <div className="mt-auto space-y-2 pt-4 text-xs">
                  <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-primary px-3 py-1.5 text-primary-foreground">
                    bom dia, vcs estão on?
                  </div>
                  <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-muted px-3 py-1.5">
                    Bom dia! Tô sim 🍔 abrimos até 23h.
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: Pedidos */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 text-accent-foreground shadow-cta">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Pedidos por todos os canais</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Delivery, retirada, mesa e agendados — num painel só.
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {["Delivery", "Retirada", "Mesa", "Agendado"].map((t) => (
                  <span key={t} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* CARD 4: Notificações */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-brand">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Cliente avisado a cada etapa</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                WhatsApp automático: confirmado → preparo → saiu → entregue.
              </p>
              <div className="mt-auto flex items-center gap-1 pt-4">
                {["✅","👨‍🍳","🛵","📦"].map((e, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-sm">
                      {e}
                    </div>
                    {i < 3 && <div className="h-px w-3 bg-border" />}
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 5: Comandas */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 text-accent-foreground shadow-cta">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Comandas por mesa</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Abre, vai adicionando itens e fecha tudo no fim. Sem caderninho.
              </p>
              <div className="mt-auto flex items-baseline gap-1.5 rounded-lg bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">Mesa 12</span>
                <span className="ml-auto font-bold text-primary">R$ 184,50</span>
              </div>
            </div>

            {/* CARD 6: Estoque */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-brand">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Estoque com receita</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A cada pedido o estoque baixa sozinho — e bloqueia quando acabar.
              </p>
              <div className="mt-auto space-y-2 pt-4">
                {[
                  { name: "Pão de hambúrguer", pct: 78, qty: "78 un" },
                  { name: "Queijo cheddar", pct: 35, qty: "1,2 kg" },
                ].map((it) => (
                  <div key={it.name}>
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground/80">{it.name}</span>
                      <span className="font-mono text-muted-foreground">{it.qty}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${it.pct < 50 ? "bg-accent" : "bg-primary"}`}
                        style={{ width: `${it.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 7: Impressão */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 text-accent-foreground shadow-cta">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Impressão automática</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Já sai impresso. Divide cupom por categoria (cozinha, bar, sobremesa).
              </p>
              <div className="mt-auto rounded-lg border-2 border-dashed border-border bg-background p-3 font-mono text-[11px] leading-tight">
                <div className="text-center font-bold">PEDIDO #1284</div>
                <div className="my-1.5 border-t border-dashed border-border" />
                <div className="flex justify-between"><span>2x X-Salada</span><span>R$ 45,80</span></div>
                <div className="flex justify-between font-bold"><span>TOTAL</span><span>R$ 52,80</span></div>
              </div>
            </div>

            {/* CARD 8: Vendas */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-brand">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Relatório de vendas</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Faturamento, top produtos e ticket médio em tempo real.
              </p>
              <div className="mt-auto flex h-14 items-end gap-1 pt-4">
                {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {/* CARD 9: Agendamento */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 text-accent-foreground shadow-cta">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Pedido agendado</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Marmitas, encomendas e eventos — para o horário que você definir.
              </p>
              <div className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">Sex, 12h00</span>
              </div>
            </div>

            {/* CARD 10: Adicionais */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-brand">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Adicionais reutilizáveis</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Cadastre uma vez, use em vários produtos.
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {["+ Queijo", "+ Bacon", "+ Cebola", "+ Molho"].map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* CARD 11: Horários */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 text-accent-foreground shadow-cta">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Horário automático</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Cardápio abre e fecha sozinho conforme seu horário.
              </p>
              <div className="mt-auto flex gap-1 pt-4">
                {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                  <div
                    key={i}
                    className={`flex h-8 w-8 items-center justify-center rounded text-[11px] font-semibold ${
                      i === 6 ? "bg-muted text-muted-foreground line-through" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 12: Layouts */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-brand">
                <Palette className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">5 layouts profissionais</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Lista, grid, premium, minimalista, destaque + cor da sua marca.
              </p>
              <div className="mt-auto flex gap-1.5 pt-4">
                {["bg-primary","bg-accent","bg-foreground","bg-primary/60","bg-accent/60"].map((c, i) => (
                  <div key={i} className={`h-8 w-8 rounded-md ${c}`} />
                ))}
              </div>
            </div>
          </div>

          {/* CTA pequeno embaixo do bento */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              E ainda muito mais: biblioteca de fotos, múltiplos cardápios, tema escuro,
              link compartilhável...
            </p>
            <Button asChild variant="cta" size="lg" className="mt-5">
              <Link to={SIGNUP_URL}>
                Quero testar tudo grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Comece em 3 passos simples
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sem instalação, sem técnico, sem dor de cabeça.
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "1",
                icon: Smartphone,
                title: "Crie sua conta usando seu numero do WhatsApp",
                desc: "Informe seu número, receba um código e pronto. Não precisa de e-mail.",
              },
              {
                n: "2",
                icon: ShoppingBag,
                title: "Monte seu cardápio",
                desc: "Adicione categorias, produtos, fotos e adicionais em poucos minutos.",
              },
              {
                n: "3",
                icon: MessageCircle,
                title: "Receba pedidos",
                desc: "Compartilhe o link / QR Code e comece a vender. A IA atende sozinha.",
              },
            ].map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border bg-card p-6">
                <div className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full gradient-cta text-sm font-bold text-accent-foreground shadow-cta">
                  {s.n}
                </div>
                <s.icon className="mt-3 h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="bg-card/40 py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Planos transparentes, sem pegadinha
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comece grátis por 15 dias. Sem cartão de crédito.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-7 transition-all duration-300 ${
                  p.highlight
                    ? "border-primary bg-card shadow-brand md:scale-[1.03]"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-cta px-3 py-1 text-xs font-semibold text-accent-foreground shadow-cta">
                    Mais vantajoso
                  </div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.note}</p>

                {p.savings > 0 ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-400/10 px-3.5 py-1.5 shadow-[0_0_0_3px_hsl(var(--background))] ring-1 ring-emerald-500/20 animate-fade-in">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Economia de
                    </span>
                    <span className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                      R$ <CountUp value={p.savings} />
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 h-[34px]" />
                )}

                <ul className="mt-6 space-y-3">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={p.highlight ? "cta" : "default"}
                  className="mt-7 w-full"
                  size="lg"
                >
                  <a href={SIGNUP_URL}>{p.cta}</a>
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="mr-1.5 inline h-4 w-4 text-primary" />
            15 dias grátis · Cancele quando quiser · Sem multa
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="container-app mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Tudo que você precisa saber antes de começar.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <summary className="cursor-pointer list-none font-semibold text-foreground">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16">
        <div className="container-app">
          <div className="relative overflow-hidden rounded-3xl gradient-brand p-10 text-center shadow-brand lg:p-16">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />
            <h2 className="relative text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Pronto para automatizar seu restaurante?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/85">
              Cadastro simples e rápido. 15 dias grátis para testar tudo.
            </p>
            <Button asChild variant="cta" size="xl" className="relative mt-8">
              <Link to={SIGNUP_URL}>
                ​Testar Gratis <ArrowRight className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
