<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('GET');
$mitarbeiter = fs_require_mitarbeiter();

$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
  fs_json_error('ungueltige_eingabe', 400);
}

$db = fs_db();
$stmt = $db->prepare('SELECT * FROM kunde WHERE id = ?');
$stmt->execute([$id]);
$kunde = $stmt->fetch();
if (!$kunde) {
  fs_json_error('nicht_gefunden', 404, 'Kunde nicht gefunden.');
}
$kunde['fuehrerschein_klassen'] = json_decode($kunde['fuehrerschein_klassen'], true);

$stmt = $db->prepare(
  'SELECT v.id, v.ausgabe_datum, v.ruecknahme_datum, f.kennzeichen, f.bezeichnung
   FROM vermietung v JOIN fahrzeug f ON f.id = v.fahrzeug_id
   WHERE v.kunde_id = ?
   ORDER BY v.ausgabe_datum DESC'
);
$stmt->execute([$id]);
$kunde['vermietungen'] = $stmt->fetchAll();

fs_log_audit($mitarbeiter['id'], 'kunde_eingesehen', $id);

fs_json_response(['kunde' => $kunde]);
