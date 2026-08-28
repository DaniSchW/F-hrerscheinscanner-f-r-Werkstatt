import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { neueVermietungSchema } from "@/lib/validation/vermietung";
import { dataUrlZuBuffer, dateiSpeichern, dateiendungFuerMediaType } from "@/lib/storage";
import { verschluesseln } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireMitarbeiter(req);
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const nurLaufende = req.nextUrl.searchParams.get("laufend") === "true";
    const vermietungen = await prisma.vermietung.findMany({
      where: {
        ...(nurLaufende ? { ruecknahmeDatum: null } : {}),
        ...(q
          ? {
              OR: [
                { fahrzeug: { kennzeichen: { contains: q, mode: "insensitive" } } },
                { kunde: { nachname: { contains: q, mode: "insensitive" } } },
                { kunde: { vorname: { contains: q, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        kunde: { select: { vorname: true, nachname: true } },
        fahrzeug: { select: { kennzeichen: true, bezeichnung: true } }
      },
      orderBy: { ausgabeDatum: "desc" },
      take: 30
    });
    return NextResponse.json({ vermietungen });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMitarbeiter(req);
    const body = neueVermietungSchema.parse(await req.json());

    const fahrzeug = await prisma.fahrzeug.findUnique({ where: { id: body.fahrzeugId } });
    if (!fahrzeug) {
      return NextResponse.json({ fehler: "Fahrzeug nicht gefunden." }, { status: 404 });
    }
    if (fahrzeug.status !== "verfuegbar") {
      return NextResponse.json({ fehler: "Fahrzeug ist nicht verfügbar." }, { status: 409 });
    }

    const zustandsfotosPfade: string[] = [];
    for (const dataUrl of body.zustandsfotosAusgabe) {
      const { buffer, mediaType } = dataUrlZuBuffer(dataUrl);
      const pfad = await dateiSpeichern("zustandsfotos", buffer, dateiendungFuerMediaType(mediaType));
      zustandsfotosPfade.push(pfad);
    }

    let unterschriftPfad: string | null = null;
    if (body.unterschriftKundeDataUrl) {
      const { buffer } = dataUrlZuBuffer(body.unterschriftKundeDataUrl);
      const verschluesselt = verschluesseln(buffer);
      unterschriftPfad = await dateiSpeichern("unterschriften", verschluesselt, "png");
    }

    const vermietung = await prisma.$transaction(async (tx) => {
      const kundeId =
        body.kunde.modus === "bestehend"
          ? body.kunde.kundeId
          : (
              await tx.kunde.create({
                data: {
                  vorname: body.kunde.vorname,
                  nachname: body.kunde.nachname,
                  geburtsdatum: new Date(body.kunde.geburtsdatum),
                  geburtsort: body.kunde.geburtsort,
                  adresse: body.kunde.adresse,
                  fuehrerscheinNummer: body.kunde.fuehrerscheinNummer,
                  ausstellendeBehoerde: body.kunde.ausstellendeBehoerde,
                  ausstellungsdatum: new Date(body.kunde.ausstellungsdatum),
                  fuehrerscheinKlassen: body.kunde.fuehrerscheinKlassen
                }
              })
            ).id;

      if (body.kunde.modus === "bestehend") {
        const bestehenderKunde = await tx.kunde.findUnique({ where: { id: kundeId } });
        if (!bestehenderKunde || bestehenderKunde.anonymisiertAm) {
          throw new Error("Kunde nicht gefunden oder Daten bereits gelöscht.");
        }
      }

      const neueVermietung = await tx.vermietung.create({
        data: {
          kundeId,
          fahrzeugId: fahrzeug.id,
          mitarbeiterIdAusgabe: auth.mitarbeiter.id,
          kmStandAusgabe: body.kmStandAusgabe,
          tankfuellungAusgabe: body.tankfuellungAusgabe,
          zustandsfotosAusgabe: zustandsfotosPfade,
          unterschriftKunde: unterschriftPfad,
          fuehrerscheinGeprueftVon: auth.mitarbeiter.id,
          fuehrerscheinKlassePassend: body.fuehrerscheinKlassePassend
        }
      });

      await tx.fahrzeug.update({ where: { id: fahrzeug.id }, data: { status: "verliehen" } });

      return neueVermietung;
    });

    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "vermietung_angelegt",
      betroffeneEntitaetId: vermietung.id
    });

    return NextResponse.json({ vermietung }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
