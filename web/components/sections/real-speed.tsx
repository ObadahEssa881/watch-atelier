"use client";

import { stage, useStage } from "@/lib/stage-store";

/** The balance at true speed is a blur, which is the point; slowed, you can see it breathe. */
export function RealSpeed() {
  const { realSpeed } = useStage();
  return (
    <button
      type="button"
      aria-pressed={realSpeed}
      onClick={() => stage.set({ realSpeed: !realSpeed })}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.12em] text-mist uppercase transition-colors hover:border-gold/60 hover:text-ivory aria-pressed:border-blued/60 aria-pressed:text-blued"
    >
      <span className="size-1.5 rounded-full bg-current" />
      {realSpeed ? "Real speed · 4 Hz" : "Slowed · see it breathe"}
    </button>
  );
}
