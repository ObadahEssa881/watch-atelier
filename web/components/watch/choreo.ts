import type { AnchorName, StageInput } from "./scene";
import type { ChapterId } from "@/lib/content";

/**
 * The scroll, as a sequence of photographs.
 *
 * Each chapter of the page is a pose of the watch: how it is turned, which
 * part sits at the centre of the frame, how close the lens is, how shallow
 * the focus, what has been lifted off, how fast time runs. Every pose has an
 * arriving and a leaving version, so a held pose drifts a little — a still
 * product shot never quite stops. Between chapters the poses blend.
 *
 * Plain numbers, no three.js import, so the scroll code ships in the page
 * chunk and the renderer arrives later in its own.
 */

type Euler = [number, number, number];
type ExplodeKey = keyof StageInput["explode"];

interface Pose {
  rot: Euler;
  anchor: AnchorName;
  dist: number;
  aperture: number;
  explode: Partial<Record<ExplodeKey, number>>;
  speed: number;
}

const PI = Math.PI;
const OFF: StageInput["explode"] = { rotor: 0, barrel: 0, train: 0, pallet: 0, cock: 0, cover: 0, caseback: 0 };

const HERO: Pose = { rot: [-0.36, -0.5, 0.16], anchor: "dial", dist: 126, aperture: 0.00003, explode: {}, speed: 1 };

const CHAPTERS: Record<ChapterId, [Pose, Pose]> = {
  caseback: [
    { rot: [0.3, PI + 0.46, -0.1], anchor: "caseback", dist: 116, aperture: 0.00005, explode: {}, speed: 1 },
    { rot: [0.24, PI + 0.22, -0.04], anchor: "caseback", dist: 108, aperture: 0.00005, explode: {}, speed: 1 },
  ],
  rotor: [
    { rot: [0.2, PI + 0.14, 0], anchor: "rotor", dist: 88, aperture: 0.0002, explode: { caseback: 1 }, speed: 1 },
    { rot: [0.28, PI - 0.06, 0.06], anchor: "rotor", dist: 84, aperture: 0.0002, explode: { caseback: 1 }, speed: 1 },
  ],
  barrel: [
    { rot: [0.44, PI + 0.3, 0.36], anchor: "barrel", dist: 58, aperture: 0.001, explode: { caseback: 1, rotor: 1, barrel: 1, cover: 1 }, speed: 1 },
    { rot: [0.5, PI + 0.16, 0.42], anchor: "barrel", dist: 54, aperture: 0.001, explode: { caseback: 1, rotor: 1, barrel: 1, cover: 1 }, speed: 1 },
  ],
  train: [
    { rot: [0.32, PI - 0.22, -0.12], anchor: "train", dist: 62, aperture: 0.001, explode: { caseback: 1, rotor: 1, barrel: 1, train: 1 }, speed: 1 },
    { rot: [0.38, PI - 0.34, -0.06], anchor: "train", dist: 58, aperture: 0.001, explode: { caseback: 1, rotor: 1, barrel: 1, train: 1 }, speed: 1 },
  ],
  escapement: [
    { rot: [0.52, PI + 0.12, 0.5], anchor: "escapement", dist: 32, aperture: 0.0026, explode: { caseback: 1, rotor: 1, barrel: 1, train: 1, pallet: 1 }, speed: 0.12 },
    { rot: [0.56, PI + 0.02, 0.56], anchor: "escapement", dist: 30, aperture: 0.0026, explode: { caseback: 1, rotor: 1, barrel: 1, train: 1, pallet: 1 }, speed: 0.12 },
  ],
  balance: [
    { rot: [0.38, PI - 0.24, -0.3], anchor: "balance", dist: 36, aperture: 0.0024, explode: { caseback: 1, rotor: 1, barrel: 1, train: 1, pallet: 1, cock: 1 }, speed: 0.15 },
    { rot: [0.44, PI - 0.36, -0.36], anchor: "balance", dist: 34, aperture: 0.0024, explode: { caseback: 1, rotor: 1, barrel: 1, train: 1, pallet: 1, cock: 1 }, speed: 0.15 },
  ],
  jewels: [
    { rot: [0.56, PI + 0.34, 0.2], anchor: "jewel", dist: 26, aperture: 0.0036, explode: { caseback: 1, rotor: 1 }, speed: 1 },
    { rot: [0.6, PI + 0.22, 0.26], anchor: "jewel", dist: 24, aperture: 0.0036, explode: { caseback: 1, rotor: 1 }, speed: 1 },
  ],
  finishing: [
    { rot: [0.66, PI - 0.36, -0.42], anchor: "finishing", dist: 30, aperture: 0.003, explode: { caseback: 1, rotor: 1 }, speed: 1 },
    { rot: [0.7, PI - 0.48, -0.46], anchor: "finishing", dist: 28, aperture: 0.003, explode: { caseback: 1, rotor: 1 }, speed: 1 },
  ],
};

const TOGETHER: Pose = { rot: [-0.18, 0.4, -0.1], anchor: "dial", dist: 118, aperture: 0.00003, explode: {}, speed: 1 };
const CONFIG_FRONT: Pose = { rot: [-0.14, -0.3, 0.05], anchor: "dial", dist: 112, aperture: 0.00003, explode: {}, speed: 1 };
const CONFIG_BACK: Pose = { rot: [0.16, PI + 0.3, -0.05], anchor: "caseback", dist: 112, aperture: 0.00003, explode: {}, speed: 1 };

