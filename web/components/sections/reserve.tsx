import { Button } from "@/components/ui/button";
import { brand } from "@/lib/content";
import { ReserveDialog } from "./reserve-dialog";

export function Reserve() {
  return (
    <section id="reserve" aria-labelledby="reserve-t" className="cv-auto relative overflow-hidden border-t border-line bg-ink py-32 md:py-44">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,color-mix(in_srgb,var(--gold)_10%,transparent),transparent_70%)]" />
      <div className="wrap-x relative text-center">
        <p data-reveal className="eyebrow text-gold">One hundred a year</p>
        <h2 id="reserve-t" data-reveal="1" className="mx-auto mt-6 max-w-[16ch] font-display text-[clamp(2.8rem,6.4vw,6rem)] leading-[0.98] font-light">
          Reserve a {brand.model}.
        </h2>
        <p data-reveal="2" className="mx-auto mt-7 max-w-[36rem] leading-relaxed text-mist">
          Each watch is assembled, regulated in five positions and checked on the timegrapher by one watchmaker, who signs the movement. A
          reservation holds your place on the bench; nothing is charged until it is ready.
        </p>
        <div data-reveal="3" className="mt-10 flex flex-wrap justify-center gap-3">
          <ReserveDialog>
            <Button size="lg" className="rounded-full px-8">
              Reserve your build
            </Button>
          </ReserveDialog>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8">
            <a href="#configure">Change the build</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
