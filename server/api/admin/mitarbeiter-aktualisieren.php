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

$db = fs_db();

if (array_key_exists('aktiv', $body) && $body['aktiv'] === false) {
  if ($id === $admin['id']) {
    fs_json_error('ungueltige_aktion', 400, 'Der eigene Account kann nicht deaktiviert werden.');
  }
  $db->prepare('UPDATE mitarbeiter SET aktiv = 0, deaktiviert_am = UTC_TIMESTAMP() WHERE id = ?')->execute([$id]);
  $db->prepare('UPDATE session SET widerrufen_am = UTC_TIMESTAMP() WHERE mitarbeiter_id = ? AND widerrufen_am IS NULL')
    ->execute([$id]);
  fs_log_audit($admin['id'], 'mitarbeiter_deaktiviert', $id);
} elseif (array_key_exists('aktiv', $body) && $body['aktiv'] === true) {
  $db->prepare('UPDATE mitarbeiter SET aktiv = 1, deaktiviert_am = NULL WHERE id = ?')->execute([$id]);
}

if (array_key_exists('rolle', $body) && in_array($body['rolle'], ['mitarbeiter', 'admin'], true)) {
  $db->prepare('UPDATE mitarbeiter SET rolle = ? WHERE id = ?')->execute([$body['rolle'], $id]);
}

fs_json_response(['ok' => true]);
