"use client";

import { useEffect, useRef, useState } from "react";

/** Touch-Unterschrift auf Canvas. Liefert PNG-Data-URL an onAendern. */
export function UnterschriftPad({ onAendern }: { onAendern: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zeichnend = useRef(false);
  const [leer, setLeer] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    zeichnend.current = true;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function zeichnen(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnend.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = position(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLeer(false);
  }

  function ende() {
    if (!zeichnend.current) return;
    zeichnend.current = false;
    const canvas = canvasRef.current;
    if (canvas) onAendern(leer ? null : canvas.toDataURL("image/png"));
  }

  function loeschen() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLeer(true);
    onAendern(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={220}
        className="w-full touch-none rounded-xl border-2 border-slate-300 bg-white"
        onPointerDown={start}
        onPointerMove={zeichnen}
        onPointerUp={ende}
        onPointerLeave={ende}
      />
      <button type="button" className="btn-secondary" onClick={loeschen}>
        Unterschrift löschen
      </button>
    </div>
  );
}
