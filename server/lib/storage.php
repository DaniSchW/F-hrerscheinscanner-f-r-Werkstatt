<?php
/* Datei-Ablage für dauerhaft zu speichernde Dateien (Zustandsfotos,
 * verschlüsselte Unterschrift) unter server/uploads/ - per .htaccess dort
 * nie direkt per URL erreichbar, nur über server/api/dateien.php nach
 * Session-Prüfung (siehe server/lib/auth.php).
 */

require_once __DIR__ . '/response.php';

define('FS_UPLOAD_DIR', __DIR__ . '/../uploads');

function fs_sicherer_pfad(string $relativPfad): string {
  $zielPfad = FS_UPLOAD_DIR . '/' . $relativPfad;
  $normalisiert = realpath(dirname($zielPfad));
  $uploadReal = realpath(FS_UPLOAD_DIR);
  if ($normalisiert === false || $uploadReal === false || strpos($normalisiert, $uploadReal) !== 0) {
    fs_json_error('ungueltiger_pfad', 400);
  }
  return $zielPfad;
}

function fs_speichere_datei(string $unterordner, string $daten, string $dateiendung): string {
  if (!preg_match('/^[a-z0-9_-]+$/i', $unterordner) || !preg_match('/^[a-z0-9]{1,10}$/i', $dateiendung)) {
    fs_json_error('ungueltiger_pfad', 400);
  }
  $verzeichnis = FS_UPLOAD_DIR . '/' . $unterordner;
  if (!is_dir($verzeichnis) && !mkdir($verzeichnis, 0750, true) && !is_dir($verzeichnis)) {
    fs_json_error('speicherfehler', 500);
  }
  $dateiname = bin2hex(random_bytes(16)) . '.' . $dateiendung;
  $relativPfad = $unterordner . '/' . $dateiname;
  if (file_put_contents(FS_UPLOAD_DIR . '/' . $relativPfad, $daten) === false) {
    fs_json_error('speicherfehler', 500);
  }
  return $relativPfad;
}

function fs_lese_datei(string $relativPfad): string {
  $pfad = fs_sicherer_pfad($relativPfad);
  $inhalt = @file_get_contents($pfad);
  if ($inhalt === false) {
    fs_json_error('datei_nicht_gefunden', 404);
  }
  return $inhalt;
}

/** Löscht eine Datei endgültig (Löschkonzept) - kein Fehler, falls bereits entfernt. */
function fs_loesche_datei(string $relativPfad): void {
  $pfad = FS_UPLOAD_DIR . '/' . $relativPfad;
  $normalisiert = realpath(dirname($pfad));
  $uploadReal = realpath(FS_UPLOAD_DIR);
  if ($normalisiert === false || $uploadReal === false || strpos($normalisiert, $uploadReal) !== 0) {
    return;
  }
  if (is_file($pfad)) {
    @unlink($pfad);
  }
}

/** Zerlegt eine "data:image/jpeg;base64,..." Data-URL in Rohbytes + Media-Type. */
function fs_data_url_zu_bytes(string $dataUrl): array {
  if (!preg_match('/^data:([\w\/+.-]+);base64,(.+)$/', $dataUrl, $matches)) {
    fs_json_error('ungueltige_data_url', 400);
  }
  $bytes = base64_decode($matches[2], true);
  if ($bytes === false) {
    fs_json_error('ungueltige_data_url', 400);
  }
  return ['bytes' => $bytes, 'media_type' => $matches[1]];
}

function fs_dateiendung_fuer_media_type(string $mediaType): string {
  if ($mediaType === 'image/png') return 'png';
  if ($mediaType === 'image/webp') return 'webp';
  return 'jpg';
}
