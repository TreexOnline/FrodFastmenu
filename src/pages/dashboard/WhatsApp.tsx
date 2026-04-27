import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWhatsappAddon } from "@/hooks/useWhatsappAddon";
import {
  MessageSquare,
  Smartphone,
  RefreshCw,
  PowerOff,
  QrCode,
  Loader2,
  CheckCircle2,
  XCircle,
  Bot,
  Bell,
  Send,
  Lock,
  Sparkles,
  Zap,
  Clock,
  ShoppingBag,
  BellRing,
  Users,
} from "lucide-react";

const WHATSAPP_SUPPORT_NUMBER = "5518991913165";
const openSupportWhatsApp = () => {
  const msg =
    "Olá! Quero adicionar o Atendente IA no WhatsApp (R$ 99/mês) ao meu plano TreexMenu.";
  window.open(
    `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer",
  );
};


type ZapiSettings = {
  id: string;
  user_id: string;
  is_connected: boolean;
  connection_status: string;
  phone_number: string | null;
  profile_name: string | null;
  last_qr: string | null;
  ai_enabled: boolean;
  ai_min_delay_seconds: number;
  ai_cooldown_seconds: number;
  ai_system_prompt: string | null;
  notify_confirmed_enabled: boolean;
  notify_confirmed_text: string;
  notify_preparing_enabled: boolean;
  notify_preparing_text: string;
  notify_ready_enabled: boolean;
  notify_ready_text: string;
  notify_out_for_delivery_enabled: boolean;
  notify_out_for_delivery_text: string;
  notify_delivered_enabled: boolean;
  notify_delivered_text: string;
  notify_cancelled_enabled: boolean;
  notify_cancelled_text: string;
};

const NOTIFY_FIELDS: Array<{
  key: keyof ZapiSettings;
  textKey: keyof ZapiSettings;
  label: string;
  desc: string;
}> = [
  {
    key: "notify_confirmed_enabled",
    textKey: "notify_confirmed_text",
    label: "Pedido confirmado",
    desc: "Enviado quando o pedido é criado",
  },
  {
    key: "notify_preparing_enabled",
    textKey: "notify_preparing_text",
    label: "Em preparo",
    desc: "Enviado quando o status muda para preparo",
  },
  {
    key: "notify_ready_enabled",
    textKey: "notify_ready_text",
    label: "Pronto para retirada",
    desc: "Enviado quando o pedido está pronto",
  },
  {
    key: "notify_out_for_delivery_enabled",
    textKey: "notify_out_for_delivery_text",
    label: "Saiu para entrega",
    desc: "Enviado ao despachar entregador",
  },
  {
    key: "notify_delivered_enabled",
    textKey: "notify_delivered_text",
    label: "Entregue",
    desc: "Enviado ao concluir entrega",
  },
  {
    key: "notify_cancelled_enabled",
    textKey: "notify_cancelled_text",
    label: "Cancelado",
    desc: "Enviado quando o pedido é cancelado",
  },
];

export default function WhatsAppPage() {
  const { user } = useAuth();
  const addon = useWhatsappAddon();
  const [settings, setSettings] = useState<ZapiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<{
    connected: boolean;
    phone: string | null;
    profileName: string | null;
    qr: string | null;
  } | null>(null);

  const connected = liveStatus?.connected ?? !!settings?.is_connected;
  const phoneNumber = liveStatus?.phone ?? settings?.phone_number ?? null;
  const profileName = liveStatus?.profileName ?? settings?.profile_name ?? null;
  const qrCode = connected ? null : liveStatus?.qr ?? settings?.last_qr ?? null;

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("zapi_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setSettings(data as any);
    if (data) setLiveStatus(null);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  // realtime updates on settings
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("zapi-settings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "zapi_settings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) setSettings(payload.new as any);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const checkConnection = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-connect");
      if (error) throw error;
      if (data) {
        setLiveStatus({
          connected: !!data.connected,
          phone: data.phone ?? null,
          profileName: data.profileName ?? null,
          qr: data.qr ?? null,
        });
      }
      await loadSettings();
      return data;
    } catch (e: any) {
      toast.error("Erro ao consultar Z-API: " + (e.message || ""));
    } finally {
      setConnecting(false);
    }
  };

  // poll QR every 6s while not connected and dialog showing
  useEffect(() => {
    if (connected) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (!settings && !liveStatus) return;
    if (pollRef.current) return;
    pollRef.current = window.setInterval(() => {
      checkConnection();
    }, 6000);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connected, settings?.id, liveStatus?.qr]);

  const handleConnect = async () => {
    await checkConnection();
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar o WhatsApp?")) return;
    setConnecting(true);
    try {
      const { error } = await supabase.functions.invoke("zapi-disconnect");
      if (error) throw error;
      setLiveStatus({ connected: false, phone: null, profileName: null, qr: null });
      toast.success("WhatsApp desconectado");
      await loadSettings();
    } catch (e: any) {
      toast.error("Erro ao desconectar: " + (e.message || ""));
    } finally {
      setConnecting(false);
    }
  };

  const updateField = async (patch: Partial<ZapiSettings>) => {
    if (!settings || !user) return;
    setSettings({ ...settings, ...patch } as ZapiSettings);
    setSaving(true);
    const { error } = await supabase
      .from("zapi_settings")
      .update(patch as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar");
  };

  if (loading || addon.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!addon.active) {
    return (
      <div className="container mx-auto p-4 lg:p-8 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Atendente IA + notificações automáticas
            </p>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/30">
          <div className="gradient-brand px-6 py-8 text-primary-foreground sm:px-10 sm:py-10">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/15 backdrop-blur">
                  <Lock className="h-7 w-7" />
                </div>
                <div>
                  <Badge className="mb-2 bg-background/20 text-primary-foreground hover:bg-background/30">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Adicional bloqueado
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Atendente IA no WhatsApp
                  </h2>
                  <p className="mt-1 text-sm opacity-90">
                    Adicione esse recurso ao seu plano para liberar.
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={openSupportWhatsApp}
                className="shrink-0 font-semibold shadow-lg"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Adicionar ao meu plano
              </Button>
            </div>
          </div>

          <CardContent className="space-y-6 p-6 sm:p-10">
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-sm">
              <p className="font-medium text-foreground">
                Esse módulo é um <span className="text-primary">adicional</span>{" "}
                contratado à parte do plano do TreexMenu.
              </p>
              <p className="mt-1 text-muted-foreground">
                Fale com nosso time pelo WhatsApp para ativar — após
                confirmação, o painel de WhatsApp será liberado para você.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold tracking-tight">
                O que você ganha com o Atendente IA
              </h3>
              <p className="text-sm text-muted-foreground">
                Atendimento, notificações e vendas no automático, 24h por dia.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Bot,
                    title: "IA responde sozinha 24/7",
                    desc:
                      "Cliente manda mensagem no seu WhatsApp e a IA responde sobre cardápio, horário, formas de pagamento e até ajuda a finalizar o pedido.",
                  },
                  {
                    icon: BellRing,
                    title: "Notificações automáticas",
                    desc:
                      "Cliente recebe avisos de pedido confirmado, em preparo, pronto, saiu para entrega e entregue — tudo direto no WhatsApp.",
                  },
                  {
                    icon: ShoppingBag,
                    title: "Mais pedidos sem esforço",
                    desc:
                      "A IA tira dúvidas no momento certo e empurra o cliente para o link do cardápio digital, aumentando a conversão.",
                  },
                  {
                    icon: Clock,
                    title: "Você economiza tempo",
                    desc:
                      "Pare de responder as mesmas perguntas o dia inteiro. A IA cuida do básico e você foca em produzir.",
                  },
                  {
                    icon: Users,
                    title: "Personalidade do seu negócio",
                    desc:
                      "Defina o tom, o nome do atendente e instruções específicas — a IA fala como o seu restaurante fala.",
                  },
                  {
                    icon: Zap,
                    title: "Conexão simples por QR Code",
                    desc:
                      "Após a liberação, é só escanear o QR com o seu WhatsApp e tudo começa a funcionar automaticamente.",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">
                          {f.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Adicional Atendente IA
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    R$ 99
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / mês
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Soma ao valor do seu plano do TreexMenu.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={openSupportWhatsApp}
                  className="font-semibold"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Adicionar ao meu plano
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Notifique clientes automaticamente e responda com IA
          </p>
        </div>
      </div>

      {/* Connection card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Conexão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {connected ? (
                  <>
                    <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Conectado
                    </Badge>
                    {phoneNumber && (
                      <span className="text-sm text-muted-foreground">
                        +{phoneNumber}
                      </span>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </div>

              {connected ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Seu WhatsApp está conectado e pronto para enviar mensagens
                    automáticas e responder com IA.
                  </p>
                    {profileName && (
                    <p>
                        Perfil: <strong>{profileName}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Clique em <strong>Conectar WhatsApp</strong> e escaneie o QR
                  Code com o seu celular (WhatsApp → Aparelhos conectados →
                  Conectar um aparelho).
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!connected && (
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4 mr-2" />
                    )}
                    Conectar WhatsApp
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={checkConnection}
                  disabled={connecting}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      connecting ? "animate-spin" : ""
                    }`}
                  />
                  Atualizar status
                </Button>
                {connected && (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={connecting}
                  >
                    <PowerOff className="w-4 h-4 mr-2" />
                    Desconectar
                  </Button>
                )}
              </div>
            </div>

            {/* QR area */}
            <div className="flex items-center justify-center">
              {connected ? (
                <div className="rounded-2xl border-2 border-dashed border-green-500/30 bg-green-500/5 p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-green-600" />
                  <p className="font-medium">Tudo pronto!</p>
                  <p className="text-sm text-muted-foreground">
                    Seu WhatsApp está ativo
                  </p>
                </div>
              ) : qrCode ? (
                <div className="rounded-2xl bg-white p-4 shadow-sm border">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64 object-contain"
                  />
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Atualizando automaticamente...
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">
                  <QrCode className="w-16 h-16 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Clique em Conectar para gerar o QR Code
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings tabs */}
      {settings && (
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Bot className="w-4 h-4 mr-2" />
              Atendente IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Mensagens automáticas de pedido
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Variáveis disponíveis:{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {"{nome}"}
                  </code>{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {"{pedido}"}
                  </code>{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {"{total}"}
                  </code>
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {NOTIFY_FIELDS.map((f) => {
                  const enabled = settings[f.key] as boolean;
                  const text = settings[f.textKey] as string;
                  return (
                    <div
                      key={f.key as string}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Label className="text-base font-semibold">
                            {f.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {f.desc}
                          </p>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) =>
                            updateField({ [f.key]: v } as any)
                          }
                        />
                      </div>
                      <Textarea
                        value={text}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [f.textKey]: e.target.value,
                          } as any)
                        }
                        onBlur={() =>
                          updateField({ [f.textKey]: text } as any)
                        }
                        rows={3}
                        disabled={!enabled}
                        className="font-mono text-sm"
                      />
                    </div>
                  );
                })}
                {saving && (
                  <p className="text-xs text-muted-foreground">Salvando...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Atendente virtual com IA
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Responde automaticamente mensagens recebidas no WhatsApp
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base font-semibold">
                      Ativar atendente IA
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Quando alguém mandar mensagem, a IA vai responder
                    </p>
                  </div>
                  <Switch
                    checked={settings.ai_enabled}
                    onCheckedChange={(v) => updateField({ ai_enabled: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Personalidade / instruções da IA</Label>
                  <Textarea
                    rows={6}
                    placeholder="Ex: Você é o atendente do restaurante X. Seja simpático e responda sobre cardápio, horário e como pedir."
                    value={settings.ai_system_prompt ?? ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ai_system_prompt: e.target.value,
                      })
                    }
                    onBlur={() =>
                      updateField({
                        ai_system_prompt: settings.ai_system_prompt,
                      })
                    }
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delay antes de responder (segundos)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={settings.ai_min_delay_seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai_min_delay_seconds: Number(e.target.value),
                        })
                      }
                      onBlur={() =>
                        updateField({
                          ai_min_delay_seconds: settings.ai_min_delay_seconds,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Espera para parecer mais natural
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cooldown entre respostas (segundos)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={600}
                      value={settings.ai_cooldown_seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai_cooldown_seconds: Number(e.target.value),
                        })
                      }
                      onBlur={() =>
                        updateField({
                          ai_cooldown_seconds: settings.ai_cooldown_seconds,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Evita spam e respostas duplicadas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
