import Link from "next/link";
import { ReactNode } from "react";
import { Icon } from "./Icon";

/** Shared frame for the screens before a game: title, one line of intro, options, sticky start bar. */
export function SetupLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: ReactNode;
  intro: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-[var(--gutter)]">
      <header className="flex h-14 items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
          <Icon name="back" className="size-6" />
        </Link>
      </header>
      <h1 className="text-[clamp(1.9rem,6vw,2.4rem)]">{title}</h1>
      <div className="mt-2 max-w-[52ch] text-ink-2">{intro}</div>
      <div className="mt-6 flex-1 pb-6">{children}</div>
      <div className="sticky bottom-0 -mx-[var(--gutter)] border-t border-line/50 bg-night/95 px-[var(--gutter)] py-3 backdrop-blur">
        {footer}
      </div>
    </main>
  );
}
