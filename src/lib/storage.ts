import "server-only";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Lokaler Datei-Adapter für dauerhaft zu speichernde Dateien
 * (Zustandsfotos, verschlüsselte Unterschrift). Für den Produktivbetrieb
 * gegen EU-Objektspeicher (z.B. Hetzner Object Storage, S3-kompatibel)
 * austauschen - dafür ist bewusst nur dieses Modul zuständig.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function sichererPfad(relativePfad: string): string {
  // turbopackIgnore: Laufzeit-Datenverzeichnis, nicht Teil des Build-Outputs -
  // soll nicht ins Server-Bundle getraced werden (self-hosted Deployment).
  const zielPfad = path.normalize(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, relativePfad));
  if (!zielPfad.startsWith(path.normalize(UPLOAD_DIR))) {
    throw new Error("Ungültiger Dateipfad.");
  }
  return zielPfad;
}

export async function dateiSpeichern(
  unterordner: string,
  daten: Buffer,
  dateiendung: string
): Promise<string> {
  const relativePfad = path.join(/* turbopackIgnore: true */ unterordner, `${randomUUID()}.${dateiendung}`);
  const zielPfad = sichererPfad(relativePfad);
  await mkdir(path.dirname(zielPfad), { recursive: true });
  await writeFile(zielPfad, daten);
  return relativePfad.split(path.sep).join("/");
}

export async function dateiLesen(relativePfad: string): Promise<Buffer> {
  return readFile(sichererPfad(relativePfad));
}

/** Löscht eine Datei endgültig (Löschkonzept, Abschnitt 8) - kein Fehler, falls bereits entfernt. */
export async function dateiLoeschen(relativePfad: string): Promise<void> {
  await rm(sichererPfad(relativePfad), { force: true });
}

export function dataUrlZuBuffer(dataUrl: string): { buffer: Buffer; mediaType: string } {
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Ungültige Data-URL.");
  return { buffer: Buffer.from(match[2]!, "base64"), mediaType: match[1]! };
}

export function dateiendungFuerMediaType(mediaType: string): string {
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/webp") return "webp";
  return "jpg";
}
