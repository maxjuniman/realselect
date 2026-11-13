export const apiBase = process.env.NEXT_PUBLIC_API_URL || "/backend";

export function authHeaders(json = false): HeadersInit {
  const token = typeof window === "undefined" ? null : localStorage.getItem("rs_token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function clientApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...authHeaders(Boolean(init?.body)), ...(init?.headers || {}) },
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || "Não foi possível concluir.");
  }
  return data;
}
