import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { Icon } from "@/components/Icon";
import { LogoMark, Wordmark } from "@/components/Logo";
import { catalogSize } from "@/lib/catalog";
import { DailyCard, ModeList } from "./HomeStatus";

export default function Home() {
  const songs = new Intl.NumberFormat("es-MX").format(catalogSize);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-[var(--gutter)]">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="syncguessr, inicio">
          <LogoMark className="size-9 text-ink" />
          <Wordmark />
        </Link>
        <Link href="/estadisticas" className="icon-btn -mr-2" aria-label="Estadísticas">
          <Icon name="chart" className="size-6" />
        </Link>
      </header>

      <section className="pt-10 pb-10 sm:pt-14">
        <h1 className="display text-[clamp(5.5rem,33vw,11.5rem)]" aria-label="0.1 segundos">
          0.1<span className="text-[0.42em] tracking-[-0.02em] text-indigo-soft">s</span>
        </h1>
        <p className="mt-5 max-w-[30ch] text-[1.35rem] leading-snug font-bold wide tracking-[-0.02em] text-ink-2 sm:text-2xl">
          ¿Te basta una décima de segundo para reconocer una canción?
        </p>
      </section>

      <ClientOnly fallback={<div className="h-[176px] rounded-[28px] bg-indigo-deep" />}>
        <DailyCard />
      </ClientOnly>

      <div className="mt-6">
        <ClientOnly fallback={<div className="h-[312px]" />}>
          <ModeList />
        </ClientOnly>
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line/50 py-6 text-sm text-ink-3">
        <span>{songs} canciones en español e inglés</span>
        <span>Audio de Deezer · parte de la familia Syncora</span>
      </footer>
    </main>
  );
}
