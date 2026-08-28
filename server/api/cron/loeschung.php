<?php
/**
 * Täglicher Löschjob (Löschkonzept). Von einem externen Cronjob aufzurufen
 * (in KAS unter "Cronjobs" einrichten), z.B. via curl:
 *   curl -X POST https://IHR-HOST/server/api/cron/loeschung.php \
 *     -H "Authorization: Bearer $CRON_SECRET"
 * Kein Mitarbeiter-Login nötig, dafür ein geheimes Bearer-Token, das nur
 * der Cronjob kennt (CRON_SECRET in server/config.php).
 */
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/loeschung.php';

fs_require_method('POST');

$cfg = fs_config();
$token = fs_bearer_token();
if ($token === null || !hash_equals((string) $cfg['CRON_SECRET'], $token)) {
  fs_json_error('unauthorized', 401, 'Nicht autorisiert.');
}

$ergebnis = fs_faellige_daten_loeschen('automatische_loeschung', null);

fs_json_response($ergebnis);
