import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "uploads");

export async function savePhoto(dataUrl: string, playerId: string) {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("Envie uma foto em JPG, PNG ou WebP.");
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 1_200_000) throw new Error("A foto precisa ter no máximo 1 MB.");
  await mkdir(directory, { recursive: true });
  const extension = match[1] === "jpeg" || match[1] === "jpg" ? "jpg" : match[1];
  const file = `${playerId}-${randomBytes(4).toString("hex")}.${extension}`;
  await writeFile(path.join(directory, file), buffer);
  return `/uploads/${file}`;
}

export async function removePhoto(stored: string | null | undefined) {
  if (!stored?.startsWith("/uploads/")) return;
  const file = path.basename(stored);
  await unlink(path.join(directory, file)).catch(() => undefined);
}

export function uploadPath(file: string) {
  const name = path.basename(file);
  if (name !== file || !/^[\w.-]+$/.test(name)) return null;
  return path.join(directory, name);
}
