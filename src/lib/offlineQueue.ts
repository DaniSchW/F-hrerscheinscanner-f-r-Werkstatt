"use client";

import { apiFetch } from "@/lib/api";

/**
 * Offline-Warteschlange für die Führerschein-Datenextraktion (Abschnitt 6
 * des Briefings). Wird genutzt, wenn am Tresen kurzzeitig keine
 * Internetverbindung besteht: Das Foto wurde trotzdem aufgenommen, die
 * OCR-Anfrage wird lokal (IndexedDB) vorgehalten und automatisch erneut
 * gesendet, sobald wieder eine Verbindung besteht.
 */

export type WarteschlangenEintrag = {
  id: string;
  vorderseiteDataUrl: string;
  rueckseiteDataUrl: string | null;
  erstelltAm: string;
};

const DB_NAME = "fuehrerscheinscanner-offline";
const STORE = "ocr-warteschlange";

function oeffnenDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function zurWarteschlangeHinzufuegen(
  eintrag: Omit<WarteschlangenEintrag, "id" | "erstelltAm">
): Promise<string> {
  const db = await oeffnenDb();
  const id = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...eintrag, id, erstelltAm: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function warteschlangeLesen(): Promise<WarteschlangenEintrag[]> {
  const db = await oeffnenDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as WarteschlangenEintrag[]);
    request.onerror = () => reject(request.error);
  });
}

export async function ausWarteschlangeEntfernen(id: string): Promise<void> {
  const db = await oeffnenDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Versucht alle wartenden Einträge zu verarbeiten; gibt die Anzahl erfolgreich verarbeiteter zurück. */
export async function warteschlangeVerarbeiten(): Promise<number> {
  if (!navigator.onLine) return 0;
  const eintraege = await warteschlangeLesen();
  let erfolgreich = 0;
  for (const eintrag of eintraege) {
    try {
      await apiFetch("/ocr/fuehrerschein.php", {
        body: {
          vorderseiteDataUrl: eintrag.vorderseiteDataUrl,
          rueckseiteDataUrl: eintrag.rueckseiteDataUrl ?? undefined
        }
      });
      await ausWarteschlangeEntfernen(eintrag.id);
      erfolgreich += 1;
    } catch {
      // weiterhin offline oder Fehler - Eintrag bleibt in der Warteschlange
      break;
    }
  }
  return erfolgreich;
}
