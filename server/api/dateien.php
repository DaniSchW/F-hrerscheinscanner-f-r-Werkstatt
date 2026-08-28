<?php
/* Liefert dauerhaft gespeicherte Dateien (Zustandsfotos, Unterschrift) nur
 * an angemeldete Mitarbeiter aus - keine öffentliche Auslieferung, da
 * personenbezogene Daten enthalten sein können.
 */
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/storage.php';
require_once __DIR__ . '/../lib/crypto.php';

fs_require_method('GET');
fs_require_mitarbeiter();

$pfad = trim((string) ($_GET['pfad'] ?? ''), '/');
if ($pfad === '' || strpos($pfad, '..') !== false) {
  fs_json_error('ungueltiger_pfad', 400);
}

$inhalt = fs_lese_datei($pfad);

if (strpos($pfad, 'unterschriften/') === 0) {
  $inhalt = fs_entschluesseln($inhalt);
  $contentType = 'image/png';
} else {
  $contentType = str_ends_with($pfad, '.png') ? 'image/png' : (str_ends_with($pfad, '.webp') ? 'image/webp' : 'image/jpeg');
}

header('Content-Type: ' . $contentType);
header('Cache-Control: private, no-store');
echo $inhalt;
