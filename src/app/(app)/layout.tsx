import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAuth } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { LogoutButton } from "@/components/LogoutButton";
import { InactivityGuard } from "@/components/InactivityGuard";
import { OfflineWarteschlangenHinweis } from "@/components/OfflineWarteschlangenHinweis";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect("/login");
  }

  return (
    <InactivityGuard timeoutMinutes={env.inactivityTimeoutMinutes} mitarbeiterName={auth.mitarbeiter.name}>
      <div className="min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand-700">
            Führerscheinscanner
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-base text-slate-600 sm:inline">
              {auth.mitarbeiter.name}
              {auth.mitarbeiter.rolle === "admin" && (
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-sm text-brand-700">
                  Admin
                </span>
              )}
            </span>
            {auth.mitarbeiter.rolle === "admin" && (
              <Link
                href="/admin"
                className="min-h-touch rounded-xl border-2 border-brand-500 px-4 py-2 text-base font-medium text-brand-700 hover:bg-brand-50"
              >
                Admin
              </Link>
            )}
            <LogoutButton />
          </div>
        </header>
        <OfflineWarteschlangenHinweis />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </div>
    </InactivityGuard>
  );
}
