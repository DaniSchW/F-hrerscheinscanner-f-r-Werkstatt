<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');
fs_require_admin();

$seite = max(1, (int) ($_GET['seite'] ?? 1));
$groesse = 50;
$offset = ($seite - 1) * $groesse;

$stmt = fs_db()->prepare(
  'SELECT a.id, a.aktion, a.betroffene_entitaet_id, a.zeitstempel, m.name AS mitarbeiter_name
   FROM audit_log a LEFT JOIN mitarbeiter m ON m.id = a.mitarbeiter_id
   ORDER BY a.zeitstempel DESC
   LIMIT ? OFFSET ?'
);
$stmt->bindValue(1, $groesse, PDO::PARAM_INT);
$stmt->bindValue(2, $offset, PDO::PARAM_INT);
$stmt->execute();

fs_json_response(['eintraege' => $stmt->fetchAll(), 'seite' => $seite]);
