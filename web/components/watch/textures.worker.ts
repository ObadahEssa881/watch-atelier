/// <reference lib="webworker" />

/**
 * The finishes, generated off the main thread.
 *
 * Every texture on the watch is a real horological finish written as maths —
 * nothing is downloaded. Each one is computed here, in a worker, so the page
 * keeps scrolling at full rate while the maps are made, then encoded as PNG
 * and handed back; the page stores the PNG in IndexedDB so a second visit
 * skips this work entirely.
 *
 * Normal maps are tangent-space (OpenGL, +Y up). Anisotropy maps follow
 * three.js: RG = direction in [-1, 1] mapped to [0, 1], B = strength.
 */

export type TexName = "cotesNormal" | "cotesAniso" | "perlageNormal" | "perlageAniso" | "sunNormal" | "sunAniso" | "brushedNormal" | "leatherNormal" | "grainNormal" | "grainAniso";

export interface TexRequest {
  names: TexName[];
}
export interface TexReply {
  name: TexName;
  blob: Blob;
}

const SIZE: Record<TexName, number> = {
  cotesNormal: 512,
  cotesAniso: 512,
  perlageNormal: 512,
  perlageAniso: 512,
  sunNormal: 1024,
  sunAniso: 512,
  brushedNormal: 512,
  leatherNormal: 512,
  grainNormal: 1024,
  grainAniso: 512,
};

/* ---- periodic noise ----------------------------------------------------- */

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** 1-D value noise with period `p` (integer). */
function noise1(x: number, p: number) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(((i % p) + p) % p);
  const b = hash((((i + 1) % p) + p) % p);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
/** 2-D value noise with period `p` on both axes. */
function noise2(x: number, y: number, p: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (i: number, j: number) => hash((((i % p) + p) % p) * 57 + (((j % p) + p) % p) * 131);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Height field → tangent-space normal map (wrapping at the edges). */
function heightToNormal(h: Float32Array, s: number, strength: number, wrap = true) {
  const out = new Uint8ClampedArray(s * s * 4);
  const at = (x: number, y: number) => {
    if (wrap) {
      x = (x + s) % s;
      y = (y + s) % s;
    } else {
      x = Math.max(0, Math.min(s - 1, x));
      y = Math.max(0, Math.min(s - 1, y));
    }
    return h[y * s + x];
  };
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      // canvas rows run downward; tangent space +Y runs up the texture
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * s + x) * 4;
      out[i] = (-dx * inv * 0.5 + 0.5) * 255;
      out[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      out[i + 2] = (inv * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

function anisoPixel(out: Uint8ClampedArray, i: number, dx: number, dy: number, strength: number) {
  const l = Math.hypot(dx, dy) || 1;
  out[i] = (dx / l * 0.5 + 0.5) * 255;
  // canvas rows run downward; texture +Y runs up
  out[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
  out[i + 2] = strength * 255;
  out[i + 3] = 255;
}

/* ---- the finishes ------------------------------------------------------- */

/**
 * Côtes de Genève: parallel bands, each cut by a spinning wheel, so every band
 * carries fine arcs across it. Four bands per tile; the arcs curve the same way
 * in every band, the way the wheel leaves them.
 */
const BANDS = 4;
function cotes(s: number, kind: "normal" | "aniso") {
  const w = s / BANDS;
  if (kind === "aniso") {
    const out = new Uint8ClampedArray(s * s * 4);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const u = ((x % w) - w / 2) / w; // -0.5..0.5 across the band
        // arc tangent runs across the band; the highlight stretches along it
        anisoPixel(out, (y * s + x) * 4, 1, -2.2 * u, 0.9);
      }
    return out;
  }
  const h = new Float32Array(s * s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const u = ((x % w) - w / 2) / w;
      const band = Math.floor(x / w);
      // the band is flat; only a slight step where the next pass overlapped it
      const ridge = Math.cos(u * Math.PI) * 0.08 + (u > 0.44 ? (u - 0.44) * -2.2 : 0);
      // arcs: the scratches follow y + k·u², so they bow across the band
      const arc = y + 34 * u * u * w / 64 + band * 17;
      const scratch = noise1(arc * 0.9, s) * 0.35 + noise1(arc * 3.1, s * 3) * 0.15;
      h[y * s + x] = ridge + scratch * 0.42;
    }
  return heightToNormal(h, s, 2.2);
}

/**
 * Perlage: overlapping circles of grain, laid in rows like the real thing.
 * What makes it read as perlage is the anisotropy: each circle is grained
 * round its own centre, so each throws its own crescent of light.
 */
function perlage(s: number, kind: "normal" | "aniso" = "normal") {
  const h = new Float32Array(s * s);
  const an = new Uint8ClampedArray(kind === "aniso" ? s * s * 4 : 0);
  const step = s / 16;
  const r = step * 1.35;
  const n = Math.round(s / step);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      // the topmost circle covering this pixel wins: later rows sit on earlier ones
      let best = -1;
      let bx = 0;
      let by = 0;
      const cx0 = Math.floor(x / step);
      const cy0 = Math.floor(y / step);
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++) {
          const gi = cx0 + i;
          const gj = cy0 + j;
          const px = gi * step + (gj % 2 ? step / 2 : 0);
          const py = gj * step;
          let ddx = x - px;
          let ddy = y - py;
          ddx -= Math.round(ddx / s) * s;
          ddy -= Math.round(ddy / s) * s;
          if (ddx * ddx + ddy * ddy < r * r) {
            const order = (((gj % n) + n) % n) * n + (((gi % n) + n) % n);
            if (order > best) {
              best = order;
              bx = ddx;
              by = ddy;
            }
          }
        }
      const d = Math.hypot(bx, by) / r;
      if (kind === "aniso") {
        // grain runs round the circle; the highlight stretches across it
        anisoPixel(an, (y * s + x) * 4, bx, by, Math.min(1, d * 1.6));
        continue;
      }
      // each circle is flat, cut with fine concentric grain; its edge is a faint step
      const grain = Math.sin(d * 46 + best) * 0.07 + noise1(Math.atan2(by, bx) * 40 + best * 7, 997) * 0.05;
      h[y * s + x] = (1 - d * d) * 0.05 + grain + (d > 0.95 ? -0.06 : 0);
    }
  if (kind === "aniso") return an;
  return heightToNormal(h, s, 3.0);
}

/** Sunburst: fine scratches radiating from the centre of the dial. */
function sun(s: number, kind: "normal" | "aniso") {
  const c = s / 2;
  if (kind === "aniso") {
    const out = new Uint8ClampedArray(s * s * 4);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const dx = x - c;
        const dy = y - c;
        // scratches run radially, so the highlight is stretched around the circle
        anisoPixel(out, (y * s + x) * 4, -dy, dx, Math.min(1, Math.hypot(dx, dy) / 12));
      }
    return out;
  }
  const h = new Float32Array(s * s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const a = Math.atan2(y - c, x - c);
      const t = (a / (Math.PI * 2) + 0.5) * 2400;
      h[y * s + x] = noise1(t, 2400) * 0.6 + noise1(t * 3.7, 8880) * 0.25;
    }
  return heightToNormal(h, s, 1.4, false);
}

