"use client";

import { useStage } from "@/lib/stage-store";

/** A quiet line while the calibre is prepared; gone once it is. */
export function StageStatus() {
  const { progress, ready, failed } = useStage();
  if (ready || failed) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-6 bottom-6 z-40 hidden items-center gap-3 font-mono text-[0.66rem] tracking-[0.18em] text-mist uppercase md:flex">
      <span className="relative block h-px w-20 overflow-hidden bg-line">
        <span className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-500" style={{ width: `${Math.round(Math.max(0.08, progress) * 100)}%` }} />
      </span>
      Assembling the calibre
    </div>
  );
}
