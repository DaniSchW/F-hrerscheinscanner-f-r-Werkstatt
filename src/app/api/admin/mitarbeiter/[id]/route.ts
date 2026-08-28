import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

const patchSchema = z.object({
  aktiv: z.boolean().optional(),
  rolle: z.enum(["mitarbeiter", "admin"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(req);
    const body = patchSchema.parse(await req.json());

    if (id === auth.mitarbeiter.id && body.aktiv === false) {
      return NextResponse.json({ fehler: "Der eigene Account kann nicht deaktiviert werden." }, { status: 400 });
    }

    const mitarbeiter = await prisma.mitarbeiter.update({
      where: { id },
      data: {
        ...body,
        deaktiviertAm: body.aktiv === false ? new Date() : body.aktiv === true ? null : undefined
      },
      select: { id: true, name: true, email: true, rolle: true, aktiv: true, erstelltAm: true }
    });

    if (body.aktiv === false) {
      // Bei Deaktivierung sofort alle aktiven Sitzungen des Mitarbeiters beenden.
      await prisma.session.updateMany({
        where: { mitarbeiterId: id, widerrufenAm: null },
        data: { widerrufenAm: new Date() }
      });
      await logAudit({
        mitarbeiterId: auth.mitarbeiter.id,
        aktion: "mitarbeiter_deaktiviert",
        betroffeneEntitaetId: mitarbeiter.id
      });
    }

    return NextResponse.json({ mitarbeiter });
  } catch (error) {
    return toErrorResponse(error);
  }
}
