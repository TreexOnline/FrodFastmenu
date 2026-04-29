import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Send,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Settings,
  MessageCircle,
  Shield,
  Lock,
} from "lucide-react";

const WHATSAPP_SUPPORT_NUMBER = "5518991913165";
const openSupportWhatsApp = () => {
  const msg =
    "Olá! Quero adicionar o WhatsApp Automático ao meu plano TreexMenu.";
  window.open(
    `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer",
  );
};

interface WhatsAppSession {
  id: string;
  store_id: string;
  session_name: string;
  phone: string | null;
  status: string;
  auth_path: string | null;
  qr_code: string | null;
  profile_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AutoMessage {
  id: string;
  store_id: string;
  message_text: string;
  cooldown_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConnectionStatus {
  connected: boolean;
  status: string;
  phone: string | null;
  profileName: string | null;
  qr: string | null;
}

export default function WhatsAppAutomaticPage() {
  const { user } = useAuth();
  const addon = useWhatsappAddon();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [autoMessage, setAutoMessage] = useState<AutoMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [messageText, setMessageText] = useState("");
  const [cooldownHours, setCooldownHours] = useState("24");
  const [isActive, setIsActive] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const connected = connectionStatus?.connected ?? session?.status === 'connected';
  const phoneNumber = connectionStatus?.phone ?? session?.phone;
  const profileName = connectionStatus?.profileName ?? session?.profile_name;
  const qrCode = connected ? null : connectionStatus?.qr ?? session?.qr_code;

  const loadSession = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("store_id", user.id)
      .maybeSingle();
    setSession(data);
    setLoading(false);
  };

  const loadAutoMessage = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("whatsapp_auto_messages")
      .select("*")
      .eq("store_id", user.id)
      .maybeSingle();
    
    if (data) {
      setAutoMessage(data);
      setMessageText(data.message_text);
      setCooldownHours(data.cooldown_hours.toString());
      setIsActive(data.is_active);
    }
  };

  useEffect(() => {
    loadSession();
    loadAutoMessage();
  }, [user]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    
    const sessionChannel = supabase
      .channel("whatsapp_sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_sessions",
          filter: `store_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setSession(payload.new as WhatsAppSession);
          }
        },
      )
      .subscribe();

    const messageChannel = supabase
      .channel("whatsapp_auto_messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_auto_messages",
          filter: `store_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setAutoMessage(payload.new as AutoMessage);
            setMessageText(payload.new.message_text);
            setCooldownHours(payload.new.cooldown_hours.toString());
            setIsActive(payload.new.is_active);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [user]);

  // Poll for QR updates
  useEffect(() => {
    if (connected) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (!session?.id && !connectionStatus) return;
    if (pollRef.current) return;

    pollRef.current = setInterval(() => {
      checkConnection();
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connected, session?.id, connectionStatus?.qr]);

  const checkConnection = async () => {
    try {
      const { data } = await supabase.functions.invoke("whatsapp-connect/status", {
        body: { store_id: user?.id }
      });
      setConnectionStatus(data);
    } catch (error: any) {
      console.error("Status check error:", error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await supabase.functions.invoke("whatsapp-connect/connect", {
        body: { store_id: user?.id }
      });
      
      if (data?.sessionId) {
        toast.success("Conexão iniciada! Aguarde o QR Code...");
        await loadSession();
        
        // Começar a verificar status
        setTimeout(() => {
          checkConnection();
        }, 2000);
      }
    } catch (error: any) {
      toast.error("Erro ao conectar: " + (error.message || "Tente novamente"));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar o WhatsApp?")) return;
    
    setConnecting(true);
    try {
      await supabase.functions.invoke("whatsapp-connect/disconnect", {
        body: { store_id: user?.id }
      });
      
      setConnectionStatus({ connected: false, status: 'disconnected', phone: null, profileName: null, qr: null });
      toast.success("WhatsApp desconectado");
      await loadSession();
    } catch (error: any) {
      toast.error("Erro ao desconectar: " + (error.message || "Tente novamente"));
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!messageText.trim()) {
      toast.error("Digite uma mensagem de boas-vindas");
      return;
    }

    setSaving(true);
    try {
      await supabase.functions.invoke("whatsapp-connect/save-config", {
        body: {
          store_id: user?.id,
          message_text: messageText,
          cooldown_hours: parseInt(cooldownHours),
          is_active: isActive
        }
      });
      
      toast.success("Configuração salva com sucesso!");
      await loadAutoMessage();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + (error.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl lg:text-3xl font-bold">WhatsApp Automático</h1>
            <p className="text-sm text-muted-foreground">
              Sistema profissional de auto resposta
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
                    <Shield className="mr-1 h-3 w-3" />
                    Adicional bloqueado
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    WhatsApp Automático
                  </h2>
                  <p className="mt-1 text-sm opacity-90">
                    Conecte seu WhatsApp e configure respostas automáticas
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={openSupportWhatsApp}
                className="shrink-0 font-semibold shadow-lg"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Ativar agora
              </Button>
            </div>
          </div>

          <CardContent className="space-y-6 p-6 sm:p-10">
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-sm">
              <p className="font-medium text-foreground">
                Este é um <span className="text-primary">adicional premium</span>{" "}
                do TreexMenu.
              </p>
              <p className="mt-1 text-muted-foreground">
                Fale com nosso time pelo WhatsApp para ativar o WhatsApp Automático
                em seu plano.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold tracking-tight">
                O que você ganha com o WhatsApp Automático
              </h3>
              <p className="text-sm text-muted-foreground">
                Atendimento 24/7 com respostas automáticas personalizadas.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Bot,
                    title: "Respostas automáticas 24/7",
                    desc: "Configure uma mensagem de boas-vindas e o sistema responde automaticamente qualquer cliente que contatar seu WhatsApp.",
                  },
                  {
                    icon: QrCode,
                    title: "Conexão por QR Code",
                    desc: "Conecte seu WhatsApp oficial de forma segura escaneando um QR Code diretamente no painel.",
                  },
                  {
                    icon: Clock,
                    title: "Cooldown inteligente",
                    desc: "Evite spam com sistema de cooldown configurável (1, 6, 12 ou 24 horas) por cliente.",
                  },
                  {
                    icon: Settings,
                    title: "Configuração simples",
                    desc: "Interface intuitiva para configurar sua mensagem automática e gerenciar a conexão.",
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
          <h1 className="text-2xl lg:text-3xl font-bold">WhatsApp Automático</h1>
          <p className="text-sm text-muted-foreground">
            Sistema profissional de auto resposta
          </p>
        </div>
      </div>

      {/* Card de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Status da Conexão
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
                    Seu WhatsApp está conectado e pronto para responder
                    automaticamente.
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
                  Code com seu celular (WhatsApp → Aparelhos conectados →
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
                  Atualizar
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

            {/* QR Code */}
            <div className="flex items-center justify-center">
              {connected ? (
                <div className="rounded-2xl border-2 border-dashed border-green-500/30 bg-green-500/5 p-12 text-center">
                  <Wifi className="w-16 h-16 mx-auto mb-3 text-green-600" />
                  <p className="font-medium">Conectado!</p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp ativo e funcionando
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
                    Escaneie com seu WhatsApp
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

      {/* Configuração da Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Mensagem Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem de boas-vindas</Label>
            <Textarea
              id="message"
              placeholder="Olá 👋 Seja bem vindo ao nosso atendimento!&#10;&#10;🍔 Confira nosso cardápio:&#10;https://seudominio.com/loja&#10;&#10;Faça seu pedido por aqui 😄"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esta mensagem será enviada automaticamente para qualquer pessoa que
              contatar seu WhatsApp.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tempo de espera (Cooldown)</Label>
              <Select value={cooldownHours} onValueChange={setCooldownHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="6">6 horas</SelectItem>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tempo mínimo entre respostas para o mesmo cliente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status do sistema</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">
                  {isActive ? "Sistema ativo" : "Sistema pausado"}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {isActive
                  ? "Respondendo automaticamente"
                  : "Sistema pausado - não responde"}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={saving || !messageText.trim()}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
