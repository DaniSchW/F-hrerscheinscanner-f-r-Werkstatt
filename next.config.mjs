/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Statischer Export, da das PHP-Backend auf klassischem Shared-Hosting
  // (Kasserver) läuft - kein Node-Prozess für Next.js selbst verfügbar.
  // `out/` wird komplett per FTP hochgeladen, server/ separat daneben.
  output: "export",
  // Jede Route als eigenes Verzeichnis mit index.html ausliefern, damit
  // z.B. /login ohne serverseitige Rewrite-Regeln über Apache funktioniert.
  trailingSlash: true
};

export default nextConfig;
