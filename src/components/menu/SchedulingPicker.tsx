/* ============================================================
   Picker de data + horário para agendamento de pedidos
   - Respeita business_hours do restaurante
   - Antecedência mínima e janela máxima configuráveis
============================================================ */

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { BusinessHours, DAY_ORDER } from "@/lib/businessHours";

interface Props {
  businessHours: BusinessHours;
  minMinutes: number; // antecedência mínima
  maxDays: number; // janela máxima
  value: Date | null;
  onChange: (d: Date | null) => void;
  accentColor?: string;
  textColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  mutedColor?: string;
  bgColor?: string;
}

const SLOT_MIN = 15;

function buildSlots(date: Date, hours: BusinessHours, minMinutes: number): string[] {
  const dayKey = DAY_ORDER[(date.getDay() + 6) % 7];
  const cfg = (hours as any)[dayKey];
  if (!cfg || !cfg.enabled) return [];
  const [oh, om] = String(cfg.open || "00:00").split(":").map((n) => parseInt(n, 10));
  const [ch, cm] = String(cfg.close || "00:00").split(":").map((n) => parseInt(n, 10));

  const start = new Date(date);
  start.setHours(oh, om, 0, 0);
  const end = new Date(date);
  end.setHours(ch, cm, 0, 0);
  if (end <= start) return []; // jornada inválida ou cruza meia-noite (não suportado v1)

  const minTs = Date.now() + minMinutes * 60 * 1000;
  const slots: string[] = [];
  for (let t = start.getTime(); t + SLOT_MIN * 60 * 1000 <= end.getTime(); t += SLOT_MIN * 60 * 1000) {
    if (t >= minTs) {
      const d = new Date(t);
      slots.push(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
  }
  return slots;
}

export function SchedulingPicker({
  businessHours,
  minMinutes,
  maxDays,
  value,
  onChange,
  accentColor = "#6C2BD9",
  textColor = "#111827",
  surfaceColor = "#FFFFFF",
  borderColor = "#E5E7EB",
  mutedColor = "#6B7280",
  bgColor = "#F9FAFB",
}: Props) {
  const today = startOfDay(new Date());
  const days = useMemo(
    () => Array.from({ length: Math.max(1, maxDays) }, (_, i) => addDays(today, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxDays],
  );

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    if (value) return startOfDay(value);
    const firstOpen = days.find((d) => buildSlots(d, businessHours, minMinutes).length > 0);
    return firstOpen || days[0];
  });

  const slots = useMemo(
    () => buildSlots(selectedDay, businessHours, minMinutes),
    [selectedDay, businessHours, minMinutes],
  );

  const selectedTime =
    value && isSameDay(value, selectedDay)
      ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
      : "";

  const pickTime = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
    const d = new Date(selectedDay);
    d.setHours(h, m, 0, 0);
    onChange(d);
  };

  return (
    <div className="space-y-3">
      {/* Dias */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: mutedColor }}>
          <CalendarIcon className="h-3.5 w-3.5" /> Escolha o dia
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const enabled = buildSlots(d, businessHours, minMinutes).length > 0;
            const selected = isSameDay(d, selectedDay);
            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setSelectedDay(d);
                  if (value && !isSameDay(value, d)) onChange(null);
                }}
                className="flex min-w-[64px] flex-col items-center rounded-xl border-2 px-3 py-2 text-xs transition disabled:opacity-40"
                style={{
                  borderColor: selected ? accentColor : borderColor,
                  background: selected ? `${accentColor}15` : surfaceColor,
                  color: textColor,
                }}
              >
                <span className="text-[10px] font-semibold uppercase" style={{ color: mutedColor }}>
                  {format(d, "EEE", { locale: ptBR }).replace(".", "")}
                </span>
                <span className="text-base font-bold">{format(d, "dd")}</span>
                <span className="text-[10px]" style={{ color: mutedColor }}>{format(d, "MMM", { locale: ptBR })}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: mutedColor }}>
          <Clock className="h-3.5 w-3.5" /> Escolha o horário
        </div>
        {slots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs" style={{ borderColor, color: mutedColor }}>
            Nenhum horário disponível para este dia. Tente outro dia.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => {
              const sel = s === selectedTime;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickTime(s)}
                  className="rounded-lg border-2 px-2 py-2 text-sm font-semibold transition"
                  style={{
                    borderColor: sel ? accentColor : borderColor,
                    background: sel ? accentColor : bgColor,
                    color: sel ? "#FFFFFF" : textColor,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {value && (
        <div
          className="rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          Agendado para {format(value, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}

// Re-exporta utilitário para uso na lógica de envio
export { buildSlots as __buildSlots };

// Os ícones extras para outros usos
export { ChevronLeft, ChevronRight };
