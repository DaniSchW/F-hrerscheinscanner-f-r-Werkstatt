import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const seite = Number.parseInt(req.nextUrl.searchParams.get("seite") ?? "1", 10);
    const groesse = 50;
    const eintraege = await prisma.auditLog.findMany({
      include: { mitarbeiter: { select: { name: true } } },
      orderBy: { zeitstempel: "desc" },
      skip: (seite - 1) * groesse,
      take: groesse
    });
    return NextResponse.json({ eintraege, seite });
  } catch (error) {
    return toErrorResponse(error);
  }
}
