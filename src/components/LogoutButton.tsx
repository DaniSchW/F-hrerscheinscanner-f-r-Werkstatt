"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [ladend, setLadend] = useState(false);

  async function abmelden() {
    setLadend(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={abmelden}
      disabled={ladend}
      className="min-h-touch rounded-xl border-2 border-slate-300 px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-100"
    >
      Abmelden
    </button>
  );
}
