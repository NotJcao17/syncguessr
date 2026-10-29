"use client";

import { ReactNode, useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR and hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * Renders children only in the browser, so they can read localStorage in their initial state
 * instead of syncing it in effects.
 */
export function ClientOnly({ children, fallback = <main className="min-h-dvh" /> }: { children: ReactNode; fallback?: ReactNode }) {
  return useHydrated() ? children : fallback;
}
