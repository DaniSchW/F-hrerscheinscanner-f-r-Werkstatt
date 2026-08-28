"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type KundeTreffer = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  fuehrerschein_nummer: string;
};

export default function KundensuchePage() {
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<KundeTreffer[]>([]);
  const [ladend, setLadend] = useState(false);

  async function suchen(wert: string) {
    setQ(wert);
    if (wert.trim().length < 2) {
      setTreffer([]);
      return;
    }
    setLadend(true);
    try {
      const data = await apiFetch<{ kunden: KundeTreffer[] }>(`/kunden/suche.php?q=${encodeURIComponent(wert)}`);
      setTreffer(data.kunden ?? []);
    } finally {
      setLadend(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Kundensuche</h1>
      <input
        className="field-input"
        placeholder="Name oder Führerscheinnummer…"
        value={q}
        onChange={(e) => suchen(e.target.value)}
      />
      {ladend && <p className="text-slate-500">Suche läuft…</p>}
      <ul className="space-y-2">
        {treffer.map((k) => (
          <li key={k.id}>
            <Link href={`/kunden/detail?id=${k.id}`} className="card block hover:border-brand-500">
              <p className="font-semibold">
                {k.vorname} {k.nachname}
              </p>
              <p className="text-base text-slate-500">
                geb. {new Date(k.geburtsdatum).toLocaleDateString("de-DE")} · FS-Nr. {k.fuehrerschein_nummer}
              </p>
            </Link>
          </li>
        ))}
        {!ladend && q.trim().length >= 2 && treffer.length === 0 && (
          <p className="text-slate-500">Keine Kunden gefunden.</p>
        )}
      </ul>
    </div>
  );
}
