"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { parseMysqlDatetime } from "@/lib/datum";

type KundeDetail = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geburtsort: string;
  adresse: string | null;
  plz: string | null;
  ort: string | null;
  fuehrerschein_nummer: string;
  ausstellende_behoerde: string;
  fuehrerschein_klassen: { klasse: string; ablaufdatum: string | null }[];
  vermietungen: {
    id: string;
    ausgabe_datum: string;
    ruecknahme_datum: string | null;
    kennzeichen: string;
    bezeichnung: string;
  }[];
};

function KundeDetailInhalt() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [kunde, setKunde] = useState<KundeDetail | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ kunde: KundeDetail }>(`/kunden/get.php?id=${encodeURIComponent(id)}`)
      .then((data) => setKunde(data.kunde))
      .catch((err) => setFehler(err instanceof Error ? err.message : "Kunde konnte nicht geladen werden."));
  }, [id]);

  if (fehler) return <p className="text-danger-500">{fehler}</p>;
  if (!kunde) return <p className="text-slate-500">Wird geladen…</p>;

  const klassen = kunde.fuehrerschein_klassen ?? [];
  const adresseVollstaendig = [kunde.adresse, [kunde.plz, kunde.ort].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-tresen-xl font-bold text-brand-700">
          {kunde.vorname} {kunde.nachname}
        </h1>
        <p className="text-slate-500">
          geb. {new Date(kunde.geburtsdatum).toLocaleDateString("de-DE")} in {kunde.geburtsort}
        </p>
        {adresseVollstaendig && <p className="text-slate-500">{adresseVollstaendig}</p>}
      </div>

      <div className="card space-y-1">
        <p className="font-semibold">Führerschein</p>
        <p>Nr. {kunde.fuehrerschein_nummer}</p>
        <p>Behörde: {kunde.ausstellende_behoerde}</p>
        <p>Klassen: {klassen.map((k) => k.klasse).join(", ") || "–"}</p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Vermietungsverlauf</h2>
        <ul className="space-y-2">
          {kunde.vermietungen.map((v) => (
            <li key={v.id} className="card">
              <p className="font-medium">
                {v.kennzeichen} · {v.bezeichnung}
              </p>
              <p className="text-base text-slate-500">
                {parseMysqlDatetime(v.ausgabe_datum).toLocaleDateString("de-DE")} –{" "}
                {v.ruecknahme_datum ? parseMysqlDatetime(v.ruecknahme_datum).toLocaleDateString("de-DE") : "laufend"}
              </p>
            </li>
          ))}
          {kunde.vermietungen.length === 0 && <p className="text-slate-500">Keine bisherigen Vermietungen.</p>}
        </ul>
      </div>
    </div>
  );
}

export default function KundeDetailPage() {
  return (
    <Suspense>
      <KundeDetailInhalt />
    </Suspense>
  );
}
