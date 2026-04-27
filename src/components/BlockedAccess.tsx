import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";

interface BlockedAccessProps {
  title?: string;
  message?: string;
}

export const BlockedAccess = ({
  title = "Cardápio bloqueado",
  message = "Seu período de teste terminou. Adquira um plano para voltar a utilizar.",
}: BlockedAccessProps) => {
  return (
    <div className="container-app flex min-h-[70vh] items-center justify-center py-10">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-premium">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand text-primary-foreground shadow-brand">
          <Lock className="h-8 w-8" />
        </div>

        <h1 className="relative mt-6 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-muted-foreground">{message}</p>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="cta" size="lg">
            <Link to="/dashboard/plano">
              <Crown /> Adquirir plano <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
