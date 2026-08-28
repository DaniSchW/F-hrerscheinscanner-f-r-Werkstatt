"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KameraAufnahme } from "@/components/KameraAufnahme";
import { UnterschriftPad } from "@/components/UnterschriftPad";
import { fuehrerscheinPasstZuFahrzeug } from "@/lib/fuehrerscheinklassen";
import { apiFetch } from "@/lib/api";
import { KlassenEditor } from "./KlassenEditor";
import { zurWarteschlangeHinzufuegen } from "@/lib/offlineQueue";
import { leeresKundeFormular, type Fahrzeug, type KundeFormular } from "./types";

type Schritt = "kunde" | "foto" | "sichtpruefung" | "fahrzeug" | "zustand" | "unterschrift";

type Suchtreffer = { id: string; vorname: string; nachname: string; fuehrerschein_nummer: string };

type KundeApiAntwort = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geburtsort: string;
  adresse: string;
  fuehrerschein_nummer: string;
  ausstellende_behoerde: string;
  ausstellungsdatum: string;
  fuehrerschein_klassen: KundeFormular["fuehrerscheinKlassen"];
};

export default function NeueVermietungPage() {
  const router = useRouter();
  const [schritt, setSchritt] = useState<Schritt>("kunde");
  const [fehler, setFehler] = useState<string | null>(null);

  // Kunde
  const [suchbegriff, setSuchbegriff] = useState("");
  const [treffer, setTreffer] = useState<Suchtreffer[]>([]);
  const [kundeId, setKundeId] = useState<string | null>(null);
  const [formular, setFormular] = useState<KundeFormular>(leeresKundeFormular);

  // Führerschein-Foto / OCR
  const [vorderseite, setVorderseite] = useState<string | null>(null);
  const [rueckseite, setRueckseite] = useState<string | null>(null);
  const [ocrLaeuft, setOcrLaeuft] = useState(false);

  // Fahrzeug
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [fahrzeugId, setFahrzeugId] = useState<string | null>(null);
  const [klasseWarnungBestaetigt, setKlasseWarnungBestaetigt] = useState(false);

  // Zustand
  const [kmStand, setKmStand] = useState("");
  const [tankfuellung, setTankfuellung] = useState("");
  const [zustandsfotos, setZustandsfotos] = useState<string[]>([]);

  // Unterschrift
  const [unterschrift, setUnterschrift] = useState<string | null>(null);
  const [absendenLaeuft, setAbsendenLaeuft] = useState(false);

  const ausgewaehltesFahrzeug = fahrzeuge.find((f) => f.id === fahrzeugId) ?? null;
  const klassePasst =
    !ausgewaehltesFahrzeug ||
    fuehrerscheinPasstZuFahrzeug(
      formular.fuehrerscheinKlassen.map((k) => k.klasse),
      ausgewaehltesFahrzeug.benoetigte_fuehrerscheinklasse
    );

  async function suchen(wert: string) {
    setSuchbegriff(wert);
    if (wert.trim().length < 2) {
      setTreffer([]);
      return;
    }
    const data = await apiFetch<{ kunden: Suchtreffer[] }>(`/kunden/suche.php?q=${encodeURIComponent(wert)}`);
    setTreffer(data.kunden ?? []);
  }

  async function kundeAuswaehlen(id: string) {
    try {
      const data = await apiFetch<{ kunde: KundeApiAntwort }>(`/kunden/get.php?id=${encodeURIComponent(id)}`);
      const k = data.kunde;
      setKundeId(id);
      setFormular({
        vorname: k.vorname,
        nachname: k.nachname,
        geburtsdatum: k.geburtsdatum.slice(0, 10),
        geburtsort: k.geburtsort,
        adresse: k.adresse,
        fuehrerscheinNummer: k.fuehrerschein_nummer,
        ausstellendeBehoerde: k.ausstellende_behoerde,
        ausstellungsdatum: k.ausstellungsdatum.slice(0, 10),
        fuehrerscheinKlassen: k.fuehrerschein_klassen ?? []
      });
      setSchritt("foto");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Kunde konnte nicht geladen werden.");
    }
  }

  function neuerKunde() {
    setKundeId(null);
    setFormular(leeresKundeFormular);
    setSchritt("foto");
  }

  async function datenAuslesen() {
    if (!vorderseite) {
      setFehler("Bitte zuerst die Vorderseite fotografieren.");
      return;
    }
    setFehler(null);

    if (!navigator.onLine) {
      await zurWarteschlangeHinzufuegen({
        vorderseiteDataUrl: vorderseite,
        rueckseiteDataUrl: rueckseite
      });
      setFehler(
        "Keine Internetverbindung. Das Foto wurde in die Warteschlange gelegt und wird automatisch " +
          "verarbeitet, sobald wieder Verbindung besteht. Bitte Felder in der Zwischenzeit manuell prüfen."
      );
      setVorderseite(null);
      setRueckseite(null);
      setSchritt("sichtpruefung");
      return;
    }

    setOcrLaeuft(true);
    try {
      const data = await apiFetch<{
        daten: {
          vorname: string | null;
          nachname: string | null;
          geburtsdatum: string | null;
          geburtsort: string | null;
          adresse: string | null;
          fuehrerscheinNummer: string | null;
          ausstellendeBehoerde: string | null;
          ausstellungsdatum: string | null;
          klassen: KundeFormular["fuehrerscheinKlassen"];
        };
      }>("/ocr/fuehrerschein.php", {
        body: { vorderseiteDataUrl: vorderseite, rueckseiteDataUrl: rueckseite ?? undefined }
      });
      const d = data.daten;
      setFormular((prev) => ({
        vorname: d.vorname ?? prev.vorname,
        nachname: d.nachname ?? prev.nachname,
        geburtsdatum: d.geburtsdatum ?? prev.geburtsdatum,
        geburtsort: d.geburtsort ?? prev.geburtsort,
        adresse: d.adresse ?? prev.adresse,
        fuehrerscheinNummer: d.fuehrerscheinNummer ?? prev.fuehrerscheinNummer,
        ausstellendeBehoerde: d.ausstellendeBehoerde ?? prev.ausstellendeBehoerde,
        ausstellungsdatum: d.ausstellungsdatum ?? prev.ausstellungsdatum,
        fuehrerscheinKlassen: d.klassen?.length ? d.klassen : prev.fuehrerscheinKlassen
      }));
      // Fotos wurden ausschließlich zur Extraktion verwendet und werden nun verworfen.
      setVorderseite(null);
      setRueckseite(null);
      setSchritt("sichtpruefung");
    } catch (err) {
      await zurWarteschlangeHinzufuegen({
        vorderseiteDataUrl: vorderseite,
        rueckseiteDataUrl: rueckseite
      });
      setFehler(
        (err instanceof Error ? err.message + " " : "") +
          "Das Foto wurde in die Warteschlange gelegt. Bitte Felder in der Zwischenzeit manuell prüfen."
      );
      setVorderseite(null);
      setRueckseite(null);
      setSchritt("sichtpruefung");
    } finally {
      setOcrLaeuft(false);
    }
  }

  async function sichtpruefungBestaetigen() {
    setFehler(null);
    const pflichtfelder: (keyof KundeFormular)[] = [
      "vorname",
      "nachname",
      "geburtsdatum",
      "geburtsort",
      "adresse",
      "fuehrerscheinNummer",
      "ausstellendeBehoerde",
      "ausstellungsdatum"
    ];
    if (pflichtfelder.some((feld) => !formular[feld])) {
      setFehler("Bitte alle Felder ausfüllen oder korrigieren.");
      return;
    }
    if (formular.fuehrerscheinKlassen.length === 0 || formular.fuehrerscheinKlassen.some((k) => !k.klasse.trim())) {
      setFehler("Bitte mindestens eine Führerscheinklasse eintragen.");
      return;
    }
    try {
      if (kundeId) {
        await apiFetch("/kunden/aktualisieren.php", { body: { id: kundeId, ...formular } });
      }
      const data = await apiFetch<{ fahrzeuge: Fahrzeug[] }>("/fahrzeuge/liste.php?verfuegbar=true");
      setFahrzeuge(data.fahrzeuge ?? []);
      setSchritt("fahrzeug");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Vorgang konnte nicht fortgesetzt werden.");
    }
  }

  function fahrzeugWeiter() {
    if (!fahrzeugId) {
      setFehler("Bitte ein Fahrzeug auswählen.");
      return;
    }
    if (!klassePasst && !klasseWarnungBestaetigt) {
      setFehler("Bitte die Führerscheinklassen-Warnung bestätigen oder ein anderes Fahrzeug wählen.");
      return;
    }
    setFehler(null);
    setSchritt("zustand");
  }

  function zustandWeiter() {
    if (!kmStand.trim() || !tankfuellung.trim()) {
      setFehler("Bitte Kilometerstand und Tankfüllung angeben.");
      return;
    }
    setFehler(null);
    setSchritt("unterschrift");
  }

  async function abschliessen() {
    if (!unterschrift) {
      setFehler("Bitte den Mietvertrag durch den Kunden unterschreiben lassen.");
      return;
    }
    setFehler(null);
    setAbsendenLaeuft(true);
    try {
      await apiFetch("/vermietungen/anlegen.php", {
        body: {
          kunde: kundeId ? { modus: "bestehend", kundeId } : { modus: "neu", ...formular },
          fahrzeugId,
          kmStandAusgabe: Number.parseInt(kmStand, 10),
          tankfuellungAusgabe: tankfuellung,
          zustandsfotosAusgabe: zustandsfotos,
          unterschriftKundeDataUrl: unterschrift,
          fuehrerscheinKlassePassend: klassePasst
        }
      });
      router.replace("/");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Vermietung konnte nicht angelegt werden.");
    } finally {
      setAbsendenLaeuft(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <h1 className="text-tresen-xl font-bold text-brand-700">Neue Vermietung</h1>
      {fehler && <p className="rounded-xl bg-danger-500/10 p-3 text-danger-600">{fehler}</p>}

      {schritt === "kunde" && (
        <div className="space-y-4">
          <input
            className="field-input"
            placeholder="Kunde suchen (Name oder FS-Nummer)…"
            value={suchbegriff}
            onChange={(e) => suchen(e.target.value)}
          />
          <ul className="space-y-2">
            {treffer.map((k) => (
              <li key={k.id}>
                <button className="card block w-full text-left" onClick={() => kundeAuswaehlen(k.id)}>
                  <p className="font-semibold">
                    {k.vorname} {k.nachname}
                  </p>
                  <p className="text-base text-slate-500">FS-Nr. {k.fuehrerschein_nummer}</p>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn-primary" onClick={neuerKunde}>
            Neuer Kunde
          </button>
        </div>
      )}

      {schritt === "foto" && (
        <div className="space-y-4">
          <KameraAufnahme label="Führerschein Vorderseite" aufgenommenesBild={vorderseite} onAufnahme={setVorderseite} />
          <KameraAufnahme label="Führerschein Rückseite" aufgenommenesBild={rueckseite} onAufnahme={setRueckseite} />
          <button className="btn-primary" onClick={datenAuslesen} disabled={ocrLaeuft || !vorderseite}>
            {ocrLaeuft ? "Daten werden ausgelesen…" : "Daten auslesen"}
          </button>
          <button className="btn-secondary" onClick={() => setSchritt("sichtpruefung")}>
            Ohne automatische Erkennung fortfahren
          </button>
        </div>
      )}

      {schritt === "sichtpruefung" && (
        <div className="space-y-3">
          <p className="text-slate-600">Bitte erkannte Felder prüfen und ggf. korrigieren.</p>
          <div>
            <label className="field-label">Vorname</label>
            <input
              className="field-input"
              value={formular.vorname}
              onChange={(e) => setFormular({ ...formular, vorname: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Nachname</label>
            <input
              className="field-input"
              value={formular.nachname}
              onChange={(e) => setFormular({ ...formular, nachname: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Geburtsdatum</label>
            <input
              type="date"
              className="field-input"
              value={formular.geburtsdatum}
              onChange={(e) => setFormular({ ...formular, geburtsdatum: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Geburtsort</label>
            <input
              className="field-input"
              value={formular.geburtsort}
              onChange={(e) => setFormular({ ...formular, geburtsort: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Adresse</label>
            <input
              className="field-input"
              value={formular.adresse}
              onChange={(e) => setFormular({ ...formular, adresse: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Führerscheinnummer</label>
            <input
              className="field-input"
              value={formular.fuehrerscheinNummer}
              onChange={(e) => setFormular({ ...formular, fuehrerscheinNummer: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Ausstellende Behörde</label>
            <input
              className="field-input"
              value={formular.ausstellendeBehoerde}
              onChange={(e) => setFormular({ ...formular, ausstellendeBehoerde: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Ausstellungsdatum</label>
            <input
              type="date"
              className="field-input"
              value={formular.ausstellungsdatum}
              onChange={(e) => setFormular({ ...formular, ausstellungsdatum: e.target.value })}
            />
          </div>
          <KlassenEditor
            klassen={formular.fuehrerscheinKlassen}
            onAendern={(klassen) => setFormular({ ...formular, fuehrerscheinKlassen: klassen })}
          />
          <button className="btn-primary" onClick={sichtpruefungBestaetigen}>
            Felder bestätigen
          </button>
        </div>
      )}

      {schritt === "fahrzeug" && (
        <div className="space-y-3">
          <p className="text-slate-600">Fahrzeug auswählen.</p>
          <div className="space-y-2">
            {fahrzeuge.map((f) => (
              <button
                key={f.id}
                className={`card block w-full text-left ${fahrzeugId === f.id ? "border-brand-500 ring-2 ring-brand-100" : ""}`}
                onClick={() => {
                  setFahrzeugId(f.id);
                  setKlasseWarnungBestaetigt(false);
                }}
              >
                <p className="font-semibold">{f.kennzeichen}</p>
                <p className="text-base text-slate-500">
                  {f.bezeichnung} · Klasse {f.benoetigte_fuehrerscheinklasse}
                </p>
              </button>
            ))}
            {fahrzeuge.length === 0 && <p className="text-slate-500">Keine verfügbaren Fahrzeuge.</p>}
          </div>
          {ausgewaehltesFahrzeug && !klassePasst && (
            <div className="card space-y-2 border-warn-500 bg-warn-500/10">
              <p className="font-semibold text-warn-600">
                Achtung: Die erfassten Führerscheinklassen passen nicht eindeutig zu diesem Fahrzeug
                (benötigt: {ausgewaehltesFahrzeug.benoetigte_fuehrerscheinklasse}).
              </p>
              <label className="flex items-center gap-2 text-base">
                <input
                  type="checkbox"
                  checked={klasseWarnungBestaetigt}
                  onChange={(e) => setKlasseWarnungBestaetigt(e.target.checked)}
                />
                Trotzdem fortfahren (Sonderfall, geprüft)
              </label>
            </div>
          )}
          <button className="btn-primary" onClick={fahrzeugWeiter}>
            Weiter
          </button>
        </div>
      )}

      {schritt === "zustand" && (
        <div className="space-y-3">
          <div>
            <label className="field-label">Kilometerstand</label>
            <input
              type="number"
              inputMode="numeric"
              className="field-input"
              value={kmStand}
              onChange={(e) => setKmStand(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Tankfüllung</label>
            <input
              className="field-input"
              placeholder="z.B. voll, 3/4, 1/2…"
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
          <button className="btn-primary" onClick={zustandWeiter}>
            Weiter zur Unterschrift
          </button>
        </div>
      )}

      {schritt === "unterschrift" && (
        <div className="space-y-3">
          <p className="text-slate-600">Der Kunde bestätigt Mietvertrag und Fahrzeugzustand mit seiner Unterschrift.</p>
          <UnterschriftPad onAendern={setUnterschrift} />
          <button className="btn-primary" onClick={abschliessen} disabled={absendenLaeuft}>
            {absendenLaeuft ? "Wird abgeschlossen…" : "Vermietung abschließen"}
          </button>
        </div>
      )}
    </div>
  );
}
