import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, Receipt, BarChart3, Sparkles, Trash2, Eye, Plus } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Order, OrderItem, STATUS_COLORS, STATUS_LABELS, autoCancelStale, buildInsights, buildTimeSeries, calcMetrics, formatCurrency, topProducts } from "@/lib/salesAnalytics";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

const SalesPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "12m">("30d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: ordersData }, { data: itemsData }] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("order_items").select("*, orders!inner(user_id)").eq("orders.user_id", user.id),
    ]);
    const raw = (ordersData as Order[]) || [];
    const { orders: normalized, staleIds } = autoCancelStale(raw);
    if (staleIds.length) {
      // Persiste cancelamento dos pedidos antigos (>2 dias em "criado")
      await supabase.from("orders").update({ status: "cancelled" }).in("id", staleIds);
    }
    setOrders(normalized);
    setItems(((itemsData as any[]) || []).map(({ orders: _o, ...rest }) => rest as OrderItem));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  // Mantém a página de Vendas ao vivo: recarrega ao detectar qualquer
  // mudança em pedidos/itens, ao voltar visibilidade da aba ou foco.
  useRealtimeRefresh({
    channelKey: `sales-rt-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: [
      { table: "orders", filter: user ? `user_id=eq.${user.id}` : undefined },
      { table: "order_items" },
    ],
    onChange: load,
  });

  const metrics = useMemo(() => calcMetrics(orders), [orders]);
  const series = useMemo(() => buildTimeSeries(orders, range), [orders, range]);
  const ranking = useMemo(() => topProducts(items, orders, 5), [items, orders]);
  const insights = useMemo(() => buildInsights(orders, items), [orders, items]);
  const filtered = useMemo(
    () => (statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter],
  );
  const selectedItems = useMemo(() => items.filter((i) => i.order_id === selected?.id), [items, selected]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error("Erro ao atualizar status");
    toast.success("Status atualizado");
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const deleteOrder = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("orders").delete().eq("id", deleteId);
    if (error) return toast.error("Erro ao excluir pedido");
    toast.success("Pedido excluído");
    setDeleteId(null);
    load();
  };

  const seedDemo = async () => {
    if (!user) return;
    const { data: menus } = await supabase.from("menus").select("id").eq("user_id", user.id).limit(1);
    if (!menus?.length) return toast.error("Crie um cardápio primeiro");
    const menuId = menus[0].id;
    const { data: products } = await supabase.from("products").select("id, name, price").eq("menu_id", menuId).limit(8);
    if (!products?.length) return toast.error("Adicione produtos ao cardápio primeiro");

    const names = ["João Silva", "Maria Souza", "Pedro Alves", "Ana Costa", "Lucas Lima", "Beatriz Rocha", "Rafael Mendes", "Camila Dias"];
    const statuses = ["new", "finished", "finished", "finished", "cancelled"];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const customer = names[Math.floor(Math.random() * names.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const daysAgo = Math.floor(Math.random() * 28);
      const created = new Date(now.getTime() - daysAgo * 86400000 - Math.random() * 86400000);
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const chosen: typeof products = [];
      for (let j = 0; j < itemCount; j++) chosen.push(products[Math.floor(Math.random() * products.length)]);
      const total = chosen.reduce((a, p) => a + Number(p.price), 0);

      const { data: order } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          menu_id: menuId,
          customer_name: customer,
          customer_phone: `+5511${Math.floor(900000000 + Math.random() * 99999999)}`,
          total_amount: total,
          status,
          source: "whatsapp",
          created_at: created.toISOString(),
        })
        .select()
        .single();

      if (order) {
        await supabase.from("order_items").insert(
          chosen.map((p) => ({
            order_id: order.id,
            product_id: p.id,
            product_name: p.name,
            quantity: 1,
            unit_price: Number(p.price),
            subtotal: Number(p.price),
          })),
        );
      }
    }
    toast.success("Pedidos de demonstração criados");
    load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Vendas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o desempenho do seu restaurante em tempo real.</p>
        </div>
        {orders.length === 0 && !loading && (
          <Button variant="outline" onClick={seedDemo}>
            <Plus className="h-4 w-4" />
            Gerar dados de demonstração
          </Button>
        )}
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard
          icon={DollarSign}
          label="Faturamento do mês"
          value={formatCurrency(metrics.revenue)}
          change={metrics.revenueChange}
          changeLabel="vs mês anterior"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Pedidos no mês"
          value={String(metrics.orderCount)}
          change={metrics.orderChange}
          changeLabel="vs mês anterior"
        />
        <KpiCard
          icon={Receipt}
          label="Ticket médio"
          value={formatCurrency(metrics.ticket)}
          change={metrics.weekChange}
          changeLabel="semana vs semana"
        />
        <KpiCard
          icon={Users}
          label="Clientes atendidos"
          value={String(metrics.customers)}
          changeLabel="únicos no mês"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Vendas no período</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Acompanhe a evolução do faturamento</p>
            </div>
            <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs">7 dias</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs">30 dias</TabsTrigger>
                <TabsTrigger value="12m" className="text-xs">12 meses</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Vendas"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Mais vendidos
            </CardTitle>
            <p className="text-xs text-muted-foreground">Top 5 do mês</p>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Sem vendas ainda</div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number, k: string) => (k === "quantity" ? [`${v} un`, "Vendidos"] : [formatCurrency(v), "Receita"])}
                    />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Insights inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InsightTile
            label="Produto mais vendido"
            value={insights.topProductName || "—"}
            sub={insights.topProductName ? `${insights.topProductQty} unidades este mês` : "Sem dados"}
          />
          <InsightTile
            label="Horário de pico"
            value={insights.topHour !== null ? `${String(insights.topHour).padStart(2, "0")}h` : "—"}
            sub="Maior volume de pedidos"
          />
          <InsightTile
            label="Melhor dia"
            value={insights.topDay || "—"}
            sub={insights.topDay ? formatCurrency(insights.topDayValue) : "Sem dados"}
          />
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Pedidos recebidos</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Originados do WhatsApp via cardápio digital</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.customer_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(Number(o.total_amount))}</TableCell>
                        <TableCell>
                          <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                            <SelectTrigger className={`h-8 w-36 border ${STATUS_COLORS[o.status] || ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setSelected(o)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteId(o.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list */}
              <div className="space-y-3 md:hidden">
                {filtered.map((o) => (
                  <div key={o.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(o.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(Number(o.total_amount))}</div>
                        <Badge variant="outline" className={`mt-1 ${STATUS_COLORS[o.status] || ""}`}>{STATUS_LABELS[o.status]}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(o)}>
                        <Eye className="h-4 w-4" /> Detalhes
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(o.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do pedido</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Cliente" value={selected.customer_name} />
                <Field label="Telefone" value={selected.customer_phone || "—"} />
                <Field label="Data" value={format(new Date(selected.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
                <Field label="Origem" value={selected.source === "whatsapp" ? "WhatsApp" : selected.source} />
              </div>
              {selected.customer_address && <Field label="Endereço" value={selected.customer_address} />}
              {selected.notes && <Field label="Observações" value={selected.notes} />}

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Itens</div>
                <div className="rounded-lg border border-border">
                  {selectedItems.map((i) => (
                    <div key={i.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
                      <div>
                        <span className="font-medium">{i.quantity}x</span> {i.product_name}
                      </div>
                      <div className="font-medium">{formatCurrency(Number(i.subtotal))}</div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-muted/50 px-3 py-2 text-sm font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(Number(selected.total_amount))}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Atualizar status</div>
                <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
  change,
  changeLabel,
}: {
  icon: any;
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
}) => {
  const positive = (change || 0) >= 0;
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground md:text-sm">{label}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight md:text-2xl">{value}</div>
        {change !== undefined ? (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className={`inline-flex items-center gap-0.5 font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        ) : (
          <div className="mt-1 text-xs text-muted-foreground">{changeLabel}</div>
        )}
      </CardContent>
    </Card>
  );
};

const InsightTile = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-lg font-semibold">{value}</div>
    <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

export default SalesPage;
