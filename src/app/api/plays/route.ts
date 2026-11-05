import { connection, NextResponse } from "next/server";

// The project has no database, so the count lives in Abacus, a free public counter API. It only ever
// receives a +1, nothing about the player. Previews and local runs use their own counter.
const KEY = process.env.VERCEL_ENV === "production" ? "games" : "games-dev";

async function counter(action: "get" | "hit"): Promise<number | null> {
  try {
    const res = await fetch(`https://abacus.jasoncameron.dev/${action}/syncguessr/${KEY}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}

/** Total games played. Unknown (503) until the first game finishes or if the counter is down. */
export async function GET() {
  await connection();
  const plays = await counter("get");
  if (plays === null) return NextResponse.json({ error: "Sin contador" }, { status: 503 });
  return NextResponse.json({ plays }, { headers: { "Cache-Control": "public, s-maxage=60" } });
}

export async function POST() {
  return NextResponse.json({ plays: await counter("hit") });
}
