"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SessionConfig, ScoredOutcome, useGameSession } from "@/hooks/useGameSession";
import { usePlayback } from "@/hooks/usePlayback";
import { useRound } from "@/hooks/useRound";
import { audioEngine } from "@/lib/audioEngine";
import { formatPoints } from "@/lib/scoring";
import { loadRecord, loadVolume } from "@/lib/storage";
import { LanguageFilter } from "@/lib/types";
import { AttemptLog } from "./AttemptLog";
import { GameSummary } from "./GameSummary";
import { HelpSheet } from "./HelpSheet";
import { Icon } from "./Icon";
import { PlayButton, VolumeControl } from "./PlayControls";
import { RevealPanel } from "./RevealPanel";
import { SearchBox, SearchBoxHandle } from "./SearchBox";
import { StageRuler } from "./StageRuler";

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);

export interface GameScreenProps {
  config: SessionConfig;
  /** Clip lengths in use, shortest first. */
  stages: number[];
  title: string;
  /** Restricts the search box (language filter, chosen artists). */
  searchLanguage: LanguageFilter;
  searchArtists?: string[];
  /** Fixed games: where the high score is kept. */
  recordKey?: string;
  summaryHeading?: string;
  challengeUrl?: string;
  rival?: number | null;
  onFinished?: (outcomes: ScoredOutcome[], score: number) => void;
  onAgain?: () => void;
  /** Back to the setup screen (filters, artists); without it the back arrow goes home. */
  onExit?: () => void;
  exitLabel?: string;
  /** Extra controls in the top bar (filters button in free mode). */
  toolbar?: ReactNode;
  /** Shown under the title (active filters, artists). */
  subtitle?: ReactNode;
}

