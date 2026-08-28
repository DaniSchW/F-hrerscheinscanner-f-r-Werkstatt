# Führerscheinscanner – Fahrzeugverleih PWA

Interne Progressive Web App für die Fahrzeugausgabe/-rückgabe am Tresen: Führerschein-Erfassung per Foto
(automatische Datenextraktion via Claude Vision), Zustandsdokumentation, digitale Unterschrift und
DSGVO-konformes Löschkonzept. Für einen einzelnen Betrieb (kein Mandantensystem), nicht öffentlich
zugänglich.

Siehe das ursprüngliche Briefing für den fachlichen Hintergrund; dieses README dokumentiert die
konkrete Umsetzung.

## Tech-Stack

- **Frontend/Backend**: Next.js 16 (App Router, TypeScript), Tailwind CSS für große, tresen-taugliche
  Bedienelemente
- **Datenbank**: PostgreSQL via Prisma ORM (EU-hosten, z.B. Hetzner/IONOS)
- **Auth**: Eigene, DB-gestützte Cookie-Sessions (kein JWT) - dadurch kann ein Admin einzelne Geräte
  gezielt abmelden
- **Datenextraktion**: Anthropic Claude API (Vision, Tool-Use für strukturiertes JSON)
- **Dateien**: Zustandsfotos + verschlüsselte Unterschrift lokal unter `UPLOAD_DIR` (austauschbar gegen
  EU-Objektspeicher, siehe `src/lib/storage.ts`)
- **PWA**: `public/manifest.json` + `public/sw.js` (App-Shell-Cache, Offline-Warteschlange für die
  Führerschein-OCR via IndexedDB)

## Ordnerstruktur

```
prisma/
  schema.prisma          Datenmodell (Abschnitt 3 des Briefings)
  migrations/
  seed.ts                Admin-Account + Beispiel-Fahrzeuge für den Erststart
src/
  app/
    login/                Login-Seite (öffentlich)
    (app)/                 Alle Seiten hinter Login (Layout prüft Session + Inaktivitäts-Sperre)
      page.tsx             Startmaske
      vermietung/neu/       Neue-Vermietung-Assistent (Kunde → Foto/OCR → Sichtprüfung →
                             Fahrzeug → Zustand → Unterschrift → Abschluss)
      vermietung/rueckgabe/ Rückgabe suchen
      vermietung/[id]/ruecknahme/ Rückgabe erfassen
      kunden/               Kundensuche + -verlauf
      admin/                Nutzerverwaltung, Fahrzeuge, Geräte/Sessions, Audit-Log, Export/Löschung
    api/                   Alle REST-Routen (siehe unten)
  components/             Kamera-Aufnahme, Unterschrift-Pad, Inaktivitäts-Sperre, Offline-Hinweis
  lib/
    auth/                 Sessions, Passwort-Hashing, Route-Guards
    ocr/claude.ts          Claude-Vision-Aufruf für die Führerschein-Extraktion
    storage.ts             Datei-Adapter (lokal, austauschbar)
    crypto.ts               AES-256-GCM für die Unterschrift
    loeschung.ts            DSGVO-Löschlogik (automatisch + manuell)
    retention.ts            Berechnung des Löschdatums
    fuehrerscheinklassen.ts Warnhinweis-Heuristik Führerscheinklasse ↔ Fahrzeug
  proxy.ts                 Next.js Proxy/Middleware: schneller Cookie-Check, Login-Redirect
public/
  manifest.json, sw.js, offline.html, icons/
```

## API-Routen

