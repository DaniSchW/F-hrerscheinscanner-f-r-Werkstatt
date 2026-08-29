-- Führerscheinscanner - MySQL/MariaDB-Schema für das PHP-Backend (All-Inkl/Kasserver).
--
-- Einmalig ausführen (z.B. phpMyAdmin in KAS oder
-- `mysql -u <dbname> -p <dbname> < server/schema.sql`). Idempotent dank
-- IF NOT EXISTS - erneutes Ausführen ist ungefährlich.
--
-- Entwurfsentscheidungen:
-- - IDs sind server-seitig erzeugte UUIDv4 (CHAR(36), siehe fs_uuid4() in
--   server/lib/db.php).
-- - Es gibt kein Row Level Security wie in Postgres - jeder Endpunkt in
--   server/api/ MUSS die Rolle/Session selbst prüfen (fs_require_mitarbeiter()/
--   fs_require_admin()). Das ist die einzige Sicherheitsgrenze.
-- - JSON-Spalten (fuehrerschein_klassen, zustandsfotos_*, detail) halten
--   strukturierte Daten, die nicht separat abgefragt werden müssen.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS mitarbeiter (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  passwort_hash VARCHAR(255) NOT NULL,
  rolle ENUM('mitarbeiter', 'admin') NOT NULL DEFAULT 'mitarbeiter',
  aktiv TINYINT(1) NOT NULL DEFAULT 1,
  erstellt_am DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deaktiviert_am DATETIME NULL,
  UNIQUE KEY mitarbeiter_email_uk (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sitzungen (Bearer-Token, im Client via localStorage gehalten). token_hash
-- speichert SHA-256(token) - der Rohtoken existiert nie in der DB, nur kurz
-- im Response-Body direkt nach dem Login.
CREATE TABLE IF NOT EXISTS session (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  mitarbeiter_id CHAR(36) NOT NULL,
  geraet_label VARCHAR(200) NULL,
  ip_adresse VARCHAR(45) NULL,
  erstellt_am DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  zuletzt_aktiv_am DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ablauf_am DATETIME NOT NULL,
  widerrufen_am DATETIME NULL,
  UNIQUE KEY session_token_hash_uk (token_hash),
  CONSTRAINT session_mitarbeiter_fk FOREIGN KEY (mitarbeiter_id) REFERENCES mitarbeiter(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX session_mitarbeiter_idx ON session (mitarbeiter_id);

CREATE TABLE IF NOT EXISTS kunde (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vorname VARCHAR(255) NOT NULL,
  nachname VARCHAR(255) NOT NULL,
  geburtsdatum DATE NOT NULL,
  geburtsort VARCHAR(255) NOT NULL,
  adresse VARCHAR(500) NULL,
  plz VARCHAR(10) NULL,
  ort VARCHAR(255) NULL,
  fuehrerschein_nummer VARCHAR(64) NOT NULL,
  ausstellende_behoerde VARCHAR(255) NOT NULL,
  ausstellungsdatum DATE NOT NULL,
  fuehrerschein_klassen JSON NOT NULL,
  erstellt_am DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  zuletzt_aktualisiert_am DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Gesetzt, sobald die personenbezogenen Daten anonymisiert wurden (DSGVO,
  -- siehe server/lib/loeschung.php). Danach stehen nur noch Platzhalterwerte
  -- in vorname/nachname/adresse/fuehrerschein_*.
  anonymisiert_am DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX kunde_name_idx ON kunde (nachname, vorname);
CREATE INDEX kunde_fuehrerschein_nummer_idx ON kunde (fuehrerschein_nummer);

CREATE TABLE IF NOT EXISTS fahrzeug (
  id CHAR(36) NOT NULL PRIMARY KEY,
  kennzeichen VARCHAR(20) NOT NULL,
  bezeichnung VARCHAR(255) NOT NULL,
  benoetigte_fuehrerscheinklasse VARCHAR(10) NOT NULL,
  status ENUM('verfuegbar', 'verliehen', 'wartung') NOT NULL DEFAULT 'verfuegbar',
  UNIQUE KEY fahrzeug_kennzeichen_uk (kennzeichen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vermietung (
  id CHAR(36) NOT NULL PRIMARY KEY,
  kunde_id CHAR(36) NOT NULL,
  fahrzeug_id CHAR(36) NOT NULL,
  mitarbeiter_id_ausgabe CHAR(36) NOT NULL,
  mitarbeiter_id_rueckgabe CHAR(36) NULL,

  ausgabe_datum DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ruecknahme_datum DATETIME NULL,

  km_stand_ausgabe INT NOT NULL,
  km_stand_rueckgabe INT NULL,
  tankfuellung_ausgabe VARCHAR(20) NULL,
  tankfuellung_rueckgabe VARCHAR(20) NULL,

  -- Pfade (relativ zu server/uploads/) der dauerhaft gespeicherten Zustandsfotos.
  zustandsfotos_ausgabe JSON NOT NULL,
  zustandsfotos_rueckgabe JSON NOT NULL,

  -- Relativer Pfad zur AES-256-GCM-verschlüsselten Unterschrift-Datei.
  unterschrift_kunde VARCHAR(500) NULL,

  fuehrerschein_geprueft_von CHAR(36) NULL,
  fuehrerschein_klasse_passend TINYINT(1) NULL,

  -- Berechnetes Löschdatum, gesetzt bei Rückgabe (ruecknahme_datum + RETENTION_MONTHS).
  loeschen_am DATETIME NULL,

  -- Manuelle Fristverlängerung durch Admin bei laufendem Schadensfall/Rechtsstreit.
  rechtsstreit_hold TINYINT(1) NOT NULL DEFAULT 0,
  rechtsstreit_hold_grund TEXT NULL,
  rechtsstreit_hold_bis DATETIME NULL,

  -- Gesetzt, sobald die Unterschrift im Rahmen des Löschkonzepts entfernt wurde.
  anonymisiert_am DATETIME NULL,

  erstellt_am DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT vermietung_kunde_fk FOREIGN KEY (kunde_id) REFERENCES kunde(id),
  CONSTRAINT vermietung_fahrzeug_fk FOREIGN KEY (fahrzeug_id) REFERENCES fahrzeug(id),
  CONSTRAINT vermietung_mitarbeiter_ausgabe_fk FOREIGN KEY (mitarbeiter_id_ausgabe) REFERENCES mitarbeiter(id),
  CONSTRAINT vermietung_mitarbeiter_rueckgabe_fk FOREIGN KEY (mitarbeiter_id_rueckgabe) REFERENCES mitarbeiter(id),
  CONSTRAINT vermietung_fuehrerschein_pruefung_fk FOREIGN KEY (fuehrerschein_geprueft_von) REFERENCES mitarbeiter(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX vermietung_kunde_idx ON vermietung (kunde_id);
CREATE INDEX vermietung_fahrzeug_idx ON vermietung (fahrzeug_id);
CREATE INDEX vermietung_loeschen_am_idx ON vermietung (loeschen_am);

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  mitarbeiter_id CHAR(36) NULL,
  aktion VARCHAR(64) NOT NULL,
  betroffene_entitaet_id CHAR(36) NULL,
  detail JSON NULL,
  zeitstempel DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_log_mitarbeiter_fk FOREIGN KEY (mitarbeiter_id) REFERENCES mitarbeiter(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX audit_log_mitarbeiter_idx ON audit_log (mitarbeiter_id);
CREATE INDEX audit_log_zeitstempel_idx ON audit_log (zeitstempel);
