import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

const loginSchema = z.object({
  email: z.string().email(),
  passwort: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const mitarbeiter = await prisma.mitarbeiter.findUnique({
      where: { email: body.email.toLowerCase() }
    });

    if (!mitarbeiter || !mitarbeiter.aktiv) {
      return NextResponse.json({ fehler: "E-Mail oder Passwort ist falsch." }, { status: 401 });
    }

    const gueltig = await verifyPassword(body.passwort, mitarbeiter.passwortHash);
    if (!gueltig) {
      return NextResponse.json({ fehler: "E-Mail oder Passwort ist falsch." }, { status: 401 });
    }

    const geraetLabel = req.headers.get("user-agent")?.slice(0, 200) ?? null;
    const ipAdresse = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { token } = await createSession({
      mitarbeiterId: mitarbeiter.id,
      geraetLabel,
      ipAdresse
    });

    await logAudit({ mitarbeiterId: mitarbeiter.id, aktion: "login" });

    const res = NextResponse.json({
      mitarbeiter: { id: mitarbeiter.id, name: mitarbeiter.name, rolle: mitarbeiter.rolle }
    });
    res.cookies.set(sessionCookieOptions().name, token, sessionCookieOptions());
    return res;
  } catch (error) {
    return toErrorResponse(error);
  }
}
