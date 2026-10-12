"use client";

import { useSyncExternalStore } from "react";

/**
 * Small switches the page and the 3D stage share: sound, real-time balance,
 * the configurator's caseback view, how far the stage is from ready, and
 * whether a dialog covers it (the stage then holds its last frame).
 */
export interface StageFlags {
  sound: boolean;
  realSpeed: boolean;
  showBack: boolean;
  progress: number;
  ready: boolean;
  failed: boolean;
  held: boolean;
}

let flags: StageFlags = { sound: false, realSpeed: false, showBack: false, progress: 0, ready: false, failed: false, held: false };
const listeners = new Set<() => void>();

export const stage = {
  get: () => flags,
  set(next: Partial<StageFlags>) {
    flags = { ...flags, ...next };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

const SERVER: StageFlags = { sound: false, realSpeed: false, showBack: false, progress: 0, ready: false, failed: false, held: false };
export const useStage = () => useSyncExternalStore(stage.subscribe, stage.get, () => SERVER);
