<?php
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/response.php';
require_once __DIR__ . '/../../lib/auth.php';

fs_require_method('GET');
fs_require_admin();

$stmt = fs_db()->query(
  "SELECT s.id, s.geraet_label, s.ip_adresse, s.erstellt_am, s.zuletzt_aktiv_am, s.ablauf_am,
          m.id AS mitarbeiter_id, m.name AS mitarbeiter_name, m.email AS mitarbeiter_email
   FROM session s JOIN mitarbeiter m ON m.id = s.mitarbeiter_id
   WHERE s.widerrufen_am IS NULL AND s.ablauf_am > UTC_TIMESTAMP()
   ORDER BY s.zuletzt_aktiv_am DESC"
);

fs_json_response(['sessions' => $stmt->fetchAll()]);
