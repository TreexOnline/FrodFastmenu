import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QuantityInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "step"> {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  /** Quantidade mínima permitida quando o campo tem valor. Default: undefined (sem mínimo). */
  min?: number;
  /** Quantidade máxima permitida. Default: undefined. */
  max?: number;
}

/**
 * Input de quantidade: aceita somente inteiros positivos.
 * Inicia vazio quando value é null/undefined.
 */
export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ value, onValueChange, min, max, className, placeholder, ...rest }, ref) => {
    const display = value === null || value === undefined || Number.isNaN(value) ? "" : String(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      if (!digits) {
        onValueChange(null);
        return;
      }
      let n = parseInt(digits.slice(0, 9), 10);
      if (max !== undefined && n > max) n = max;
      onValueChange(n);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (value !== null && value !== undefined && min !== undefined && value < min) {
        onValueChange(min);
      }
      rest.onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? ""}
        className={cn("tabular-nums", className)}
        {...rest}
      />
    );
  },
);
QuantityInput.displayName = "QuantityInput";
