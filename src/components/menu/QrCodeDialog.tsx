import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode as QrCodeIcon, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string;
  restaurantName: string;
  primaryColor?: string;
  logoUrl?: string | null;
}

export function QrCodeDialog({ open, onOpenChange, url, restaurantName, primaryColor, logoUrl }: Props) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<string>("");

  useEffect(() => {
    if (!open) {
      setPosterUrl(null);
      return;
    }
    const key = `${url}::${restaurantName}::${primaryColor || ""}::${logoUrl || ""}`;
    if (ref.current === key && posterUrl) return;
    ref.current = key;
    setGenerating(true);
    (async () => {
      try {
        const { generateQrPoster } = await import("@/lib/qrCodePoster");
        const data = await generateQrPoster({ url, restaurantName, primaryColor, logoUrl });
        setPosterUrl(data);
      } catch (e: any) {
        toast.error("Não foi possível gerar o QR Code");
      } finally {
        setGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url, restaurantName, primaryColor, logoUrl]);

  const handleDownload = async () => {
    if (!posterUrl) return;
    const { downloadDataUrl } = await import("@/lib/qrCodePoster");
    const safe = (restaurantName || "cardapio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadDataUrl(posterUrl, `qrcode-${safe || "cardapio"}.png`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5 text-primary" />
            QR Code do cardápio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
            {generating || !posterUrl ? (
              <div className="flex aspect-[4/5] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <img
                src={posterUrl}
                alt="QR Code do cardápio"
                className="h-auto w-full object-contain"
                draggable={false}
              />
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
            <code className="flex-1 truncate px-2 text-xs text-muted-foreground">{url}</code>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-8 px-2">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            variant="cta"
            className="w-full"
            disabled={!posterUrl || generating}
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            Baixar imagem (alta qualidade)
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Imagem 1080×1350 pronta para imprimir e colar no balcão, mesa ou vitrine.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
