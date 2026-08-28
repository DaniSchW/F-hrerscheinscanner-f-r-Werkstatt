import "server-only";
import { NextRequest } from "next/server";
import { validateSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/cookieName";
import type { Mitarbeiter, Session } from "@prisma/client";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Für API-Routen: liest/prüft die Session aus dem Request-Cookie. */
export async function requireMitarbeiter(
  req: NextRequest
): Promise<{ mitarbeiter: Mitarbeiter; session: Session }> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Nicht angemeldet.");
  const auth = await validateSessionToken(token);
  if (!auth) throw new AuthError("Sitzung abgelaufen oder ungültig.");
  return auth;
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ mitarbeiter: Mitarbeiter; session: Session }> {
  const auth = await requireMitarbeiter(req);
  if (auth.mitarbeiter.rolle !== "admin") {
    throw new AuthError("Nur für Administratoren.", 403);
  }
  return auth;
}
