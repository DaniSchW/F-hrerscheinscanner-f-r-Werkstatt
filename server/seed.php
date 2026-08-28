<?php
/**
 * Einmalig ausführen, um den ersten Admin-Account und Beispiel-Fahrzeuge
 * anzulegen:
 *   php server/seed.php admin@example.com "IhrPasswort123"
 * Nur über die Kommandozeile lauffähig (kein Web-Endpunkt), damit dieses
 * Skript nicht versehentlich öffentlich erreichbar ist.
 */

if (PHP_SAPI !== 'cli') {
  http_response_code(403);
  exit('Nur über die Kommandozeile ausführbar.');
}

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';

$email = strtolower(trim($argv[1] ?? 'admin@example.com'));
$passwort = $argv[2] ?? 'bitte-aendern-123';

$db = fs_db();

$stmt = $db->prepare('SELECT id FROM mitarbeiter WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
  echo "Mitarbeiter $email existiert bereits - kein neuer Admin angelegt.\n";
} else {
  $id = fs_uuid4();
  $db->prepare('INSERT INTO mitarbeiter (id, name, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)')
    ->execute([$id, 'Admin', $email, fs_hash_password($passwort), 'admin']);
  echo "Admin-Account angelegt: $email (Passwort: $passwort - bitte nach dem ersten Login ändern)\n";
}

$beispielFahrzeuge = [
  ['AA-BC 123', 'VW Golf', 'B'],
  ['AA-BC 456', 'VW Transporter T6', 'BE'],
];
foreach ($beispielFahrzeuge as [$kennzeichen, $bezeichnung, $klasse]) {
  $stmt = $db->prepare('SELECT id FROM fahrzeug WHERE kennzeichen = ?');
  $stmt->execute([$kennzeichen]);
  if ($stmt->fetch()) continue;
  $db->prepare('INSERT INTO fahrzeug (id, kennzeichen, bezeichnung, benoetigte_fuehrerscheinklasse) VALUES (?, ?, ?, ?)')
    ->execute([fs_uuid4(), $kennzeichen, $bezeichnung, $klasse]);
}
echo "Beispiel-Fahrzeuge angelegt (sofern noch nicht vorhanden).\n";
