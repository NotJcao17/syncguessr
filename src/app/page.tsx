import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { Icon } from "@/components/Icon";
import { LogoMark, SyncoraMark, Wordmark } from "@/components/Logo";
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

      <a
        href="https://syncoraplayer.app"
        rel="noopener"
        className="group mt-3 flex items-center gap-4 rounded-[24px] border border-line/60 p-5 transition-[transform,background-color] duration-300 ease-[var(--ease-out-quint)] hover:bg-surface active:scale-[0.985]"
      >
        <SyncoraMark className="size-12 shrink-0 text-ink" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold wide tracking-[-0.02em]">¿No tienes dónde escuchar tu música?</p>
          <p className="mt-0.5 text-[0.95rem] leading-snug text-ink-3">
            Prueba Syncora Player, nuestro reproductor gratuito y de código abierto para Android y Windows. Sin
            anuncios y sin cuenta.
          </p>
        </div>
        <Icon
          name="next"
          className="size-6 shrink-0 text-indigo-soft transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5"
        />
      </a>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-8 pb-5 text-sm text-ink-3">
        <span>{songs} canciones en español e inglés</span>
        <span className="flex flex-wrap gap-x-4 gap-y-2">
          <span>Audio de Deezer</span>
          <Link href="/privacidad" className="underline underline-offset-[3px] hover:text-ink">
            Aviso de privacidad
          </Link>
        </span>
      </footer>
    </main>
  );
}
