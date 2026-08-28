import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { ruecknahmeSchema } from "@/lib/validation/vermietung";
import { dataUrlZuBuffer, dateiSpeichern, dateiendungFuerMediaType } from "@/lib/storage";
import { berechneLoeschdatum } from "@/lib/retention";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireMitarbeiter(req);
    const body = ruecknahmeSchema.parse(await req.json());

    const vermietung = await prisma.vermietung.findUnique({ where: { id } });
    if (!vermietung) {
      return NextResponse.json({ fehler: "Vermietung nicht gefunden." }, { status: 404 });
    }
    if (vermietung.ruecknahmeDatum) {
      return NextResponse.json({ fehler: "Diese Vermietung wurde bereits zurückgenommen." }, { status: 409 });
    }

    const zustandsfotosPfade: string[] = [];
    for (const dataUrl of body.zustandsfotosRueckgabe) {
      const { buffer, mediaType } = dataUrlZuBuffer(dataUrl);
      const pfad = await dateiSpeichern("zustandsfotos", buffer, dateiendungFuerMediaType(mediaType));
      zustandsfotosPfade.push(pfad);
    }

    const ruecknahmeDatum = new Date();

    const aktualisiert = await prisma.$transaction(async (tx) => {
      const v = await tx.vermietung.update({
        where: { id: vermietung.id },
        data: {
          ruecknahmeDatum,
          kmStandRueckgabe: body.kmStandRueckgabe,
          tankfuellungRueckgabe: body.tankfuellungRueckgabe,
          zustandsfotosRueckgabe: zustandsfotosPfade,
          mitarbeiterIdRueckgabe: auth.mitarbeiter.id,
          loeschenAm: berechneLoeschdatum(ruecknahmeDatum)
        }
      });
      await tx.fahrzeug.update({ where: { id: vermietung.fahrzeugId }, data: { status: "verfuegbar" } });
      return v;
    });

    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "vermietung_abgeschlossen",
      betroffeneEntitaetId: aktualisiert.id
    });

    return NextResponse.json({ vermietung: aktualisiert });
  } catch (error) {
    return toErrorResponse(error);
  }
}
