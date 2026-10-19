import { apiBase } from "./client";

export function photoUrl(photo?: string | null) {
  if (!photo) return "";
  if (photo.startsWith("data:") || photo.startsWith("http") || photo.startsWith("/backend")) return photo;
  return `${apiBase}${photo}`;
}

export async function shrinkPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não consegui preparar a foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ageFrom(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}
