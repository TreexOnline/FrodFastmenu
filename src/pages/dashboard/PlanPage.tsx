import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, CalendarClock, Zap, ArrowRight, AlertTriangle, Bot } from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/hooks/useAccess";
import { useNavigate } from "react-router-dom";

type PlanKey = "free" | "monthly" | "combo" | "annual";

interface Plan {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  pricePerMonth?: string;
  savings?: number; // BRL
  features: string[];
  highlight?: boolean;
  icon: typeof Sparkles;
}

const plans: Plan[] = [
  {
    key: "monthly",
    name: "Plano Mensal",
    price: "R$ 148",
    period: "/mês",
    pricePerMonth: "R$ 148/mês",
    features: [
      "Até 2 cardápios",
      "Produtos ilimitados",
      "5 layouts visuais",
      "Pedidos via WhatsApp",
      "Suporte por email",
    ],
    icon: Sparkles,
  },
  {
    key: "combo",
    name: "Plano Combo",
    price: "R$ 380",
    period: "/3 meses",
    pricePerMonth: "Equivale a R$ 126,66/mês",
    savings: 64,
    features: ["Até 5 cardápios", "Tudo do Mensal", "Suporte prioritário", "Sem renovação automática"],
    icon: Zap,
  },
  {
    key: "annual",
    name: "Plano Anual",
    price: "R$ 1.148",
    period: "/ano",
    pricePerMonth: "Equivale a R$ 95,66/mês",
    savings: 628,
    features: ["Até 5 cardápios", "Tudo do Combo", "Atendimento dedicado", "Acesso antecipado a novidades"],
    highlight: true,
    icon: Crown,
  },
];

const planLabel = (key: string) => {
  const map: Record<string, string> = {
    free: "Período de teste",
    monthly: "Plano Mensal",
    combo: "Plano Combo",
    annual: "Plano Anual",
  };
  return map[key] || "Período de teste";
};

const PlanPage = () => {
  const access = useAccess();
  const loading = access.loading;
  const currentPlan = access.planActive ? (access.planType ?? "monthly") : "free";
  const navigate = useNavigate();

  const WHATSAPP_NUMBER = "18991913165";
  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/55${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSelect = (p: Plan) => {
    if (p.key === currentPlan) {
      toast.info("Este já é o seu plano atual.");
      return;
    }
    // Redirecionar para checkout com o plano selecionado
    navigate(`/checkout?plan=${p.key}`);
  };

  const isFree = currentPlan === "free";
  const expirationDate = access.planExpiresAt ?? access.trialEndsAt;
  const daysRemaining = expirationDate
    ? Math.max(0, Math.ceil((expirationDate.getTime() - Date.now()) / 86_400_000))
    : 0;
  const formattedDate = expirationDate
    ? expirationDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  const isExpiringSoon = isFree && daysRemaining <= 5;

  return (
    <div className="container-app py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plano e assinatura</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gerencie sua assinatura e desbloqueie todo o potencial do TreexMenu.
          </p>
        </div>
      </div>

      {/* Active plan banner */}
      {!loading && (
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-brand">
          {/* glows */}
          <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand text-primary-foreground shadow-brand">
                {isFree ? <Sparkles className="h-7 w-7" /> : <Crown className="h-7 w-7" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Plano atual
                  </span>
                  {isFree && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <Zap className="h-3 w-3" /> Período de teste
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight">
                  {planLabel(currentPlan)}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span>
                    {isFree ? "Termina em " : "Renova em "}
                    <span className="font-semibold text-foreground">{formattedDate}</span>
                    {" · "}
                    <span className="relative inline-flex items-center">
                      <span className="absolute -left-3 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      <span className="ml-1.5 font-semibold text-primary">
                        {daysRemaining} dias restantes
                      </span>
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="cta"
              size="lg"
              onClick={() => document.getElementById("plans-grid")?.scrollIntoView({ behavior: "smooth" })}
            >
              {isFree ? "Assinar agora" : "Trocar de plano"} <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {/* Plans */}
      <div id="plans-grid" className="mt-10 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.key === currentPlan;
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className={`group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                p.highlight
                  ? "border-primary bg-card shadow-brand hover:-translate-y-1 hover:shadow-2xl"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-cta px-3 py-1 text-xs font-semibold text-accent-foreground shadow-cta">
                  Mais vantajoso
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
                  Plano atual
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    p.highlight
                      ? "gradient-brand text-primary-foreground shadow-brand"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              {p.pricePerMonth && (
                <p className="mt-1.5 text-xs text-muted-foreground">{p.pricePerMonth}</p>
              )}

              {p.savings ? (
                <div className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Economia de
                  </span>
                  <span className="font-serif text-base font-extrabold italic">
                    R$ {p.savings}
                  </span>
                </div>
              ) : (
                <div className="mt-4 h-[34px]" />
              )}

              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrent ? "outline" : p.highlight ? "cta" : "default"}
                className="mt-6 w-full"
                disabled={isCurrent}
                onClick={() => handleSelect(p)}
              >
                {isCurrent ? "Plano ativo" : "Assinar plano"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Adicional — IA WhatsApp */}
      <div className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
              <Sparkles className="h-3 w-3" /> Adicional opcional
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Atendente IA no WhatsApp</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Independente do seu plano. Ative ou cancele quando quiser.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-brand md:p-8">
          <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-brand text-primary-foreground shadow-brand">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">IA responde sozinha 24h</h3>
                  <p className="text-xs text-muted-foreground">Por instância de WhatsApp conectada</p>
                </div>
              </div>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  "Atendimento 24h por dia",
                  "Entende gírias e erros",
                  "Tira pedidos sozinha",
                  "Conexão exclusiva via WhatsApp",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Adicional
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">R$ 99</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Soma-se ao valor do seu plano
              </p>

              <Button
                variant="cta"
                className="mt-4 w-full"
                onClick={() => openWhatsApp("Olá! Quero adicionar a IA Atendente no WhatsApp (R$ 99/mês) ao meu plano FrodFast. Pode me enviar as instruções?")}
              >
                Adicionar IA <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanPage;
