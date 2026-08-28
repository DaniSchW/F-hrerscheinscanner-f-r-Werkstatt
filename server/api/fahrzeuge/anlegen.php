<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('POST');
fs_require_admin();

$body = fs_json_body();
$kennzeichen = trim((string) ($body['kennzeichen'] ?? ''));
$bezeichnung = trim((string) ($body['bezeichnung'] ?? ''));
$klasse = trim((string) ($body['benoetigteFuehrerscheinklasse'] ?? ''));
if ($kennzeichen === '' || $bezeichnung === '' || $klasse === '') {
  fs_json_error('ungueltige_eingabe', 400);
}

$id = fs_uuid4();
try {
  fs_db()->prepare(
    'INSERT INTO fahrzeug (id, kennzeichen, bezeichnung, benoetigte_fuehrerscheinklasse) VALUES (?, ?, ?, ?)'
  )->execute([$id, $kennzeichen, $bezeichnung, $klasse]);
} catch (PDOException $e) {
  if ($e->getCode() === '23000') {
    fs_json_error('kennzeichen_bereits_vorhanden', 409, 'Ein Fahrzeug mit diesem Kennzeichen existiert bereits.');
  }
  throw $e;
}

fs_json_response(['fahrzeug' => ['id' => $id]], 201);
