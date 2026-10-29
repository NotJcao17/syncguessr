import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { Icon } from "@/components/Icon";
import { LogoMark, Wordmark } from "@/components/Logo";
import { catalogSize } from "@/lib/catalog";
import { ModeGrid, ModeGridFallback } from "./HomeStatus";

export default function Home() {
  const songs = new Intl.NumberFormat("es-MX").format(catalogSize);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-[var(--gutter)]">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="syncguessr, inicio">
          <LogoMark className="size-9 text-ink" />
          <Wordmark />
        </Link>
        <Link href="/estadisticas" className="icon-btn -mr-2" aria-label="Estadísticas">
          <Icon name="chart" className="size-6" />
        </Link>
      </header>

      <section className="pt-6 pb-7 sm:pt-10">
        <h1 className="text-[clamp(2rem,6.5vw,3.25rem)] leading-[1.02]">
          Adivina la canción
          <br />
          <span className="text-indigo-soft">desde 0.1 segundos</span>
        </h1>
      </section>

      <ClientOnly fallback={<ModeGridFallback />}>
        <ModeGrid />
      </ClientOnly>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-8 pb-5 text-sm text-ink-3">
        <span>{songs} canciones en español e inglés</span>
        <span>Audio de Deezer</span>
      </footer>
    </main>
  );
}
