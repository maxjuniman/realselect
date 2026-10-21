export async function downloadPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyPng(image: Promise<Blob>) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Este navegador não copia a imagem. Baixe o arquivo e anexe no WhatsApp.");
  }
  const png = image.then((blob) => (blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" })));
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
  } catch (caught) {
    if (caught instanceof Error && caught.name === "NotAllowedError") {
      throw new Error("O navegador bloqueou a cópia. Baixe o arquivo e anexe no WhatsApp.");
    }
    throw caught;
  }
}

const ink = "#1c1022";
const paper = "#f7f4f6";
const card = "#ffffff";
const purple = "#4c124f";
const muted = "#5e4d63";
const line = "#e3d7e4";
const green = "#008000";

export function paintSheet(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const scale = width > 1800 ? 1 : 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem.");
  ctx.scale(scale, scale);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  draw(ctx);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem."))), "image/png");
  });
}

let logoTask: Promise<CanvasImageSource | null> | null = null;

export function loadLogo() {
  if (typeof Image === "undefined") return Promise.resolve(null);
  if (!logoTask) {
    logoTask = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = "/brand/logo.png";
    });
  }
  return logoTask;
}

export function drawBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  title: string,
  subtitle: string,
  logo: CanvasImageSource | null,
  progress?: string,
) {
  ctx.fillStyle = purple;
  ctx.fillRect(0, 0, width, 156);
  const logoSize = 116;
  const reserved = logo ? logoSize + 36 : 0;
  if (logo) ctx.drawImage(logo, width - 20 - logoSize, 20, logoSize, logoSize);
  const max = width - 80 - reserved;
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 52px Segoe UI, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(fitText(ctx, title, max), 40, 72);
  ctx.font = "600 28px Segoe UI, sans-serif";
  let progressWidth = 0;
  if (progress) {
    ctx.font = "700 28px Segoe UI, sans-serif";
    progressWidth = ctx.measureText(progress).width;
    ctx.font = "600 28px Segoe UI, sans-serif";
  }
  const gap = progress ? 28 : 0;
  const name = fitText(ctx, subtitle, Math.max(40, max - progressWidth - gap));
  const nameWidth = ctx.measureText(name).width;
  ctx.fillStyle = green;
  ctx.fillText(name, 40, 118);
  if (!progress) return;
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px Segoe UI, sans-serif";
  ctx.fillText(progress, 40 + nameWidth + gap, 118);
}

export function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut}…`;
}

export const sheet = { ink, paper, card, purple, muted, line, green };