| Route | Methode | Zweck |
|---|---|---|
| `/api/auth/login` | POST | Login, setzt Sitzungs-Cookie (7 Tage) |
| `/api/auth/logout` | POST | Aktuelle Sitzung widerrufen |
| `/api/auth/session` | GET | Aktuellen Mitarbeiter abfragen (u.a. für die Inaktivitäts-Sperre) |
| `/api/ocr/fuehrerschein` | POST | Fotos an Claude Vision senden, strukturierte Felder zurück |
| `/api/kunden` | GET/POST | Kundensuche / neuen Kunden anlegen |
| `/api/kunden/[id]` | GET/PATCH | Kunde inkl. Verlauf laden / aktualisieren |
| `/api/fahrzeuge` | GET/POST | Fahrzeugliste (optional `?verfuegbar=true`) / anlegen (Admin) |
| `/api/vermietungen` | GET/POST | Vermietungen suchen / neue Vermietung anlegen |
| `/api/vermietungen/[id]/ruecknahme` | POST | Rückgabe erfassen |
| `/api/dateien/[...pfad]` | GET | Zustandsfotos/Unterschrift ausliefern (nur angemeldet) |
| `/api/admin/mitarbeiter` | GET/POST | Mitarbeiterverwaltung |
| `/api/admin/mitarbeiter/[id]` | PATCH | Aktivieren/Deaktivieren/Rolle ändern |
| `/api/admin/sessions` | GET | Aktive Geräte/Sessions |
| `/api/admin/sessions/[id]` | DELETE | Gerät abmelden |
| `/api/admin/audit-log` | GET | Audit-Log (paginiert) |
| `/api/admin/export` | POST/DELETE | DSGVO-Auskunft / manuelle Löschung auf Anfrage |
| `/api/cron/loeschung` | POST | Täglicher Löschjob (Bearer-Token `CRON_SECRET`) |

## Lokale Einrichtung

Voraussetzungen: Node.js 20+, PostgreSQL (lokal via `docker-compose.yml` oder eine bestehende Instanz).

```bash
cp .env.example .env
# .env ausfüllen: DATABASE_URL, ANTHROPIC_API_KEY, CRON_SECRET, SIGNATURE_ENCRYPTION_KEY
#   openssl rand -hex 32      -> CRON_SECRET
#   openssl rand -base64 32   -> SIGNATURE_ENCRYPTION_KEY

docker compose up -d          # startet lokale PostgreSQL
npm install
npm run prisma:migrate        # Schema anwenden
npm run db:seed               # Admin-Account + Beispiel-Fahrzeuge anlegen
npm run dev                   # http://localhost:3000
```

Weitere Skripte: `npm run build`, `npm run typecheck`, `npm run lint`.

### Löschjob einrichten

`/api/cron/loeschung` muss täglich von einem externen Cronjob aufgerufen werden, z.B.:

```bash
curl -X POST https://IHR-HOST/api/cron/loeschung -H "Authorization: Bearer $CRON_SECRET"
```

## Sicherheits-/DSGVO-Hinweise für den Produktivbetrieb

- **AVV**: Mit dem Hosting-Anbieter und mit Anthropic (Claude API) muss ein
  Auftragsverarbeitungsvertrag abgeschlossen werden, bevor produktive Führerscheindaten verarbeitet
  werden (Abschnitt 9 des Briefings).
- **TLS**: Produktiv ausschließlich über HTTPS betreiben (z.B. Reverse Proxy mit Let's-Encrypt-Zertifikat).
- **Verschlüsselung at rest**: Die Datenbank sollte auf Infrastrukturebene verschlüsselt werden
  (z.B. verschlüsseltes Volume). Die digitale Unterschrift ist zusätzlich anwendungsseitig mit
  AES-256-GCM verschlüsselt.
- **Datei-Speicher**: `src/lib/storage.ts` schreibt standardmäßig lokal unter `UPLOAD_DIR`. Für den
  Produktivbetrieb gegen EU-Objektspeicher (z.B. Hetzner Object Storage, S3-kompatibel) austauschen -
  dafür ist bewusst nur dieses eine Modul zuständig.
- **Führerschein-Rohfotos** werden serverseitig nie persistiert (`src/lib/ocr/claude.ts`) und
  client-seitig nach der Sichtprüfung verworfen.
- **Aufbewahrungsfrist**: `RETENTION_MONTHS` (Standard 12) ist vom Betrieb festzulegen
  (Abschnitt 8 des Briefings nennt 6–12 Monate als Richtwert).
- **Backups**: Automatisiertes tägliches Backup der Datenbank, getrennt vom Produktivsystem
  gespeichert, ist Teil des Hosting-Setups und nicht Teil dieses Repos (Abschnitt 7 des Briefings).

## Bewusste Vereinfachungen (siehe Abschnitt 10 des Briefings)

Nicht enthalten: Dashboard aktuell verliehener Fahrzeuge, automatische Erinnerung bei überfälliger
Rückgabe, Buchhaltungs-Export. Die Führerschein-Klassen-Prüfung
(`src/lib/fuehrerscheinklassen.ts`) ist eine vereinfachte Warnhinweis-Heuristik, keine
rechtsverbindliche Prüfung.
