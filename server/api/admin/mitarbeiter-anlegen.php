<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');
$admin = fs_require_admin();

$body = fs_json_body();
$name = trim((string) ($body['name'] ?? ''));
$email = strtolower(trim((string) ($body['email'] ?? '')));
$passwort = (string) ($body['passwort'] ?? '');
$rolle = (string) ($body['rolle'] ?? 'mitarbeiter');

if ($name === '' || $email === '' || strlen($passwort) < 8 || !in_array($rolle, ['mitarbeiter', 'admin'], true)) {
  fs_json_error('ungueltige_eingabe', 400, 'Name, E-Mail und ein Passwort mit mind. 8 Zeichen erforderlich.');
}

$id = fs_uuid4();
try {
  fs_db()->prepare(
    'INSERT INTO mitarbeiter (id, name, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)'
  )->execute([$id, $name, $email, fs_hash_password($passwort), $rolle]);
} catch (PDOException $e) {
  if ($e->getCode() === '23000') {
    fs_json_error('email_bereits_vorhanden', 409, 'Diese E-Mail-Adresse ist bereits vergeben.');
  }
  throw $e;
}

fs_log_audit($admin['id'], 'mitarbeiter_angelegt', $id);

fs_json_response(['mitarbeiter' => ['id' => $id]], 201);
