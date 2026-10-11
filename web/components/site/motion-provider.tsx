"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { buildStore } from "@/lib/build-store";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll and reveals. The page is complete without any of this: every
 * element is laid out visible by the server, and these only animate FROM
 * elsewhere TO that state, after the reduced-motion guard (signature-design §6).
 */
export function MotionProvider() {
  useEffect(() => {
    buildStore.hydrate();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // a heavier, slower glide than the default: a luxury page should not skate
    const lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.85, anchors: { offset: -64 } });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.4,
            ease: "expo.out",
            delay: Number(el.dataset.reveal || 0) * 0.09,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
      // a hairline that draws itself across each chapter card
      gsap.utils.toArray<HTMLElement>("[data-draw]").forEach((el) => {
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", ease: "none", scrollTrigger: { trigger: el, start: "top 85%", end: "top 45%", scrub: 0.6 } });
      });
    });
    return () => {
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
