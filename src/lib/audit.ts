import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuditAktion =
  | "login"
  | "logout"
  | "geraet_abgemeldet"
  | "mitarbeiter_angelegt"
  | "mitarbeiter_deaktiviert"
  | "kunde_angelegt"
  | "kunde_aktualisiert"
  | "kunde_eingesehen"
  | "vermietung_angelegt"
  | "vermietung_abgeschlossen"
  | "fristverlaengerung_gesetzt"
  | "daten_exportiert"
  | "daten_manuell_geloescht"
  | "automatische_loeschung";

/**
 * Schreibt einen Audit-Log-Eintrag. Enthält absichtlich keine
 * Führerschein-/Kundendaten, nur Metadaten (wer, wann, was, welche Entität) -
 * damit der Audit-Log unabhängig von der regulären Löschfrist aufbewahrt
 * werden darf (Nachweispflicht, Abschnitt 8 des Briefings).
 */
export async function logAudit(params: {
  mitarbeiterId: string | null;
  aktion: AuditAktion;
  betroffeneEntitaetId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      mitarbeiterId: params.mitarbeiterId,
      aktion: params.aktion,
      betroffeneEntitaetId: params.betroffeneEntitaetId ?? null,
      detail: (params.detail as Prisma.InputJsonObject | undefined) ?? undefined
    }
  });
}
