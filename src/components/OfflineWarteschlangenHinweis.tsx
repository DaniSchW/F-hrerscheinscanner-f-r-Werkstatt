"use client";

import { useEffect, useState } from "react";
import { warteschlangeLesen, warteschlangeVerarbeiten } from "@/lib/offlineQueue";

/** Zeigt an, wenn Führerschein-Erkennungen wegen fehlender Verbindung noch ausstehen. */
export function OfflineWarteschlangenHinweis() {
  const [anzahl, setAnzahl] = useState(0);

  useEffect(() => {
    let abgebrochen = false;

    async function aktualisieren() {
      try {
        const eintraege = await warteschlangeLesen();
        if (!abgebrochen) setAnzahl(eintraege.length);
      } catch {
        // IndexedDB evtl. nicht verfügbar (z.B. privater Modus) - Hinweis einfach ausblenden
      }
    }

    async function versuchen() {
      await warteschlangeVerarbeiten().catch(() => undefined);
      await aktualisieren();
    }

    aktualisieren();
    window.addEventListener("online", versuchen);
    const interval = setInterval(versuchen, 60_000);
    return () => {
      abgebrochen = true;
      window.removeEventListener("online", versuchen);
      clearInterval(interval);
    };
  }, []);

  if (anzahl === 0) return null;

  return (
    <div className="bg-warn-500 px-4 py-2 text-center text-base text-white">
      {anzahl} Führerschein-Erfassung(en) warten auf Internetverbindung zur Verarbeitung.
    </div>
  );
}
