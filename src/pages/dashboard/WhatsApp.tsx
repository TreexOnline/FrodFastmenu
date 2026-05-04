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
import { whatsappApi } from "@/config/whatsapp-api";
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

export default function WhatsAppPage() {
  const { user } = useAuth();
  const addon = useWhatsappAddon();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [autoMessage, setAutoMessage] = useState<AutoMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [cooldownHours, setCooldownHours] = useState("24");
  const [isActive, setIsActive] = useState(true);
  
  // Estados para integração com WhatsApp Engine
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected',
    qr: null as string | null,
    phone: null as string | null,
    profileName: null as string | null
  });
  
  // Ref para polling unificado
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado local para debug logs
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Função unificada de polling para status (inclui QR)
  const startStatusPolling = (userId: string) => {
    // Limpar polling anterior se existir
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Iniciar novo polling
    pollingRef.current = setInterval(async () => {
      try {
        const result = await whatsappApi.getStatus(userId);
        if (result.success && result.data) {
          debugLog('📥 Status received', result.data);
          
          setConnectionState({
            status: result.data.status,
            qr: result.data.qr || null,
            phone: result.data.phone || null,
            profileName: result.data.profile_name || null
          });
          
          // Log específico para mudanças de estado
          if (result.data.status === 'qr') {
            debugLog('📲 QR state detected');
            if (result.data.qr) {
              debugLog('📸 QR received');
            }
          }
          
          // Parar polling quando conectar com sucesso
          if (result.data.status === 'connected') {
            debugLog('🟢 CONNECTED - stopping flow');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }
      } catch (error) {
        debugLog('❌ Status polling error', { error: error.message });
        console.error('Erro no polling de status:', error);
      }
    }, 3000); // A cada 3 segundos
  };
  
  // Função para parar polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };
  
  // Função de debug local
  const debugLog = (message: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const formatted = data 
      ? `[${time}] ${message} - ${JSON.stringify(data)}` 
      : `[${time}] ${message}`;
    
    console.log('📡 [WHATSAPP DEBUG]', formatted);
    setDebugLogs((prev) => [...prev.slice(-50), formatted]);
  };

  const loadAutoMessage = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("whatsapp_auto_responder" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setAutoMessage(data as unknown as AutoMessage);
      setMessageText((data as any).message_text || '');
      setCooldownHours((data as any).cooldown_hours.toString());
      setIsActive((data as any).enabled);
    }
  };

  useEffect(() => {
    loadAutoMessage();
    
    // Iniciar polling de status quando usuário carregar
    if (user) {
      startStatusPolling(user.id);
    }
    
    // Limpar polling ao desmontar
    return () => {
      stopPolling();
    };
  }, [user]);

  // Realtime updates para mensagens (WebSocket cuida do status)
  useEffect(() => {
    if (!user) return;
    
    const messageChannel = supabase
      .channel("whatsapp_auto_responder")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_auto_responder" as any,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            setAutoMessage(data as AutoMessage);
            setMessageText(data.message);
            setCooldownHours(data.cooldown_hours.toString());
            setIsActive(data.enabled);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    
    debugLog('🚀 Connect clicked', { userId: user.id });
    setConnecting(true);
    try {
      await whatsappApi.connect(user.id);
      toast.success("Conexão iniciada! Aguarde o QR Code...");
      debugLog('🔁 Connect API called successfully');
      
      // Iniciar polling de status para detectar mudanças
      debugLog('🔁 Status polling started');
      startStatusPolling(user.id);
    } catch (error: any) {
      debugLog('❌ Connect error', { error: error.message });
      toast.error("Erro ao conectar: " + (error.message || "Tente novamente"));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !confirm("Desconectar o WhatsApp?")) return;
    
    debugLog('🔌 Disconnect clicked', { userId: user.id });
    setConnecting(true);
    try {
      await whatsappApi.disconnect(user.id);
      toast.success("WhatsApp desconectado!");
      debugLog('🔌 Disconnect API called successfully');
      
      // Resetar estado para disconnected
      setConnectionState({
        status: 'disconnected',
        qr: null,
        phone: null,
        profileName: null
      });
    } catch (error: any) {
      debugLog('❌ Disconnect error', { error: error.message });
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
          user_id: user?.id,
          message: messageText,
          cooldown_hours: parseInt(cooldownHours),
          enabled: isActive
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
                {connectionState.status === 'connected' ? (
                  <>
                    <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Conectado
                    </Badge>
                    {connectionState.phone && (
                      <span className="text-sm text-muted-foreground">
                        +{connectionState.phone}
                      </span>
                    )}
                  </>
                ) : connectionState.status === 'connecting' ? (
                  <Badge className="bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/30">
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Conectando
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </div>

              {connectionState.status === 'connected' ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Seu WhatsApp está conectado e pronto para responder
                    automaticamente.
                  </p>
                  {connectionState.profileName && (
                    <p>
                      Perfil: <strong>{connectionState.profileName}</strong>
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
                {connectionState.status !== 'connected' && (
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
                  onClick={() => {
                    if (user) startStatusPolling(user.id);
                  }}
                  disabled={connecting}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      connecting ? "animate-spin" : ""
                    }`}
                  />
                  Atualizar
                </Button>
                {connectionState.status === 'connected' && (
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
              {connectionState.status === 'connected' ? (
                <div className="rounded-2xl border-2 border-dashed border-green-500/30 bg-green-500/5 p-12 text-center">
                  <Wifi className="w-16 h-16 mx-auto mb-3 text-green-600" />
                  <p className="font-medium">Conectado!</p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp ativo e funcionando
                  </p>
                </div>
              ) : connectionState.qr ? (
                <div className="rounded-2xl bg-white p-4 shadow-sm border">
                  <img
                    src={connectionState.qr}
                    alt="QR Code"
                    className="w-64 h-64 object-contain"
                  />
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Escaneie com seu WhatsApp
                  </p>
                </div>
              ) : connectionState.status === 'connecting' ? (
                <div className="rounded-2xl border-2 border-dashed border-yellow-500/30 bg-yellow-500/5 p-12 text-center">
                  <Loader2 className="w-16 h-16 mx-auto mb-3 text-yellow-600 animate-spin" />
                  <p className="font-medium">Gerando QR Code...</p>
                  <p className="text-sm text-muted-foreground">
                    Aguarde um momento
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

      {/* Preview da Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Preview da Mensagem do Bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Assistente Virtual
                </p>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  {messageText.trim() ? (
                    <p className="text-sm whitespace-pre-line">
                      {messageText}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Configure uma mensagem de boas-vindas...
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isActive ? "🟢 Ativo" : "🔴 Inativo"} • 
                  Cooldown: {cooldownHours}h
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração da Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Configurar Mensagem Automática
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

      {/* Logs de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Logs de Mensagens Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Status do Sistema</span>
                <Badge variant={connectionState.status === 'connected' ? "default" : "secondary"}>
                  {connectionState.status === 'connected' ? "🟢 Conectado" : "🔴 Desconectado"}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Backend: {connectionState.status !== 'disconnected' ? "🟢 Online" : "🔴 Offline"}</p>
                <p>• Auto resposta: {isActive ? "🟢 Ativa" : "🔴 Inativa"}</p>
                <p>• Mensagem configurada: {messageText.trim() ? "🟢 Sim" : "🔴 Não"}</p>
              </div>
            </div>
            
            <div className="text-center py-4 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Nenhuma mensagem recebida ainda
              </p>
              <p className="text-xs">
                Envie uma mensagem para o WhatsApp conectado para testar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Debug Panel - Tempário */}
      <div className="fixed bottom-4 right-4 w-96 max-h-64 overflow-auto bg-black text-green-400 text-xs p-3 rounded-lg opacity-90 z-50">
        <div className="font-bold mb-2">📡 WhatsApp Debug</div>
        {debugLogs.slice(-20).map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
}
