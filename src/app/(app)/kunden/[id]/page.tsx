import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

export default async function KundeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getCurrentAuth();
  const kunde = await prisma.kunde.findUnique({
    where: { id },
    include: {
      vermietungen: {
        select: {
          id: true,
          ausgabeDatum: true,
          ruecknahmeDatum: true,
          fahrzeug: { select: { kennzeichen: true, bezeichnung: true } }
        },
        orderBy: { ausgabeDatum: "desc" }
      }
    }
  });
  if (!kunde) notFound();

  if (auth) {
    await logAudit({
      mitarbeiterId: auth.mitarbeiter.id,
      aktion: "kunde_eingesehen",
      betroffeneEntitaetId: kunde.id
    });
  }

  const klassen = Array.isArray(kunde.fuehrerscheinKlassen)
    ? (kunde.fuehrerscheinKlassen as { klasse: string; ablaufdatum: string | null }[])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-tresen-xl font-bold text-brand-700">
          {kunde.vorname} {kunde.nachname}
        </h1>
        <p className="text-slate-500">
          geb. {kunde.geburtsdatum.toLocaleDateString("de-DE")} in {kunde.geburtsort}
        </p>
      </div>

      <div className="card space-y-1">
        <p className="font-semibold">Führerschein</p>
        <p>Nr. {kunde.fuehrerscheinNummer}</p>
        <p>Behörde: {kunde.ausstellendeBehoerde}</p>
        <p>Klassen: {klassen.map((k) => k.klasse).join(", ") || "–"}</p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Vermietungsverlauf</h2>
        <ul className="space-y-2">
          {kunde.vermietungen.map((v) => (
            <li key={v.id} className="card">
              <p className="font-medium">
                {v.fahrzeug.kennzeichen} · {v.fahrzeug.bezeichnung}
              </p>
              <p className="text-base text-slate-500">
                {v.ausgabeDatum.toLocaleDateString("de-DE")} –{" "}
                {v.ruecknahmeDatum ? v.ruecknahmeDatum.toLocaleDateString("de-DE") : "laufend"}
              </p>
            </li>
          ))}
          {kunde.vermietungen.length === 0 && <p className="text-slate-500">Keine bisherigen Vermietungen.</p>}
        </ul>
      </div>
    </div>
  );
}
