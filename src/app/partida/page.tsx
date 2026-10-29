import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { PartidaGame } from "./PartidaGame";

export const metadata: Metadata = { title: "Partida" };

export default function PartidaPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <ClientOnly>
        <PartidaGame />
      </ClientOnly>
    </Suspense>
  );
}
