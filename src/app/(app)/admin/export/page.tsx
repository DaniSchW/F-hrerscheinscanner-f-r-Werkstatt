"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ExportLoeschungPage() {
  const [suchbegriff, setSuchbegriff] = useState("");
  const [treffer, setTreffer] = useState<{ id: string; vorname: string; nachname: string }[]>([]);
  const [ausgewaehlt, setAusgewaehlt] = useState<{ id: string; vorname: string; nachname: string } | null>(null);
  const [exportDaten, setExportDaten] = useState<unknown | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);

  async function suchen(wert: string) {
    setSuchbegriff(wert);
    setExportDaten(null);
    setAusgewaehlt(null);
    if (wert.trim().length < 2) {
      setTreffer([]);
      return;
    }
    const data = await apiFetch<{ kunden: { id: string; vorname: string; nachname: string }[] }>(
      `/kunden/suche.php?q=${encodeURIComponent(wert)}`
    );
    setTreffer(data.kunden ?? []);
  }

  async function exportieren(kunde: { id: string; vorname: string; nachname: string }) {
    setAusgewaehlt(kunde);
    setMeldung(null);
    try {
      const data = await apiFetch<{ kunde: unknown }>("/admin/export.php", { body: { kundeId: kunde.id } });
      setExportDaten(data.kunde);
    } catch (err) {
      setExportDaten(null);
      setMeldung(err instanceof Error ? err.message : "Export fehlgeschlagen.");
    }
  }

  async function loeschen() {
    if (!ausgewaehlt) return;
    if (!confirm(`Alle Führerschein-/Kundendaten von ${ausgewaehlt.vorname} ${ausgewaehlt.nachname} jetzt löschen?`)) {
      return;
    }
    try {
      const data = await apiFetch<{ kundenAnonymisiert: number }>("/admin/loeschen.php", {
        body: { kundeId: ausgewaehlt.id }
      });
      setMeldung(
        `Löschung ausgeführt (${data.kundenAnonymisiert} Kunde(n) anonymisiert). Hinweis: Ein aktiver Rechtsstreit-Hold verhindert die Löschung einzelner Vermietungen.`
      );
      setExportDaten(null);
    } catch (err) {
      setMeldung(err instanceof Error ? err.message : "Löschung fehlgeschlagen.");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Export/Löschung (DSGVO)</h1>
      <p className="text-slate-600">
        Für Betroffenenrechte (Auskunft, Löschung) auf Anfrage eines Kunden. Die automatische Löschung
        nach Ablauf der Aufbewahrungsfrist läuft unabhängig davon über den täglichen Löschjob.
      </p>
      <input
        className="field-input"
        placeholder="Kunde suchen…"
        value={suchbegriff}
        onChange={(e) => suchen(e.target.value)}
      />
      <ul className="space-y-2">
        {treffer.map((k) => (
          <li key={k.id}>
            <button className="card block w-full text-left" onClick={() => exportieren(k)}>
              {k.vorname} {k.nachname}
            </button>
          </li>
        ))}
      </ul>

      {meldung && <p className="rounded-xl bg-brand-50 p-3 text-brand-700">{meldung}</p>}

      {exportDaten !== null && ausgewaehlt && (
        <div className="card space-y-3">
          <p className="font-semibold">Exportierte Daten – {ausgewaehlt.vorname} {ausgewaehlt.nachname}</p>
          <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-3 text-sm text-slate-100">
            {JSON.stringify(exportDaten, null, 2)}
          </pre>
          <button className="btn-danger" onClick={loeschen}>
            Daten dieses Kunden jetzt löschen
          </button>
        </div>
      )}
    </div>
  );
}
