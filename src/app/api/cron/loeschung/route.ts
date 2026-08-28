import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { faelligeDatenLoeschen } from "@/lib/loeschung";
import { toErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";

/**
 * Täglicher Löschjob (Abschnitt 8 des Briefings). Wird von einem externen
 * Cronjob aufgerufen, z.B.:
 *   curl -X POST https://IHR-HOST/api/cron/loeschung -H "Authorization: Bearer $CRON_SECRET"
 * Kein Nutzer-Login nötig, dafür ein geheimes Bearer-Token, das nur der
 * Cronjob kennt (CRON_SECRET in der Umgebung).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ fehler: "Nicht autorisiert." }, { status: 401 });
    }
    const ergebnis = await faelligeDatenLoeschen({
      ausgeloestVon: "automatische_loeschung",
      mitarbeiterId: null
    });
    return NextResponse.json(ergebnis);
  } catch (error) {
    return toErrorResponse(error);
  }
}
