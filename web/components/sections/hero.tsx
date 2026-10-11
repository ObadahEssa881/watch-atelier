import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand, heroSpecs } from "@/lib/content";
import { LiveTime } from "./live-time";

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] items-end overflow-hidden md:items-center">
      {/* The first frame, photographed from the live scene: the hero is whole before any 3D loads. */}
      <Image src="/stills/hero.webp" alt="" aria-hidden="true" fill priority sizes="100vw" className="still-live -z-10 object-cover object-[68%_center] md:object-center" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,var(--ink)_6%,color-mix(in_srgb,var(--ink)_50%,transparent)_40%,transparent_70%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--ink)_85%,transparent)_0%,color-mix(in_srgb,var(--ink)_35%,transparent)_38%,transparent_60%)]" />
      <div className="wrap-x relative pt-32 pb-16 md:pb-0">
        <p className="intro eyebrow text-gold" style={{ ["--i" as string]: 0 }}>
          {brand.calibre} · Self-winding
        </p>
        <h1 className="intro mt-6 font-display text-[clamp(3.4rem,8.6vw,8.4rem)] leading-[0.92] font-light tracking-[-0.03em]" style={{ ["--i" as string]: 1 }}>
          Eight beats
          <br />
          <span className="italic text-ivory/85">a second.</span>
        </h1>
        <p className="intro mt-8 max-w-[31rem] text-[1.05rem] leading-relaxed text-mist" style={{ ["--i" as string]: 2 }}>
          The {brand.model} automatic: forty millimetres of steel and sapphire around a movement you can watch breathe. The hands are already
          showing your time.
        </p>
        <div className="intro mt-10 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 3 }}>
          <Button asChild size="lg" className="rounded-full px-7 tracking-[0.04em]">
            <a href="#caseback">
              Take it apart
              <ArrowDown />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-7 tracking-[0.04em]">
            <a href="#configure">Configure yours</a>
          </Button>
        </div>
        <dl className="intro mt-14 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[0.7rem] tracking-[0.14em] text-mist uppercase" style={{ ["--i" as string]: 4 }}>
          {heroSpecs.map((s) => (
            <div key={s}>
              <dt className="sr-only">Specification</dt>
              <dd>{s}</dd>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <dt className="text-mist">On the dial</dt>
            <dd>
              <LiveTime />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
