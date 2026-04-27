export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  enabled: boolean;
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}

export type BusinessHours = Record<DayKey, DayHours>;

export const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, { short: string; long: string }> = {
  mon: { short: "Seg", long: "Segunda-feira" },
  tue: { short: "Ter", long: "Terça-feira" },
  wed: { short: "Qua", long: "Quarta-feira" },
  thu: { short: "Qui", long: "Quinta-feira" },
  fri: { short: "Sex", long: "Sexta-feira" },
  sat: { short: "Sáb", long: "Sábado" },
  sun: { short: "Dom", long: "Domingo" },
};

export const DEFAULT_HOURS: BusinessHours = {
  mon: { enabled: false, open: "09:00", close: "18:00" },
  tue: { enabled: false, open: "09:00", close: "18:00" },
  wed: { enabled: false, open: "09:00", close: "18:00" },
  thu: { enabled: false, open: "09:00", close: "18:00" },
  fri: { enabled: false, open: "09:00", close: "18:00" },
  sat: { enabled: false, open: "09:00", close: "18:00" },
  sun: { enabled: false, open: "09:00", close: "18:00" },
};

export function normalizeBusinessHours(input: any): BusinessHours {
  const out = { ...DEFAULT_HOURS };
  if (input && typeof input === "object") {
    DAY_ORDER.forEach((k) => {
      const d = input[k];
      if (d && typeof d === "object") {
        out[k] = {
          enabled: !!d.enabled,
          open: typeof d.open === "string" ? d.open : "09:00",
          close: typeof d.close === "string" ? d.close : "18:00",
        };
      }
    });
  }
  return out;
}

// JS Date.getDay(): 0=Sun, 1=Mon ... 6=Sat
const JS_TO_KEY: Record<number, DayKey> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

/** Verifica se o estabelecimento está aberto agora segundo o cronograma. */
export function isOpenNow(hours: BusinessHours, now: Date = new Date()): boolean {
  const key = JS_TO_KEY[now.getDay()];
  const day = hours[key];
  if (!day || !day.enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  if (open < 0 || close < 0) return false;
  // Suporta horários que cruzam meia-noite (ex: 18:00 - 02:00)
  if (close <= open) {
    return cur >= open || cur < close;
  }
  return cur >= open && cur < close;
}

/** Conta quantos dias estão habilitados — para indicador no editor. */
export function enabledDaysCount(hours: BusinessHours): number {
  return DAY_ORDER.filter((k) => hours[k].enabled).length;
}
