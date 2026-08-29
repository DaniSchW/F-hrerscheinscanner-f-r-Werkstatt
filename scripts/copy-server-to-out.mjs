#!/usr/bin/env node
/**
 * Läuft automatisch nach `next build` (npm "postbuild"-Hook) und kopiert
 * server/ nach out/server/, sodass out/ danach 1:1 dem fertigen Domain-
 * Wurzelverzeichnis entspricht - beim Deployment muss dann nichts mehr
 * verschoben werden, nur noch der komplette Inhalt von out/ hochgeladen
 * werden.
 *
 * Bewusst NICHT mitkopiert:
 * - server/config.php (enthält Geheimnisse, gehört nicht in einen
 *   wiederholt neu gebauten Ordner - einmalig direkt auf dem Server anlegen
 *   oder gezielt manuell nach out/server/config.php kopieren)
 * - server/uploads/* (Laufzeit-Daten des jeweiligen Servers, nicht Teil
 *   eines Builds) - außer .htaccess/.gitkeep, die den Ordner initial anlegen
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const quelle = path.join(root, "server");
const ziel = path.join(root, "out", "server");

const ausgeschlossenePfade = new Set([
  path.join(quelle, "config.php")
]);

function istUploadsInhalt(pfad) {
  const relativ = path.relative(path.join(quelle, "uploads"), pfad);
  return !relativ.startsWith("..") && relativ !== "";
}

function kopieren(von, nach) {
  if (ausgeschlossenePfade.has(von)) return;
  if (istUploadsInhalt(von) && !von.endsWith(".htaccess") && !von.endsWith(".gitkeep")) return;

  const stat = fs.statSync(von);
  if (stat.isDirectory()) {
    fs.mkdirSync(nach, { recursive: true });
    for (const eintrag of fs.readdirSync(von)) {
      kopieren(path.join(von, eintrag), path.join(nach, eintrag));
    }
  } else {
    fs.mkdirSync(path.dirname(nach), { recursive: true });
    fs.copyFileSync(von, nach);
  }
}

if (!fs.existsSync(path.join(root, "out"))) {
  console.error('out/ fehlt - erst "next build" laufen lassen.');
  process.exit(1);
}

fs.rmSync(ziel, { recursive: true, force: true });
kopieren(quelle, ziel);
console.log("server/ wurde nach out/server/ kopiert (ohne config.php und uploads-Inhalte).");
