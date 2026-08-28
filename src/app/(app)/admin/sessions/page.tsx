"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { parseMysqlDatetime } from "@/lib/datum";

type SessionEintrag = {
  id: string;
  geraet_label: string | null;
  ip_adresse: string | null;
  erstellt_am: string;
  zuletzt_aktiv_am: string;
  ablauf_am: string;
  mitarbeiter_id: string;
  mitarbeiter_name: string;
  mitarbeiter_email: string;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionEintrag[]>([]);

  async function laden() {
    const data = await apiFetch<{ sessions: SessionEintrag[] }>("/admin/sessions-liste.php");
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    // Einmaliges Laden der Liste beim Mount - kein Race-Condition-Risiko in dieser Admin-Seite.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    laden();
  }, []);

  async function abmelden(id: string) {
    await apiFetch("/admin/sessions-abmelden.php", { body: { id } });
    laden();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Aktive Geräte/Sessions</h1>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{s.mitarbeiter_name}</p>
              <p className="text-base text-slate-500">{s.geraet_label ?? "Unbekanntes Gerät"}</p>
              <p className="text-sm text-slate-400">
                Zuletzt aktiv: {parseMysqlDatetime(s.zuletzt_aktiv_am).toLocaleString("de-DE")}
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
