# Führerscheinscanner – Fahrzeugverleih PWA

Interne Progressive Web App für die Fahrzeugausgabe/-rückgabe am Tresen: Führerschein-Erfassung per Foto
(automatische Datenextraktion via Claude Vision), Zustandsdokumentation, digitale Unterschrift und
DSGVO-konformes Löschkonzept. Für einen einzelnen Betrieb (kein Mandantensystem), nicht öffentlich
zugänglich.

Siehe das ursprüngliche Briefing für den fachlichen Hintergrund; dieses README dokumentiert die
konkrete Umsetzung.

## Architektur

Läuft auf klassischem PHP/MySQL-Shared-Hosting (Kasserver/All-Inkl) - kein dauerhafter Node-Prozess
nötig:

- **Frontend**: Next.js 16 (App Router, TypeScript), als **statischer Export** gebaut
  (`npm run build` → `out/`), Tailwind CSS für große, tresen-taugliche Bedienelemente. Läuft rein im
  Browser, spricht das PHP-Backend über `fetch()` an.
- **Backend**: PHP 8.5, flache Skripte unter `server/api/`, PDO/MySQL, kein Framework (kleine,
  prüfbare Angriffsfläche). Konventionen orientieren sich am bestehenden Random-Jingle-PHP-Backend
  desselben Hostings.
- **Datenbank**: MySQL/MariaDB (`server/schema.sql`).
- **Auth**: Bearer-Token-Sessions (kein Cookie, da Next-Export und PHP-Backend als reine
  Request/Response-APIs ohne gemeinsamen Server-Prozess laufen). Der Token liegt im `localStorage`
  des Browsers und wird bei jedem Request als `Authorization: Bearer <token>` mitgeschickt.
- **Datenextraktion**: Anthropic Claude API (Vision, Tool-Use für strukturiertes JSON), aufgerufen
  server-seitig aus PHP (`server/lib/ocr.php`) - der API-Key bleibt serverseitig.
- **Dateien**: Zustandsfotos + AES-256-GCM-verschlüsselte Unterschrift liegen unter
  `server/uploads/` (per `.htaccess` nie direkt per URL erreichbar), ausgeliefert nur über
  `server/api/dateien.php` nach Session-Prüfung.
- **PWA**: `public/manifest.json` + `public/sw.js` (App-Shell-Cache, Offline-Warteschlange für die
  Führerschein-OCR via IndexedDB).

## Ordnerstruktur

```
server/                       PHP-Backend
  schema.sql                  MySQL-Schema
  seed.php                    CLI-Skript: Erst-Admin + Beispiel-Fahrzeuge anlegen
  config.example.php          Vorlage - nach server/config.php kopieren (gitignored)
  .htaccess                   Sperrt config.php gegen Direktzugriff
  lib/                        db, auth, response, crypto, storage, audit, loeschung, ocr,
                               fuehrerscheinklassen
  api/
    auth/                     login.php, logout.php, session.php
    kunden/                   suche.php, anlegen.php, get.php, aktualisieren.php
    fahrzeuge/                liste.php, anlegen.php
    vermietungen/             suche.php, anlegen.php, ruecknahme.php
    ocr/fuehrerschein.php
    dateien.php               Zustandsfotos/Unterschrift ausliefern (authentifiziert)
    admin/                    mitarbeiter-*, sessions-*, audit-log.php, export.php, loeschen.php
    cron/loeschung.php        Täglicher Löschjob (Bearer-Secret statt Login)
  uploads/                    Zustandsfotos + verschlüsselte Unterschrift (gitignored, per .htaccess gesperrt)

src/
  lib/
    api.ts                    Fetch-Wrapper fürs PHP-Backend, Token-Verwaltung (localStorage)
    AuthContext.tsx            Client-seitige Sitzungsprüfung/-verwaltung (ersetzt Server-Middleware)
    datum.ts                   MySQL-DATETIME-Strings korrekt als UTC parsen
    fuehrerscheinklassen.ts    Warnhinweis-Heuristik Führerscheinklasse ↔ Fahrzeug
    offlineQueue.ts            IndexedDB-Warteschlange für OCR-Aufrufe ohne Verbindung
  components/                 Kamera-Aufnahme, Unterschrift-Pad, Inaktivitäts-Sperre, Offline-Hinweis
  app/
    login/                     Login-Seite (öffentlich)
    (app)/                     Alle Seiten hinter Login (AuthProvider prüft Token clientseitig)
      page.tsx                 Startmaske
      vermietung/neu/           Neue-Vermietung-Assistent
      vermietung/rueckgabe/     Rückgabe suchen
      vermietung/ruecknahme/    Rückgabe erfassen (?id=… statt dynamischer Route, s.u.)
      kunden/                   Kundensuche
      kunden/detail/            Kundendetail + Verlauf (?id=…)
      admin/                    Nutzerverwaltung, Fahrzeuge, Geräte/Sessions, Audit-Log, Export/Löschung

public/
  manifest.json, sw.js, offline.html, icons/
```

