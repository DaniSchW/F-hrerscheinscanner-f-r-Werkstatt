"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KameraAufnahme } from "@/components/KameraAufnahme";
import { apiFetch } from "@/lib/api";

function RuecknahmeInhalt() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const router = useRouter();
  const [kmStand, setKmStand] = useState("");
  const [tankfuellung, setTankfuellung] = useState("");
  const [zustandsfotos, setZustandsfotos] = useState<string[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladend, setLadend] = useState(false);

  async function abschliessen() {
    if (!kmStand.trim() || !tankfuellung.trim()) {
      setFehler("Bitte Kilometerstand und Tankfüllung angeben.");
      return;
    }
    setFehler(null);
    setLadend(true);
    try {
      await apiFetch("/vermietungen/ruecknahme.php", {
        body: {
          id,
          kmStandRueckgabe: Number.parseInt(kmStand, 10),
          tankfuellungRueckgabe: tankfuellung,
          zustandsfotosRueckgabe: zustandsfotos
        }
      });
      router.replace("/");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Rückgabe konnte nicht erfasst werden.");
    } finally {
      setLadend(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-tresen-xl font-bold text-brand-700">Rückgabe erfassen</h1>
      {fehler && <p className="rounded-xl bg-danger-500/10 p-3 text-danger-600">{fehler}</p>}
      <div>
        <label className="field-label">Kilometerstand bei Rückgabe</label>
        <input
          type="number"
          inputMode="numeric"
          className="field-input"
          value={kmStand}
          onChange={(e) => setKmStand(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">Tankfüllung bei Rückgabe</label>
        <input
          className="field-input"
          value={tankfuellung}
          onChange={(e) => setTankfuellung(e.target.value)}
        />
      </div>
      <KameraAufnahme
        label={`Zustandsfoto hinzufügen (${zustandsfotos.length} erfasst)`}
        aufgenommenesBild={null}
        onAufnahme={(bild) => setZustandsfotos((prev) => [...prev, bild])}
      />
      {zustandsfotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {zustandsfotos.map((foto, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={foto} alt={`Zustandsfoto ${i + 1}`} className="rounded-lg border border-slate-200" />
          ))}
        </div>
      )}
      <button className="btn-primary" onClick={abschliessen} disabled={ladend}>
        {ladend ? "Wird abgeschlossen…" : "Rückgabe abschließen"}
      </button>
    </div>
  );
}

export default function RuecknahmePage() {
  return (
    <Suspense>
      <RuecknahmeInhalt />
    </Suspense>
  );
}
