<?php
/* Sitzungs-/Passwort-Handling. Jeder geschützte Endpunkt MUSS
 * fs_require_mitarbeiter() (oder fs_require_admin()) aufrufen - das ist die
 * gesamte Sicherheitsgrenze, es gibt kein Row Level Security wie bei
 * Postgres/Supabase.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

function fs_generate_token(): string {
  return bin2hex(random_bytes(32));
}

function fs_hash_token(string $token): string {
  return hash('sha256', $token);
}

function fs_hash_password(string $plain): string {
  return password_hash($plain, PASSWORD_DEFAULT);
}

function fs_verify_password(string $plain, string $hash): bool {
  return password_verify($plain, $hash);
}

function fs_client_ip(): string {
  $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
  if ($forwarded !== '') {
    return trim(explode(',', $forwarded)[0]);
  }
  return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function fs_bearer_token(): ?string {
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if ($header === '' && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  }
  if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
    return null;
  }
  return $matches[1];
}

/**
 * Legt eine neue Sitzung an (7 Tage gültig, konfigurierbar über
 * SESSION_TTL_DAYS). Gibt den rohen Token zurück - er wird nur hier und im
 * Login-Response gesehen, in der DB liegt ausschließlich sein SHA-256-Hash.
 */
function fs_create_session(string $mitarbeiterId): string {
  $cfg = fs_config();
  $token = fs_generate_token();
  $ttlDays = (int) ($cfg['SESSION_TTL_DAYS'] ?? 7);

  fs_db()->prepare(
    'INSERT INTO session (id, token_hash, mitarbeiter_id, geraet_label, ip_adresse, ablauf_am)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))'
  )->execute([
    fs_uuid4(),
    fs_hash_token($token),
    $mitarbeiterId,
    substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
    fs_client_ip(),
    $ttlDays,
  ]);

  return $token;
}

/**
 * Prüft den Bearer-Token aus dem Request und liefert den angemeldeten
 * Mitarbeiter zurück (id, name, email, rolle) oder beendet den Request mit
 * 401. Aktualisiert nebenbei zuletzt_aktiv_am (höchstens alle 5 Minuten, um
 * Schreiblast zu sparen).
 */
function fs_require_mitarbeiter(): array {
  $token = fs_bearer_token();
  if ($token === null) {
    fs_json_error('unauthorized', 401, 'Nicht angemeldet.');
  }
  $tokenHash = fs_hash_token($token);

  $stmt = fs_db()->prepare(
    'SELECT s.id AS session_id, s.zuletzt_aktiv_am, m.id, m.name, m.email, m.rolle, m.aktiv
     FROM session s
     JOIN mitarbeiter m ON m.id = s.mitarbeiter_id
     WHERE s.token_hash = ? AND s.widerrufen_am IS NULL AND s.ablauf_am > UTC_TIMESTAMP()'
  );
  $stmt->execute([$tokenHash]);
  $row = $stmt->fetch();
  if (!$row || (int) $row['aktiv'] !== 1) {
    fs_json_error('unauthorized', 401, 'Sitzung abgelaufen oder ungültig.');
  }

  if (strtotime($row['zuletzt_aktiv_am'] . ' UTC') < time() - 300) {
    fs_db()->prepare('UPDATE session SET zuletzt_aktiv_am = UTC_TIMESTAMP() WHERE id = ?')
      ->execute([$row['session_id']]);
  }

  return [
    'id' => $row['id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'rolle' => $row['rolle'],
    'session_id' => $row['session_id'],
  ];
}

function fs_require_admin(): array {
  $mitarbeiter = fs_require_mitarbeiter();
  if ($mitarbeiter['rolle'] !== 'admin') {
    fs_json_error('forbidden', 403, 'Nur für Administratoren.');
  }
  return $mitarbeiter;
}
