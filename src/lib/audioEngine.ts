/**
 * Motor de Audio para syncguessr usando Web Audio API.
 * Garantiza reproducción con precisión de milisegundos para clips de 0.1s, 0.5s, 2s, etc.
 * sin cortes ni retardos de buffer de <audio> tradicional.
 * Incluye protección contra race conditions verificando el trackId activo.
 */

type PlayStateCallback = (isPlaying: boolean) => void;
type ProgressCallback = (progress: number) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentTrackId: number | null = null;
  private pendingTrackId: number | null = null;

  private startTime = 0;
  private playDuration = 0;
  private animFrameId: number | null = null;
  private isPlaying = false;
  private currentVolume = 0.85;

  private onPlayStateChange: PlayStateCallback | null = null;
  private onProgress: ProgressCallback | null = null;

  private applyVolume() {
    if (!this.gainNode || !this.ctx) return;
    // Logarithmic curve for natural hearing perception
    // When volume is <= 0.005, gain is 0 (silent)
    // Small volume (e.g. 0.02) yields 0.000057 (-85 dB, barely audible whisper)
    const actualGain = this.currentVolume <= 0.005 ? 0 : Math.pow(this.currentVolume, 2.5);
    try {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(actualGain, this.ctx.currentTime);
      this.gainNode.gain.value = actualGain;
    } catch {
      this.gainNode.gain.value = actualGain;
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    this.applyVolume();
  }

  public setCallbacks(onState: PlayStateCallback, onProg: ProgressCallback) {
    this.onPlayStateChange = onState;
    this.onProgress = onProg;
  }

  public async loadAudio(url: string, trackId: number): Promise<boolean> {
    this.stop();
    this.currentBuffer = null;
    this.currentTrackId = null;
    this.pendingTrackId = trackId;

    try {
      this.initContext();
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[AudioEngine] Audio fetch returned status ${response.status} for track ${trackId}`);
        return false;
      }

      // Check if another track was requested while fetching
      if (this.pendingTrackId !== trackId) {
        return false;
      }

      const arrayBuffer = await response.arrayBuffer();

      if (this.pendingTrackId !== trackId) {
        return false;
      }

      if (!this.ctx) {
        console.warn("[AudioEngine] AudioContext not initialized");
        return false;
      }

      const decoded = await this.ctx.decodeAudioData(arrayBuffer);

      if (this.pendingTrackId !== trackId) {
        return false;
      }

      this.currentBuffer = decoded;
      this.currentTrackId = trackId;
      return true;
    } catch (err) {
      console.warn("[AudioEngine] Warn loading preview:", err);
      return false;
    }
  }

  public playSegment(durationSeconds: number) {
    if (!this.currentBuffer) return;
    this.initContext();
    this.stop();

    if (!this.ctx || !this.gainNode) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.currentBuffer;
    source.connect(this.gainNode);

    const maxDur = Math.min(durationSeconds, this.currentBuffer.duration);
    this.playDuration = maxDur;
    this.startTime = this.ctx.currentTime;
    this.currentSource = source;
    this.isPlaying = true;
    this.onPlayStateChange?.(true);

    this.applyVolume();
    source.start(0, 0, maxDur);

    source.onended = () => {
      if (this.currentSource === source) {
        this.stop();
      }
    };

    this.startProgressLoop();
  }

  public playFull() {
    if (!this.currentBuffer) return;
    this.playSegment(this.currentBuffer.duration);
  }

  public stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
      this.onProgress?.(0);
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentVolume = clamped;
    this.applyVolume();
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public hasBuffer(): boolean {
    return this.currentBuffer !== null;
  }

  public getLoadedTrackId(): number | null {
    return this.currentTrackId;
  }

  private startProgressLoop() {
    const update = () => {
      if (!this.isPlaying || !this.ctx) return;
      const elapsed = this.ctx.currentTime - this.startTime;
      const progress = Math.min(1, Math.max(0, elapsed / this.playDuration));
      this.onProgress?.(progress);

      if (elapsed < this.playDuration && this.isPlaying) {
        this.animFrameId = requestAnimationFrame(update);
      } else {
        this.stop();
      }
    };
    this.animFrameId = requestAnimationFrame(update);
  }
}

export const audioEngine = new AudioEngine();
