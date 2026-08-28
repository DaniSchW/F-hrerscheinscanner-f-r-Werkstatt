import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/guard";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ fehler: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { fehler: "Ungültige Eingabe.", details: error.flatten() },
      { status: 400 }
    );
  }
  if (error instanceof Error) {
    console.error(error);
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ fehler: "Unbekannter Fehler." }, { status: 500 });
}
