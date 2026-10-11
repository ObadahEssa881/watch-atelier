import { Chapters } from "@/components/sections/chapters";
import { Configurator } from "@/components/sections/configurator";
import { Footer } from "@/components/sections/footer";
import { Hero } from "@/components/sections/hero";
import { Reserve } from "@/components/sections/reserve";
import { Specs } from "@/components/sections/specs";

export default function Page() {
  return (
    <>
      <Hero />
      <section aria-label="Introduction" className="relative py-[24vh]">
        <p data-reveal className="wrap-x max-w-[62rem] font-display text-[clamp(1.8rem,3.6vw,3.3rem)] leading-[1.18] font-light text-ivory/90">
          A mechanical watch has no battery and no chip. It runs on a coiled spring, a wheel that swings four times a second, and thirty-one
          rubies. <span className="text-mist italic">Scroll, and we will take one apart.</span>
        </p>
      </section>
      <Chapters />
      <section id="together" aria-labelledby="together-t" className="relative min-h-[150svh]">
        <div className="wrap-x pt-[50svh] md:sticky md:top-0 md:flex md:min-h-[100svh] md:items-center md:pt-0">
          <div className="max-w-[30rem]">
            <p data-reveal className="eyebrow text-gold">Reassembled</p>
            <h2 id="together-t" data-reveal="1" className="mt-5 font-display text-[clamp(2.4rem,4.6vw,4.4rem)] leading-[1] font-light">
              Every part, back where it belongs.
            </h2>
            <p data-reveal="2" className="mt-6 max-w-[26rem] leading-relaxed text-mist">
              Five point six millimetres of movement, closed behind sapphire, beating eight times a second for the next seventy hours — and
              longer, if you wear it.
            </p>
          </div>
        </div>
      </section>
      <Configurator />
      <Specs />
      <Reserve />
      <Footer />
    </>
  );
}
