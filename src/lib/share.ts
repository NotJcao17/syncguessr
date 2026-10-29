import { STAGES, formatPoints } from "./scoring";

/** One line per song: filled blocks up to the stage where it was solved, "x" when missed. */
export function resultGrid(stages: (number | null)[]): string {
  return stages
    .map((s) =>
      s === null ? `${"□".repeat(STAGES.length)}  x` : `${"■".repeat(s + 1)}${"□".repeat(STAGES.length - s - 1)}  ${STAGES[s]}s`
    )
    .join("\n");
}

export function shareText({
  heading,
  score,
  stages,
  url,
}: {
  heading: string;
  score: number;
  stages: (number | null)[];
  url?: string;
}) {
  const solved = stages.filter((s) => s !== null).length;
  return [
    `syncguessr · ${heading}`,
    `${formatPoints(score)} pts · ${solved}/${stages.length} canciones`,
    "",
    resultGrid(stages),
    url ? `\n${url}` : "",
  ]
    .join("\n")
    .trim();
}

/** Native share sheet when there is one, clipboard otherwise. Resolves to what happened. */
export async function shareOrCopy(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return "shared";
    }
  } catch {
    // dismissed: fall back to copying
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
