import type { Metadata } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { StatsView } from "./StatsView";

export const metadata: Metadata = { title: "Estadísticas" };

export default function StatsPage() {
  return (
    <ClientOnly>
      <StatsView />
    </ClientOnly>
  );
}
