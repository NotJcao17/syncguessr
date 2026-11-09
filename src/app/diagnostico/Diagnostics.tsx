"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { DEFAULT_FILTERS } from "@/lib/filters";
import { RoundTicket } from "@/lib/types";

const SAMPLES = 10;

interface Sample {
  /** Picking the song (server only, no Deezer). */
  round: number;
  /** Whole audio request as the browser sees it. */
  total: number;
  /** Server time talking to the Deezer API, and downloading the preview. */
  api: number | null;
  audio: number | null;
  quota: number;
  fallback: boolean;
  cache: string;
  status: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function parseServerTiming(header: string | null) {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(",")) {
    const [name, ...params] = part.trim().split(";");
    const value = params.find((p) => p.startsWith("dur=") || p.startsWith("desc="));
    if (name && value) out[name] = value.replace(/^(dur|desc)=/, "").replace(/"/g, "");
  }
  return out;
}

/**
 * Not linked from the app: open /diagnostico on each deployment to compare server regions.
 * Every sample is a fresh random song, so the server's audio cache rarely hides the real cost.
 */
export function Diagnostics() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setSamples([]);
    for (let i = 0; i < SAMPLES; i++) {
      const t0 = performance.now();
      const ticket: RoundTicket | null = await fetch("/api/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: { kind: "filters", filters: DEFAULT_FILTERS } }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const t1 = performance.now();
      if (!ticket) {
        setSamples((s) => [...s, { round: t1 - t0, total: 0, api: null, audio: null, quota: 0, fallback: false, cache: "-", status: 0 }]);
        continue;
      }
      const res = await fetch(`/api/stream?t=${encodeURIComponent(ticket.token)}`, { cache: "no-store" }).catch(() => null);
      if (res) await res.arrayBuffer().catch(() => null);
      const t2 = performance.now();
      const timing = parseServerTiming(res?.headers.get("Server-Timing") ?? null);
      setRegion(res?.headers.get("X-Region") ?? null);
      setSamples((s) => [
        ...s,
        {
          round: t1 - t0,
          total: t2 - t1,
          api: timing.api ? Number(timing.api) : null,
          audio: timing.audio ? Number(timing.audio) : null,
          quota: Number(timing.quota ?? 0),
          fallback: timing.fallback === "1",
          cache: timing.cache ?? "-",
          status: res?.status ?? 0,
        },
      ]);
    }
    setRunning(false);
  };

  const ok = samples.filter((s) => s.status === 200);
  const ms = (n: number | null) => (n === null ? "–" : `${Math.round(n)} ms`);

  return (
    <main className="mx-auto w-full max-w-2xl px-[var(--gutter)] pb-12">
      <header className="flex h-14 items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
          <Icon name="back" className="size-6" />
        </Link>
        <p className="font-bold wide">Diagnóstico</p>
      </header>

      <p className="text-ink-2">
        Pide {SAMPLES} canciones al azar y mide cuánto tarda cada paso. Ábrelo en cada despliegue para comparar regiones.
      </p>
      <button type="button" className="btn btn-primary mt-5" disabled={running} onClick={run}>
        {running ? `Midiendo ${samples.length + 1} de ${SAMPLES}…` : "Medir"}
      </button>

      {samples.length > 0 && (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Región", region ?? "–"],
              ["Audio (mediana)", ms(median(ok.map((s) => s.total)))],
              ["Elegir canción", ms(median(samples.map((s) => s.round)))],
              ["Fallos", `${samples.length - ok.length} de ${samples.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-surface p-4">
                <dt className="text-sm text-ink-3">{k}</dt>
                <dd className="mt-1 text-xl font-extrabold wide">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-ink-3">
                <tr>
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="pr-3 font-semibold">Audio total</th>
                  <th className="pr-3 font-semibold">API Deezer</th>
                  <th className="pr-3 font-semibold">Descarga</th>
                  <th className="pr-3 font-semibold">Cuota</th>
                  <th className="pr-3 font-semibold">Respaldo</th>
                  <th className="font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {samples.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 text-ink-3">{i + 1}</td>
                    <td className="pr-3">{ms(s.total)}</td>
                    <td className="pr-3">{s.cache === "hit" ? "caché" : ms(s.api)}</td>
                    <td className="pr-3">{s.cache === "hit" ? "caché" : ms(s.audio)}</td>
                    <td className={`pr-3 ${s.quota ? "text-miss" : ""}`}>{s.quota}</td>
                    <td className="pr-3">{s.fallback ? "sí" : "no"}</td>
                    <td className={s.status === 200 ? "text-ok" : "text-miss"}>{s.status || "error"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ink-3">
            «API Deezer» y «Descarga» son tiempos del servidor; la diferencia con el total es la red entre tu navegador y el
            servidor. «Cuota» cuenta las veces que Deezer respondió que se excedió su límite de peticiones.
          </p>
        </>
      )}
    </main>
  );
}
