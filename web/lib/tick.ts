"use client";

/**
 * The sound of a lever escapement, synthesised: no audio file.
 *
 * A tick is a tooth landing on a pallet stone — a very short, bright, metallic
 * click. Alternate beats ("tick" and "tock") land on different stones, so they
 * differ slightly in pitch. Each click is a few milliseconds of noise through
 * a resonant band-pass, with a faint lower knock from the case.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let out: GainNode | null = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.03), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function tick(odd: boolean) {
  if (!ctx || !noise || !out || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.005;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = odd ? 4100 : 3600;
  band.Q.value = 9;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 1800;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.9, t + 0.0006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
  src.connect(band).connect(high).connect(env).connect(out);
  // the case's own small knock under the click
  const knock = ctx.createOscillator();
  knock.frequency.value = odd ? 1250 : 1150;
  const kenv = ctx.createGain();
  kenv.gain.setValueAtTime(0.0001, t);
  kenv.gain.exponentialRampToValueAtTime(0.08, t + 0.001);
  kenv.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  knock.connect(kenv).connect(out);
  src.start(t);
  src.stop(t + 0.03);
  knock.start(t);
  knock.stop(t + 0.015);
}
