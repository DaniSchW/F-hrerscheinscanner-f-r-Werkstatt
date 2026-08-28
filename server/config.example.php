<?php
/* Vorlage für server/config.php - diese Datei kopieren und mit echten Werten
 * füllen. server/config.php ist absichtlich gitignored: DB_PASS ist ein
 * echtes MySQL-Passwort ohne weiteren Schutz (kein RLS wie bei Postgres) -
 * darf nie committet werden und darf den Browser nie erreichen.
 *
 * All-Inkl/Kasserver-Konvention: DB_HOST ist innerhalb des eigenen Hostings
 * i.d.R. "localhost", DB_USER ist i.d.R. identisch mit DB_NAME. Im Zweifel
 * im KAS (Kunden-Administrations-System) nachsehen.
 */

return [
  'DB_HOST' => 'localhost',
  'DB_NAME' => 'd048149c',
  'DB_USER' => 'd048149c',
  'DB_PASS' => 'change-me',

  // Anthropic API-Key für die Claude-Vision-Führerschein-Extraktion.
  'ANTHROPIC_API_KEY' => '',
  'ANTHROPIC_MODEL' => 'claude-sonnet-5',

  // Geheimes Token für den Cronjob, der server/api/cron/loeschung.php aufruft.
  // Erzeugen z.B. mit: openssl rand -hex 32
  'CRON_SECRET' => 'change-me',

  // 32-Byte-Schlüssel (Base64) zur Verschlüsselung der Unterschrift at rest.
  // Erzeugen mit: openssl rand -base64 32
  'SIGNATURE_ENCRYPTION_KEY' => '',

  // Aufbewahrungsfrist in Monaten nach Rückgabe, bevor Führerschein-/Kundendaten
  // automatisch gelöscht werden (vom Betrieb festzulegen, siehe README).
  'RETENTION_MONTHS' => 12,

  'SESSION_TTL_DAYS' => 7,
];
