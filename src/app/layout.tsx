import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrierung } from "@/components/ServiceWorkerRegistrierung";

export const metadata: Metadata = {
  title: "Führerscheinscanner – Fahrzeugverleih",
  description: "Interne PWA zur Fahrzeugausgabe/-rückgabe mit Führerschein-Erfassung.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1d6fe0"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
        <ServiceWorkerRegistrierung />
      </body>
    </html>
  );
}
