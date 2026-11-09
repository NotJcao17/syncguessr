import type { Metadata } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { PlaylistGame } from "./PlaylistGame";

export const metadata: Metadata = {
  title: "Tu playlist",
  description: "Adivina las canciones de tu playlist de Spotify, Syncora Player o Deezer.",
};

export default function PlaylistPage() {
  return (
    <ClientOnly>
      <PlaylistGame />
    </ClientOnly>
  );
}
