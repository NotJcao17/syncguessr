"use client";

import React from "react";

export function HelpModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line/60 bg-surface p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-line/40 pb-4">
          <h2 className="text-xl font-extrabold text-ink">¿Cómo se juega?</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs sm:text-sm text-ink-2 leading-relaxed">
          <p>
            <strong className="text-ink">1. Escucha el fragmento:</strong> El juego empieza con una pista de solo <strong className="text-indigo">0.1 segundos</strong>. Aunque parezca imposible, el timbre de un instrumento o de la voz muchas veces es suficiente para identificarla.
          </p>
          <p>
            <strong className="text-ink">2. Busca y adivina:</strong> Escribe en el buscador el título o artista. Elige la canción sugerida y presiona <strong className="text-ink">Adivinar</strong>.
          </p>
          <p>
            <strong className="text-ink">3. Desbloquea más pistas:</strong> Cada vez que falles o pulses <strong className="text-amber">Omitir</strong>, avanzarás a la siguiente etapa revelando un fragmento más largo:
          </p>
          <ul className="grid grid-cols-5 gap-1.5 py-1 text-center font-mono font-bold text-xs">
            <li className="rounded-lg bg-surface-2 p-1.5">0.1s</li>
            <li className="rounded-lg bg-surface-2 p-1.5">0.5s</li>
            <li className="rounded-lg bg-surface-2 p-1.5">2.0s</li>
            <li className="rounded-lg bg-surface-2 p-1.5">8.0s</li>
            <li className="rounded-lg bg-surface-2 p-1.5">15.0s</li>
          </ul>
          <p>
            <strong className="text-ink">4. Sin límites diarios:</strong> Juega todas las rondas que quieras sin registro ni esperas. El sistema guarda en tu navegador las canciones jugadas para no repetírtelas.
          </p>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary w-full py-3.5 text-sm font-bold shadow-md"
          >
            ¡Entendido, a jugar!
          </button>
        </div>
      </div>
    </div>
  );
}
