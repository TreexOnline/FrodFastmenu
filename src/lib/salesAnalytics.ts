import { startOfDay, startOfMonth, startOfWeek, subDays, subMonths, format, eachDayOfInterval, eachMonthOfInterval, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  total_amount: number;
  status: string;
  source: string;
  notes: string | null;
  menu_id: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string | null;
  addons?: any[] | null;
  category_name?: string | null;
};

export const STATUS_LABELS: Record<string, string> = {
  new: "Pedido criado",
  finished: "Pedido concluído",
  cancelled: "Pedido cancelado",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  finished: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

/** Auto-cancela pedidos com status "new" há mais de N dias. Retorna a lista normalizada. */
export const AUTO_CANCEL_DAYS = 2;
export function autoCancelStale(orders: Order[]): { orders: Order[]; staleIds: string[] } {
  const cutoff = Date.now() - AUTO_CANCEL_DAYS * 86400000;
  const staleIds: string[] = [];
  const normalized = orders.map((o) => {
    if (o.status === "new" && new Date(o.created_at).getTime() < cutoff) {
      staleIds.push(o.id);
      return { ...o, status: "cancelled" };
    }
    // Mapeia status legados para o novo conjunto
    if (["preparing", "shipped"].includes(o.status)) return { ...o, status: "new" };
    return o;
  });
  return { orders: normalized, staleIds };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function calcMetrics(orders: Order[]) {
  // KPIs consideram APENAS pedidos concluídos (status = "finished")
  const valid = orders.filter((o) => o.status === "finished");
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = monthStart;
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subDays(weekStart, 7);

  const inRange = (o: Order, from: Date, to: Date) => {
    const d = new Date(o.created_at);
    return d >= from && d < to;
  };

  const monthOrders = valid.filter((o) => new Date(o.created_at) >= monthStart);
  const lastMonthOrders = valid.filter((o) => inRange(o, lastMonthStart, lastMonthEnd));
  const weekOrders = valid.filter((o) => new Date(o.created_at) >= weekStart);
  const lastWeekOrders = valid.filter((o) => inRange(o, lastWeekStart, weekStart));

  const sum = (arr: Order[]) => arr.reduce((a, o) => a + Number(o.total_amount), 0);

  const revenue = sum(monthOrders);
  const lastRevenue = sum(lastMonthOrders);
  const weekRevenue = sum(weekOrders);
  const lastWeekRevenue = sum(lastWeekOrders);

  const uniqueCustomers = new Set(monthOrders.map((o) => o.customer_phone || o.customer_name)).size;
  const ticket = monthOrders.length ? revenue / monthOrders.length : 0;

  const pct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  return {
    revenue,
    orderCount: monthOrders.length,
    ticket,
    customers: uniqueCustomers,
    revenueChange: pct(revenue, lastRevenue),
    orderChange: pct(monthOrders.length, lastMonthOrders.length),
    weekChange: pct(weekRevenue, lastWeekRevenue),
  };
}

export function buildTimeSeries(orders: Order[], range: "7d" | "30d" | "12m") {
  const now = new Date();
  const valid = orders.filter((o) => o.status !== "cancelled");

  if (range === "12m") {
    const from = startOfMonth(subMonths(now, 11));
    const months = eachMonthOfInterval({ start: from, end: now });
    return months.map((m) => {
      const next = startOfMonth(subMonths(m, -1));
      const total = valid
        .filter((o) => isWithinInterval(new Date(o.created_at), { start: m, end: next }))
        .reduce((a, o) => a + Number(o.total_amount), 0);
      return { label: format(m, "MMM", { locale: ptBR }), value: Math.round(total * 100) / 100 };
    });
  }

  const days = range === "7d" ? 7 : 30;
  const from = startOfDay(subDays(now, days - 1));
  const allDays = eachDayOfInterval({ start: from, end: now });
  return allDays.map((d) => {
    const next = subDays(d, -1);
    const total = valid
      .filter((o) => {
        const od = new Date(o.created_at);
        return od >= d && od < next;
      })
      .reduce((a, o) => a + Number(o.total_amount), 0);
    return {
      label: format(d, range === "7d" ? "EEE" : "dd/MM", { locale: ptBR }),
      value: Math.round(total * 100) / 100,
    };
  });
}

/** Remove o sufixo de adicionais "(...)" inserido no checkout, mantendo apenas o nome base do produto. */
function baseProductName(name: string): string {
  return name.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

export function topProducts(items: OrderItem[], orders: Order[], limit = 5) {
  const validIds = new Set(orders.filter((o) => o.status !== "cancelled").map((o) => o.id));
  const map = new Map<string, { name: string; quantity: number; revenue: number }>();
  items
    .filter((i) => validIds.has(i.order_id))
    .forEach((i) => {
      const baseName = baseProductName(i.product_name);
      // Agrupa por product_id quando disponível; senão, pelo nome base normalizado
      const key = i.product_id || `name:${baseName.toLowerCase()}`;
      const cur = map.get(key) || { name: baseName, quantity: 0, revenue: 0 };
      cur.quantity += i.quantity;
      cur.revenue += Number(i.subtotal);
      map.set(key, cur);
    });
  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function buildInsights(orders: Order[], items: OrderItem[]) {
  const valid = orders.filter((o) => o.status !== "cancelled");
  const monthStart = startOfMonth(new Date());
  const monthOrders = valid.filter((o) => new Date(o.created_at) >= monthStart);
  const top = topProducts(items, monthOrders, 1)[0];

  const hourMap = new Map<number, number>();
  valid.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    hourMap.set(h, (hourMap.get(h) || 0) + 1);
  });
  let topHour: number | null = null;
  let topHourCount = 0;
  hourMap.forEach((c, h) => {
    if (c > topHourCount) {
      topHourCount = c;
      topHour = h;
    }
  });

  const dayMap = new Map<string, number>();
  valid.forEach((o) => {
    const day = format(new Date(o.created_at), "yyyy-MM-dd");
    dayMap.set(day, (dayMap.get(day) || 0) + Number(o.total_amount));
  });
  let topDay: string | null = null;
  let topDayValue = 0;
  dayMap.forEach((v, d) => {
    if (v > topDayValue) {
      topDayValue = v;
      topDay = d;
    }
  });

  return {
    topProductName: top?.name || null,
    topProductQty: top?.quantity || 0,
    topHour,
    topDay: topDay ? format(new Date(topDay + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR }) : null,
    topDayValue,
  };
}
