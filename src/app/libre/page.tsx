import type { Metadata } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { LibreGame } from "./LibreGame";

export const metadata: Metadata = { title: "Modo libre" };

export default function LibrePage() {
  return (
    <ClientOnly>
      <LibreGame />
    </ClientOnly>
  );
}
