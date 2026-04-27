import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";
import { BusinessHours, DAY_LABELS, DAY_ORDER, DEFAULT_HOURS, enabledDaysCount, normalizeBusinessHours } from "@/lib/businessHours";

interface Props {
  value: BusinessHours | null | undefined;
  onSave: (next: BusinessHours) => Promise<void> | void;
}

export function BusinessHoursDialog({ value, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState<BusinessHours>(normalizeBusinessHours(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHours(normalizeBusinessHours(value));
  }, [value, open]);

  const enabledCount = enabledDaysCount(hours);

  const update = (k: keyof BusinessHours, patch: Partial<BusinessHours[keyof BusinessHours]>) => {
    setHours((h) => ({ ...h, [k]: { ...h[k], ...patch } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(hours);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const applyToAll = () => {
    const ref = hours.mon;
    const next = { ...hours };
    DAY_ORDER.forEach((k) => {
      next[k] = { ...ref };
    });
    setHours(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:border-primary/50 hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Horário de atendimento
              </div>
              <div className="text-xs text-muted-foreground">
                {enabledCount === 0
                  ? "Nenhum dia configurado"
                  : `${enabledCount} ${enabledCount === 1 ? "dia ativo" : "dias ativos"} na semana`}
              </div>
            </div>
          </div>
          <span className="text-xs font-medium text-primary group-hover:underline">
            Configurar
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horário de atendimento
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Selecione os dias e defina os horários. Apenas dias ativos contam como aberto.
          </p>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-3 py-3 sm:px-5">
          <div className="space-y-2">
            {DAY_ORDER.map((k) => {
              const d = hours[k];
              const label = DAY_LABELS[k];
              return (
                <div
                  key={k}
                  className={`rounded-xl border p-3 transition-colors ${
                    d.enabled ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => update(k, { enabled: !d.enabled })}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          d.enabled
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-border bg-background"
                        }`}
                      >
                        {d.enabled && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">
                          {label.long}
                        </div>
                        <div className={`text-xs ${d.enabled ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}>
                          {d.enabled ? "Aberto" : "Fechado"}
                        </div>
                      </div>
                    </button>

                    {d.enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={d.open}
                          onChange={(e) => update(k, { open: e.target.value })}
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground outline-none focus:border-primary"
                        />
                        <span className="text-xs text-muted-foreground">às</span>
                        <input
                          type="time"
                          value={d.close}
                          onChange={(e) => update(k, { close: e.target.value })}
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={applyToAll}
            className="mt-3 w-full rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            Aplicar horário de Segunda em todos os dias
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="cta" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar horários"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
