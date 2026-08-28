"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Kamera-Aufnahme über die Browser-API. Liefert ein JPEG als Data-URL
 * an onAufnahme - der Aufrufer entscheidet, ob/wie lange das Bild
 * gehalten wird (z.B. Führerschein-Fotos werden nach der OCR verworfen,
 * Zustandsfotos werden dauerhaft hochgeladen).
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
  const [aktiv, setAktiv] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const kameraStarten = useCallback(async () => {
    setFehler(null);
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
      setAktiv(true);
    } catch {
      setFehler("Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.");
    }
  }, []);

  const kameraStoppen = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setAktiv(false);
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
          <button type="button" className="btn-secondary" onClick={kameraStarten}>
            Erneut aufnehmen
          </button>
        </div>
      ) : aktiv ? (
        <div className="space-y-2">
          <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black" />
          <button type="button" className="btn-primary" onClick={aufnehmen}>
            Foto aufnehmen
          </button>
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={kameraStarten}>
          Kamera öffnen
        </button>
      )}
      {fehler && <p className="text-danger-500">{fehler}</p>}
    </div>
  );
}
