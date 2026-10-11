"use client";

import { useSyncExternalStore } from "react";
import { cases, defaultBuild, dials, ENGRAVING_MAX, straps, type Build } from "./catalogue";

/**
 * The build being configured, shared by the configurator panel and the 3D
 * watch. It lives in the URL (`?case=…&dial=…`), so a build is a link you can
 * send — no account, no server needed to share it.
 */

let build: Build = defaultBuild;
const listeners = new Set<() => void>();

const valid = <T extends string>(v: string | null, list: { id: T }[], fallback: T): T =>
  list.some((o) => o.id === v) ? (v as T) : fallback;

export function readBuildFromUrl(): Build {
  if (typeof window === "undefined") return defaultBuild;
  const q = new URLSearchParams(window.location.search);
  return {
    case: valid(q.get("case"), cases, defaultBuild.case),
    dial: valid(q.get("dial"), dials, defaultBuild.dial),
    strap: valid(q.get("strap"), straps, defaultBuild.strap),
    engraving: (q.get("engraving") ?? "").slice(0, ENGRAVING_MAX),
  };
}

export const buildStore = {
  get: () => build,
  set(next: Partial<Build>) {
    build = { ...build, ...next };
    const q = new URLSearchParams(window.location.search);
    q.set("case", build.case);
    q.set("dial", build.dial);
    q.set("strap", build.strap);
    if (build.engraving.trim()) q.set("engraving", build.engraving);
    else q.delete("engraving");
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}${window.location.hash}`);
    listeners.forEach((l) => l());
  },
  hydrate() {
    build = readBuildFromUrl();
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  shareUrl: () => window.location.href,
};

export const useBuild = () => useSyncExternalStore(buildStore.subscribe, buildStore.get, () => defaultBuild);
