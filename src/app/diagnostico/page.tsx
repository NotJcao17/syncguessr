import type { Metadata } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { Diagnostics } from "./Diagnostics";

export const metadata: Metadata = { title: "Diagnóstico", robots: { index: false } };

export default function DiagnosticsPage() {
  return (
    <ClientOnly>
      <Diagnostics />
    </ClientOnly>
  );
}
