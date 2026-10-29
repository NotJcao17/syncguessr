"use client";

import { STAGE_POINTS, STAGES, formatPoints } from "@/lib/scoring";
import { Sheet } from "./Sheet";

const SHORTCUTS: [string, string][] = [
  ["Espacio", "Escuchar o detener (fuera del buscador)"],
  ["Ctrl + Espacio", "Escuchar desde el buscador"],
  ["/", "Ir al buscador"],
  ["↑ ↓ y Enter", "Elegir canción y adivinar"],
  ["S", "Saltar a la siguiente pista"],
  ["N", "Siguiente canción al terminar"],
];

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Cómo se juega">
      <ol className="space-y-3 text-ink-2">
        <li>
          <strong className="text-ink">Escucha.</strong> Empiezas con una décima de segundo de la canción.
        </li>
        <li>
          <strong className="text-ink">Busca y adivina.</strong> Escribe el título o el artista y elige de la lista. Solo
          aparecen canciones del catálogo, sin covers ni versiones repetidas.
        </li>
        <li>
          <strong className="text-ink">Cada fallo o salto abre un fragmento más largo:</strong>{" "}
          {STAGES.map((s) => `${s}s`).join(", ")}. Si fallas pero el artista es correcto, te lo decimos.
        </li>
      </ol>

      <h3 className="mt-7 text-base">Puntos en partida</h3>
      <div className="mt-3 grid grid-cols-5 gap-2 text-center">
        {STAGES.map((s, i) => (
          <div key={s} className="rounded-2xl bg-night-deep/60 px-1 py-3">
            <p className="text-sm font-bold wide">{s}s</p>
            <p className="mt-1 text-sm tabular-nums text-ink-3">{formatPoints(STAGE_POINTS[i])}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-3">
        Cada acierto seguido suma 10% extra (hasta 50%). Si no la adivinas pero acertaste el artista, te llevas un cuarto de
        los puntos de esa pista.
      </p>

      <h3 className="mt-7 text-base">Atajos de teclado</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt>
              <span className="kbd">{k}</span>
            </dt>
            <dd className="text-right text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
