<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');
fs_require_mitarbeiter();

$q = trim((string) ($_GET['q'] ?? ''));
$nurLaufend = ($_GET['laufend'] ?? '') === 'true';

$bedingungen = [];
$werte = [];
if ($nurLaufend) {
  $bedingungen[] = 'v.ruecknahme_datum IS NULL';
}
if ($q !== '') {
  $like = '%' . $q . '%';
  $bedingungen[] = '(f.kennzeichen LIKE ? OR k.nachname LIKE ? OR k.vorname LIKE ?)';
  array_push($werte, $like, $like, $like);
}

$where = count($bedingungen) > 0 ? 'WHERE ' . implode(' AND ', $bedingungen) : '';

$stmt = fs_db()->prepare(
  "SELECT v.id, v.ausgabe_datum, v.ruecknahme_datum,
          k.vorname AS kunde_vorname, k.nachname AS kunde_nachname,
          f.kennzeichen AS fahrzeug_kennzeichen, f.bezeichnung AS fahrzeug_bezeichnung
   FROM vermietung v
   JOIN kunde k ON k.id = v.kunde_id
   JOIN fahrzeug f ON f.id = v.fahrzeug_id
   $where
   ORDER BY v.ausgabe_datum DESC
   LIMIT 30"
);
$stmt->execute($werte);

fs_json_response(['vermietungen' => $stmt->fetchAll()]);
