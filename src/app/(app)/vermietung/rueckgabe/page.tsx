"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { parseMysqlDatetime } from "@/lib/datum";

type Treffer = {
  id: string;
  ausgabe_datum: string;
  kunde_vorname: string;
  kunde_nachname: string;
  fahrzeug_kennzeichen: string;
  fahrzeug_bezeichnung: string;
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
      const data = await apiFetch<{ vermietungen: Treffer[] }>(
        `/vermietungen/suche.php?laufend=true&q=${encodeURIComponent(wert)}`
      );
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
              onClick={() => router.push(`/vermietung/ruecknahme?id=${v.id}`)}
            >
              <p className="font-semibold">
                {v.fahrzeug_kennzeichen} · {v.fahrzeug_bezeichnung}
              </p>
              <p className="text-base text-slate-500">
                {v.kunde_vorname} {v.kunde_nachname} · seit{" "}
                {parseMysqlDatetime(v.ausgabe_datum).toLocaleDateString("de-DE")}
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
