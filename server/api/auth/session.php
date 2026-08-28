<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');

$token = fs_bearer_token();
if ($token === null) {
  fs_json_response(['mitarbeiter' => null]);
}

$tokenHash = fs_hash_token($token);
$stmt = fs_db()->prepare(
  'SELECT m.id, m.name, m.rolle, m.aktiv
   FROM session s JOIN mitarbeiter m ON m.id = s.mitarbeiter_id
   WHERE s.token_hash = ? AND s.widerrufen_am IS NULL AND s.ablauf_am > UTC_TIMESTAMP()'
);
$stmt->execute([$tokenHash]);
$row = $stmt->fetch();

if (!$row || (int) $row['aktiv'] !== 1) {
  fs_json_response(['mitarbeiter' => null]);
}

fs_json_response(['mitarbeiter' => ['id' => $row['id'], 'name' => $row['name'], 'rolle' => $row['rolle']]]);
