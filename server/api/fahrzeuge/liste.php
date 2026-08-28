<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');
fs_require_mitarbeiter();

$nurVerfuegbare = ($_GET['verfuegbar'] ?? '') === 'true';

if ($nurVerfuegbare) {
  $stmt = fs_db()->prepare("SELECT * FROM fahrzeug WHERE status = 'verfuegbar' ORDER BY kennzeichen ASC");
  $stmt->execute();
} else {
  $stmt = fs_db()->query('SELECT * FROM fahrzeug ORDER BY kennzeichen ASC');
}

fs_json_response(['fahrzeuge' => $stmt->fetchAll()]);
