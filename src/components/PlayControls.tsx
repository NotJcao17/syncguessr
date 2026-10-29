"use client";

import { useState } from "react";
import { audioEngine, PlaybackState } from "@/lib/audioEngine";
import { saveVolume } from "@/lib/storage";
import { Icon } from "./Icon";

export function PlayButton({
  playback,
  loading,
  disabled,
  onPlay,
  size = "lg",
}: {
  playback: PlaybackState;
  loading: boolean;
  disabled?: boolean;
  onPlay: () => void;
  size?: "lg" | "md";
}) {
  const playing = playback.playing;
  const dim = size === "lg" ? "size-[76px]" : "size-14";
  return (
    <button
      type="button"
      onClick={() => (playing ? audioEngine.stop() : onPlay())}
      disabled={disabled || loading}
      aria-label={loading ? "Cargando canción" : playing ? "Detener" : "Escuchar"}
      className={`relative grid ${dim} shrink-0 place-items-center rounded-full bg-ink text-night transition-transform duration-200 ease-[var(--ease-out-quint)] active:scale-95 disabled:opacity-50`}
    >
      {loading ? (
        <span className="size-7 animate-spin rounded-full border-[3px] border-night/20 border-t-night" />
      ) : (
        <Icon name={playing ? "pause" : "play"} className={size === "lg" ? "size-9" : "size-7"} />
      )}
      {playing && (
        <svg className="pointer-events-none absolute -inset-[5px]" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="var(--color-indigo-soft)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - playback.progress}
            transform="rotate(-90 50 50)"
          />
        </svg>
      )}
    </button>
  );
}

export function VolumeControl({ initial }: { initial: number }) {
  const [volume, setVolume] = useState(initial);
  const [before, setBefore] = useState(initial || 0.85);

  const apply = (v: number) => {
    setVolume(v);
    audioEngine.setVolume(v);
    saveVolume(v);
  };

  return (
    <div className="flex items-center gap-1.5" data-keep-search>
      <button
        type="button"
        className="icon-btn"
        aria-label={volume === 0 ? "Activar sonido" : "Silenciar"}
        onClick={() => {
          if (volume > 0) {
            setBefore(volume);
            apply(0);
          } else apply(before || 0.85);
        }}
      >
        <Icon name={volume === 0 ? "mute" : volume < 0.5 ? "volumeLow" : "volume"} className="size-5" />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => apply(Number(e.target.value))}
        aria-label="Volumen"
        className="slider w-20 sm:w-28"
        style={{ "--fill": `${volume * 100}%` } as React.CSSProperties}
      />
    </div>
  );
}
