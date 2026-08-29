<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');
$mitarbeiter = fs_require_mitarbeiter();

$body = fs_json_body();
$id = trim((string) ($body['id'] ?? ''));
if ($id === '') {
  fs_json_error('ungueltige_eingabe', 400);
}

$erlaubteFelder = [
  'vorname' => 'vorname', 'nachname' => 'nachname', 'geburtsdatum' => 'geburtsdatum',
  'geburtsort' => 'geburtsort', 'adresse' => 'adresse', 'plz' => 'plz', 'ort' => 'ort',
  'fuehrerscheinNummer' => 'fuehrerschein_nummer',
  'ausstellendeBehoerde' => 'ausstellende_behoerde', 'ausstellungsdatum' => 'ausstellungsdatum',
];

$setzungen = [];
$werte = [];
foreach ($erlaubteFelder as $jsonFeld => $spalte) {
  if (array_key_exists($jsonFeld, $body)) {
    $setzungen[] = "$spalte = ?";
    $werte[] = $body[$jsonFeld];
  }
}
if (array_key_exists('fuehrerscheinKlassen', $body)) {
  $setzungen[] = 'fuehrerschein_klassen = ?';
  $werte[] = json_encode($body['fuehrerscheinKlassen']);
}
if (count($setzungen) === 0) {
  fs_json_error('ungueltige_eingabe', 400, 'Keine Felder zum Aktualisieren übergeben.');
}
$werte[] = $id;

fs_db()->prepare('UPDATE kunde SET ' . implode(', ', $setzungen) . ' WHERE id = ?')->execute($werte);

fs_log_audit($mitarbeiter['id'], 'kunde_aktualisiert', $id);

fs_json_response(['ok' => true]);
