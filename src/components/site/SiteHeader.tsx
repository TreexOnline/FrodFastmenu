import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const SiteHeader = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const links = [
    { href: "/#recursos", label: "Recursos" },
    { href: "/#planos", label: "Planos" },
    { href: "/#faq", label: "Perguntas" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between">
        <Logo imgClassName="h-16 max-lg:h-12" />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild variant="brand" size="sm">
              <Link to="/dashboard">Ir ao painel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="cta" size="sm">
                <a href="https://wa.me/5518991913165?text=Olá!%20Quero%20criar%20minha%20conta%20no%20TreexMenu%20e%20começar%20o%20teste%20grátis%20🚀" target="_blank" rel="noopener noreferrer">​Testar Gratis</a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