**Warum `?id=…` statt `/kunden/[id]`:** Ein reiner statischer Export kann keine zur Build-Zeit
unbekannten dynamischen Routen bedienen (kein Server, der sie zur Laufzeit auflöst). Kundendetail und
Rückgabe-Erfassung lesen die ID daher über `useSearchParams()` statt über einen Next.js-Routenparameter.

## Lokale Einrichtung

Voraussetzungen: Node.js 20+, PHP 8.4/8.5 mit `pdo_mysql`, eine MySQL/MariaDB-Instanz.

```bash
# Backend
cp server/config.example.php server/config.php
# server/config.php mit echten Werten füllen: DB-Zugang, ANTHROPIC_API_KEY, CRON_SECRET,
# SIGNATURE_ENCRYPTION_KEY (openssl rand -base64 32)
mysql -u <db_user> -p <db_name> < server/schema.sql
php server/seed.php admin@example.com "IhrPasswort123"
php -S localhost:8090          # Backend unter http://localhost:8090/server/api/...

# Frontend
cp .env.example .env
npm install
npm run dev                     # http://localhost:3000, spricht per Default localhost:8090? siehe unten
```

Für `npm run dev` gegen das lokale PHP unter einem anderen Port zeigt: `NEXT_PUBLIC_API_BASE_URL`
in `.env` auf `http://localhost:8090/server/api` setzen (CORS ist dabei kein Problem, da PHP hier
nur GET/POST/JSON ohne Cookies beantwortet - Bearer-Token-Auth ist CORS-unkritisch, `server/lib/response.php`
antwortet aber ohne CORS-Header; für funktionierende Cross-Origin-Requests im `next dev`-Betrieb ggf.
`Access-Control-Allow-Origin` in `server/lib/response.php` ergänzen, oder direkt production-artig über
denselben Ursprung testen, siehe nächster Abschnitt).

`npm run build` ruft automatisch (npm-"postbuild"-Hook, `scripts/copy-server-to-out.mjs`) auch
`server/` nach `out/server/` kopiert - `out/` entspricht danach 1:1 dem fertigen Domain-
Wurzelverzeichnis (ohne `server/config.php` und ohne Upload-Laufzeitdaten, siehe nächster Abschnitt).
Für den Upload muss also **nichts mehr verschoben werden**: einfach der komplette Inhalt von `out/`
hochladen.

### Production-artig lokal testen (empfohlen vor jedem Deploy)

Simuliert das echte Kasserver-Setup: Next-Export und `server/` auf demselben Ursprung, kein CORS nötig.

```bash
npm run build                   # erzeugt out/ inkl. out/server/
cp server/config.php out/server/config.php   # lokale Testkonfiguration ergänzen
cd out && php -S localhost:8090
# http://localhost:8090/ öffnen
```

Weitere Skripte: `npm run typecheck`, `npm run lint`.

## Deployment auf dem Kasserver

1. `npm run build` lokal ausführen → `out/` enthält danach die komplette Seite inkl. `server/`.
2. Kompletten Inhalt von `out/` per FTP/SFTP in das Hauptverzeichnis (Domain-Wurzel) hochladen -
   **ein einziger Upload-Vorgang, keine Ordner verschieben.**
3. `server/config.example.php` auf dem Server nach `server/config.php` kopieren und ausfüllen
   (DB-Zugang aus KAS, Claude-API-Key, `CRON_SECRET`, `SIGNATURE_ENCRYPTION_KEY`) - diese Datei ist
   bewusst nicht im Build enthalten (Geheimnisse) und muss einmalig direkt auf dem Server angelegt
   oder gezielt per FTP nach `server/config.php` hochgeladen werden.
4. `server/schema.sql` einmalig gegen die MySQL-Datenbank ausführen (phpMyAdmin in KAS oder
   `mysql -u <dbname> -p <dbname> < server/schema.sql`).
5. Ersten Admin-Account anlegen: `php server/seed.php admin@example.com "IhrPasswort"` per SSH,
   oder per phpMyAdmin manuell einen `mitarbeiter`-Datensatz einfügen (Passwort-Hash lässt sich
   lokal mit `php -r 'echo password_hash("...", PASSWORD_DEFAULT);'` erzeugen).
