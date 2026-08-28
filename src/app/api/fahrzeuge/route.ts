import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMitarbeiter, requireAdmin } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    await requireMitarbeiter(req);
    const nurVerfuegbare = req.nextUrl.searchParams.get("verfuegbar") === "true";
    const fahrzeuge = await prisma.fahrzeug.findMany({
      where: nurVerfuegbare ? { status: "verfuegbar" } : undefined,
      orderBy: { kennzeichen: "asc" }
    });
    return NextResponse.json({ fahrzeuge });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const fahrzeugSchema = z.object({
  kennzeichen: z.string().min(1),
  bezeichnung: z.string().min(1),
  benoetigteFuehrerscheinklasse: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = fahrzeugSchema.parse(await req.json());
    const fahrzeug = await prisma.fahrzeug.create({ data: body });
    return NextResponse.json({ fahrzeug }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