/* ---- quaternion maths, so this file needs no three.js ------------------ */
type Q = [number, number, number, number];
function quat([x, y, z]: Euler): Q {
  // XYZ order, as three.js
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
}
function slerp(a: Q, b: Q, t: number): Q {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (cos < 0) {
    cos = -cos;
    bb = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (cos > 0.9995) {
    const r: Q = [a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, a[3] + (bb[3] - a[3]) * t];
    const l = Math.hypot(...r);
    return [r[0] / l, r[1] / l, r[2] / l, r[3] / l];
  }
  const th = Math.acos(cos);
  const sa = Math.sin((1 - t) * th) / Math.sin(th);
  const sb = Math.sin(t * th) / Math.sin(th);
  return [a[0] * sa + bb[0] * sb, a[1] * sa + bb[1] * sb, a[2] * sa + bb[2] * sb, a[3] * sa + bb[3] * sb];
}
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (x: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (x - a) / Math.max(1, b - a))));

interface Key {
  at: number;
  pose: Pose;
}

export interface Reading {
  input: StageInput;
  /** 0..1, how visible the stage is. */
  alpha: number;
  /** The chapter under the middle of the screen, if any. */
  chapter: ChapterId | null;
}

export function createChoreo() {
  let keys: Key[] = [];
  let vh = 1;
  let phone = false;
  let stageEnd = Infinity;
  let spans: { id: ChapterId; top: number; end: number }[] = [];
  const abs = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, h: r.height };
  };

  function refresh() {
    vh = window.innerHeight;
    phone = window.innerWidth < 900;
    keys = [{ at: 0, pose: HERO }];
    spans = [];
    document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => {
      const id = el.dataset.chapter as ChapterId;
      const pair = CHAPTERS[id];
      if (!pair) return;
      const { top, h } = abs(el);
      spans.push({ id, top, end: top + h });
      keys.push({ at: top - 0.35 * vh, pose: pair[0] }, { at: Math.max(top - 0.35 * vh + 1, top + h - vh), pose: pair[1] });
    });
    const together = document.getElementById("together");
    if (together) {
      const { top, h } = abs(together);
      keys.push({ at: top - 0.2 * vh, pose: TOGETHER }, { at: top + h - vh * 0.6, pose: TOGETHER });
    }
    const config = document.getElementById("configure");
    if (config) {
      const { top, h } = abs(config);
      keys.push({ at: top - 0.1 * vh, pose: CONFIG_FRONT }, { at: top + h - vh, pose: CONFIG_FRONT });
      stageEnd = top + h - 0.35 * vh;
    }
    keys.sort((a, b) => a.at - b.at);
  }

  const input: StageInput = {
    quat: [0, 0, 0, 1],
    anchor: "dial",
    dist: HERO.dist,
    offX: 0,
    offY: 0,
    aperture: 0,
    explode: { ...OFF },
    speed: 1,
    rotor: 0,
  };

  /** `back` turns the configurator's watch around to show the engraving. */
  function read(opts: { back: boolean; realSpeed: boolean }): Reading {
    const y = window.scrollY;
    let a = keys[0];
    let b = keys[keys.length - 1];
    if (y <= a.at) b = a;
    else if (y >= b.at) a = b;
    else
      for (let i = 0; i < keys.length - 1; i++)
        if (y >= keys[i].at && y <= keys[i + 1].at) {
          a = keys[i];
          b = keys[i + 1];
          break;
        }
    let t = a === b ? 0 : smooth((y - a.at) / Math.max(1, b.at - a.at));
    let pa = a.pose;
    let pb = b.pose;
    if (opts.back && (pa === CONFIG_FRONT || pb === CONFIG_FRONT)) {
      pa = CONFIG_BACK;
      pb = CONFIG_BACK;
      t = 0;
    }
    input.quat = slerp(quat(pa.rot), quat(pb.rot), t);
    // the anchor switches at the midpoint; the scene eases the target itself
    input.anchor = t < 0.5 ? pa.anchor : pb.anchor;
    input.dist = pa.dist + (pb.dist - pa.dist) * t;
    input.aperture = pa.aperture + (pb.aperture - pa.aperture) * t;
    for (const k of Object.keys(OFF) as ExplodeKey[]) input.explode[k] = (pa.explode[k] ?? 0) + ((pb.explode[k] ?? 0) - (pa.explode[k] ?? 0)) * t;
    input.speed = opts.realSpeed ? 1 : pa.speed + (pb.speed - pa.speed) * t;
    // the rotor turns with the scroll everywhere: your wrist, moving
    input.rotor = (y / vh) * 0.9;

    // phones: portrait, the copy below — pull back and lift the subject
    const aspect = window.innerWidth / Math.max(1, vh);
    if (aspect < 1) input.dist *= 1 + (1 - aspect) * 0.95;
    input.offX = phone ? 0 : 0.19;
    input.offY = phone ? 0.16 : 0;

    const mid = y + vh * 0.5;
    const chapter = spans.find((s) => mid >= s.top && mid < s.end)?.id ?? null;
    const alpha = 1 - ramp(y, stageEnd - 0.2 * vh, stageEnd + 0.35 * vh);
    return { input, alpha, chapter };
  }

  return { refresh, read };
}
