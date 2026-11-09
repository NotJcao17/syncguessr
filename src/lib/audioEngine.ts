/**
 * Web Audio engine for syncguessr.
 * - Decoded buffers give exact clip lengths (0.1s really is 0.1s, unlike <audio>).
 * - Clips start at the first audible moment: Deezer previews often open with a fade-in,
 *   which would make the 0.1s stage near-silent.
 * - Every source gets a few milliseconds of fade so cuts never click.
 * - Any number of components can subscribe; nobody replaces anybody else's listener.
 */

export interface PlaybackState {
  playing: boolean;
  /** 0..1 within the current clip. */
  progress: number;
  /** Clip length in seconds, or the full preview length. */
  duration: number;
  kind: "clip" | "full" | null;
}

interface LoadedAudio {
  buffer: AudioBuffer;
  /** Seconds to skip so the clip starts with sound. */
  onset: number;
}

type Listener = (state: PlaybackState) => void;

const FADE = 0.008;
const MAX_CACHED = 4;

function findOnset(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const win = Math.floor(rate * 0.01);
  const span = Math.min(data.length, Math.floor(rate * 15));
  const rms: number[] = [];
  for (let i = 0; i + win <= span; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / win));
  }
  if (rms.length === 0) return 0;
  const sorted = [...rms].sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length * 0.5)];
  const threshold = Math.max(0.01, typical * 0.35);
  const maxWindows = Math.min(rms.length, 400); // never skip more than 4s
  for (let i = 0; i < maxWindows; i++) {
    if (rms[i] >= threshold) return i * 0.01;
  }
  return 0;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cache = new Map<string, Promise<LoadedAudio | null>>();
  private current: { key: string; audio: LoadedAudio } | null = null;
  private source: AudioBufferSourceNode | null = null;
  private envelope: GainNode | null = null;
  private startedAt = 0;
  private frame: number | null = null;
  private volume = 0.85;
  private listeners = new Set<Listener>();
  private state: PlaybackState = { playing: false, progress: 0, duration: 0, kind: null };

  private ensureContext() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private applyVolume() {
    if (!this.master || !this.ctx) return;
    // Perceptual curve: linear sliders sound far too loud at the bottom of their range.
    const gain = this.volume <= 0.005 ? 0 : Math.pow(this.volume, 2.5);
    this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.015);
  }

  private emit(patch: Partial<PlaybackState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private fetchAudio(url: string): Promise<LoadedAudio | null> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const promise = (async () => {
      // One retry: a cold server or a rate-limited Deezer often answers the second time.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));
          const res = await fetch(url);
          if (!res.ok) continue;
          const bytes = await res.arrayBuffer();
          const buffer = await this.ensureContext().decodeAudioData(bytes);
          return { buffer, onset: findOnset(buffer) };
        } catch {
          // try again
        }
      }
      return null;
    })();
    this.cache.set(url, promise);
    promise.then((r) => {
      if (!r) this.cache.delete(url);
    });
    while (this.cache.size > MAX_CACHED) {
      const oldest = this.cache.keys().next().value!;
      if (oldest === this.current?.key) break;
      this.cache.delete(oldest);
    }
    return promise;
  }

  /** Starts downloading and decoding a round in the background. */
  preload(url: string) {
    void this.fetchAudio(url);
  }

  /** Makes `url` the active round. Resolves false when the audio can't be used. */
  async load(url: string): Promise<boolean> {
    this.stop();
    this.current = null;
    const audio = await this.fetchAudio(url);
    if (!audio) return false;
    this.current = { key: url, audio };
    return true;
  }

  isLoaded(url: string) {
    return this.current?.key === url;
  }

  /** Waveform peaks (0..1) of the first `seconds` after the onset. */
  peaks(seconds: number, bins: number): number[] {
    if (!this.current) return [];
    const { buffer, onset } = this.current.audio;
    const data = buffer.getChannelData(0);
    const start = Math.floor(onset * buffer.sampleRate);
    const end = Math.min(data.length, start + Math.floor(seconds * buffer.sampleRate));
    const step = Math.max(1, Math.floor((end - start) / bins));
    const out: number[] = [];
    for (let b = 0; b < bins; b++) {
      let peak = 0;
      const from = start + b * step;
      for (let i = from; i < Math.min(end, from + step); i += 4) peak = Math.max(peak, Math.abs(data[i]));
      out.push(peak);
    }
    const max = Math.max(...out, 0.0001);
    return out.map((p) => p / max);
  }

  /** Plays the first `seconds` of the song (from the onset), or the whole preview. */
  play(seconds: number | "full") {
    if (!this.current) return;
    const ctx = this.ensureContext();
    this.stop();

    const { buffer, onset } = this.current.audio;
    const offset = seconds === "full" ? 0 : onset;
    const duration = seconds === "full" ? buffer.duration : Math.min(seconds, buffer.duration - offset);

    const envelope = ctx.createGain();
    envelope.connect(this.master!);
    const t0 = ctx.currentTime + 0.01;
    const fade = Math.min(FADE, duration / 4);
    envelope.gain.setValueAtTime(0, t0);
    envelope.gain.linearRampToValueAtTime(1, t0 + fade);
    envelope.gain.setValueAtTime(1, t0 + duration - fade);
    envelope.gain.linearRampToValueAtTime(0, t0 + duration);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(envelope);
    source.start(t0, offset, duration);
    source.onended = () => {
      if (this.source === source) this.stop();
    };

    this.source = source;
    this.envelope = envelope;
    this.startedAt = t0;
    this.emit({ playing: true, progress: 0, duration, kind: seconds === "full" ? "full" : "clip" });
    this.tick();
  }

  private tick = () => {
    if (!this.ctx || !this.source) return;
    const elapsed = Math.max(0, this.ctx.currentTime - this.startedAt);
    this.emit({ progress: Math.min(1, elapsed / this.state.duration) });
    this.frame = requestAnimationFrame(this.tick);
  };

  stop() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (this.source && this.ctx && this.envelope) {
      const source = this.source;
      const now = this.ctx.currentTime;
      // Short fade instead of a hard cut, then let the node go.
      this.envelope.gain.cancelScheduledValues(now);
      this.envelope.gain.setValueAtTime(this.envelope.gain.value, now);
      this.envelope.gain.linearRampToValueAtTime(0, now + FADE);
      try {
        source.stop(now + FADE);
      } catch {
        // already stopped
      }
    }
    this.source = null;
    this.envelope = null;
    if (this.state.playing || this.state.progress !== 0) this.emit({ playing: false, progress: 0, kind: null });
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }
}

export const audioEngine = new AudioEngine();
