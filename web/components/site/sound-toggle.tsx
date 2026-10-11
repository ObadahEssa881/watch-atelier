"use client";

import { Volume2, VolumeX } from "lucide-react";
import { stage, useStage } from "@/lib/stage-store";
import { unlockAudio } from "@/lib/tick";
import { cn } from "@/lib/utils";

/** Off by default; the click that turns it on is the gesture audio needs. */
export function SoundToggle({ className, label = true }: { className?: string; label?: boolean }) {
  const { sound } = useStage();
  return (
    <button
      type="button"
      aria-pressed={sound}
      onClick={() => {
        if (!sound) unlockAudio();
        stage.set({ sound: !sound });
      }}
      className={cn("inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[0.7rem] tracking-[0.12em] text-mist uppercase transition-colors hover:border-gold/60 hover:text-ivory", sound && "border-blued/60 text-blued", className)}
    >
      {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
      {label && (sound ? "Ticking" : "Hear it")}
    </button>
  );
}
