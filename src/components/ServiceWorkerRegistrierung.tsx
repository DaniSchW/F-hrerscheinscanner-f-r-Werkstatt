"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrierung() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker Registrierung fehlgeschlagen", err);
      });
    }
  }, []);
  return null;
}
