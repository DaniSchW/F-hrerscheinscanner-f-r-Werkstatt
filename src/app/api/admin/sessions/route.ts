import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/apiError";

/** Aktive Sitzungen/Geräte pro Mitarbeiter (Abschnitt 2/4.6 des Briefings). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sessions = await prisma.session.findMany({
      where: { widerrufenAm: null, ablaufAm: { gt: new Date() } },
      select: {
        id: true,
        geraetLabel: true,
        ipAdresse: true,
        erstelltAm: true,
        zuletztAktivAm: true,
        ablaufAm: true,
        mitarbeiter: { select: { id: true, name: true, email: true } }
      },
      orderBy: { zuletztAktivAm: "desc" }
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    return toErrorResponse(error);
  }
}
