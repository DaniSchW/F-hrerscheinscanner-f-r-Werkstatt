import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { faelligeDatenLoeschen } from "@/lib/loeschung";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

const kundeIdSchema = z.object({ kundeId: z.string().min(1) });

/** Manueller Datenexport auf Anfrage (DSGVO-Betroffenenrecht auf Auskunft/Datenübertragbarkeit). */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    const body = kundeIdSchema.parse(await req.json());
    const kunde = await prisma.kunde.findUnique({
      where: { id: body.kundeId },
      include: {
        vermietungen: {
          include: { fahrzeug: { select: { kennzeichen: true, bezeichnung: true } } }
        }
      }
    });
    if (!kunde) {
      return NextResponse.json({ fehler: "Kunde nicht gefunden." }, { status: 404 });
    }
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "daten_exportiert",
      betroffeneEntitaetId: kunde.id
    });
    return NextResponse.json({ kunde });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Manuelle vorzeitige Löschung auf Anfrage (DSGVO-Betroffenenrecht auf
 * Löschung) oder um den automatischen Löschjob für ein Testszenario
 * auszulösen.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    const body = kundeIdSchema.parse(await req.json());
    await prisma.vermietung.updateMany({
      where: { kundeId: body.kundeId, ruecknahmeDatum: { not: null } },
      data: { loeschenAm: new Date() }
    });
    const ergebnis = await faelligeDatenLoeschen({
      ausgeloestVon: "daten_manuell_geloescht",
      mitarbeiterId: auth.mitarbeiter.id
    });
    return NextResponse.json(ergebnis);
  } catch (error) {
    return toErrorResponse(error);
  }
}
