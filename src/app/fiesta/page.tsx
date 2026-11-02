import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { FiestaGame } from "./FiestaGame";

export const metadata: Metadata = { title: "Modo fiesta" };

export default function FiestaPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <ClientOnly>
        <FiestaGame />
      </ClientOnly>
    </Suspense>
  );
}
