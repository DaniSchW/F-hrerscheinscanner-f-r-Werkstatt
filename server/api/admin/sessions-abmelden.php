<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');
$admin = fs_require_admin();

$body = fs_json_body();
$id = trim((string) ($body['id'] ?? ''));
if ($id === '') {
  fs_json_error('ungueltige_eingabe', 400);
}

fs_db()->prepare('UPDATE session SET widerrufen_am = UTC_TIMESTAMP() WHERE id = ?')->execute([$id]);

fs_log_audit($admin['id'], 'geraet_abgemeldet', $id);

fs_json_response(['ok' => true]);
