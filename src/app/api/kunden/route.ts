import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { kundeEingabeSchema } from "@/lib/validation/kunde";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

/** Kundensuche per Name oder Führerscheinnummer (Abschnitt 4.3 Schritt 1 / 4.5). */
export async function GET(req: NextRequest) {
  try {
    await requireMitarbeiter(req);
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ kunden: [] });
    }
    const kunden = await prisma.kunde.findMany({
      where: {
        anonymisiertAm: null,
        OR: [
          { vorname: { contains: q, mode: "insensitive" } },
          { nachname: { contains: q, mode: "insensitive" } },
          { fuehrerscheinNummer: { contains: q, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        geburtsdatum: true,
        fuehrerscheinNummer: true
      },
      take: 20,
      orderBy: { nachname: "asc" }
    });
    return NextResponse.json({ kunden });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMitarbeiter(req);
    const body = kundeEingabeSchema.parse(await req.json());
    const kunde = await prisma.kunde.create({
      data: {
        vorname: body.vorname,
        nachname: body.nachname,
        geburtsdatum: new Date(body.geburtsdatum),
        geburtsort: body.geburtsort,
        adresse: body.adresse,
        fuehrerscheinNummer: body.fuehrerscheinNummer,
        ausstellendeBehoerde: body.ausstellendeBehoerde,
        ausstellungsdatum: new Date(body.ausstellungsdatum),
        fuehrerscheinKlassen: body.fuehrerscheinKlassen
      }
    });
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "kunde_angelegt",
      betroffeneEntitaetId: kunde.id
    });
    return NextResponse.json({ kunde }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
