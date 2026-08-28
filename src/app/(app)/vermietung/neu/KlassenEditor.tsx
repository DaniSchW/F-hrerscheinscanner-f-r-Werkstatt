"use client";

import type { FuehrerscheinKlasse } from "./types";

export function KlassenEditor({
  klassen,
  onAendern
}: {
  klassen: FuehrerscheinKlasse[];
  onAendern: (klassen: FuehrerscheinKlasse[]) => void;
}) {
  function zeileAendern(index: number, patch: Partial<FuehrerscheinKlasse>) {
    onAendern(klassen.map((k, i) => (i === index ? { ...k, ...patch } : k)));
  }

  function zeileEntfernen(index: number) {
    onAendern(klassen.filter((_, i) => i !== index));
  }

  function zeileHinzufuegen() {
    onAendern([...klassen, { klasse: "", ausstellungsdatum: null, ablaufdatum: null }]);
  }

  return (
    <div className="space-y-2">
      <p className="field-label">Führerscheinklassen</p>
      {klassen.map((k, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="field-input w-20"
            placeholder="Klasse"
            value={k.klasse}
            onChange={(e) => zeileAendern(i, { klasse: e.target.value })}
          />
          <input
            type="date"
            className="field-input"
            value={k.ausstellungsdatum ?? ""}
            onChange={(e) => zeileAendern(i, { ausstellungsdatum: e.target.value || null })}
          />
          <input
            type="date"
            className="field-input"
            value={k.ablaufdatum ?? ""}
            onChange={(e) => zeileAendern(i, { ablaufdatum: e.target.value || null })}
          />
          <button
            type="button"
            onClick={() => zeileEntfernen(i)}
            className="min-h-touch rounded-xl border-2 border-danger-500 px-3 text-danger-500"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={zeileHinzufuegen}>
        + Klasse hinzufügen
      </button>
    </div>
  );
}
