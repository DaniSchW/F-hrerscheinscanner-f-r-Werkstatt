"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginFormular() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladend, setLadend] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLadend(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passwort })
      });
      const data = await res.json();
      if (!res.ok) {
        setFehler(data.fehler ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      const ziel = params.get("weiter") ?? "/";
      router.replace(ziel);
      router.refresh();
    } catch {
      setFehler("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLadend(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={absenden} className="card w-full max-w-sm space-y-5">
        <h1 className="text-tresen-xl font-bold text-brand-700">Anmelden</h1>
        <div>
          <label className="field-label" htmlFor="email">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="passwort">
            Passwort
          </label>
          <input
            id="passwort"
            type="password"
            required
            autoComplete="current-password"
            className="field-input"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
          />
        </div>
        {fehler && <p className="text-danger-500 font-medium">{fehler}</p>}
        <button type="submit" className="btn-primary" disabled={ladend}>
          {ladend ? "Wird angemeldet…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFormular />
    </Suspense>
  );
}
