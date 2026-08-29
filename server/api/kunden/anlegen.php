<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');
$mitarbeiter = fs_require_mitarbeiter();

$body = fs_json_body();
$pflichtfelder = [
  'vorname', 'nachname', 'geburtsdatum', 'geburtsort',
  'fuehrerscheinNummer', 'ausstellendeBehoerde', 'ausstellungsdatum',
];
foreach ($pflichtfelder as $feld) {
  if (empty($body[$feld])) {
    fs_json_error('ungueltige_eingabe', 400, "Feld '$feld' fehlt.");
  }
}
if (empty($body['fuehrerscheinKlassen']) || !is_array($body['fuehrerscheinKlassen'])) {
  fs_json_error('ungueltige_eingabe', 400, "Mindestens eine Führerscheinklasse erforderlich.");
}

$id = fs_uuid4();
fs_db()->prepare(
  'INSERT INTO kunde (id, vorname, nachname, geburtsdatum, geburtsort, adresse, plz, ort,
     fuehrerschein_nummer, ausstellende_behoerde, ausstellungsdatum, fuehrerschein_klassen)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
)->execute([
  $id,
  $body['vorname'], $body['nachname'], $body['geburtsdatum'], $body['geburtsort'],
  $body['adresse'] ?? null, $body['plz'] ?? null, $body['ort'] ?? null,
  $body['fuehrerscheinNummer'], $body['ausstellendeBehoerde'], $body['ausstellungsdatum'],
  json_encode($body['fuehrerscheinKlassen']),
]);

fs_log_audit($mitarbeiter['id'], 'kunde_angelegt', $id);

fs_json_response(['kunde' => ['id' => $id]], 201);
