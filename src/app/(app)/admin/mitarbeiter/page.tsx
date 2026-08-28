"use client";

import { useEffect, useState } from "react";

type MitarbeiterEintrag = {
  id: string;
  name: string;
  email: string;
  rolle: "mitarbeiter" | "admin";
  aktiv: boolean;
};

export default function MitarbeiterverwaltungPage() {
  const [liste, setListe] = useState<MitarbeiterEintrag[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [rolle, setRolle] = useState<"mitarbeiter" | "admin">("mitarbeiter");
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    const res = await fetch("/api/admin/mitarbeiter");
    const data = await res.json();
    setListe(data.mitarbeiter ?? []);
  }

  useEffect(() => {
    // Einmaliges Laden der Liste beim Mount - kein Race-Condition-Risiko in dieser Admin-Seite.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    laden();
  }, []);

  async function anlegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    const res = await fetch("/api/admin/mitarbeiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, passwort, rolle })
    });
    const data = await res.json();
    if (!res.ok) {
      setFehler(data.fehler ?? "Anlegen fehlgeschlagen.");
      return;
    }
    setName("");
    setEmail("");
    setPasswort("");
    setRolle("mitarbeiter");
    laden();
  }

  async function statusAendern(id: string, aktiv: boolean) {
    await fetch(`/api/admin/mitarbeiter/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktiv })
    });
    laden();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-tresen-xl font-bold text-brand-700">Mitarbeiterverwaltung</h1>

      <form onSubmit={anlegen} className="card space-y-3">
        <h2 className="font-semibold">Neuen Mitarbeiter anlegen</h2>
        {fehler && <p className="text-danger-500">{fehler}</p>}
        <input className="field-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          className="field-input"
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field-input"
          type="password"
          placeholder="Initialpasswort (min. 8 Zeichen)"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          required
        />
        <select
          className="field-input"
          value={rolle}
          onChange={(e) => setRolle(e.target.value as "mitarbeiter" | "admin")}
        >
          <option value="mitarbeiter">Mitarbeiter</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn-primary">
          Anlegen
        </button>
      </form>

      <ul className="space-y-2">
        {liste.map((m) => (
          <li key={m.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {m.name} {!m.aktiv && <span className="text-danger-500">(deaktiviert)</span>}
              </p>
              <p className="text-base text-slate-500">
                {m.email} · {m.rolle}
              </p>
            </div>
            <button
              className={m.aktiv ? "btn-danger max-w-fit px-4" : "btn-secondary max-w-fit px-4"}
              onClick={() => statusAendern(m.id, !m.aktiv)}
            >
              {m.aktiv ? "Deaktivieren" : "Aktivieren"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
