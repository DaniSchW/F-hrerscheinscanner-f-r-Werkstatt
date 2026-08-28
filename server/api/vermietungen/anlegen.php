<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';
require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/crypto.php';

fs_require_method('POST');
$mitarbeiter = fs_require_mitarbeiter();

$body = fs_json_body();
$kunde = $body['kunde'] ?? null;
$fahrzeugId = trim((string) ($body['fahrzeugId'] ?? ''));
$kmStandAusgabe = $body['kmStandAusgabe'] ?? null;
$tankfuellungAusgabe = trim((string) ($body['tankfuellungAusgabe'] ?? ''));
$zustandsfotos = $body['zustandsfotosAusgabe'] ?? [];
$unterschriftDataUrl = $body['unterschriftKundeDataUrl'] ?? null;
$klassePassend = (bool) ($body['fuehrerscheinKlassePassend'] ?? false);

if (!is_array($kunde) || !isset($kunde['modus']) || $fahrzeugId === '' ||
    !is_int($kmStandAusgabe) || $kmStandAusgabe < 0 || $tankfuellungAusgabe === '' || !is_array($zustandsfotos)) {
  fs_json_error('ungueltige_eingabe', 400);
}

if ($kunde['modus'] === 'neu') {
  $pflichtfelder = [
    'vorname', 'nachname', 'geburtsdatum', 'geburtsort', 'adresse',
    'fuehrerscheinNummer', 'ausstellendeBehoerde', 'ausstellungsdatum',
  ];
  foreach ($pflichtfelder as $feld) {
    if (empty($kunde[$feld])) {
      fs_json_error('ungueltige_eingabe', 400, "Feld '$feld' fehlt.");
    }
  }
  if (empty($kunde['fuehrerscheinKlassen']) || !is_array($kunde['fuehrerscheinKlassen'])) {
    fs_json_error('ungueltige_eingabe', 400, 'Mindestens eine Führerscheinklasse erforderlich.');
  }
} elseif ($kunde['modus'] !== 'bestehend') {
  fs_json_error('ungueltige_eingabe', 400);
}

$db = fs_db();

$stmt = $db->prepare('SELECT status FROM fahrzeug WHERE id = ?');
$stmt->execute([$fahrzeugId]);
$fahrzeug = $stmt->fetch();
if (!$fahrzeug) {
  fs_json_error('nicht_gefunden', 404, 'Fahrzeug nicht gefunden.');
}
if ($fahrzeug['status'] !== 'verfuegbar') {
  fs_json_error('fahrzeug_nicht_verfuegbar', 409, 'Fahrzeug ist nicht verfügbar.');
}

$zustandsfotosPfade = [];
foreach ($zustandsfotos as $dataUrl) {
  $decoded = fs_data_url_zu_bytes((string) $dataUrl);
  $zustandsfotosPfade[] = fs_speichere_datei('zustandsfotos', $decoded['bytes'], fs_dateiendung_fuer_media_type($decoded['media_type']));
}

$unterschriftPfad = null;
if ($unterschriftDataUrl) {
  $decoded = fs_data_url_zu_bytes((string) $unterschriftDataUrl);
  $unterschriftPfad = fs_speichere_datei('unterschriften', fs_verschluesseln($decoded['bytes']), 'bin');
}

$db->beginTransaction();
try {
  if ($kunde['modus'] === 'bestehend') {
    $kundeId = trim((string) ($kunde['kundeId'] ?? ''));
    $stmt = $db->prepare('SELECT id FROM kunde WHERE id = ? AND anonymisiert_am IS NULL');
    $stmt->execute([$kundeId]);
    if (!$stmt->fetch()) {
      $db->rollBack();
      fs_json_error('kunde_nicht_gefunden', 404, 'Kunde nicht gefunden oder Daten bereits gelöscht.');
    }
  } elseif ($kunde['modus'] === 'neu') {
    $kundeId = fs_uuid4();
    $db->prepare(
      'INSERT INTO kunde (id, vorname, nachname, geburtsdatum, geburtsort, adresse,
         fuehrerschein_nummer, ausstellende_behoerde, ausstellungsdatum, fuehrerschein_klassen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
      $kundeId,
      $kunde['vorname'] ?? '', $kunde['nachname'] ?? '', $kunde['geburtsdatum'] ?? null,
      $kunde['geburtsort'] ?? '', $kunde['adresse'] ?? '',
      $kunde['fuehrerscheinNummer'] ?? '', $kunde['ausstellendeBehoerde'] ?? '', $kunde['ausstellungsdatum'] ?? null,
      json_encode($kunde['fuehrerscheinKlassen'] ?? []),
    ]);
  } else {
    $db->rollBack();
    fs_json_error('ungueltige_eingabe', 400);
  }

  $vermietungId = fs_uuid4();
  $db->prepare(
    'INSERT INTO vermietung (id, kunde_id, fahrzeug_id, mitarbeiter_id_ausgabe, km_stand_ausgabe,
       tankfuellung_ausgabe, zustandsfotos_ausgabe, zustandsfotos_rueckgabe, unterschrift_kunde,
       fuehrerschein_geprueft_von, fuehrerschein_klasse_passend)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )->execute([
    $vermietungId, $kundeId, $fahrzeugId, $mitarbeiter['id'], $kmStandAusgabe,
    $tankfuellungAusgabe, json_encode($zustandsfotosPfade), json_encode([]), $unterschriftPfad,
    $mitarbeiter['id'], $klassePassend ? 1 : 0,
  ]);

  $db->prepare("UPDATE fahrzeug SET status = 'verliehen' WHERE id = ?")->execute([$fahrzeugId]);

  $db->commit();
} catch (Exception $e) {
  $db->rollBack();
  throw $e;
}

fs_log_audit($mitarbeiter['id'], 'vermietung_angelegt', $vermietungId);

fs_json_response(['vermietung' => ['id' => $vermietungId]], 201);
