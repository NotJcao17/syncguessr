"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { LanguageFilter, SearchResultItem } from "@/lib/types";
import { Icon } from "./Icon";

export interface SearchBoxHandle {
  focus: () => void;
}

/**
 * Song autocomplete. The list stays open while the player replays the clip (clicks inside
 * any element marked `data-keep-search` don't close it); it closes on Escape, on picking a
 * song, or on clicking somewhere unrelated.
 */
export const SearchBox = forwardRef<
  SearchBoxHandle,
  {
    language: LanguageFilter;
    artists?: string[];
    disabled: boolean;
    triedTitles: string[];
    onGuess: (item: SearchResultItem) => void;
    onSkip: () => void;
    skipLabel: string;
  }
>(function SearchBox({ language, artists, disabled, triedTitles, onGuess, onSkip, skipLabel }, ref) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<SearchResultItem | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const artistKey = artists?.join("|") ?? "";

  useEffect(() => {
    const q = query.trim();
    if (selected || q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, language });
        for (const a of artistKey ? artistKey.split("|") : []) params.append("artist", a);
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setActive(-1);
          setOpen(true);
        }
      } catch {
        // aborted or offline: keep the previous list
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, language, artistKey, selected]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (rootRef.current?.contains(target) || target.closest("[data-keep-search]")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  // A new round clears the box.
  useEffect(() => {
    if (disabled) {
      setQuery("");
      setSelected(null);
      setResults([]);
      setOpen(false);
    }
  }, [disabled]);

  const choose = (item: SearchResultItem) => {
    setSelected(item);
    setQuery(`${item.title} · ${item.artist}`);
    setOpen(false);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (!selected || disabled) return;
    onGuess(selected);
    setSelected(null);
    setQuery("");
    setResults([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && results[active]) choose(results[active]);
      else if (selected) submit();
      else if (open && results.length === 1) choose(results[0]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const tried = new Set(triedTitles);

  return (
    <div ref={rootRef} className="relative">
      {/* Buttons above the box, so an open result list never covers them. */}
      <div className="mb-3 grid grid-cols-[auto_1fr] gap-3">
        <button type="button" onClick={onSkip} disabled={disabled} className="btn btn-ghost">
          <Icon name="skip" className="size-5" />
          {skipLabel}
        </button>
        <button type="button" onClick={submit} disabled={!selected || disabled} className="btn btn-primary">
          Adivinar
        </button>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3">
          <Icon name="search" className={`size-5 ${loading ? "animate-pulse" : ""}`} />
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Busca la canción por título o artista"
          placeholder={artists?.length ? "Busca entre sus canciones…" : "Título o artista…"}
          className={`field ${selected ? "pr-12" : "pr-11"}`}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query && !disabled && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            className="absolute top-1/2 right-2 -translate-y-1/2 icon-btn size-9"
            onClick={() => {
              setQuery("");
              setSelected(null);
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" className="size-5" />
          </button>
        )}

      {open && query.trim().length >= 2 && !selected && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 animate-fade overflow-hidden rounded-2xl bg-surface-2 shadow-[0_24px_60px_-20px_oklch(0_0_0/0.9)] ring-1 ring-ink/10">
          {results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-3">{loading ? "Buscando…" : "Nada con ese nombre en el catálogo."}</p>
          ) : (
            <ul id={listId} role="listbox" className="max-h-[min(44dvh,360px)] overflow-y-auto p-1.5">
              {results.map((item, i) => {
                const already = tried.has(`${item.title}::${item.artist}`);
                return (
                  <li
                    key={item.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={already}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => !already && choose(item)}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${
                      i === active ? "bg-ink/8" : ""
                    } ${already ? "opacity-40" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.cover} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg bg-surface object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.title}</span>
                      <span className="block truncate text-sm text-ink-3">{item.artist}</span>
                    </span>
                    {already && <span className="text-xs font-semibold text-miss">ya intentada</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      </div>

    </div>
  );
});