/** Linear brushing, along x: case flanks and lug tops. */
function brushed(s: number) {
  const h = new Float32Array(s * s);
  for (let y = 0; y < s; y++) {
    const line = noise1(y * 1.7, Math.round(s * 1.7)) * 0.7 + noise1(y * 5.3, Math.round(s * 5.3)) * 0.3;
    for (let x = 0; x < s; x++) h[y * s + x] = line + noise2(x * 0.01, y * 0.8, Math.round(s * 0.8)) * 0.15;
  }
  return heightToNormal(h, s, 1.2);
}

/** Calf leather: a fine pebbled grain with soft pores. */
function leather(s: number) {
  const h = new Float32Array(s * s);
  const cells = 48;
  const pts: [number, number][] = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([(i + hash(i * 7 + j * 13)) / cells, (j + hash(i * 31 + j * 3)) / cells]);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const u = x / s;
      const v = y / s;
      const ci = Math.floor(u * cells);
      const cj = Math.floor(v * cells);
      let d1 = 9;
      let d2 = 9;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const ii = (ci + i + cells) % cells;
          const jj = (cj + j + cells) % cells;
          const p = pts[jj * cells + ii];
          let dx = p[0] - u;
          let dy = p[1] - v;
          dx -= Math.round(dx);
          dy -= Math.round(dy);
          const d = Math.hypot(dx, dy) * cells;
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
      const crease = Math.min(1, (d2 - d1) * 3);
      h[y * s + x] = crease * 0.7 + noise2(u * 64, v * 64, 64) * 0.3;
    }
  return heightToNormal(h, s, 2.5);
}

/** Circular graining (soleillage) for wheels and the ratchet wheel. */
function grain(s: number, kind: "normal" | "aniso") {
  const c = s / 2;
  if (kind === "aniso") {
    const out = new Uint8ClampedArray(s * s * 4);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) anisoPixel(out, (y * s + x) * 4, x - c, y - c, 0.85);
    return out;
  }
  const h = new Float32Array(s * s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const r = Math.hypot(x - c, y - c);
      h[y * s + x] = noise1(r * 1.3, 4096) * 0.6 + noise1(r * 4.1, 8192) * 0.3;
    }
  return heightToNormal(h, s, 1.6, false);
}

function make(name: TexName): Uint8ClampedArray {
  const s = SIZE[name];
  switch (name) {
    case "cotesNormal":
      return cotes(s, "normal");
    case "cotesAniso":
      return cotes(s, "aniso");
    case "perlageNormal":
      return perlage(s);
    case "perlageAniso":
      return perlage(s, "aniso");
    case "sunNormal":
      return sun(s, "normal");
    case "sunAniso":
      return sun(s, "aniso");
    case "brushedNormal":
      return brushed(s);
    case "leatherNormal":
      return leather(s);
    case "grainNormal":
      return grain(s, "normal");
    case "grainAniso":
      return grain(s, "aniso");
  }
}

self.onmessage = async (e: MessageEvent<TexRequest>) => {
  for (const name of e.data.names) {
    const s = SIZE[name];
    const data = make(name);
    const canvas = new OffscreenCanvas(s, s);
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), s, s), 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    (self as unknown as Worker).postMessage({ name, blob } satisfies TexReply);
  }
};
