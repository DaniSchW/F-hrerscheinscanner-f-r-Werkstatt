"use client";

/**
 * Client für das PHP-Backend (server/api/). Ersetzt die frühere
 * Next.js-API-Route-Schicht: Auth läuft jetzt über einen Bearer-Token in
 * localStorage statt über ein httpOnly-Cookie, da das PHP-Backend auf
 * gemeinsamem Webhosting (kein Node-Prozess) läuft und die PWA als rein
 * statischer Export ausgeliefert wird.
 */

const TOKEN_KEY = "fs_session_token";

// Relativer Standardpfad, da Next-Export und server/ typischerweise auf
// derselben Domain liegen (kein CORS nötig). Für abweichende Deployments
// zur Build-Zeit über NEXT_PUBLIC_API_BASE_URL überschreibbar.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/server/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(
  pfad: string,
  optionen: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (optionen.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${pfad}`, {
    method: optionen.method ?? (optionen.body !== undefined ? "POST" : "GET"),
    headers,
    body: optionen.body !== undefined ? JSON.stringify(optionen.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.fehler ?? "Unbekannter Fehler.", res.status, data.code ?? "unbekannt");
  }
  return data as T;
}
