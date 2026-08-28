import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAuth } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCurrentAuth();
  if (!auth || auth.mitarbeiter.rolle !== "admin") {
    redirect("/");
  }

  const links = [
    { href: "/admin", label: "Übersicht" },
    { href: "/admin/mitarbeiter", label: "Mitarbeiter" },
    { href: "/admin/fahrzeuge", label: "Fahrzeuge" },
    { href: "/admin/sessions", label: "Geräte/Sessions" },
    { href: "/admin/audit-log", label: "Audit-Log" },
    { href: "/admin/export", label: "Export/Löschung" }
  ];

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="min-h-touch rounded-xl border-2 border-brand-500 px-4 py-2 text-base font-medium text-brand-700 hover:bg-brand-50"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
