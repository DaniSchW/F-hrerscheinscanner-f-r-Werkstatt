<?php
/* AES-256-GCM für die Unterschrift ("verschlüsselt gespeichert" laut
 * Briefing). SIGNATURE_ENCRYPTION_KEY muss ein 32-Byte-Schlüssel,
 * Base64-kodiert, sein (z.B. `openssl rand -base64 32`).
 * Layout der gespeicherten Datei: [12 Byte IV][16 Byte Auth-Tag][Ciphertext].
 */

require_once __DIR__ . '/db.php';

function fs_encryption_key(): string {
  $cfg = fs_config();
  $raw = (string) ($cfg['SIGNATURE_ENCRYPTION_KEY'] ?? '');
  if ($raw === '') {
    fs_json_error('server_nicht_konfiguriert', 500, 'SIGNATURE_ENCRYPTION_KEY ist nicht gesetzt.');
  }
  $key = base64_decode($raw, true);
  if ($key === false || strlen($key) !== 32) {
    fs_json_error('server_nicht_konfiguriert', 500, 'SIGNATURE_ENCRYPTION_KEY muss 32 Byte (Base64) lang sein.');
  }
  return $key;
}

function fs_verschluesseln(string $daten): string {
  $key = fs_encryption_key();
  $iv = random_bytes(12);
  $tag = '';
  $ciphertext = openssl_encrypt($daten, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
  if ($ciphertext === false) {
    fs_json_error('verschluesselung_fehlgeschlagen', 500);
  }
  return $iv . $tag . $ciphertext;
}

function fs_entschluesseln(string $daten): string {
  $key = fs_encryption_key();
  $iv = substr($daten, 0, 12);
  $tag = substr($daten, 12, 16);
  $ciphertext = substr($daten, 28);
  $plain = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
  if ($plain === false) {
    fs_json_error('entschluesselung_fehlgeschlagen', 500);
  }
  return $plain;
}
