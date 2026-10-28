"use client";

import React, { useState, useEffect, useRef } from "react";
import { SearchResultItem, Language } from "@/lib/types";

interface SearchBarProps {
  currentTrackId: number | null;
  language?: Language;
  onGuess: (trackId: number) => void;
  onSkip: () => void;
  disabled?: boolean;
  isLastStage?: boolean;
}

export function SearchBar({
  currentTrackId,
  language = "all",
  onGuess,
  onSkip,
  disabled = false,
  isLastStage = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // If user just clicked an item, don't re-search for the exact text
    if (selectedItem && `${selectedItem.title} — ${selectedItem.artist}` === query) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          language,
        });
        if (currentTrackId) {
          params.append("currentTrackId", String(currentTrackId));
        }

        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, currentTrackId, language, selectedItem]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    setSelectedItem(item);
    setQuery(`${item.title} — ${item.artist}`);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      onGuess(selectedItem.id);
      setQuery("");
      setSelectedItem(null);
      setSuggestions([]);
    }
  };

  const handleSkipClick = () => {
    setQuery("");
    setSelectedItem(null);
    setSuggestions([]);
    onSkip();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl px-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Search input container */}
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedItem(null);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder="Buscar por artista o título de canción..."
            className="w-full rounded-2xl border border-line bg-surface/90 px-12 py-3.5 text-sm font-semibold text-ink placeholder-ink-3 shadow-lg outline-none transition-all focus:border-indigo focus:ring-2 focus:ring-indigo-soft/30 disabled:opacity-50 sm:text-base"
          />

          {/* Left search icon */}
          <div className="pointer-events-none absolute left-4 text-ink-3">
            {isSearching ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </div>

          {/* Clear button */}
          {query && !disabled && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedItem(null);
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="absolute right-4 text-ink-3 hover:text-ink"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Action Buttons: Skip and Guess */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={handleSkipClick}
            className="btn btn-ghost flex-1 py-3 text-sm font-bold text-amber shadow-sm"
          >
            {isLastStage ? "Rendirse / Revelar" : "Omitir (+ siguiente pista)"}
          </button>

          <button
            type="submit"
            disabled={disabled || !selectedItem}
            className="btn btn-primary flex-1 py-3 text-sm font-bold shadow-lg"
          >
            Adivinar
          </button>
        </div>
      </form>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-4 right-4 z-50 mt-2 max-h-80 sm:max-h-96 overflow-y-auto rounded-2xl border border-line bg-surface-2 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-3 border-b border-line/30 mb-1">
            Canciones disponibles ({suggestions.length})
          </div>
          <ul className="space-y-0.5">
            {suggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors ${
                    isHighlighted ? "bg-indigo-deep/40 text-ink" : "hover:bg-surface text-ink-2"
                  }`}
                >
                  {/* Album Cover Art */}
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-3">
                      🎵
                    </div>
                  )}

                  {/* Track and Artist Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-ink-3 font-semibold">
                      {item.artist}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
