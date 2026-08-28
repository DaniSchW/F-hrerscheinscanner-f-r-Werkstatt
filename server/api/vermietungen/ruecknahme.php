<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';
require_once __DIR__ . '/../../lib/storage.php';

fs_require_method('POST');
$mitarbeiter = fs_require_mitarbeiter();

$body = fs_json_body();
$id = trim((string) ($body['id'] ?? ''));
$kmStandRueckgabe = $body['kmStandRueckgabe'] ?? null;
$tankfuellungRueckgabe = trim((string) ($body['tankfuellungRueckgabe'] ?? ''));
$zustandsfotos = $body['zustandsfotosRueckgabe'] ?? [];

if ($id === '' || !is_int($kmStandRueckgabe) || $kmStandRueckgabe < 0 || $tankfuellungRueckgabe === '' || !is_array($zustandsfotos)) {
  fs_json_error('ungueltige_eingabe', 400);
}

$db = fs_db();
$stmt = $db->prepare('SELECT fahrzeug_id, ruecknahme_datum FROM vermietung WHERE id = ?');
$stmt->execute([$id]);
$vermietung = $stmt->fetch();
if (!$vermietung) {
  fs_json_error('nicht_gefunden', 404, 'Vermietung nicht gefunden.');
}
if ($vermietung['ruecknahme_datum'] !== null) {
  fs_json_error('bereits_zurueckgenommen', 409, 'Diese Vermietung wurde bereits zurückgenommen.');
}

$zustandsfotosPfade = [];
foreach ($zustandsfotos as $dataUrl) {
  $decoded = fs_data_url_zu_bytes((string) $dataUrl);
  $zustandsfotosPfade[] = fs_speichere_datei('zustandsfotos', $decoded['bytes'], fs_dateiendung_fuer_media_type($decoded['media_type']));
}

$cfg = fs_config();
$retentionMonths = (int) ($cfg['RETENTION_MONTHS'] ?? 12);

$db->beginTransaction();
try {
  $db->prepare(
    "UPDATE vermietung SET ruecknahme_datum = UTC_TIMESTAMP(), km_stand_rueckgabe = ?,
       tankfuellung_rueckgabe = ?, zustandsfotos_rueckgabe = ?, mitarbeiter_id_rueckgabe = ?,
       loeschen_am = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MONTH)
     WHERE id = ?"
  )->execute([$kmStandRueckgabe, $tankfuellungRueckgabe, json_encode($zustandsfotosPfade), $mitarbeiter['id'], $retentionMonths, $id]);

  $db->prepare("UPDATE fahrzeug SET status = 'verfuegbar' WHERE id = ?")->execute([$vermietung['fahrzeug_id']]);

  $db->commit();
} catch (Exception $e) {
  $db->rollBack();
  throw $e;
}

fs_log_audit($mitarbeiter['id'], 'vermietung_abgeschlossen', $id);

fs_json_response(['ok' => true]);
