"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AKTIVITAETS_EREIGNISSE = ["mousedown", "touchstart", "keydown", "wheel"] as const;

/**
 * Sperrt den Bildschirm nach Inaktivität (Abschnitt 2 des Briefings).
 * Das Sitzungs-Cookie bleibt gültig – zum Fortsetzen ist kein erneuter
 * Passwort-Login nötig, nur eine bewusste Bestätigung, damit niemand an
 * einem unbeaufsichtigten Tablet weiterarbeiten kann.
 */
export function InactivityGuard({
  timeoutMinutes,
  mitarbeiterName,
  children
}: {
  timeoutMinutes: number;
  mitarbeiterName: string;
  children: React.ReactNode;
}) {
  const [gesperrt, setGesperrt] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const timerZuruecksetzen = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setGesperrt(true), timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes]);

  useEffect(() => {
    timerZuruecksetzen();
    const handler = () => {
      if (!gesperrt) timerZuruecksetzen();
    };
    AKTIVITAETS_EREIGNISSE.forEach((ev) => window.addEventListener(ev, handler));
    return () => {
      AKTIVITAETS_EREIGNISSE.forEach((ev) => window.removeEventListener(ev, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gesperrt, timerZuruecksetzen]);

  async function fortsetzen() {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    if (!data.mitarbeiter) {
      router.replace("/login");
      return;
    }
    setGesperrt(false);
    timerZuruecksetzen();
  }

  return (
    <>
      {children}
      {gesperrt && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-900/95 px-6 text-center text-white">
          <p className="text-tresen-xl font-semibold">Bildschirm gesperrt</p>
          <p className="text-tresen-lg">Angemeldet als {mitarbeiterName}</p>
          <button onClick={fortsetzen} className="btn-primary max-w-xs">
            Weiter
          </button>
        </div>
      )}
    </>
  );
}
