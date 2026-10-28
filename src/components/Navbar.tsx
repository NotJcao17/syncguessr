"use client";

import React from "react";
import { Logo } from "./Logo";
import { Language } from "@/lib/types";

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export function Navbar({
  language,
  onLanguageChange,
  onOpenSettings,
  onOpenHelp,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/40 bg-night/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-ink">
              sync<span className="text-indigo">guessr</span>
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-ink-3 sm:inline-block">
              music game
            </span>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Selector Pills */}
          <div className="flex items-center rounded-full bg-surface p-1 shadow-inner">
            <button
              type="button"
              onClick={() => onLanguageChange("es")}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                language === "es"
                  ? "bg-indigo-deep text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
              title="Canciones en español"
            >
              🇪🇸 <span className="hidden sm:inline">Español</span>
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("en")}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                language === "en"
                  ? "bg-indigo-deep text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
              title="Canciones en inglés"
            >
              🇬🇧 <span className="hidden sm:inline">Inglés</span>
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("all")}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                language === "all"
                  ? "bg-indigo-deep text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
              title="Ambos idiomas"
            >
              🌐 <span className="hidden sm:inline">Ambos</span>
            </button>
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Cómo jugar"
            title="Cómo jugar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Ajustes y Filtros"
            title="Ajustes y Filtros"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
