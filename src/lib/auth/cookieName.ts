// Eigenständiges Modul (kein "server-only"/Node-Crypto-Import), damit der
// Cookie-Name auch im Edge-Runtime-Proxy (src/proxy.ts) genutzt werden kann,
// ohne dass der gesamte session.ts-Code (Node "crypto", Prisma) mitgebündelt wird.
export const SESSION_COOKIE = "sitzung";
