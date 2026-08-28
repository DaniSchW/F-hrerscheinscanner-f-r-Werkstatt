import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const mitarbeiter = await prisma.mitarbeiter.findMany({
      select: { id: true, name: true, email: true, rolle: true, aktiv: true, erstelltAm: true },
      orderBy: { name: "asc" }
    });
    return NextResponse.json({ mitarbeiter });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const neuerMitarbeiterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  passwort: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben."),
  rolle: z.enum(["mitarbeiter", "admin"]).default("mitarbeiter")
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    const body = neuerMitarbeiterSchema.parse(await req.json());
    const passwortHash = await hashPassword(body.passwort);
    const mitarbeiter = await prisma.mitarbeiter.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwortHash,
        rolle: body.rolle
      },
      select: { id: true, name: true, email: true, rolle: true, aktiv: true, erstelltAm: true }
    });
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "mitarbeiter_angelegt",
      betroffeneEntitaetId: mitarbeiter.id
    });
    return NextResponse.json({ mitarbeiter }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
