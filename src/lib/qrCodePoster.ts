/* ============================================================
   Cartaz com QR Code do cardápio
   - Renderiza um PNG 1080x1350 em <canvas> (sem deps extras)
   - QR é gerado pela lib `qrcode` em alta resolução
============================================================ */

import QRCode from "qrcode";

export interface PosterParams {
  url: string;
  restaurantName: string;
  primaryColor?: string; // hex (#RRGGBB) — usado como acento; fallback #6C2BD9
  logoUrl?: string | null;
}

const POSTER_W = 1080;
const POSTER_H = 1350;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
};

/** Gera um cartaz com QR + nome + frase, retorna data URL (PNG). */
export async function generateQrPoster(p: PosterParams): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d")!;

  const accent = (p.primaryColor || "#6C2BD9").trim();

  // Fundo branco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Faixa superior colorida
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, POSTER_W, 110);

  // Faixa inferior
  ctx.fillStyle = accent;
  ctx.fillRect(0, POSTER_H - 110, POSTER_W, 110);

  // Texto pequeno topo
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CARDÁPIO DIGITAL", POSTER_W / 2, 55);

  // Nome do restaurante
  ctx.fillStyle = "#111827";
  ctx.font = "800 64px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const nameLines = wrapText(ctx, (p.restaurantName || "").toUpperCase(), POSTER_W - 120).slice(0, 2);
  let nameY = 170;
  for (const line of nameLines) {
    ctx.fillText(line, POSTER_W / 2, nameY);
    nameY += 78;
  }

  // QR Code (gera em PNG dataURL na resolução alta)
  const qrSize = 720;
  const qrDataUrl = await QRCode.toDataURL(p.url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#111827", light: "#FFFFFF" },
  });
  const qrImg = await loadImage(qrDataUrl);

  const qrX = (POSTER_W - qrSize) / 2;
  const qrY = nameY + 40;

  // Card branco com sombra atrás do QR
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#FFFFFF";
  roundedRect(ctx, qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 28);
  ctx.fill();
  ctx.restore();

  // Borda colorida fina ao redor do card
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  roundedRect(ctx, qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 28);
  ctx.stroke();

  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Logo central opcional (se houver e couber)
  if (p.logoUrl) {
    try {
      const logo = await loadImage(p.logoUrl);
      const ls = qrSize * 0.18;
      const lx = qrX + (qrSize - ls) / 2;
      const ly = qrY + (qrSize - ls) / 2;
      // Fundo branco arredondado pra "limpar" o QR no centro
      ctx.fillStyle = "#FFFFFF";
      roundedRect(ctx, lx - 12, ly - 12, ls + 24, ls + 24, 16);
      ctx.fill();
      ctx.save();
      roundedRect(ctx, lx, ly, ls, ls, 12);
      ctx.clip();
      ctx.drawImage(logo, lx, ly, ls, ls);
      ctx.restore();
    } catch {
      /* ignora erro de logo */
    }
  }

  // Frase de instrução
  ctx.fillStyle = "#111827";
  ctx.font = "700 38px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Aponte a câmera para acessar", POSTER_W / 2, qrY + qrSize + 80);
  ctx.fillStyle = accent;
  ctx.font = "800 42px Inter, system-ui, sans-serif";
  ctx.fillText("nosso cardápio", POSTER_W / 2, qrY + qrSize + 130);

  // Texto inferior pequeno
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Peça pelo WhatsApp em segundos", POSTER_W / 2, POSTER_H - 55);

  return canvas.toDataURL("image/png");
}

/** Faz download de um data URL como arquivo. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
