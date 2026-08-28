<?php
/**
 * Manuelle vorzeitige Löschung auf Anfrage (DSGVO-Betroffenenrecht auf
 * Löschung). Setzt loeschen_am aller bereits zurückgegebenen Vermietungen
 * dieses Kunden auf "jetzt" und stößt anschließend denselben Löschlauf an,
 * den auch der tägliche Cronjob nutzt - ein aktiver Rechtsstreit-Hold
 * verhindert die Löschung weiterhin (Art. 17 Abs. 3 DSGVO).
 */
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/loeschung.php';

fs_require_method('POST');
$admin = fs_require_admin();

$body = fs_json_body();
$kundeId = trim((string) ($body['kundeId'] ?? ''));
if ($kundeId === '') {
  fs_json_error('ungueltige_eingabe', 400);
}

fs_db()->prepare(
  "UPDATE vermietung SET loeschen_am = UTC_TIMESTAMP() WHERE kunde_id = ? AND ruecknahme_datum IS NOT NULL"
)->execute([$kundeId]);

$ergebnis = fs_faellige_daten_loeschen('daten_manuell_geloescht', $admin['id']);

fs_json_response($ergebnis);
