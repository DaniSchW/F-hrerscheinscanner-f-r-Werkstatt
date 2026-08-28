import "server-only";
import { prisma } from "@/lib/db";
import { logAudit, type AuditAktion } from "@/lib/audit";
import { dateiLoeschen } from "@/lib/storage";

const REDAKTIONS_MARKER = "[gelöscht]";
const REDAKTIONS_DATUM = new Date("1970-01-01T00:00:00.000Z");

/**
 * Entfernt die Unterschrift einer einzelnen Vermietung, sobald deren
 * Löschfrist erreicht ist (Abschnitt 8: "gleiche Löschfrist wie zugehörige
 * Vermietung"). Zustandsfotos/Kilometerstände bleiben als betriebliche
 * Historie erhalten - sie enthalten keine Führerschein-/Kundendaten.
 */
async function vermietungBereinigen(vermietungId: string): Promise<void> {
  const vermietung = await prisma.vermietung.findUnique({
    where: { id: vermietungId },
    select: { unterschriftKunde: true }
  });
  if (vermietung?.unterschriftKunde) {
    await dateiLoeschen(vermietung.unterschriftKunde);
  }
  await prisma.vermietung.update({
    where: { id: vermietungId },
    data: { unterschriftKunde: null, anonymisiertAm: new Date() }
  });
}

/**
 * Anonymisiert die Führerschein-/Kundendaten eines Kunden, sobald ALLE
 * seiner Vermietungen ihre Löschfrist erreicht haben und keine davon einen
 * aktiven Rechtsstreit-Hold trägt (Abschnitt 8).
 */
async function kundeAnonymisierenFallsFaellig(kundeId: string, now: Date): Promise<boolean> {
  const vermietungen = await prisma.vermietung.findMany({
    where: { kundeId },
    select: { ruecknahmeDatum: true, loeschenAm: true, rechtsstreitHold: true, rechtsstreitHoldBis: true }
  });

  if (vermietungen.length === 0) return false;

  const alleFaellig = vermietungen.every((v) => {
    if (!v.ruecknahmeDatum || !v.loeschenAm) return false; // laufende Vermietung
    if (v.rechtsstreitHold && (!v.rechtsstreitHoldBis || v.rechtsstreitHoldBis > now)) return false;
    return v.loeschenAm <= now;
  });

  if (!alleFaellig) return false;

  await prisma.kunde.update({
    where: { id: kundeId },
    data: {
      vorname: REDAKTIONS_MARKER,
      nachname: REDAKTIONS_MARKER,
      geburtsdatum: REDAKTIONS_DATUM,
      geburtsort: REDAKTIONS_MARKER,
      adresse: REDAKTIONS_MARKER,
      fuehrerscheinNummer: REDAKTIONS_MARKER,
      ausstellendeBehoerde: REDAKTIONS_MARKER,
      ausstellungsdatum: REDAKTIONS_DATUM,
      fuehrerscheinKlassen: [],
      anonymisiertAm: now
    }
  });
  return true;
}

export async function faelligeDatenLoeschen(params: {
  ausgeloestVon: AuditAktion;
  mitarbeiterId: string | null;
}): Promise<{ vermietungenBereinigt: number; kundenAnonymisiert: number }> {
  const now = new Date();

  const faelligeVermietungen = await prisma.vermietung.findMany({
    where: {
      anonymisiertAm: null,
      loeschenAm: { lte: now },
      OR: [{ rechtsstreitHold: false }, { rechtsstreitHoldBis: { lte: now } }]
    },
    select: { id: true, kundeId: true }
  });

  const betroffeneKundenIds = new Set<string>();
  for (const v of faelligeVermietungen) {
    await vermietungBereinigen(v.id);
    betroffeneKundenIds.add(v.kundeId);
  }

  let kundenAnonymisiert = 0;
  for (const kundeId of betroffeneKundenIds) {
    const anonymisiert = await kundeAnonymisierenFallsFaellig(kundeId, now);
    if (anonymisiert) kundenAnonymisiert += 1;
  }

  await logAudit({
    mitarbeiterId: params.mitarbeiterId,
    aktion: params.ausgeloestVon,
    detail: {
      vermietungenBereinigt: faelligeVermietungen.length,
      kundenAnonymisiert
    }
  });

  return { vermietungenBereinigt: faelligeVermietungen.length, kundenAnonymisiert };
}
