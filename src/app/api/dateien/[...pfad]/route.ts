import { NextRequest, NextResponse } from "next/server";
import { requireMitarbeiter } from "@/lib/auth/guard";
import { dateiLesen } from "@/lib/storage";
import { entschluesseln } from "@/lib/crypto";
import { toErrorResponse } from "@/lib/apiError";

/**
 * Liefert dauerhaft gespeicherte Dateien (Zustandsfotos, Unterschrift) nur
 * an angemeldete Mitarbeiter aus - keine öffentliche Auslieferung, da
 * personenbezogene Daten enthalten sein können.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ pfad: string[] }> }) {
  try {
    await requireMitarbeiter(req);
    const { pfad } = await params;
    const relativePfad = pfad.join("/");
    let inhalt = await dateiLesen(relativePfad);
    if (relativePfad.startsWith("unterschriften/")) {
      inhalt = entschluesseln(inhalt);
    }
    const contentType = relativePfad.endsWith(".png") ? "image/png" : "image/jpeg";
    return new NextResponse(new Uint8Array(inhalt), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
