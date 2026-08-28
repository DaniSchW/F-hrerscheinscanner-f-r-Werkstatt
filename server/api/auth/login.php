<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');

$body = fs_json_body();
$email = strtolower(trim((string) ($body['email'] ?? '')));
$passwort = (string) ($body['passwort'] ?? '');
if ($email === '' || $passwort === '') {
  fs_json_error('ungueltige_eingabe', 400, 'E-Mail und Passwort erforderlich.');
}

$stmt = fs_db()->prepare('SELECT id, name, passwort_hash, rolle, aktiv FROM mitarbeiter WHERE email = ?');
$stmt->execute([$email]);
$mitarbeiter = $stmt->fetch();

if (!$mitarbeiter || (int) $mitarbeiter['aktiv'] !== 1 || !fs_verify_password($passwort, $mitarbeiter['passwort_hash'])) {
  fs_json_error('login_fehlgeschlagen', 401, 'E-Mail oder Passwort ist falsch.');
}

$token = fs_create_session($mitarbeiter['id']);
fs_log_audit($mitarbeiter['id'], 'login');

fs_json_response([
  'token' => $token,
  'mitarbeiter' => ['id' => $mitarbeiter['id'], 'name' => $mitarbeiter['name'], 'rolle' => $mitarbeiter['rolle']],
]);
