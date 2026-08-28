"use client";

import { useEffect, useState } from "react";

type Eintrag = {
  id: string;
  aktion: string;
  betroffeneEntitaetId: string | null;
  zeitstempel: string;
  mitarbeiter: { name: string } | null;
};

export default function AuditLogPage() {
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [seite, setSeite] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/audit-log?seite=${seite}`)
      .then((res) => res.json())
      .then((data) => setEintraege(data.eintraege ?? []));
  }, [seite]);

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Audit-Log</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 pr-3">Zeitpunkt</th>
              <th className="py-2 pr-3">Mitarbeiter</th>
              <th className="py-2 pr-3">Aktion</th>
              <th className="py-2 pr-3">Entität</th>
            </tr>
          </thead>
          <tbody>
            {eintraege.map((e) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="py-2 pr-3">{new Date(e.zeitstempel).toLocaleString("de-DE")}</td>
                <td className="py-2 pr-3">{e.mitarbeiter?.name ?? "–"}</td>
                <td className="py-2 pr-3">{e.aktion}</td>
                <td className="py-2 pr-3 text-slate-500">{e.betroffeneEntitaetId ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary max-w-fit px-4" disabled={seite <= 1} onClick={() => setSeite((s) => s - 1)}>
          Zurück
        </button>
        <button className="btn-secondary max-w-fit px-4" onClick={() => setSeite((s) => s + 1)}>
          Weiter
        </button>
      </div>
    </div>
  );
}
