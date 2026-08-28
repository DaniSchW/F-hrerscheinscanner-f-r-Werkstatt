import { NextRequest, NextResponse } from "next/server";
import { revokeSessionByToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const auth = await requireMitarbeiter(req).catch(() => null);
    await revokeSessionByToken(token);
    if (auth) {
      await logAudit({ mitarbeiterId: auth.mitarbeiter.id, aktion: "logout" });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
