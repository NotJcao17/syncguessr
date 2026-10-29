"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { Navbar } from "@/components/Navbar";
import { StageTimeline } from "@/components/StageTimeline";
import { AudioController } from "@/components/AudioController";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { SettingsModal } from "@/components/SettingsModal";
import { HelpModal } from "@/components/HelpModal";
import { audioEngine } from "@/lib/audioEngine";
import {
  Language,
  Genre,
  Era,
  Difficulty,
  StageConfig,
  StageStatus,
  RoundResponse,
  VerifyResponse,
  ALL_GENRES,
  ALL_ERAS,
  ALL_DIFFICULTIES,
} from "@/lib/types";

const DEFAULT_STAGES: StageConfig[] = [
  { index: 0, duration: 0.1, enabled: true },
  { index: 1, duration: 0.5, enabled: true },
  { index: 2, duration: 2.0, enabled: true },
  { index: 3, duration: 8.0, enabled: true },
  { index: 4, duration: 15.0, enabled: true },
];

export default function GamePage() {
  // Settings & Filters (Multi-select)
  const [language, setLanguage] = useState<Language>("all");
  const [genres, setGenres] = useState<Genre[]>(() => ALL_GENRES.map((g) => g.id));
  const [eras, setEras] = useState<Era[]>(() => ALL_ERAS.map((e) => e.id));
  const [difficulties, setDifficulties] = useState<Difficulty[]>(() => ALL_DIFFICULTIES.map((d) => d.id));
  const [stages, setStages] = useState<StageConfig[]>(DEFAULT_STAGES);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Game Progress State
  const [currentRound, setCurrentRound] = useState<RoundResponse | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [stageStatuses, setStageStatuses] = useState<StageStatus[]>([
    "active",
    "locked",
    "locked",
    "locked",
    "locked",
  ]);
  const [hasMadeAttempt, setHasMadeAttempt] = useState(false);
  const [playedIds, setPlayedIds] = useState<number[]>([]);

  // Audio Playback & Volume State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [volume, setVolume] = useState(0.85);

  // Game End State
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [revealedTrack, setRevealedTrack] = useState<VerifyResponse["track"] | null>(null);

  // Monotonic sequence counter to prevent race conditions on round load
  const roundSeqRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const lastArtistRef = useRef<string>("");

  const [, startTransition] = useTransition();

  // Load preferences from localStorage on mount (once)
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("syncguessr_lang") as Language;
      if (savedLang && (savedLang === "es" || savedLang === "en" || savedLang === "all")) {
        setLanguage(savedLang);
      }

      const savedGenres = localStorage.getItem("syncguessr_genres");
      if (savedGenres) {
        const parsed = JSON.parse(savedGenres);
        if (Array.isArray(parsed) && parsed.length > 0) setGenres(parsed);
      }

      const savedEras = localStorage.getItem("syncguessr_eras");
      if (savedEras) {
        const parsed = JSON.parse(savedEras);
        if (Array.isArray(parsed) && parsed.length > 0) setEras(parsed);
      }

      const savedDiffs = localStorage.getItem("syncguessr_diffs");
      if (savedDiffs) {
        const parsed = JSON.parse(savedDiffs);
        if (Array.isArray(parsed) && parsed.length > 0) setDifficulties(parsed);
      }

      const savedPlayed = localStorage.getItem("syncguessr_history");
      if (savedPlayed) {
        const parsed = JSON.parse(savedPlayed);
        if (Array.isArray(parsed)) setPlayedIds(parsed);
      }

      const savedVol = localStorage.getItem("syncguessr_vol");
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          setVolume(parsed);
          audioEngine.setVolume(parsed);
        }
      }
    } catch {}
  }, []);

  // Sync callbacks with AudioEngine
  useEffect(() => {
    audioEngine.setCallbacks(
      (playing) => setIsPlaying(playing),
      (prog) => setPlayProgress(prog)
    );
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
    try {
      localStorage.setItem("syncguessr_vol", String(newVol));
    } catch {}
  };

  // Fetch a new round cleanly
  const startNewRound = useCallback(
    async (overrides?: {
      language?: Language;
      genres?: Genre[];
      eras?: Era[];
      difficulties?: Difficulty[];
    }) => {
      const seq = ++roundSeqRef.current;

      audioEngine.stop();
      setIsPlaying(false);
      setPlayProgress(0);
      setWon(false);
      setLost(false);
      setRevealedTrack(null);
      setCurrentStageIdx(0);
      setHasMadeAttempt(false);
      setStageStatuses(["active", "locked", "locked", "locked", "locked"]);
      setIsLoadingAudio(true);

      const langToUse = overrides?.language || language;
      const genresToUse = overrides?.genres || genres;
      const erasToUse = overrides?.eras || eras;
      const diffsToUse = overrides?.difficulties || difficulties;
      const excludeParam = playedIds.slice(-200).join(",");

      try {
        const queryParams = new URLSearchParams({
          language: langToUse,
          genres: genresToUse.join(","),
          eras: erasToUse.join(","),
          difficulties: diffsToUse.join(","),
          exclude: excludeParam,
        });
        if (lastArtistRef.current) {
          queryParams.append("excludeArtist", lastArtistRef.current);
        }

        const res = await fetch(`/api/round?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Error loading round");
        const roundData: RoundResponse = await res.json();

        // Discard if another round request was triggered while fetching
        if (seq !== roundSeqRef.current) return;

        // Preload audio into memory buffer via Web Audio API, verifying trackId
        const loaded = await audioEngine.loadAudio(roundData.previewUrl, roundData.trackId);

        // Discard if another round request occurred during audio decode
        if (seq !== roundSeqRef.current) return;

        if (loaded) {
          setCurrentRound(roundData);
        } else {
          console.warn("Could not load preview, retrying new round...");
          startNewRound(overrides);
        }
      } catch (err) {
        console.error("Error starting new round:", err);
      } finally {
        if (seq === roundSeqRef.current) {
          setIsLoadingAudio(false);
        }
      }
    },
    [language, genres, eras, difficulties, playedIds]
  );

  // Initial round start — runs once on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      startNewRound();
    }
  }, [startNewRound]);

  // Language Change Handler from Navbar
  const handleLanguageChange = (newLang: Language) => {
    if (newLang === language) return;
    setLanguage(newLang);
    try {
      localStorage.setItem("syncguessr_lang", newLang);
    } catch {}
    startNewRound({ language: newLang });
  };

  // Apply filters from modal
  const handleApplyFilters = (newFilters: {
    language: Language;
    genres: Genre[];
    eras: Era[];
    difficulties: Difficulty[];
  }) => {
    setLanguage(newFilters.language);
    setGenres(newFilters.genres);
    setEras(newFilters.eras);
    setDifficulties(newFilters.difficulties);

    try {
      localStorage.setItem("syncguessr_lang", newFilters.language);
      localStorage.setItem("syncguessr_genres", JSON.stringify(newFilters.genres));
      localStorage.setItem("syncguessr_eras", JSON.stringify(newFilters.eras));
      localStorage.setItem("syncguessr_diffs", JSON.stringify(newFilters.difficulties));
    } catch {}

    startNewRound({
      language: newFilters.language,
      genres: newFilters.genres,
      eras: newFilters.eras,
      difficulties: newFilters.difficulties,
    });
  };

  // Play current segment
  const handlePlayCurrent = () => {
    if (!currentRound || audioEngine.getLoadedTrackId() !== currentRound.trackId) return;
    const activeStage = stages[currentStageIdx] || stages[0];
    audioEngine.playSegment(activeStage.duration);
  };

  const handleStopAudio = () => {
    audioEngine.stop();
  };

  // Save played track to memory
  const recordPlayedTrack = (trackId: number) => {
    const updated = Array.from(new Set([...playedIds, trackId]));
    setPlayedIds(updated);
    try {
      localStorage.setItem("syncguessr_history", JSON.stringify(updated));
    } catch {}
  };

  // Surrender & Reveal Track on Loss
  const handleSurrender = async () => {
    if (!currentRound) return;
    audioEngine.stop();
    setLost(true);
    recordPlayedTrack(currentRound.trackId);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: currentRound.trackId,
          surrender: true,
        }),
      });
      if (res.ok) {
        const data: VerifyResponse = await res.json();
        if (data.track) {
          setRevealedTrack(data.track);
          lastArtistRef.current = data.track.artist;
        }
      }
    } catch (err) {
      console.error("Error revealing track:", err);
    }
  };

  // Submit Guess
  const handleGuess = async (guessId: number) => {
    if (!currentRound || won || lost) return;
    setHasMadeAttempt(true);
    audioEngine.stop();

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: currentRound.trackId,
          guessId,
        }),
      });

      if (res.ok) {
        const data: VerifyResponse = await res.json();

        if (data.correct) {
          // VICTORY!
          startTransition(() => {
            const newStatuses = [...stageStatuses];
            newStatuses[currentStageIdx] = "solved";
            setStageStatuses(newStatuses);
            setWon(true);
            if (data.track) {
              setRevealedTrack(data.track);
              lastArtistRef.current = data.track.artist;
            }
            recordPlayedTrack(currentRound.trackId);
          });
        } else {
          // WRONG GUESS
          const nextIdx = currentStageIdx + 1;
          const newStatuses = [...stageStatuses];
          newStatuses[currentStageIdx] = "failed";

          if (nextIdx >= stages.length) {
            // Out of attempts = LOSS
            setStageStatuses(newStatuses);
            handleSurrender();
          } else {
            newStatuses[nextIdx] = "active";
            setStageStatuses(newStatuses);
            setCurrentStageIdx(nextIdx);
            // Auto play next segment
            setTimeout(() => {
              const nextStage = stages[nextIdx];
              if (nextStage) audioEngine.playSegment(nextStage.duration);
            }, 300);
          }
        }
      }
    } catch (err) {
      console.error("Error verifying guess:", err);
    }
  };

  // Skip Stage
  const handleSkip = () => {
    if (!currentRound || won || lost) return;
    setHasMadeAttempt(true);
    audioEngine.stop();

    const nextIdx = currentStageIdx + 1;
    const newStatuses = [...stageStatuses];
    newStatuses[currentStageIdx] = "skipped";

    if (nextIdx >= stages.length) {
      // Skipped the last stage = LOSS
      setStageStatuses(newStatuses);
      handleSurrender();
    } else {
      newStatuses[nextIdx] = "active";
      setStageStatuses(newStatuses);
      setCurrentStageIdx(nextIdx);
      // Auto play next segment
      setTimeout(() => {
        const nextStage = stages[nextIdx];
        if (nextStage) audioEngine.playSegment(nextStage.duration);
      }, 300);
    }
  };

  // Toggle stage setting
  const handleToggleStage = (index: number) => {
    const updated = [...stages];
    updated[index].enabled = !updated[index].enabled;
    setStages(updated);
  };

  // Reset played history
  const handleResetHistory = () => {
    setPlayedIds([]);
    try {
      localStorage.removeItem("syncguessr_history");
    } catch {}
  };

  const activeStage = stages[currentStageIdx] || stages[0];

  const hasCustomFilters =
    genres.length < ALL_GENRES.length ||
    eras.length < ALL_ERAS.length ||
    difficulties.length < ALL_DIFFICULTIES.length;

  const filterSummary = [
    genres.length < ALL_GENRES.length
      ? `${genres.length} género${genres.length > 1 ? "s" : ""}`
      : null,
    eras.length < ALL_ERAS.length
      ? `${eras.length} época${eras.length > 1 ? "s" : ""}`
      : null,
    difficulties.length < ALL_DIFFICULTIES.length
      ? `${difficulties.length} dificultad${difficulties.length > 1 ? "es" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="flex min-h-screen flex-col bg-night text-ink">
      {/* Top Navigation */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Game Stage */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Decorative stage glow lines */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center overflow-hidden">
          <div className="h-[600px] w-[800px] rounded-full bg-gradient-to-b from-indigo/10 via-surface/5 to-transparent blur-3xl" />
        </div>

        {/* Wordmark slot */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black italic tracking-tighter text-ink sm:text-5xl">
            sync<span className="text-indigo">guessr</span>
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-ink-3">
            Adivina la canción desde {activeStage.duration}s
          </p>

          {/* Active custom filter chip */}
          {hasCustomFilters && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-indigo/40 bg-indigo-deep/40 px-3.5 py-1 text-xs font-semibold text-ink-2 hover:border-indigo hover:text-ink transition-colors shadow-sm"
              title="Haz clic para modificar los filtros"
            >
              <span className="text-indigo">⚡ Filtros:</span>
              <span>{filterSummary}</span>
            </button>
          )}
        </div>

        {/* Stage Timeline (0.1s, 0.5s, 2s, 8s, 15s) */}
        <div className="mb-8 w-full max-w-xl">
          <StageTimeline
            stages={stages}
            currentStageIndex={currentStageIdx}
            stageStatuses={stageStatuses}
            onSelectStage={(idx) => {
              setCurrentStageIdx(idx);
              audioEngine.playSegment(stages[idx].duration);
            }}
          />
        </div>

        {/* Central Audio Controller with Volume Slider */}
        <div className="mb-8 w-full max-w-md">
          <AudioController
            isPlaying={isPlaying}
            duration={activeStage.duration}
            progress={playProgress}
            isLoading={isLoadingAudio}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            onPlay={handlePlayCurrent}
            onStop={handleStopAudio}
            onReroll={() => startNewRound()}
            canReroll={!hasMadeAttempt && !won && !lost}
          />
        </div>

        {/* Autocomplete Search Bar */}
        <div className="w-full max-w-xl">
          <SearchBar
            currentTrackId={currentRound?.trackId || null}
            language={language}
            onGuess={handleGuess}
            onSkip={handleSkip}
            disabled={won || lost || isLoadingAudio}
            isLastStage={currentStageIdx === stages.length - 1}
          />
        </div>
      </main>

      {/* Result Card Modal */}
      {(won || lost) && revealedTrack && (
        <ResultCard
          won={won}
          stageReached={currentStageIdx}
          stageDuration={activeStage.duration}
          track={revealedTrack}
          onNextRound={() => startNewRound()}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        onLanguageChange={handleLanguageChange}
        selectedGenres={genres}
        onGenresChange={setGenres}
        selectedEras={eras}
        onErasChange={setEras}
        selectedDifficulties={difficulties}
        onDifficultiesChange={setDifficulties}
        stages={stages}
        onToggleStage={handleToggleStage}
        onResetHistory={handleResetHistory}
        historyCount={playedIds.length}
        onApplyFilters={handleApplyFilters}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
