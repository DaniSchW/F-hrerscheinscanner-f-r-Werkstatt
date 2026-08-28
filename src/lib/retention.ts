import { env } from "@/lib/env";

/** loeschen_am = Rückgabedatum + RETENTION_MONTHS (Abschnitt 8 des Briefings). */
export function berechneLoeschdatum(ruecknahmeDatum: Date): Date {
  const datum = new Date(ruecknahmeDatum);
  datum.setMonth(datum.getMonth() + env.retentionMonths);
  return datum;
}
