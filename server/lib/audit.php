<?php
/* Schreibt einen Audit-Log-Eintrag. Enthält absichtlich keine
 * Führerschein-/Kundendaten, nur Metadaten (wer, wann, was, welche
 * Entität) - damit der Audit-Log unabhängig von der regulären Löschfrist
 * aufbewahrt werden darf (Nachweispflicht, Löschkonzept-Abschnitt).
 */

require_once __DIR__ . '/db.php';

function fs_log_audit(?string $mitarbeiterId, string $aktion, ?string $entitaetId = null, ?array $detail = null): void {
  fs_db()->prepare(
    'INSERT INTO audit_log (id, mitarbeiter_id, aktion, betroffene_entitaet_id, detail) VALUES (?, ?, ?, ?, ?)'
  )->execute([
    fs_uuid4(),
    $mitarbeiterId,
    $aktion,
    $entitaetId,
    $detail === null ? null : json_encode($detail),
  ]);
}
