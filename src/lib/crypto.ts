import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM für die Unterschrift (per Briefing "verschlüsselt gespeichert").
 * SIGNATURE_ENCRYPTION_KEY muss ein 32-Byte-Schlüssel, Base64-kodiert, sein
 * (z.B. `openssl rand -base64 32`).
 */
function schluessel(): Buffer {
  const raw = process.env.SIGNATURE_ENCRYPTION_KEY;
  if (!raw) throw new Error("SIGNATURE_ENCRYPTION_KEY ist nicht gesetzt.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SIGNATURE_ENCRYPTION_KEY muss 32 Byte (Base64) lang sein.");
  }
  return key;
}

export function verschluesseln(daten: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", schluessel(), iv);
  const verschluesselt = Buffer.concat([cipher.update(daten), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, verschluesselt]);
}

export function entschluesseln(daten: Buffer): Buffer {
  const iv = daten.subarray(0, 12);
  const tag = daten.subarray(12, 28);
  const verschluesselt = daten.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", schluessel(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(verschluesselt), decipher.final()]);
}
