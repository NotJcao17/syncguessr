import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "syncguessr · Adivina la canción desde 0.1 segundos",
    template: "%s · syncguessr",
  },
  description:
    "Escucha una décima de segundo y adivina la canción. Más de 13 mil canciones en español e inglés, partidas por puntos, modo artista y un reto diario.",
  applicationName: "syncguessr",
};

export const viewport: Viewport = {
  themeColor: "#181C27",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={archivo.variable}>
      <body className="flex min-h-dvh flex-col bg-night text-ink">{children}</body>
    </html>
  );
}
