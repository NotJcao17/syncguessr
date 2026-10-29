"use client";

import { useEffect, useState } from "react";
import { audioEngine, PlaybackState } from "@/lib/audioEngine";

export function usePlayback(): PlaybackState {
  const [state, setState] = useState<PlaybackState>({ playing: false, progress: 0, duration: 0, kind: null });
  useEffect(() => audioEngine.subscribe(setState), []);
  return state;
}
