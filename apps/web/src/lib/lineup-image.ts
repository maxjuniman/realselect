import { formatLongDate } from "./format";

type LineupPlayer = { name: string };

const width = 1080;
const ink = "#1c1022";
const paper = "#f7f4f6";
const purple = "#4c124f";
const green = "#008000";

export async function shareLineupImage(input: {
  playedOn: string;
  teamA: LineupPlayer[];
  teamB: LineupPlayer[];
}) {
  const blob = await drawLineup(input);
  const file = new File([blob], "escalacao-real-select.png", { type: "image/png" });
  const share = { files: [file], title: "Escalação do Real Select" };
  if (typeof navigator.share === "function" && navigator.canShare?.(share)) {
    await navigator.share(share);
    return "shared" as const;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded" as const;
}

async function drawLineup(input: { playedOn: string; teamA: LineupPlayer[]; teamB: LineupPlayer[] }) {
  const rows = Math.max(input.teamA.length, input.teamB.length, 1);
  const height = 280 + rows * 54 + 72;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem.");

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = purple;
  ctx.fillRect(0, 0, width, 168);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 64px Segoe UI, sans-serif";
  ctx.fillText("Real Select", 64, 86);
  ctx.fillStyle = green;
  ctx.font = "600 32px Segoe UI, sans-serif";
  ctx.fillText(formatLongDate(input.playedOn), 64, 136);

  drawColumn(ctx, "Time A", input.teamA, 64, ink);
  drawColumn(ctx, "Time B", input.teamB, 560, purple);

  ctx.fillStyle = "#5e4d63";
  ctx.font = "500 24px Segoe UI, sans-serif";
  ctx.fillText("Futibas de terça", 64, height - 36);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  return blob;
}

function drawColumn(ctx: CanvasRenderingContext2D, title: string, players: LineupPlayer[], x: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = "700 36px Segoe UI, sans-serif";
  ctx.fillText(title, x, 240);
  ctx.font = "600 32px Segoe UI, sans-serif";
  ctx.fillStyle = ink;
  const names = players.map((player) => player.name).sort((a, b) => a.localeCompare(b, "pt-BR"));
  names.forEach((name, index) => {
    ctx.fillText(name, x, 300 + index * 54);
  });
  if (!names.length) {
    ctx.fillStyle = "#5e4d63";
    ctx.fillText("Sem jogadores", x, 300);
  }
}
