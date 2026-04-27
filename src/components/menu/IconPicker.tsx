import { useState } from "react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { CategoryIconView } from "./CategoryIconView";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const [open, setOpen] = useState(false);

  // Separa: novos personalizados primeiro, depois Lucide
  const customIcons = CATEGORY_ICONS.filter((c) => c.image);
  const lucideIcons = CATEGORY_ICONS.filter((c) => !c.image);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-11 min-w-[3rem] shrink-0 items-center justify-center gap-0.5 rounded-lg border border-border bg-background transition hover:bg-muted px-1.5"
          aria-label="Escolher ícone"
        >
          <CategoryIconView iconKey={value} size={26} />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <div className="mb-2 text-xs font-semibold text-foreground">
          Ícones personalizados
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {customIcons.map(({ key, label }) => {
            const selected = value === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => { onChange(key); setOpen(false); }}
                className={`flex h-14 w-full items-center justify-center rounded-lg border-2 transition ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <CategoryIconView iconKey={key} size={36} />
              </button>
            );
          })}
        </div>

        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Genéricos
        </div>
        <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto">
          {lucideIcons.map(({ key, label, Icon }) => {
            const selected = value === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => { onChange(key); setOpen(false); }}
                className={`flex h-10 w-10 items-center justify-center rounded-md border transition ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
