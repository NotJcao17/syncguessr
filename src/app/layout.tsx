import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "syncguessr — Adivina la canción desde 0.1s",
  description: "Juego musical de adivinanza desde 0.1 segundos. Música en español e inglés, niveles de dificultad, filtros y rondas ilimitadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-night text-ink">
        {children}
      </body>
    </html>
  );
}
