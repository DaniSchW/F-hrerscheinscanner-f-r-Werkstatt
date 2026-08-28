import { NextRequest, NextResponse } from "next/server";
import { requireMitarbeiter } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  const auth = await requireMitarbeiter(req).catch(() => null);
  if (!auth) {
    return NextResponse.json({ mitarbeiter: null }, { status: 200 });
  }
  return NextResponse.json({
    mitarbeiter: {
      id: auth.mitarbeiter.id,
      name: auth.mitarbeiter.name,
      rolle: auth.mitarbeiter.rolle
    }
  });
}
