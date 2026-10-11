import Image from "next/image";
import { chapters } from "@/lib/content";
import { Badge } from "@/components/ui/badge";
import { SoundToggle } from "@/components/site/sound-toggle";
import { RealSpeed } from "./real-speed";
import { Timegrapher } from "./timegrapher";

/**
 * The spine: one article per stop of the disassembly. The 3D stage reads each
 * article's `data-chapter` and turns the watch to that part while the article
 * is on screen; the numbering is honest, because this is the order a
 * watchmaker takes a movement apart.
 */
export function Chapters() {
  return (
    <div>
      {chapters.map((c) => (
        <article key={c.id} id={c.id} data-chapter={c.id} aria-labelledby={`${c.id}-t`} className="relative min-h-[165svh]">
          <div className="wrap-x pt-[52svh] md:sticky md:top-0 md:flex md:min-h-[100svh] md:items-center md:pt-0">
            <div className="relative max-w-[28rem] rounded-sm border border-line/80 bg-ink/72 p-7 backdrop-blur-md md:p-9">
              <p className="flex items-center gap-4 font-mono text-[0.68rem] tracking-[0.22em] text-gold uppercase">
                <span>{c.index}</span>
                <span data-draw className="hairline block w-16" />
                <span className="text-mist">{c.eyebrow}</span>
              </p>
              <h2 id={`${c.id}-t`} className="mt-6 font-display text-[clamp(2.1rem,3.4vw,3.1rem)] leading-[1.02] font-light">
                {c.title}
              </h2>
              <p className="mt-5 text-[0.98rem] leading-[1.75] text-ivory/80">{c.body}</p>
              <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Details">
                {c.facts.map((f) => (
                  <li key={f}>
                    <Badge className="rounded-full border-line px-2.5 py-1 font-mono text-[0.64rem] tracking-[0.08em] text-ivory/80">{f}</Badge>
                  </li>
                ))}
              </ul>
              {c.id === "escapement" && (
                <div className="live-only mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  <SoundToggle />
                  <span className="font-mono text-[0.66rem] tracking-[0.12em] text-mist uppercase">Shown at ⅛ speed</span>
                </div>
              )}
              {c.id === "balance" && (
                <div className="mt-6 border-t border-line pt-5">
                  <Timegrapher />
                  <div className="live-only">
                    <RealSpeed />
                  </div>
                </div>
              )}
              {c.footnote && <p className="mt-6 border-t border-line pt-4 text-[0.8rem] leading-relaxed text-mist italic">{c.footnote}</p>}
            </div>
            {/* the still photograph of this stop, for reduced motion */}
            <Image
              src={`/stills/${c.id}.webp`}
              alt=""
              aria-hidden="true"
              width={1600}
              height={1000}
              sizes="(min-width: 900px) 50vw, 100vw"
              className="still-chapter mt-6 w-full rounded-sm border border-line md:mt-0 md:ms-10 md:max-w-[46vw]"
            />
          </div>
        </article>
      ))}
    </div>
  );
}
