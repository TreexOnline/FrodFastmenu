import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "step" | "min" | "max"> {
  /** Valor em reais (ex: 12.5 = R$ 12,50). null/undefined = vazio */
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  /** Mostra o prefixo "R$ " dentro do input. Default true. */
  showPrefix?: boolean;
}

const formatCents = (cents: number) => {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Input de moeda BRL: o usuário digita apenas dígitos e o valor é
 * automaticamente formatado em tempo real (ex: 1 → 0,01 | 123 → 1,23).
 * Inicia vazio quando value é null/undefined.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, showPrefix = true, className, placeholder, ...rest }, ref) => {
    // Valor exibido (string formatada) — sincronizado com value externo
    const display = React.useMemo(() => {
      if (value === null || value === undefined || Number.isNaN(value)) return "";
      const cents = Math.round(Number(value) * 100);
      return formatCents(cents);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      if (!digits) {
        onValueChange(null);
        return;
      }
      // Limita a 12 dígitos para evitar overflow visual
      const limited = digits.slice(0, 12);
      const cents = parseInt(limited, 10);
      onValueChange(cents / 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite navegação/edição padrão; bloqueia teclas inválidas
      const allowed = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Tab",
        "Home",
        "End",
        "Enter",
      ];
      if (allowed.includes(e.key)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (!/^\d$/.test(e.key)) e.preventDefault();
    };

    return (
      <div className="relative w-full">
        {showPrefix && (
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
        )}
        <Input
          ref={ref}
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "0,00"}
          className={cn(showPrefix && "pl-9", "text-right tabular-nums", className)}
          {...rest}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
