"use client";

import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";
import { buildStore } from "@/lib/build-store";
import { stage } from "@/lib/stage-store";
import { tick } from "@/lib/tick";
import { createChoreo } from "./choreo";
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
 *  - resolution adapts: if frames run long the pixel ratio steps down, then
 *    ambient occlusion switches off; if there is headroom it steps back up.
 *  - nothing renders while the tab is hidden or the stage is scrolled away.
 */

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
      const maxPr = Math.min(window.devicePixelRatio || 1, phone ? 2 : 2);
      let pr = Math.min(maxPr, phone ? 1.5 : 1.75);
      let quality: Quality = phone ? "medium" : "high";

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
      renderer.setPixelRatio(pr);
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      performance.mark("q:maps-start");
      const maps = await texMod.loadMaps(THREE, renderer.capabilities.getMaxAnisotropy(), (done, total) => stage.set({ progress: done / total }));
      performance.mark("q:maps-end");
      if (disposed) return;
      await document.fonts.ready;
      const font = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";
      watch = sceneMod.createWatchScene(THREE, renderer, { maps, font, quality });
      watch.applyBuild(buildStore.get());
      cleanups.push(buildStore.subscribe(() => watch?.applyBuild(buildStore.get())));

      const choreo = createChoreo();
      const size = () => {
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

      let last = 0;
      let shown = 0;
      let slow = 0;
      let fast = 0;
      let samples = 0;
      let sum = 0;
      const tune = (ms: number) => {
        sum += ms;
        if (++samples < 60) return;
        const avg = sum / samples;
        samples = 0;
        sum = 0;
        if (avg > 26) {
          fast = 0;
          if (++slow >= 2) {
            slow = 0;
            if (pr > 1.0) pr = Math.max(1.0, pr - 0.25);
            else if (quality === "high") watch!.setQuality((quality = "medium"));
            else if (pr > 0.75) pr = 0.75;
            else if (quality === "medium") watch!.setQuality((quality = "low"));
            size();
          }
        } else if (avg < 13 && pr < maxPr) {
          slow = 0;
          if (++fast >= 4) {
            fast = 0;
            pr = Math.min(maxPr, pr + 0.25);
            size();
          }
        }
      };

      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
        last = now;
        const f = stage.get();
        const { input, alpha } = choreo.read({ back: f.showBack, realSpeed: f.realSpeed });
        if (process.env.NODE_ENV !== "production") {
          const pose = (window as { __pose?: Partial<typeof input> }).__pose;
          if (pose) Object.assign(input, pose);
        }
        shown += (alpha - shown) * (1 - Math.exp(-6 * dt));
        if (shown < 0.004 && alpha === 0) {
          el.style.visibility = "hidden";
          return;
        }
        el.style.visibility = "visible";
        el.style.opacity = shown.toFixed(3);
        const t0 = performance.now();
        const beat = watch!.frame(dt, input);
        if (beat && f.sound && alpha > 0.5) tick(Math.floor(performance.now() / 125) % 2 === 0);
        tune(performance.now() - t0 + dt * 1000 * 0.35);
      };
      const sync = () => {
        cancelAnimationFrame(raf);
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
