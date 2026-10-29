import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { ArtistaGame } from "./ArtistaGame";

export const metadata: Metadata = { title: "Modo artista" };

export default function ArtistaPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <ClientOnly>
        <ArtistaGame />
      </ClientOnly>
    </Suspense>
  );
}
