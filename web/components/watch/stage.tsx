"use client";

import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";
import { buildStore } from "@/lib/build-store";
import { stage } from "@/lib/stage-store";
import { tick } from "@/lib/tick";
import { createChoreo } from "./choreo";
import { createGovernor } from "./governor";
import type { Quality, WatchScene } from "./scene";

/**
 * One fixed canvas behind the page, holding the watch.
 *
 * Smoothness, in the order it matters:
 *  - three.js, the scene and the finishes are separate chunks, fetched after
 *    the page has painted; the hero's still photograph covers the wait.
 *  - finishes are generated in a worker and cached in IndexedDB (textures.ts).
 *  - every shader is compiled before the first frame is shown, so the first
 *    scroll never stalls on a compile.
 *  - resolution is a budget of pixels, not the screen's density: every
 *    effect costs per pixel, so the canvas holds about 3 million of them
 *    whatever the screen. It never starts below one per CSS pixel.
 *  - the governor (governor.ts) watches the real frame rate and, if it
 *    drops, gives up resolution, then ambient occlusion, then more
 *    resolution and antialiasing samples — a step at a time, never a shader
 *    recompile.
 *  - nothing renders while the tab is hidden or the stage is scrolled away.
 */

const PIXELS = { desktop: 3.2e6, phone: 0.8e6 };
const LADDER: Record<"desktop" | "phone", (Quality & { scale: number })[]> = {
  desktop: [
    { scale: 1, ao: true, msaa: 4 },
    { scale: 0.85, ao: true, msaa: 4 },
    { scale: 0.85, ao: false, msaa: 4 },
    { scale: 0.7, ao: false, msaa: 4 },
    { scale: 0.6, ao: false, msaa: 2 },
  ],
  phone: [
    { scale: 1, ao: false, msaa: 4 },
    { scale: 0.85, ao: false, msaa: 4 },
    { scale: 0.7, ao: false, msaa: 2 },
  ],
};

export function Stage() {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || document.documentElement.dataset.webgl === "fail") {
      stage.set({ failed: true });
      return;
    }
    let disposed = false;
    let raf = 0;
    let renderer: ThreeNS.WebGLRenderer | null = null;
    let watch: WatchScene | null = null;
    const cleanups: (() => void)[] = [];

    (async () => {
      const [THREE, sceneMod, texMod] = await Promise.all([import("three"), import("./scene"), import("./textures")]);
      if (disposed) return;
      const phone = window.matchMedia("(max-width: 900px)").matches;
      const ladder = LADDER[phone ? "phone" : "desktop"];
      let level = 0;
      const pixelRatio = () => {
        const fit = Math.max(1, Math.sqrt(PIXELS[phone ? "phone" : "desktop"] / (window.innerWidth * window.innerHeight)));
        return Math.max(0.5, Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2, fit) * ladder[level].scale);
      };

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
      renderer.setPixelRatio(pixelRatio());
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      performance.mark("q:maps-start");
      // 8× anisotropic filtering looks the same as 16× on these finishes, for less bandwidth
      const maps = await texMod.loadMaps(THREE, Math.min(8, renderer.capabilities.getMaxAnisotropy()), (done, total) => stage.set({ progress: done / total }));
      performance.mark("q:maps-end");
      if (disposed) return;
      await document.fonts.ready;
      const font = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";
      watch = sceneMod.createWatchScene(THREE, renderer, { maps, font, quality: ladder[0] });
      watch.applyBuild(buildStore.get());
      cleanups.push(buildStore.subscribe(() => watch?.applyBuild(buildStore.get())));

      const choreo = createChoreo();
      const size = () => {
        const pr = pixelRatio();
        renderer!.setPixelRatio(pr);
        renderer!.setSize(window.innerWidth, window.innerHeight);
        watch!.resize(window.innerWidth, window.innerHeight, pr);
        choreo.refresh();
      };
      size();
      window.addEventListener("resize", size);
      cleanups.push(() => window.removeEventListener("resize", size));
      const ro = new ResizeObserver(() => choreo.refresh());
      ro.observe(document.body);
      cleanups.push(() => ro.disconnect());

      // compile everything once, render one frame, then reveal
      performance.mark("q:compile-start");
      await watch.compile();
      performance.mark("q:compile-end");
      if (disposed) return;

      const governor = createGovernor(ladder.length, (l) => {
        level = l;
        watch!.setQuality(ladder[l]);
        size();
        document.documentElement.dataset.quality = String(l);
      });
      document.documentElement.dataset.quality = "0";

      let last = 0;
      let shown = 0;
      let drew = false; // whether the previous frame was rendered, so the interval measures one

      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const ms = last ? now - last : 0;
        const dt = last ? Math.min(ms / 1000, 0.05) : 1 / 60;
        last = now;
        const f = stage.get();
        if (f.held) {
          drew = false;
          return;
        }
        const { input, alpha } = choreo.read({ back: f.showBack, realSpeed: f.realSpeed });
        if (process.env.NODE_ENV !== "production") {
          const pose = (window as { __pose?: Partial<typeof input> }).__pose;
          if (pose) Object.assign(input, pose);
        }
        shown += (alpha - shown) * (1 - Math.exp(-6 * dt));
        if (shown < 0.004 && alpha === 0) {
          el.style.visibility = "hidden";
          drew = false;
          return;
        }
        el.style.visibility = "visible";
        el.style.opacity = shown.toFixed(3);
        const beat = watch!.frame(dt, input);
        if (beat && f.sound && alpha > 0.5) tick(Math.floor(performance.now() / 125) % 2 === 0);
        if (drew) governor.sample(ms);
        drew = true;
      };
      const sync = () => {
        cancelAnimationFrame(raf);
        drew = false;
        if (!document.hidden) {
          last = 0;
          raf = requestAnimationFrame(loop);
        }
      };
      document.addEventListener("visibilitychange", sync);
      cleanups.push(() => document.removeEventListener("visibilitychange", sync));
      sync();
      stage.set({ ready: true, progress: 1 });
      document.documentElement.dataset.stage = "ready";

      if (process.env.NODE_ENV !== "production") {
        // dev only: step time and centre the subject, for headless checks
        Object.assign(window, {
          __watch: watch,
          __level: (n: number) => governor.pin(n),
          __advance: (sec: number) => {
            for (let i = 0; i < sec * 30; i++) {
              const f = stage.get();
              const r = choreo.read({ back: f.showBack, realSpeed: f.realSpeed });
              const pose = (window as { __pose?: Partial<typeof r.input> }).__pose;
              if (pose) Object.assign(r.input, pose);
              const still = (window as { __still?: { x: number; y: number } }).__still;
              if (still) {
                r.input.offX = still.x;
                r.input.offY = still.y;
              }
              watch!.frame(1 / 30, r.input, false);
            }
          },
        });
      }
    })().catch((e) => {
      console.error(e);
      document.documentElement.dataset.webgl = "fail";
      stage.set({ failed: true });
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      watch?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return <div ref={host} className="stage" aria-hidden="true" style={{ opacity: 0 }} />;
}
