"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, setToken } from "@/lib/api";

function LoginFormular() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [angemeldetBleiben, setAngemeldetBleiben] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladend, setLadend] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLadend(true);
    try {
      const data = await apiFetch<{ token: string }>("/auth/login.php", { body: { email, passwort } });
      setToken(data.token, angemeldetBleiben);
      const ziel = params.get("weiter") ?? "/";
      router.replace(ziel);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLadend(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={absenden} className="card w-full max-w-sm space-y-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Firmenlogo"
          className="mx-auto h-20 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <h1 className="text-tresen-xl font-bold text-brand-700 text-center">Anmelden</h1>
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
        <div>
          <label className="flex items-start gap-2 text-base text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={angemeldetBleiben}
              onChange={(e) => setAngemeldetBleiben(e.target.checked)}
            />
            <span>
              Angemeldet bleiben
              <span className="block text-sm text-slate-500">
                Sie bleiben auf diesem Gerät 7 Tage angemeldet, ohne sich erneut einloggen zu müssen. Ohne
                Haken werden Sie beim Schließen des Browsers abgemeldet.
              </span>
            </span>
          </label>
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
