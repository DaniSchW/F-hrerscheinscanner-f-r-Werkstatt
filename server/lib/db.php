<?php
/* Einzelne geteilte PDO-Verbindung, aufgebaut aus server/config.php. Jede
 * Query in server/ muss über Prepared Statements auf diesem Handle laufen -
 * kein ORM (kleine, prüfbare Angriffsfläche), aber das heißt auch: nie
 * String-Interpolation in SQL, auch nicht für vermeintlich sichere Werte.
 */

function fs_config(): array {
  static $config = null;
  if ($config === null) {
    $path = __DIR__ . '/../config.php';
    if (!file_exists($path)) {
      http_response_code(500);
      header('Content-Type: application/json');
      echo json_encode(['fehler' => 'server_nicht_konfiguriert']);
      exit;
    }
    $config = require $path;
  }
  return $config;
}

function fs_db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $cfg = fs_config();
    $dsn = sprintf(
      'mysql:host=%s;dbname=%s;charset=utf8mb4',
      $cfg['DB_HOST'],
      $cfg['DB_NAME']
    );
    $pdo = new PDO($dsn, $cfg['DB_USER'], $cfg['DB_PASS'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  }
  return $pdo;
}

function fs_uuid4(): string {
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