6. In KAS unter "Cronjobs" einen täglichen Job einrichten, der den Löschjob aufruft:
   ```bash
   curl -X POST https://IHR-DOMAIN/server/api/cron/loeschung.php \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
7. `server/uploads/` muss für den Webserver-Nutzer beschreibbar sein (Standard bei Kasserver-Hosting
   i.d.R. gegeben).

Bei jedem Code-Update: Schritt 1–2 wiederholen (nur den Inhalt von `out/` neu hochladen -
`server/config.php` und `server/uploads/` auf dem Server bleiben dabei unangetastet, da sie nicht
Teil des Builds sind).

## API-Routen (server/api/)

| Route | Methode | Zweck |
|---|---|---|
| `auth/login.php` | POST | Login, liefert Bearer-Token (7 Tage gültig) |
| `auth/logout.php` | POST | Aktuelle Sitzung widerrufen |
| `auth/session.php` | GET | Aktuellen Mitarbeiter abfragen |
| `ocr/fuehrerschein.php` | POST | Fotos an Claude Vision senden, strukturierte Felder zurück |
| `kunden/suche.php` | GET | Kundensuche (Name/FS-Nummer) |
| `kunden/anlegen.php` | POST | Neuen Kunden anlegen |
| `kunden/get.php` | GET | Kunde inkl. Verlauf laden |
| `kunden/aktualisieren.php` | POST | Kunde aktualisieren |
| `fahrzeuge/liste.php` | GET | Fahrzeugliste (optional `?verfuegbar=true`) |
| `fahrzeuge/anlegen.php` | POST | Fahrzeug anlegen (Admin) |
| `vermietungen/suche.php` | GET | Vermietungen suchen |
| `vermietungen/anlegen.php` | POST | Neue Vermietung anlegen |
| `vermietungen/ruecknahme.php` | POST | Rückgabe erfassen |
| `dateien.php` | GET | Zustandsfoto/Unterschrift ausliefern (nur angemeldet) |
| `admin/mitarbeiter-liste.php` | GET | Mitarbeiterliste |
| `admin/mitarbeiter-anlegen.php` | POST | Mitarbeiter anlegen |
| `admin/mitarbeiter-aktualisieren.php` | POST | Aktivieren/Deaktivieren/Rolle ändern |
| `admin/sessions-liste.php` | GET | Aktive Geräte/Sessions |
| `admin/sessions-abmelden.php` | POST | Gerät abmelden |
| `admin/audit-log.php` | GET | Audit-Log (paginiert) |
| `admin/export.php` | POST | DSGVO-Auskunft |
| `admin/loeschen.php` | POST | Manuelle Löschung auf Anfrage |
| `cron/loeschung.php` | POST | Täglicher Löschjob (Bearer `CRON_SECRET`) |

## Sicherheits-/DSGVO-Hinweise für den Produktivbetrieb

- **AVV**: Mit dem Hosting-Anbieter und mit Anthropic (Claude API) muss ein
  Auftragsverarbeitungsvertrag abgeschlossen werden, bevor produktive Führerscheindaten verarbeitet
  werden (Briefing Abschnitt 9).
- **TLS**: Kasserver stellt HTTPS bereit - sicherstellen, dass die Domain darüber läuft und HTTP auf
  HTTPS umleitet.
- **Bearer-Token statt Cookie**: Der Session-Token liegt im `localStorage` (nicht httpOnly, da
  clientseitig aus einer statischen Seite heraus gesendet). Ein XSS auf derselben Origin könnte ihn
  auslesen - daher: keine Fremd-Skripte einbinden, CSP über `.htaccess`/Meta-Tag erwägen.
- **Verschlüsselung at rest**: Die digitale Unterschrift ist AES-256-GCM-verschlüsselt
  (`server/lib/crypto.php`) mit `SIGNATURE_ENCRYPTION_KEY`. Für die Datenbank selbst hängt
  Verschlüsselung at rest vom Kasserver-Hosting ab (i.d.R. keine eigene Kontrolle darüber, ähnlich wie
  bei anderen Shared-Hosting-Angeboten).
- **Führerschein-Rohfotos** werden serverseitig nie persistiert (`server/lib/ocr.php`) und
  client-seitig nach der Sichtprüfung verworfen.
- **Aufbewahrungsfrist**: `RETENTION_MONTHS` in `server/config.php` (Standard 12) ist vom Betrieb
  festzulegen (Briefing Abschnitt 8 nennt 6–12 Monate als Richtwert).
- **Backups**: Automatisiertes tägliches Backup der Datenbank (KAS bietet Backup-Funktionen),
  getrennt vom Produktivsystem gespeichert (Briefing Abschnitt 7).

## Bewusste Vereinfachungen (siehe Abschnitt 10 des Briefings)

Nicht enthalten: Dashboard aktuell verliehener Fahrzeuge, automatische Erinnerung bei überfälliger
Rückgabe, Buchhaltungs-Export. Die Führerschein-Klassen-Prüfung
(`server/lib/fuehrerscheinklassen.php`) ist eine vereinfachte Warnhinweis-Heuristik, keine
rechtsverbindliche Prüfung.
