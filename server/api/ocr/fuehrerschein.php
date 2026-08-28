<?php
/* Nimmt die Führerschein-Fotos entgegen, lässt sie von Claude Vision
 * strukturiert auslesen und gibt nur die extrahierten Felder zurück. Die
 * Fotos selbst werden serverseitig nicht persistiert - der Mitarbeiter
 * prüft die Felder anschließend im UI (Sichtprüfung), das Foto wird danach
 * im Client verworfen.
 */
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/ocr.php';

fs_require_method('POST');
fs_require_mitarbeiter();

$body = fs_json_body();
$vorderseite = (string) ($body['vorderseiteDataUrl'] ?? '');
$rueckseite = isset($body['rueckseiteDataUrl']) ? (string) $body['rueckseiteDataUrl'] : null;

if ($vorderseite === '' || strpos($vorderseite, 'data:image/') !== 0) {
  fs_json_error('ungueltige_eingabe', 400);
}

$daten = fs_fuehrerschein_extrahieren($vorderseite, $rueckseite);

fs_json_response(['daten' => $daten]);
