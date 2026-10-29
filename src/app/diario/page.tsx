import type { Metadata } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { DiarioGame } from "./DiarioGame";

export const metadata: Metadata = { title: "Reto diario" };

export default function DiarioPage() {
  return (
    <ClientOnly>
      <DiarioGame />
    </ClientOnly>
  );
}
