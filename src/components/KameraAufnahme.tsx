"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Kamera-Aufnahme über die Browser-API. Liefert ein JPEG als Data-URL
 * an onAufnahme - der Aufrufer entscheidet, ob/wie lange das Bild
 * gehalten wird (z.B. Führerschein-Fotos werden nach der OCR verworfen,
 * Zustandsfotos werden dauerhaft hochgeladen).
 *
 * Vor dem eigentlichen getUserMedia()-Aufruf wird zunächst eine eigene
 * Erklärung eingeblendet ("Abfrage"), bevor der native Browser-Dialog
 * erscheint - das macht sichtbar, dass gerade auf eine Reaktion des
 * Browsers gewartet wird, statt dass scheinbar gar nichts passiert.
 */
export function KameraAufnahme({
  label,
  onAufnahme,
  aufgenommenesBild
}: {
  label: string;
  onAufnahme: (dataUrl: string) => void;
  aufgenommenesBild: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"inaktiv" | "anfrage" | "wird_angefragt" | "aktiv">("inaktiv");
  const [fehler, setFehler] = useState<string | null>(null);

  function fehlermeldungFuer(err: unknown): string {
    if (!navigator.mediaDevices?.getUserMedia) {
      return "Kamerazugriff ist nur über eine sichere Verbindung (https://) oder auf localhost möglich. " +
        "Bitte prüfen, ob die Seite über https:// aufgerufen wird.";
    }
    const name = err instanceof DOMException ? err.name : "";
    switch (name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Kamerazugriff wurde verweigert. Bitte in den Website-/Browser-Einstellungen für diese " +
          "Seite die Kamera-Berechtigung erlauben und erneut versuchen.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Es wurde keine Kamera gefunden.";
      case "NotReadableError":
      case "TrackStartError":
        return "Auf die Kamera kann nicht zugegriffen werden - wird sie bereits von einer anderen App verwendet?";
      default:
        return "Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.";
    }
  }

  const kameraStarten = useCallback(async () => {
    setFehler(null);
    setStatus("wird_angefragt");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1600 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("aktiv");
    } catch (err) {
      setFehler(fehlermeldungFuer(err));
      setStatus("inaktiv");
    }
  }, []);

  const kameraStoppen = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("inaktiv");
  }, []);

  useEffect(() => () => kameraStoppen(), [kameraStoppen]);

  function aufnehmen() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onAufnahme(dataUrl);
    kameraStoppen();
  }

  return (
    <div className="card space-y-3">
      <p className="field-label">{label}</p>
      {aufgenommenesBild ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aufgenommenesBild} alt={label} className="w-full rounded-xl border border-slate-200" />
          <button type="button" className="btn-secondary" onClick={() => setStatus("anfrage")}>
            Erneut aufnehmen
          </button>
        </div>
      ) : status === "aktiv" ? (
        <div className="space-y-2">
          <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black" />
          <button type="button" className="btn-primary" onClick={aufnehmen}>
            Foto aufnehmen
          </button>
        </div>
      ) : status === "anfrage" || status === "wird_angefragt" ? (
        <div className="space-y-2 rounded-xl border-2 border-brand-100 bg-brand-50 p-4">
          <p className="text-base text-slate-700">
            Für die Aufnahme benötigt diese Seite Zugriff auf die Kamera des Geräts. Gleich fragt der
            Browser um Erlaubnis - bitte dort auf <strong>„Zulassen“</strong> tippen.
          </p>
          <button type="button" className="btn-primary" onClick={kameraStarten} disabled={status === "wird_angefragt"}>
            {status === "wird_angefragt" ? "Warte auf Browser-Freigabe…" : "Zugriff erlauben"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setStatus("inaktiv")}>
            Abbrechen
          </button>
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setStatus("anfrage")}>
          Kamera öffnen
        </button>
      )}
      {fehler && <p className="text-danger-500">{fehler}</p>}
    </div>
  );
}
