"use client";

import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { INACTIVITY_TIMEOUT_MINUTES } from "@/lib/config";
import { InactivityGuard } from "@/components/InactivityGuard";
import { OfflineWarteschlangenHinweis } from "@/components/OfflineWarteschlangenHinweis";

function AppShell({ children }: { children: React.ReactNode }) {
  const { mitarbeiter, ladend, abmelden } = useAuth();

  if (ladend) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Wird geladen…
      </div>
    );
  }

  if (!mitarbeiter) {
    // AuthProvider leitet bereits zu /login um - hier nichts rendern.
    return null;
  }

  return (
    <InactivityGuard timeoutMinutes={INACTIVITY_TIMEOUT_MINUTES} mitarbeiterName={mitarbeiter.name}>
      <div className="min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand-700">
            Führerscheinscanner
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-base text-slate-600 sm:inline">
              {mitarbeiter.name}
              {mitarbeiter.rolle === "admin" && (
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-sm text-brand-700">Admin</span>
              )}
            </span>
            {mitarbeiter.rolle === "admin" && (
              <Link
                href="/admin"
                className="min-h-touch rounded-xl border-2 border-brand-500 px-4 py-2 text-base font-medium text-brand-700 hover:bg-brand-50"
              >
                Admin
              </Link>
            )}
            <button
              onClick={abmelden}
              className="min-h-touch rounded-xl border-2 border-slate-300 px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-100"
            >
              Abmelden
            </button>
          </div>
        </header>
        <OfflineWarteschlangenHinweis />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </div>
    </InactivityGuard>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
