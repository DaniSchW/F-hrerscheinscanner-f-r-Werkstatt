import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { kundeEingabeSchema } from "@/lib/validation/kunde";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireMitarbeiter(req);
    const kunde = await prisma.kunde.findUnique({
      where: { id },
      include: {
        vermietungen: {
          select: {
            id: true,
            ausgabeDatum: true,
            ruecknahmeDatum: true,
            fahrzeug: { select: { kennzeichen: true, bezeichnung: true } }
          },
          orderBy: { ausgabeDatum: "desc" }
        }
      }
    });
    if (!kunde) {
      return NextResponse.json({ fehler: "Kunde nicht gefunden." }, { status: 404 });
    }
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "kunde_eingesehen",
      betroffeneEntitaetId: kunde.id
    });
    return NextResponse.json({ kunde });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireMitarbeiter(req);
    const body = kundeEingabeSchema.partial().parse(await req.json());
    const kunde = await prisma.kunde.update({
      where: { id },
      data: {
        ...body,
        geburtsdatum: body.geburtsdatum ? new Date(body.geburtsdatum) : undefined,
        ausstellungsdatum: body.ausstellungsdatum ? new Date(body.ausstellungsdatum) : undefined
      }
    });
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "kunde_aktualisiert",
      betroffeneEntitaetId: kunde.id
    });
    return NextResponse.json({ kunde });
  } catch (error) {
    return toErrorResponse(error);
  }
}