export function GameScreen(props: GameScreenProps) {
  const { config, stages, recordKey } = props;
  const session = useGameSession({ ...config, recordKey, onFinished: props.onFinished });
  const playback = usePlayback();
  const [helpOpen, setHelpOpen] = useState(false);
  const [volume] = useState(loadVolume);
  const [record] = useState(() => (recordKey ? loadRecord(recordKey) : null));
  const [interacted, setInteracted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const searchRef = useRef<SearchBoxHandle>(null);

  const round = useRound({
    ticket: session.ticket,
    stages,
    autoPlay: interacted,
    onFinish: session.onRoundFinished,
  });

  const revealed = round.phase === "won" || round.phase === "lost";
  const outcome = revealed ? session.outcomes[session.outcomes.length - 1] : undefined;
  const counted = config.count !== null;

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Start once on mount; the page remounts this component for a new configuration.
  const { start } = session;
  useEffect(() => {
    void start();
  }, [start]);

  const { handleLoadError, updateLastTrack } = session;
  useEffect(() => {
    if (round.phase === "error") void handleLoadError();
  }, [round.phase, handleLoadError]);

  useEffect(() => {
    if (round.track) updateLastTrack(round.track);
  }, [round.track, updateLastTrack]);

  const goNext = useCallback(() => {
    setInteracted(true);
    audioEngine.stop();
    if (counted && session.isLast) {
      setShowSummary(true);
      window.scrollTo({ top: 0 });
      return;
    }
    void session.next();
  }, [counted, session]);

  const play = useCallback(
    (stage?: number) => {
      setInteracted(true);
      round.play(stage);
    },
    [round]
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (helpOpen || e.altKey || e.metaKey) return;
      const typing = isTyping(document.activeElement);
      if (e.code === "Space" && (e.ctrlKey || !typing)) {
        e.preventDefault();
        if (playback.playing) audioEngine.stop();
        else play();
        return;
      }
      if (typing || e.ctrlKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if ((e.key === "s" || e.key === "S") && round.phase === "ready") {
        round.skip();
      } else if ((e.key === "n" || e.key === "N") && revealed) {
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [helpOpen, playback.playing, play, round, revealed, goNext]);

  // Leaving the screen stops the music.
  useEffect(() => () => audioEngine.stop(), []);

  const isLastStage = round.unlocked >= stages.length - 1;
  const triedTitles = round.attempts.filter((a) => a.guess).map((a) => `${a.guess!.title}::${a.guess!.artist}`);

  const back = props.onExit ? (
    <button type="button" className="icon-btn -ml-2" aria-label={props.exitLabel ?? "Volver"} onClick={props.onExit}>
      <Icon name="back" className="size-6" />
    </button>
  ) : (
    <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
      <Icon name="back" className="size-6" />
    </Link>
  );

  const topBar = (
    <header className="flex h-14 items-center justify-between gap-2">
      {back}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold wide leading-tight">{props.title}</p>
        {props.subtitle && <div className="truncate text-sm text-ink-3">{props.subtitle}</div>}
      </div>
      {props.toolbar}
      <button type="button" className="icon-btn -mr-2" aria-label="Cómo se juega" onClick={() => setHelpOpen(true)}>
        <Icon name="help" className="size-6" />
      </button>
    </header>
  );

  const summary = session.result;
  const freeStreak = session.freeStreak;
  if (showSummary && summary) {
    return (
      <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-12">
        {topBar}
        <div className="pt-4">
          <GameSummary
            heading={props.summaryHeading ?? props.title}
            outcomes={session.outcomes}
            score={session.score}
            record={summary.record}
            isRecord={summary.isRecord}
            challengeUrl={props.challengeUrl}
            rival={props.rival}
            onAgain={props.onAgain}
            onChange={props.onExit}
            changeLabel={props.exitLabel}
          />
        </div>
        <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-10">
      {topBar}

      <div className="flex min-h-6 items-center justify-between gap-3 text-sm font-semibold text-ink-2">
        {counted ? (
          <>
            <span>
              Canción <span className="text-ink">{Math.min(session.index + 1, config.count!)}</span> de {config.count}
            </span>
            <span className="flex items-center gap-3 tabular-nums">
              {session.streak >= 2 && (
                <span className="flex items-center gap-1 text-ember-soft">
                  <Icon name="fire" className="size-4" />×{(1 + Math.min(session.streak, 5) * 0.1).toFixed(1)}
                </span>
              )}
              <span className="text-ink">{formatPoints(session.score)} pts</span>
              {record && <span className="text-ink-3">récord {formatPoints(record.score)}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Icon name="fire" className={`size-4 ${freeStreak.current ? "text-ember-soft" : "text-ink-3"}`} />
              Racha <span className="text-ink tabular-nums">{freeStreak.current}</span>
            </span>
            <span className="tabular-nums text-ink-3">Mejor racha {freeStreak.best}</span>
          </>
        )}
      </div>

      {session.error ? (
        <div className="mt-8 rounded-3xl bg-surface p-6">
          <Icon name="danger" className="size-7 text-miss" />
          <p className="mt-3 text-lg font-bold wide">{session.error}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                session.dismissError();
                void session.start();
              }}
            >
              Intentar de nuevo
            </button>
            {props.onExit ? (
              <button type="button" className="btn btn-ghost" onClick={props.onExit}>
                {props.exitLabel ?? "Volver"}
              </button>
            ) : (
              <Link href="/" className="btn btn-ghost">
                Inicio
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <section className="mt-4" data-keep-search>
            <StageRuler
              stages={stages}
              unlocked={round.unlocked}
              attempts={round.attempts}
              playback={playback}
              peaks={round.peaks}
              revealed={revealed}
              onSelect={(i) => play(i)}
            />

            <div className="mt-4 flex items-center gap-4">
              <PlayButton
                playback={playback}
                loading={round.phase === "loading"}
                disabled={round.phase === "error"}
                onPlay={() => play(round.listening)}
              />
              <div className="min-w-0 flex-1">
                <p className="display text-[2.6rem] leading-none">
                  {stages[round.listening]}
                  <span className="text-[0.5em] tracking-[-0.02em]">s</span>
                </p>
                <p className="mt-1 text-sm text-ink-3">
                  {round.phase === "loading" ? (
                    "Cargando canción…"
                  ) : (
                    <>
                      Pista <span className="font-bold text-ink">{round.unlocked + 1}</span> de {stages.length}
                    </>
                  )}
                </p>
              </div>
              <VolumeControl initial={volume} />
            </div>
          </section>

          {session.notice && <p className="mt-4 rounded-2xl bg-indigo-night/60 px-4 py-3 text-sm text-indigo-soft">{session.notice}</p>}

          <div className="mt-6">
            {round.phase === "error" ? (
              <div className="rounded-3xl bg-surface p-5">
                <p className="font-semibold">No se pudo cargar el audio de esta canción.</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" className="btn btn-light btn-sm" onClick={round.reload}>
                    Reintentar
                  </button>
                  {!counted && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void session.reroll()}>
                      Otra canción
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <SearchBox
                  ref={searchRef}
                  language={props.searchLanguage}
                  artists={props.searchArtists}
                  disabled={round.phase !== "ready"}
                  triedTitles={triedTitles}
                  onGuess={(item) => void round.guess(item)}
                  onSkip={isLastStage ? round.giveUp : round.skip}
                  skipLabel={isLastStage ? "Rendirse" : `+${(stages[round.unlocked + 1] - stages[round.unlocked]).toFixed(1).replace(/\.0$/, "")}s`}
                />
                <AttemptLog attempts={round.attempts} stages={stages} />
                {!counted && round.attempts.length === 0 && round.phase === "ready" && (
                  <button
                    type="button"
                    onClick={() => void session.reroll()}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink"
                  >
                    <Icon name="refresh" className="size-4" />
                    Cambiar de canción
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {revealed && outcome && (
        <RevealPanel
          won={round.phase === "won"}
          stageSeconds={stages[outcome.stage]}
          track={round.track}
          revealFailed={round.revealFailed}
          points={outcome.points}
          multiplier={outcome.multiplier}
          showPoints={counted}
          guessedArtist={round.attempts.find((a) => a.kind === "correct")?.guess?.artist}
          playback={playback}
          onPlay={() => play()}
          onRetryReveal={round.retryReveal}
          onNext={goNext}
          nextLabel={counted && session.isLast ? "Ver resultado" : "Siguiente canción"}
        />
      )}

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}
