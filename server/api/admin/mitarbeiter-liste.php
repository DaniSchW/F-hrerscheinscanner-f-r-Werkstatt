<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');
fs_require_admin();

$stmt = fs_db()->query('SELECT id, name, email, rolle, aktiv, erstellt_am FROM mitarbeiter ORDER BY name ASC');
fs_json_response(['mitarbeiter' => $stmt->fetchAll()]);
