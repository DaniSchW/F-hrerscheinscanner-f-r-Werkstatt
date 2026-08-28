/**
 * Service Worker für den App-Shell-Cache (Abschnitt 6 des Briefings).
 *
 * Bewusst zurückhaltend: API-Antworten (Kunden-/Führerscheindaten) werden
 * NIE gecacht - das würde dem Datenminimierungs-Prinzip widersprechen.
 * Gecacht werden nur statische, nicht-personenbezogene Assets sowie eine
 * Offline-Fallback-Seite für Navigationen ohne Verbindung.
 */
const CACHE_NAME = "fs-scanner-shell-v1";
const APP_SHELL = ["/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // API-Schreibzugriffe nie über den SW cachen/abfangen
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return; // niemals personenbezogene API-Antworten cachen

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html").then((res) => res ?? Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
  }
});
