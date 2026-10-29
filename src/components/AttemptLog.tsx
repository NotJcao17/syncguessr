import type { Attempt } from "@/hooks/useRound";

/** What happened at each stage, so a near miss ("right artist") is information, not just a red dot. */
export function AttemptLog({ attempts, stages }: { attempts: Attempt[]; stages: number[] }) {
  const shown = attempts.filter((a) => a.kind !== "correct");
  if (shown.length === 0) return null;
  return (
    <ol className="mt-5 space-y-1.5" aria-label="Intentos">
      {shown.map((a, i) => (
        <li key={i} className="flex items-baseline gap-3 text-sm">
          <span className="w-10 shrink-0 text-right font-bold tabular-nums text-ink-3 wide">{stages[a.stage]}s</span>
          {a.kind === "skip" ? (
            <span className="text-skip">Saltada</span>
          ) : (
            <span className="min-w-0">
              <span className="text-ink-2 line-through decoration-miss/70">
                {a.guess?.title} · {a.guess?.artist}
              </span>
              {a.artistMatch && <span className="ml-2 font-semibold text-indigo-soft">el artista sí es</span>}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
