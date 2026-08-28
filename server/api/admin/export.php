<?php
/* Manueller Datenexport auf Anfrage (DSGVO-Betroffenenrecht auf Auskunft/Datenübertragbarkeit). */
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/audit.php';

fs_require_method('POST');
$admin = fs_require_admin();

$body = fs_json_body();
$kundeId = trim((string) ($body['kundeId'] ?? ''));
if ($kundeId === '') {
  fs_json_error('ungueltige_eingabe', 400);
}

$db = fs_db();
$stmt = $db->prepare('SELECT * FROM kunde WHERE id = ?');
$stmt->execute([$kundeId]);
$kunde = $stmt->fetch();
if (!$kunde) {
  fs_json_error('nicht_gefunden', 404, 'Kunde nicht gefunden.');
}
$kunde['fuehrerschein_klassen'] = json_decode($kunde['fuehrerschein_klassen'], true);

$stmt = $db->prepare(
  'SELECT v.*, f.kennzeichen AS fahrzeug_kennzeichen, f.bezeichnung AS fahrzeug_bezeichnung
   FROM vermietung v JOIN fahrzeug f ON f.id = v.fahrzeug_id
   WHERE v.kunde_id = ?
   ORDER BY v.ausgabe_datum DESC'
);
$stmt->execute([$kundeId]);
$vermietungen = $stmt->fetchAll();
foreach ($vermietungen as &$v) {
  $v['zustandsfotos_ausgabe'] = json_decode($v['zustandsfotos_ausgabe'], true);
  $v['zustandsfotos_rueckgabe'] = json_decode($v['zustandsfotos_rueckgabe'], true);
}
unset($v);
$kunde['vermietungen'] = $vermietungen;

fs_log_audit($admin['id'], 'daten_exportiert', $kundeId);

fs_json_response(['kunde' => $kunde]);
