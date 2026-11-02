"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FilterPanel, MIN_SONGS, SongCount } from "@/components/FilterPanel";
import { Icon } from "@/components/Icon";
import { PlayButton, VolumeControl } from "@/components/PlayControls";
import { SearchBox } from "@/components/SearchBox";
import { SetupLayout } from "@/components/SetupLayout";
import { useCatalog } from "@/hooks/useCatalog";
import { usePartyGuest } from "@/hooks/usePartyGuest";
import { HostFeedback, usePartyHost } from "@/hooks/usePartyHost";
import { usePlayback } from "@/hooks/usePlayback";
import { audioEngine } from "@/lib/audioEngine";
import { countSongs } from "@/lib/filters";
import { CODE_LENGTH, cleanName, HOST_ID, normalizeCode, PartyPlayer, PartyState, ranking } from "@/lib/party";
import { formatPoints } from "@/lib/scoring";
import { shareOrCopy } from "@/lib/share";
import { loadFilters, loadVolume, saveFilters } from "@/lib/storage";
import { Filters, SearchResultItem } from "@/lib/types";

const NAME_KEY = "syncguessr:party-name";
const ROUND_OPTIONS = [5, 10, 15];

const loadName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};
const saveName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // blocked storage: the name is asked again next time
  }
};

type View = { kind: "menu" } | { kind: "host"; name: string } | { kind: "guest"; name: string; code: string };

export function FiestaGame() {
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "menu" });
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(() => normalizeCode(params.get("sala") ?? ""));

  const exit = () => {
    if (params.get("sala")) router.replace("/fiesta");
    setView({ kind: "menu" });
  };

  if (view.kind === "host") return <HostView name={view.name} onExit={exit} />;
  if (view.kind === "guest") return <GuestView name={view.name} code={view.code} onExit={exit} />;

  const cleaned = cleanName(name);
  const remember = () => saveName(cleaned);

  return (
    <SetupLayout
      title="Modo fiesta"
      intro={
        <p>
          La música suena en un solo dispositivo, el del host. Los demás se unen con el código y adivinan desde su celular: gana
          quien la saque con menos segundos.
        </p>
      }
      footer={
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={!cleaned}
          onClick={() => {
            remember();
            setView({ kind: "host", name: cleaned });
          }}
        >
          <Icon name="soundwave" className="size-5" />
          Crear sala y poner la música
        </button>
      }
    >
      <label className="block">
        <span className="text-[0.95rem] font-bold wide">Tu nombre</span>
        <input
          type="text"
          className="field mt-3 pl-4"
          maxLength={20}
          autoComplete="nickname"
          placeholder="Cómo te verán los demás"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <form
        className="mt-8 rounded-3xl bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!cleaned || code.length !== CODE_LENGTH) return;
          remember();
          setView({ kind: "guest", name: cleaned, code });
        }}
      >
        <p className="flex items-center gap-2 font-bold wide">
          <Icon name="users" className="size-5 text-indigo-soft" />
          Unirme a una sala
        </p>
        <p className="mt-1 text-sm text-ink-3">Pide el código de {CODE_LENGTH} letras a quien tiene la música.</p>
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            className="field min-w-0 flex-1 pl-4 text-center text-xl font-extrabold tracking-[0.3em] uppercase"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-label="Código de la sala"
            placeholder="ABCD"
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
          />
          <button type="submit" className="btn btn-light" disabled={!cleaned || code.length !== CODE_LENGTH}>
            Unirme
          </button>
        </div>
        {!cleaned && <p className="mt-3 text-sm text-ink-3">Escribe tu nombre arriba para entrar.</p>}
      </form>
    </SetupLayout>
  );
}

// --- Host ---------------------------------------------------------------------------

