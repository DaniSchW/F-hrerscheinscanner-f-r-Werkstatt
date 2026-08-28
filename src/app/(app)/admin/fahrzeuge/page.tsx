"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type FahrzeugEintrag = {
  id: string;
  kennzeichen: string;
  bezeichnung: string;
  benoetigte_fuehrerscheinklasse: string;
  status: string;
};

export default function FahrzeugverwaltungPage() {
  const [liste, setListe] = useState<FahrzeugEintrag[]>([]);
  const [kennzeichen, setKennzeichen] = useState("");
  const [bezeichnung, setBezeichnung] = useState("");
  const [klasse, setKlasse] = useState("B");
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    const data = await apiFetch<{ fahrzeuge: FahrzeugEintrag[] }>("/fahrzeuge/liste.php");
    setListe(data.fahrzeuge ?? []);
  }

  useEffect(() => {
    // Einmaliges Laden der Liste beim Mount - kein Race-Condition-Risiko in dieser Admin-Seite.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    laden();
  }, []);

  async function anlegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    try {
      await apiFetch("/fahrzeuge/anlegen.php", {
        body: { kennzeichen, bezeichnung, benoetigteFuehrerscheinklasse: klasse }
      });
      setKennzeichen("");
      setBezeichnung("");
      setKlasse("B");
      laden();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Anlegen fehlgeschlagen.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-tresen-xl font-bold text-brand-700">Fahrzeugverwaltung</h1>

      <form onSubmit={anlegen} className="card space-y-3">
        <h2 className="font-semibold">Neues Fahrzeug anlegen</h2>
        {fehler && <p className="text-danger-500">{fehler}</p>}
        <input
          className="field-input"
          placeholder="Kennzeichen"
          value={kennzeichen}
          onChange={(e) => setKennzeichen(e.target.value)}
          required
        />
        <input
          className="field-input"
          placeholder="Bezeichnung (z.B. VW Transporter)"
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          required
        />
        <input
          className="field-input"
          placeholder="Benötigte Führerscheinklasse (z.B. B, BE, C1)"
          value={klasse}
          onChange={(e) => setKlasse(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary">
          Anlegen
        </button>
      </form>

      <ul className="space-y-2">
        {liste.map((f) => (
          <li key={f.id} className="card">
            <p className="font-semibold">{f.kennzeichen}</p>
            <p className="text-base text-slate-500">
              {f.bezeichnung} · Klasse {f.benoetigte_fuehrerscheinklasse} · {f.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
