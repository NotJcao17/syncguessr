import Link from "next/link";
import { ReactNode } from "react";
import { Icon } from "./Icon";

/** Shared frame for the screens before a game: title, intro, options, sticky start bar. */
export function SetupLayout({
  title,
  headline,
  intro,
  children,
  footer,
}: {
  title: string;
  headline: ReactNode;
  intro: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-[var(--gutter)]">
      <header className="flex h-16 items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
          <Icon name="back" className="size-6" />
        </Link>
        <p className="font-bold wide">{title}</p>
      </header>
      <h1 className="display mt-4 text-[clamp(2.3rem,8.5vw,3.5rem)] leading-[0.92]">{headline}</h1>
      <div className="mt-4 max-w-[52ch] text-ink-2">{intro}</div>
      <div className="mt-8 flex-1 pb-8">{children}</div>
      <div className="sticky bottom-0 -mx-[var(--gutter)] border-t border-line/50 bg-night/95 px-[var(--gutter)] py-4 backdrop-blur">
        {footer}
      </div>
    </main>
  );
}

export function CountPicker({ value, options, onChange }: { value: number | null; options: (number | null)[]; onChange: (n: number | null) => void }) {
  return (
    <fieldset>
      <legend className="text-[0.95rem] font-bold wide">Canciones por partida</legend>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
        {options.map((n) => (
          <button key={n ?? "inf"} type="button" role="radio" aria-checked={value === n} className="chip min-w-14 justify-center" onClick={() => onChange(n)}>
            {n ?? "Sin límite"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