function HostView({ name, onExit }: { name: string; onExit: () => void }) {
  const host = usePartyHost(name);
  const catalog = useCatalog();
  const playback = usePlayback();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [rounds, setRounds] = useState(5);
  const [volume] = useState(loadVolume);
  const [tried, setTried] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const state = host.state;
  const phase = state?.phase ?? "lobby";

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Reloading the host's tab ends the party for everyone.
  useEffect(() => {
    if (phase === "lobby") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const round = state?.round ?? 0;
  const [triedRound, setTriedRound] = useState(round);
  if (triedRound !== round) {
    setTriedRound(round);
    setTried([]);
  }

  const inviteUrl = host.code && typeof window !== "undefined" ? `${window.location.origin}/fiesta?sala=${host.code}` : "";
  const invite = async () => {
    const r = await shareOrCopy(`Únete a mi sala de syncguessr con el código ${host.code}\n${inviteUrl}`);
    setToast(r === "copied" ? "Invitación copiada" : r === "failed" ? "No se pudo copiar" : null);
    setTimeout(() => setToast(null), 2200);
  };

  const header = (
    <header className="flex h-14 items-center gap-2">
      <button type="button" className="icon-btn -ml-2" aria-label="Cerrar la sala" onClick={onExit}>
        <Icon name="back" className="size-6" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold wide leading-tight">Modo fiesta</p>
        <p className="truncate text-sm text-ink-3">Sala {host.code ?? "…"}</p>
      </div>
      {host.code && (
        <button type="button" className="icon-btn -mr-2" aria-label="Invitar" onClick={invite}>
          <Icon name="share" className="size-6" />
        </button>
      )}
    </header>
  );

  if (host.room === "error") {
    return (
      <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
        {header}
        <ErrorCard
          message="No se pudo abrir la sala. Revisa tu conexión e inténtalo otra vez."
          action={
            <button type="button" className="btn btn-light" onClick={onExit}>
              Volver
            </button>
          }
        />
      </main>
    );
  }

  if (phase === "lobby") {
    const available = catalog ? countSongs(catalog.facets, filters) : null;
    const guests = (state?.players ?? []).filter((p) => p.id !== HOST_ID && p.online);
    return (
      <SetupLayout
        title={
          <>
            Sala <span className="tracking-[0.12em] text-indigo-soft">{host.code ?? "····"}</span>
          </>
        }
        intro={
          <p>
            {host.room === "connecting"
              ? "Abriendo la sala…"
              : "Que los demás abran syncguessr, entren a Modo fiesta y escriban este código."}
          </p>
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <SongCount facets={catalog?.facets ?? null} filters={filters} />
              <p className="mt-0.5 text-ink-3">
                {guests.length === 0 ? "Esperando jugadores" : `${guests.length + 1} jugadores contándote`}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={host.room !== "open" || (available !== null && available < Math.max(MIN_SONGS, rounds))}
              onClick={() => {
                saveFilters(filters);
                void host.startGame({ kind: "filters", filters }, rounds, filters.language);
              }}
            >
              Empezar
              <Icon name="next" className="size-5" />
            </button>
          </div>
        }
      >
        {host.code && (
          <button type="button" onClick={invite} className="btn btn-ghost btn-sm -mt-2 mb-6">
            <Icon name="link" className="size-4" />
            {toast ?? "Copiar invitación"}
          </button>
        )}
        {host.error && <p className="mb-5 rounded-2xl bg-surface px-4 py-3 text-sm text-miss">{host.error}</p>}
        <h2 className="text-[0.95rem] font-bold wide">Jugadores</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(state?.players ?? []).map((p) => (
            <li key={p.id} className={`chip ${p.online ? "" : "opacity-50"}`}>
              {p.name}
              {p.id === HOST_ID && <span className="count">host</span>}
            </li>
          ))}
        </ul>

        <fieldset className="mt-8">
          <legend className="text-[0.95rem] font-bold wide">Canciones por partida</legend>
          <div className="mt-3 flex gap-2" role="radiogroup">
            {ROUND_OPTIONS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rounds === n} className="chip" onClick={() => setRounds(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-6">
          <FilterPanel value={filters} onChange={setFilters} facets={catalog?.facets ?? null} />
        </div>
      </SetupLayout>
    );
  }

  const me = state?.players.find((p) => p.id === HOST_ID);
  const stages = host.stages;
  const stage = state?.stage ?? 0;
  const isLast = stage >= stages.length - 1;

  if (phase === "final" && state) {
    return (
      <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
        {header}
        <FinalStandings state={state} myId={HOST_ID} />
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            Cerrar sala
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={host.backToLobby}>
            Otra partida
            <Icon name="next" className="size-5" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
      {header}
      {state && <RoundHeader state={state} />}

      {phase === "reveal" && state ? (
        <RoundResult state={state} myId={HOST_ID}>
          <div className="mt-6 flex items-center gap-3">
            <PlayButton playback={playback} loading={false} onPlay={host.play} size="md" />
            <button type="button" className="btn btn-light flex-1" onClick={host.next}>
              {state.round + 1 >= state.rounds ? "Ver ganador" : "Siguiente canción"}
              <Icon name="next" className="size-5" />
            </button>
          </div>
        </RoundResult>
      ) : (
        <>
          <section className="mt-4 rounded-3xl bg-surface p-4" data-keep-search>
            <StageDots stages={stages} stage={stage} />
            <div className="mt-4 flex items-center gap-4">
              <PlayButton playback={playback} loading={phase === "loading"} onPlay={host.play} />
              <div className="min-w-0 flex-1">
                <p className="display text-[2.6rem] leading-none">
                  {stages[stage]}
                  <span className="text-[0.5em] tracking-[-0.02em]">s</span>
                </p>
                <p className="mt-1 text-sm text-ink-3">{phase === "loading" ? "Cargando canción…" : "Suena aquí"}</p>
              </div>
              <VolumeControl initial={volume} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-ghost btn-sm" disabled={phase !== "playing"} onClick={host.openNextStage}>
                {isLast ? "Terminar ronda" : `Abrir ${stages[stage + 1]}s`}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={phase !== "playing"} onClick={host.reveal}>
                Revelar
              </button>
            </div>
          </section>
          {host.error && <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-miss">{host.error}</p>}

          <div className="mt-6">
            <GuessArea
              state={state}
              me={me}
              feedback={host.feedback}
              tried={tried}
              onGuess={(item) => {
                setTried((t) => [...t, `${item.title}::${item.artist}`]);
                host.guess(item);
              }}
              onPass={host.pass}
            />
          </div>
          {state && <Scoreboard players={state.players} myId={HOST_ID} live />}
        </>
      )}
    </main>
  );
}

// --- Guest ----------------------------------------------------------------------------

function GuestView({ name, code, onExit }: { name: string; code: string; onExit: () => void }) {
  const guest = usePartyGuest(code, name);
  const [tried, setTried] = useState<string[]>([]);
  const state = guest.state;
  const me = state?.players.find((p) => p.id === guest.myId);

  const round = state?.round ?? 0;
  const [triedRound, setTriedRound] = useState(round);
  if (triedRound !== round) {
    setTriedRound(round);
    setTried([]);
  }

  const header = (
    <header className="flex h-14 items-center gap-2">
      <button type="button" className="icon-btn -ml-2" aria-label="Salir de la sala" onClick={onExit}>
        <Icon name="back" className="size-6" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold wide leading-tight">Sala {code}</p>
        <p className="truncate text-sm text-ink-3">{name}</p>
      </div>
    </header>
  );

  if (guest.status === "error" || guest.status === "closed") {
    return (
      <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
        {header}
        <ErrorCard
          message={guest.status === "closed" ? "Se perdió la conexión con el host." : (guest.error ?? "No se pudo conectar.")}
          action={
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-light" onClick={guest.retry}>
                Reconectar
              </button>
              <button type="button" className="btn btn-ghost" onClick={onExit}>
                Salir
              </button>
            </div>
          }
        />
      </main>
    );
  }

  if (guest.status === "connecting" || !state) {
    return (
      <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
        {header}
        <p className="mt-10 text-center text-ink-3">Conectando con la sala…</p>
      </main>
    );
  }

  if (state.phase === "lobby") {
    return (
      <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
        {header}
        <div className="mt-6 rounded-3xl bg-surface p-6">
          <Icon name="check" className="size-7 text-ok" />
          <p className="mt-3 text-xl font-bold wide">Ya estás dentro</p>
          <p className="mt-1 text-ink-2">Espera a que el host empiece. La música suena en su dispositivo.</p>
        </div>
        <Scoreboard players={state.players} myId={guest.myId} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
      {header}
      {state.phase === "final" ? (
        <FinalStandings state={state} myId={guest.myId} />
      ) : (
        <>
          <RoundHeader state={state} />
          {state.phase === "reveal" ? (
            <RoundResult state={state} myId={guest.myId}>
              <p className="mt-6 text-center text-sm text-ink-3">El host pasa a la siguiente canción.</p>
            </RoundResult>
          ) : (
            <>
              <section className="mt-4 rounded-3xl bg-surface p-4">
                <StageDots stages={state.stages} stage={state.stage} />
                <p className="mt-4 display text-[2.6rem] leading-none">
                  {state.stages[state.stage]}
                  <span className="text-[0.5em] tracking-[-0.02em]">s</span>
                </p>
                <p className="mt-1 text-sm text-ink-3">
                  {state.phase === "loading" ? "El host está cargando la canción…" : "Escucha en el dispositivo del host"}
                </p>
              </section>
              <div className="mt-6">
                <GuessArea
                  state={state}
                  me={me}
                  feedback={guest.feedback}
                  tried={tried}
                  onGuess={(item) => {
                    setTried((t) => [...t, `${item.title}::${item.artist}`]);
                    guest.guess(item);
                  }}
                  onPass={guest.pass}
                />
              </div>
              <Scoreboard players={state.players} myId={guest.myId} live />
            </>
          )}
        </>
      )}
    </main>
  );
}

// --- Shared pieces --------------------------------------------------------------------------

function ErrorCard({ message, action }: { message: string; action: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-3xl bg-surface p-6">
      <Icon name="danger" className="size-7 text-miss" />
      <p className="mt-3 text-lg font-bold wide">{message}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}

function RoundHeader({ state }: { state: PartyState }) {
  return (
    <p className="text-sm font-semibold text-ink-2">
      Canción <span className="text-ink">{state.round + 1}</span> de {state.rounds}
    </p>
  );
}

/** The five clips; the open one is highlighted. */
function StageDots({ stages, stage }: { stages: number[]; stage: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Pistas">
      {stages.map((s, i) => (
        <li
          key={s}
          aria-current={i === stage ? "step" : undefined}
          className={`rounded-xl py-1.5 text-center text-sm font-bold tabular-nums ${
            i === stage ? "bg-indigo-deep text-ink" : i < stage ? "bg-ink/8 text-ink-2" : "bg-ink/4 text-ink-3"
          }`}
        >
          {s}s
        </li>
      ))}
    </ol>
  );
}

function GuessArea({
  state,
  me,
  feedback,
  tried,
  onGuess,
  onPass,
}: {
  state: PartyState | null;
  me: PartyPlayer | undefined;
  feedback: HostFeedback | null;
  tried: string[];
  onGuess: (item: SearchResultItem) => void;
  onPass: () => void;
}) {
  const canGuess = state?.phase === "playing" && me?.status === "guessing";
  const message =
    me?.status === "correct"
      ? { tone: "text-ok", text: `La tienes: ${feedback?.title ?? "correcto"}. +${formatPoints(me.roundPoints)} pts` }
      : me?.status === "waiting"
        ? {
            tone: "text-ink-2",
            text: feedback && !feedback.correct
              ? `No es ${feedback.title}${feedback.artistMatch ? ", pero el artista sí" : ""}. Espera la siguiente pista.`
              : "Pasaste. Espera la siguiente pista.",
          }
        : null;
  return (
    <div>
      <SearchBox
        language={state?.language ?? "all"}
        disabled={!canGuess}
        triedTitles={tried}
        onGuess={onGuess}
        onSkip={onPass}
        skipLabel="Paso"
      />
      {message && <p className={`mt-3 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold ${message.tone}`}>{message.text}</p>}
    </div>
  );
}

const STATUS_LABEL: Record<PartyPlayer["status"], string> = {
  guessing: "pensando",
  waiting: "esperando pista",
  correct: "la tiene",
  out: "",
};

function Scoreboard({ players, myId, live = false }: { players: PartyPlayer[]; myId: string | null; live?: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="text-[0.95rem] font-bold wide">Marcador</h2>
      <ol className="mt-3 space-y-1.5">
        {ranking(players).map((p, i) => (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${p.id === myId ? "bg-indigo-deep/35" : "bg-surface"} ${
              p.online ? "" : "opacity-50"
            }`}
          >
            <span className="w-5 text-sm font-bold tabular-nums text-ink-3">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
            {live && (
              <span className={`text-xs font-semibold ${p.status === "correct" ? "text-ok" : "text-ink-3"}`}>
                {p.online ? STATUS_LABEL[p.status] : "desconectado"}
              </span>
            )}
            <span className="font-bold tabular-nums">{formatPoints(p.score)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RoundResult({ state, myId, children }: { state: PartyState; myId: string | null; children?: React.ReactNode }) {
  const track = state.track;
  const me = state.players.find((p) => p.id === myId);
  return (
    <section className="mt-4">
      <div className="flex items-center gap-4 rounded-3xl bg-surface p-4">
        {track ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverXl} alt="" className="size-24 shrink-0 animate-rise rounded-2xl object-cover" />
        ) : (
          <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-night-deep text-ink-3">
            <Icon name="note" className="size-8" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-3">Era</p>
          <p className="text-xl leading-tight font-extrabold wide">{track?.title ?? "…"}</p>
          <p className="mt-0.5 font-semibold text-indigo-soft">{track?.artist}</p>
          {track && <p className="text-sm text-ink-3">{track.year}</p>}
        </div>
      </div>
      {me && (
        <p className={`mt-4 text-center text-lg font-bold wide ${me.roundPoints > 0 ? "text-ok" : "text-ink-2"}`}>
          {me.status === "correct" ? `+${formatPoints(me.roundPoints)} pts` : me.roundPoints > 0 ? `+${formatPoints(me.roundPoints)} por el artista` : "Esta vez no"}
        </p>
      )}
      {children}
      <section className="mt-6">
        <h2 className="text-[0.95rem] font-bold wide">Marcador</h2>
        <ol className="mt-3 space-y-1.5">
          {ranking(state.players).map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${p.id === myId ? "bg-indigo-deep/35" : "bg-surface"}`}>
              <span className="w-5 text-sm font-bold tabular-nums text-ink-3">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              {p.roundPoints > 0 && <span className="text-sm font-semibold text-ok tabular-nums">+{formatPoints(p.roundPoints)}</span>}
              <span className="font-bold tabular-nums">{formatPoints(p.score)}</span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function FinalStandings({ state, myId }: { state: PartyState; myId: string | null }) {
  const order = ranking(state.players);
  const winner = order[0];
  const tie = order.length > 1 && order[1].score === winner?.score;
  return (
    <section className="pt-6 text-center">
      <p className="text-lg font-bold wide text-ink-2">{tie ? "Empate en la cima" : "Gana"}</p>
      <p className="display mt-2 text-[clamp(2.4rem,10vw,3.6rem)] leading-none text-indigo-soft">
        {tie ? order.filter((p) => p.score === winner.score).map((p) => p.name).join(" y ") : winner?.name}
      </p>
      <p className="mt-3 text-ink-3 tabular-nums">{formatPoints(winner?.score ?? 0)} pts</p>
      <ol className="mt-8 space-y-1.5 text-left">
        {order.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${p.id === myId ? "bg-indigo-deep/35" : "bg-surface"}`}>
            <span className="w-5 text-sm font-bold tabular-nums text-ink-3">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
            <span className="font-bold tabular-nums">{formatPoints(p.score)}</span>
          </li>
        ))}
      </ol>
      {myId !== HOST_ID && <p className="mt-6 text-sm text-ink-3">El host puede empezar otra partida en la misma sala.</p>}
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-ink-3 hover:text-ink">
        Ir al inicio
      </Link>
    </section>
  );
}
