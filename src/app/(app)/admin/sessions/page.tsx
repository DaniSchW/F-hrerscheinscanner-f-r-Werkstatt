"use client";

import { useEffect, useState } from "react";

type SessionEintrag = {
  id: string;
  geraetLabel: string | null;
  ipAdresse: string | null;
  erstelltAm: string;
  zuletztAktivAm: string;
  ablaufAm: string;
  mitarbeiter: { id: string; name: string; email: string };
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionEintrag[]>([]);

  async function laden() {
    const res = await fetch("/api/admin/sessions");
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    // Einmaliges Laden der Liste beim Mount - kein Race-Condition-Risiko in dieser Admin-Seite.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    laden();
  }, []);

  async function abmelden(id: string) {
    await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    laden();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Aktive Geräte/Sessions</h1>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{s.mitarbeiter.name}</p>
              <p className="text-base text-slate-500">{s.geraetLabel ?? "Unbekanntes Gerät"}</p>
              <p className="text-sm text-slate-400">
                Zuletzt aktiv: {new Date(s.zuletztAktivAm).toLocaleString("de-DE")}
              </p>
            </div>
            <button className="btn-danger max-w-fit px-4" onClick={() => abmelden(s.id)}>
              Gerät abmelden
            </button>
          </li>
        ))}
        {sessions.length === 0 && <p className="text-slate-500">Keine aktiven Sitzungen.</p>}
      </ul>
    </div>
  );
}
