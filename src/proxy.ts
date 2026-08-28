import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookieName";

// Öffentliche Pfade, die ohne Sitzungs-Cookie erreichbar sein müssen.
// /api/cron/* prüft seine eigene Bearer-Token-Autorisierung (CRON_SECRET),
// nicht das Sitzungs-Cookie - siehe src/app/api/cron/loeschung/route.ts.
const OEFFENTLICHE_PFADE = ["/login", "/api/auth/login", "/api/cron", "/manifest.json", "/sw.js"];

/**
 * Schneller Vorab-Check anhand des Cookies (Edge-Runtime, kein DB-Zugriff möglich).
 * Die eigentliche Prüfung von Gültigkeit/Rolle erfolgt serverseitig in den
 * Layouts/Routen über getCurrentAuth()/requireMitarbeiter(), da Prisma dort
 * in der Node-Runtime läuft.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const istOeffentlich =
    OEFFENTLICHE_PFADE.some((pfad) => pathname === pfad || pathname.startsWith(pfad + "/")) ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/");

  if (istOeffentlich) {
    return NextResponse.next();
  }

  const hatCookie = req.cookies.has(SESSION_COOKIE);
  if (!hatCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("weiter", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"]
};
