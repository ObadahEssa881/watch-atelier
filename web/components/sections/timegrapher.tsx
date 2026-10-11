"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A timegrapher, the watchmaker's instrument: it listens to each tick and plots
 * when it arrived. A watch running fast draws lines that climb; tick and tock
 * draw two lines, and the gap between them is the beat error. These readings
 * are the Q-01's specification, with the small jitter a real trace shows.
 */
const RATE = 2.1; // s/day, fast
const BEAT_ERROR = 0.1; // ms
const AMPLITUDE = 284; // degrees

export function Timegrapher() {
  const cv = useRef<HTMLCanvasElement>(null);
  const [read, setRead] = useState({ rate: RATE, amp: AMPLITUDE });

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    g.scale(dpr, dpr);
    const blued = getComputedStyle(document.documentElement).getPropertyValue("--blued").trim() || "#7f9cf0";
    const line = getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#2c2722";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // each column is one beat; y drifts with the rate, tock offset by the beat error
    const cols: { y: number; tock: boolean }[] = [];
    let drift = 0;
    const push = (i: number) => {
      drift += RATE / 86400 / 8 * 1e3 * 40; // scaled so the slope is visible
      const tock = i % 2 === 1;
      const jitter = (Math.random() - 0.5) * 0.9;
      cols.push({ y: H / 2 - drift + (tock ? BEAT_ERROR * 22 : -BEAT_ERROR * 22) + jitter, tock });
      if (cols.length > W / 1.6) cols.shift();
      if (drift > H * 0.32) drift = -H * 0.32;
    };
    const draw = () => {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = line;
      g.lineWidth = 1;
      for (let y = 0; y <= H; y += H / 4) {
        g.beginPath();
        g.moveTo(0, y + 0.5);
        g.lineTo(W, y + 0.5);
        g.stroke();
      }
      cols.forEach((p, i) => {
        g.fillStyle = blued;
        g.globalAlpha = 0.25 + (i / cols.length) * 0.75;
        g.fillRect(i * 1.6, p.y, 1.4, 1.4);
      });
      g.globalAlpha = 1;
    };
    let i = 0;
    for (; i < W / 1.6; i++) push(i);
    draw();
    if (reduce) return;
    let raf = 0;
    let acc = 0;
    let last = 0;
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(c);
    const loop = (now: number) => {
      if (!visible) return;
      raf = requestAnimationFrame(loop);
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      acc += dt * 8; // eight beats a second
      let n = 0;
      while (acc >= 1) {
        push(i++);
        acc -= 1;
        n++;
      }
      if (n) {
        draw();
        if (i % 16 === 0) setRead({ rate: RATE + (Math.random() - 0.5) * 0.4, amp: AMPLITUDE + Math.round((Math.random() - 0.5) * 4) });
      }
    };
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <figure>
      <canvas ref={cv} className="block h-16 w-full" aria-hidden="true" />
      <figcaption className="mt-3 grid grid-cols-3 gap-2 font-mono text-[0.64rem] tracking-[0.1em] text-mist uppercase">
        <span>
          Rate
          <span className="num mt-0.5 block text-[0.86rem] tracking-normal text-ivory">+{read.rate.toFixed(1)} s/d</span>
        </span>
        <span>
          Amplitude
          <span className="num mt-0.5 block text-[0.86rem] tracking-normal text-ivory">{read.amp}°</span>
        </span>
        <span>
          Beat error
          <span className="num mt-0.5 block text-[0.86rem] tracking-normal text-ivory">{BEAT_ERROR.toFixed(1)} ms</span>
        </span>
      </figcaption>
    </figure>
  );
}
