import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { Mitarbeiter, Session } from "@prisma/client";
import { SESSION_COOKIE } from "@/lib/auth/cookieName";

export { SESSION_COOKIE };
const SESSION_TTL_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(params: {
  mitarbeiterId: string;
  geraetLabel?: string | null;
  ipAdresse?: string | null;
}): Promise<{ token: string; session: Session }> {
  const token = generateSessionToken();
  const ablaufAm = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      mitarbeiterId: params.mitarbeiterId,
      geraetLabel: params.geraetLabel ?? null,
      ipAdresse: params.ipAdresse ?? null,
      ablaufAm
    }
  });
  return { token, session };
}

export async function validateSessionToken(
  token: string
): Promise<{ mitarbeiter: Mitarbeiter; session: Session } | null> {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { mitarbeiter: true }
  });
  if (!session) return null;
  if (session.widerrufenAm) return null;
  if (session.ablaufAm.getTime() < Date.now()) return null;
  if (!session.mitarbeiter.aktiv) return null;

  // Aktivitäts-Zeitstempel nur alle paar Minuten aktualisieren, um Schreiblast zu sparen.
  if (Date.now() - session.zuletztAktivAm.getTime() > 5 * 60 * 1000) {
    await prisma.session.update({
      where: { id: session.id },
      data: { zuletztAktivAm: new Date() }
    });
  }

  return { mitarbeiter: session.mitarbeiter, session };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.session
    .updateMany({
      where: { tokenHash, widerrufenAm: null },
      data: { widerrufenAm: new Date() }
    })
    .catch(() => undefined);
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { widerrufenAm: new Date() }
  });
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
  };
}

/** Für Server Components / Layouts: liest die aktuelle Session aus dem Cookie. */
export async function getCurrentAuth(): Promise<{ mitarbeiter: Mitarbeiter; session: Session } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
}
