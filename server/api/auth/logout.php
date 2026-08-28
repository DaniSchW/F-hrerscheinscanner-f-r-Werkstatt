<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');

$token = fs_bearer_token();
if ($token !== null) {
  $tokenHash = fs_hash_token($token);
  $stmt = fs_db()->prepare('SELECT mitarbeiter_id FROM session WHERE token_hash = ? AND widerrufen_am IS NULL');
  $stmt->execute([$tokenHash]);
  $row = $stmt->fetch();

  fs_db()->prepare('UPDATE session SET widerrufen_am = UTC_TIMESTAMP() WHERE token_hash = ? AND widerrufen_am IS NULL')
    ->execute([$tokenHash]);

  if ($row) {
    fs_log_audit($row['mitarbeiter_id'], 'logout');
  }
}

fs_json_response(['ok' => true]);
