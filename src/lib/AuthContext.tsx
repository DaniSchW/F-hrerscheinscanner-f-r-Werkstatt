"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken, getToken } from "@/lib/api";

export type Mitarbeiter = { id: string; name: string; rolle: "mitarbeiter" | "admin" };

type AuthState = {
  mitarbeiter: Mitarbeiter | null;
  ladend: boolean;
  neuLaden: () => Promise<void>;
  abmelden: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Ersetzt die frühere serverseitige Session-Prüfung (getCurrentAuth() in
 * Next.js-Layouts): läuft clientseitig, da die App als statischer Export
 * ausgeliefert wird. Leitet zu /login um, wenn kein gültiger Bearer-Token
 * (mehr) vorhanden ist.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter | null>(null);
  const [ladend, setLadend] = useState(true);

  async function neuLaden() {
    if (!getToken()) {
      setMitarbeiter(null);
      setLadend(false);
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ mitarbeiter: Mitarbeiter | null }>("/auth/session.php");
      setMitarbeiter(data.mitarbeiter);
      if (!data.mitarbeiter) {
        clearToken();
        router.replace("/login");
      }
    } catch {
      setMitarbeiter(null);
      router.replace("/login");
    } finally {
      setLadend(false);
    }
  }

  async function abmelden() {
    await apiFetch("/auth/logout.php", { method: "POST" }).catch(() => undefined);
    clearToken();
    setMitarbeiter(null);
    router.replace("/login");
  }

  useEffect(() => {
    // Einmalige Session-Prüfung beim Mount - kein Race-Condition-Risiko.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    neuLaden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ mitarbeiter, ladend, neuLaden, abmelden }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von <AuthProvider> verwendet werden.");
  return ctx;
}
