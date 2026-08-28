import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { revokeSessionById } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { toErrorResponse } from "@/lib/apiError";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(req);
    await revokeSessionById(id);
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "geraet_abgemeldet",
      betroffeneEntitaetId: id
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
