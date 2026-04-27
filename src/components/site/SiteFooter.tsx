import { Logo } from "@/components/Logo";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-border/60 bg-background py-12">
      <div className="container-app grid gap-8 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Cardápio digital profissional + pedidos via WhatsApp para o seu restaurante.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Produto</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="/#recursos" className="hover:text-foreground">Recursos</a></li>
            <li><a href="/#planos" className="hover:text-foreground">Planos</a></li>
            <li><a href="/#faq" className="hover:text-foreground">Perguntas</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Conta</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="/auth" className="hover:text-foreground">Entrar</a></li>
            <li><a href="https://wa.me/5518991913165?text=Olá!%20Quero%20criar%20minha%20conta%20no%20TreexMenu%20e%20começar%20o%20teste%20grátis%20🚀" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Criar conta</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Contato</h4>
          <p className="mt-3 text-sm text-muted-foreground">contato@treexmenu.com</p>
        </div>
      </div>
      <div className="container-app mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} TreexMenu. Todos os direitos reservados.
      </div>
    </footer>
  );
};
