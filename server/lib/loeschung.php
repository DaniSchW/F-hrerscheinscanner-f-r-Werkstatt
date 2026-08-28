<?php
/* DSGVO-Löschlogik (Löschkonzept). Wird sowohl vom täglichen Cronjob
 * (server/api/cron/loeschung.php) als auch von der manuellen Admin-Löschung
 * auf Anfrage (server/api/admin/export.php) genutzt.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/audit.php';

const FS_REDAKTIONS_MARKER = '[gelöscht]';
const FS_REDAKTIONS_DATUM = '1970-01-01';

/**
 * Entfernt die Unterschrift-Datei einer einzelnen Vermietung, sobald deren
 * Löschfrist erreicht ist ("gleiche Löschfrist wie zugehörige Vermietung").
 * Zustandsfotos/Kilometerstände bleiben als betriebliche Historie erhalten -
 * sie enthalten keine Führerschein-/Kundendaten.
 */
function fs_vermietung_bereinigen(string $vermietungId): void {
  $db = fs_db();
  $stmt = $db->prepare('SELECT unterschrift_kunde FROM vermietung WHERE id = ?');
  $stmt->execute([$vermietungId]);
  $row = $stmt->fetch();
  if ($row && $row['unterschrift_kunde']) {
    fs_loesche_datei($row['unterschrift_kunde']);
  }
  $db->prepare('UPDATE vermietung SET unterschrift_kunde = NULL, anonymisiert_am = UTC_TIMESTAMP() WHERE id = ?')
    ->execute([$vermietungId]);
}

/**
 * Anonymisiert die Führerschein-/Kundendaten eines Kunden, sobald ALLE
 * seiner Vermietungen ihre Löschfrist erreicht haben und keine davon einen
 * aktiven Rechtsstreit-Hold trägt.
 */
function fs_kunde_anonymisieren_falls_faellig(string $kundeId): bool {
  $db = fs_db();
  $stmt = $db->prepare(
    'SELECT ruecknahme_datum, loeschen_am, rechtsstreit_hold, rechtsstreit_hold_bis FROM vermietung WHERE kunde_id = ?'
  );
  $stmt->execute([$kundeId]);
  $vermietungen = $stmt->fetchAll();
  if (count($vermietungen) === 0) return false;

  $now = time();
  foreach ($vermietungen as $v) {
    if ($v['ruecknahme_datum'] === null || $v['loeschen_am'] === null) return false; // laufende Vermietung
    if ((int) $v['rechtsstreit_hold'] === 1) {
      if ($v['rechtsstreit_hold_bis'] === null || strtotime($v['rechtsstreit_hold_bis'] . ' UTC') > $now) {
        return false;
      }
    }
    if (strtotime($v['loeschen_am'] . ' UTC') > $now) return false;
  }

  $db->prepare(
    'UPDATE kunde SET vorname = ?, nachname = ?, geburtsdatum = ?, geburtsort = ?, adresse = ?,
       fuehrerschein_nummer = ?, ausstellende_behoerde = ?, ausstellungsdatum = ?,
       fuehrerschein_klassen = ?, anonymisiert_am = UTC_TIMESTAMP()
     WHERE id = ?'
  )->execute([
    FS_REDAKTIONS_MARKER, FS_REDAKTIONS_MARKER, FS_REDAKTIONS_DATUM, FS_REDAKTIONS_MARKER, FS_REDAKTIONS_MARKER,
    FS_REDAKTIONS_MARKER, FS_REDAKTIONS_MARKER, FS_REDAKTIONS_DATUM,
    json_encode([]), $kundeId,
  ]);
  return true;
}

function fs_faellige_daten_loeschen(string $ausgeloestVon, ?string $mitarbeiterId): array {
  $db = fs_db();
  $stmt = $db->prepare(
    "SELECT id, kunde_id FROM vermietung
     WHERE anonymisiert_am IS NULL AND loeschen_am IS NOT NULL AND loeschen_am <= UTC_TIMESTAMP()
       AND (rechtsstreit_hold = 0 OR rechtsstreit_hold_bis <= UTC_TIMESTAMP())"
  );
  $stmt->execute();
  $faelligeVermietungen = $stmt->fetchAll();

  $betroffeneKundenIds = [];
  foreach ($faelligeVermietungen as $v) {
    fs_vermietung_bereinigen($v['id']);
    $betroffeneKundenIds[$v['kunde_id']] = true;
  }

  $kundenAnonymisiert = 0;
  foreach (array_keys($betroffeneKundenIds) as $kundeId) {
    if (fs_kunde_anonymisieren_falls_faellig($kundeId)) {
      $kundenAnonymisiert++;
    }
  }

  fs_log_audit($mitarbeiterId, $ausgeloestVon, null, [
    'vermietungenBereinigt' => count($faelligeVermietungen),
    'kundenAnonymisiert' => $kundenAnonymisiert,
  ]);

  return ['vermietungenBereinigt' => count($faelligeVermietungen), 'kundenAnonymisiert' => $kundenAnonymisiert];
}
