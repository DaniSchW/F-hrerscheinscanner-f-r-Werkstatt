import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { fuehrerscheinDatenExtrahieren } from "@/lib/ocr/claude";
import { toErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  vorderseiteDataUrl: z.string().startsWith("data:image/"),
  rueckseiteDataUrl: z.string().startsWith("data:image/").optional()
});

/**
 * Nimmt die Führerschein-Fotos entgegen, lässt sie von Claude Vision
 * strukturiert auslesen und gibt nur die extrahierten Felder zurück.
 * Die Fotos selbst werden serverseitig nicht persistiert - der Mitarbeiter
 * prüft die Felder anschließend im UI (Sichtprüfung, Abschnitt 4.3 Schritt 4)
 * und das Foto wird danach im Client verworfen.
 */
export async function POST(req: NextRequest) {
  try {
    await requireMitarbeiter(req);
    const body = requestSchema.parse(await req.json());
    const daten = await fuehrerscheinDatenExtrahieren({
      vorderseiteDataUrl: body.vorderseiteDataUrl,
      rueckseiteDataUrl: body.rueckseiteDataUrl
    });
    return NextResponse.json({ daten });
  } catch (error) {
    return toErrorResponse(error);
  }
}
