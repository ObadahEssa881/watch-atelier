"use client";

import { useEffect, useState } from "react";
import { Check, Link2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { quote, type Quote } from "@/lib/api";
import { buildStore, useBuild } from "@/lib/build-store";
import { cases, dials, ENGRAVING_MAX, ENGRAVING_PRICE, priceOf, straps, usd, type Option } from "@/lib/catalogue";
import { stage, useStage } from "@/lib/stage-store";
import { cn } from "@/lib/utils";
import { ReserveDialog } from "./reserve-dialog";

function Options<T extends string>({ legend, value, options, onChange, layout = "list" }: { legend: string; value: T; options: Option<T>[]; onChange: (v: T) => void; layout?: "list" | "swatch" }) {
  const current = options.find((o) => o.id === value);
  return (
    <fieldset className="mt-5">
      <legend className="font-mono text-[0.68rem] tracking-[0.18em] text-mist uppercase">{legend}</legend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} className={cn("mt-3", layout === "swatch" ? "flex flex-wrap gap-1.5" : "grid gap-2")} aria-label={legend}>
        {options.map((o) =>
          layout === "swatch" ? (
            <RadioGroupItem key={o.id} value={o.id} aria-label={`${o.name}, ${o.detail}${o.price ? `, plus ${usd(o.price)}` : ""}`} className="rounded-full p-1">
              <span className="block size-8 rounded-full border border-white/10 shadow-[inset_0_2px_6px_rgba(255,255,255,0.18),inset_0_-4px_8px_rgba(0,0,0,0.5)]" style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${o.swatch}, white 22%), ${o.swatch} 60%)` }} />
            </RadioGroupItem>
          ) : (
            <RadioGroupItem key={o.id} value={o.id} className="flex items-center gap-3.5 px-3.5 py-2.5">
              <span className="size-6 shrink-0 rounded-full border border-white/10" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${o.swatch}, white 30%), ${o.swatch} 55%, color-mix(in srgb, ${o.swatch}, black 25%))` }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.93rem] text-ivory">{o.name}</span>
                <span className="block text-[0.76rem] text-mist">{o.detail}</span>
              </span>
              <span className="num text-[0.8rem] text-ivory/80">{usd(o.price)}</span>
            </RadioGroupItem>
          ),
        )}
      </RadioGroup>
      {layout === "swatch" && current && (
        <p className="mt-2 text-[0.8rem] text-ivory" aria-live="polite">
          {current.name} <span className="text-mist">· {current.detail}</span>
        </p>
      )}
    </fieldset>
  );
}

export function Configurator() {
  const b = useBuild();
  const { showBack } = useStage();
  const [q, setQ] = useState<Quote | null>(null);
  const [copied, setCopied] = useState(false);

  // the server prices the build; the local price shows instantly meanwhile
  useEffect(() => {
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      quote(b, ac.signal).then(setQ).catch(() => {});
    }, 250);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [b]);

  const price = q?.price ?? priceOf(b);
  const lead = q?.leadWeeks;

  return (
    <section id="configure" aria-labelledby="configure-t" className="relative min-h-[170svh]">
      <div className="wrap-x pt-[46svh] md:sticky md:top-0 md:flex md:min-h-[100svh] md:items-center md:pt-0">
        <div className="w-full max-w-[29rem] rounded-sm border border-line/80 bg-ink/80 p-6 backdrop-blur-md md:mt-10 md:max-h-[calc(100svh-6.5rem)] md:overflow-y-auto md:p-7">
          <p className="eyebrow text-gold">Configure</p>
          <h2 id="configure-t" className="mt-3 font-display text-[clamp(2rem,3.2vw,2.7rem)] leading-[1.02] font-light">
            Make it yours.
          </h2>
          <Options legend="Case" value={b.case} options={cases} onChange={(v) => buildStore.set({ case: v })} />
          <div className="grid grid-cols-2 gap-x-5">
            <Options legend="Dial" value={b.dial} options={dials} onChange={(v) => buildStore.set({ dial: v })} layout="swatch" />
            <Options legend="Strap" value={b.strap} options={straps} onChange={(v) => buildStore.set({ strap: v })} layout="swatch" />
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="engraving">Caseback engraving</Label>
              <span className="num text-[0.7rem] text-mist">
                {b.engraving.length}/{ENGRAVING_MAX} · +{usd(ENGRAVING_PRICE)}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                id="engraving"
                value={b.engraving}
                maxLength={ENGRAVING_MAX}
                placeholder="A name, a date, a word"
                onChange={(e) => buildStore.set({ engraving: e.target.value.replace(/[^\p{L}\p{N} .,'’&·\-/]/gu, "") })}
                onFocus={() => stage.set({ showBack: true })}
              />
              <Button type="button" variant="outline" className="h-11 shrink-0 rounded-sm" aria-pressed={showBack} onClick={() => stage.set({ showBack: !showBack })}>
                <RotateCcw />
                {showBack ? "Dial" : "Back"}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[0.66rem] tracking-[0.16em] text-mist uppercase">Your Q-01</p>
                {q && (
                  <p className="flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.14em] text-mist uppercase" data-quote-source={q.source}>
                    <span aria-hidden="true" className={cn("size-1.5 rounded-full", q.source === "api" ? "bg-gold shadow-[0_0_8px_var(--gold)]" : "border border-mist/60")} />
                    {q.source === "api" ? "Priced live by the atelier" : "Estimated in your browser"}
                  </p>
                )}
              </div>
              <p className="num mt-1 text-[1.7rem] leading-none text-ivory">{usd(price)}</p>
              <p className="mt-2 text-[0.8rem] text-mist">{lead ? `Assembled and regulated in ${lead[0]}–${lead[1]} weeks` : "Assembled and regulated by hand"}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ReserveDialog>
              <Button size="lg" className="rounded-full px-6">
                Reserve this build
              </Button>
            </ReserveDialog>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(buildStore.shareUrl());
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                } catch {
                  /* clipboard blocked: the URL bar already holds the build */
                }
              }}
            >
              {copied ? <Check /> : <Link2 />}
              {copied ? "Link copied" : "Copy link"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
