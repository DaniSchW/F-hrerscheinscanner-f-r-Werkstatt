<?php
/* Kundensuche per Name oder Führerscheinnummer. */
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');
fs_require_mitarbeiter();

$q = trim((string) ($_GET['q'] ?? ''));
if (mb_strlen($q) < 2) {
  fs_json_response(['kunden' => []]);
}

$like = '%' . $q . '%';
$stmt = fs_db()->prepare(
  'SELECT id, vorname, nachname, geburtsdatum, fuehrerschein_nummer
   FROM kunde
   WHERE anonymisiert_am IS NULL
     AND (vorname LIKE ? OR nachname LIKE ? OR fuehrerschein_nummer LIKE ?)
   ORDER BY nachname ASC
   LIMIT 20'
);
$stmt->execute([$like, $like, $like]);

fs_json_response(['kunden' => $stmt->fetchAll()]);
