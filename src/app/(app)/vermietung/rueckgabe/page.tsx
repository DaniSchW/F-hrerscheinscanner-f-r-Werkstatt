"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Treffer = {
  id: string;
  ausgabeDatum: string;
  kunde: { vorname: string; nachname: string };
  fahrzeug: { kennzeichen: string; bezeichnung: string };
};

export default function RueckgabeSuchePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<Treffer[]>([]);
  const [ladend, setLadend] = useState(false);

  async function suchen(wert: string) {
    setQ(wert);
    if (wert.trim().length < 2) {
      setTreffer([]);
      return;
    }
    setLadend(true);
    try {
      const res = await fetch(`/api/vermietungen?laufend=true&q=${encodeURIComponent(wert)}`);
      const data = await res.json();
      setTreffer(data.vermietungen ?? []);
    } finally {
      setLadend(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Rückgabe erfassen</h1>
      <input
        className="field-input"
        placeholder="Kennzeichen oder Kundenname…"
        value={q}
        onChange={(e) => suchen(e.target.value)}
      />
      {ladend && <p className="text-slate-500">Suche läuft…</p>}
      <ul className="space-y-2">
        {treffer.map((v) => (
          <li key={v.id}>
            <button
              className="card block w-full text-left hover:border-brand-500"
              onClick={() => router.push(`/vermietung/${v.id}/ruecknahme`)}
            >
              <p className="font-semibold">
                {v.fahrzeug.kennzeichen} · {v.fahrzeug.bezeichnung}
              </p>
              <p className="text-base text-slate-500">
                {v.kunde.vorname} {v.kunde.nachname} · seit{" "}
                {new Date(v.ausgabeDatum).toLocaleDateString("de-DE")}
              </p>
            </button>
          </li>
        ))}
        {!ladend && q.trim().length >= 2 && treffer.length === 0 && (
          <p className="text-slate-500">Keine laufenden Vermietungen gefunden.</p>
        )}
      </ul>
    </div>
  );
}
