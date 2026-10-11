import type * as ThreeNS from "three";

/**
 * The machinist's toolbox. Units are millimetres throughout: the case is
 * 40 mm across and the calibre 28.6 mm, so proportions come out right by
 * construction rather than by eye.
 *
 * Every flat part is an extrusion with a bevel, and ExtrudeGeometry puts its
 * faces in group 0 and its sides (bevel included) in group 1. Pass two
 * materials — grained face, mirror-polished side — and every edge gets its
 * anglage for free: the polished chamfer that catches a line of light.
 */

export type V2 = [number, number];

export function makeKit(THREE: typeof ThreeNS) {
  const extrude = (shape: ThreeNS.Shape | ThreeNS.Shape[], depth: number, bevel = 0.06, curveSegments = 24, bevelSegments = 2) => {
    const b = Math.min(bevel, depth * 0.35);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, depth - 2 * b),
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelOffset: -b,
      bevelSegments,
      curveSegments,
    });
    g.translate(0, 0, b); // bottom face at z = 0, top at z = depth
    g.computeVertexNormals();
    return g;
  };

  const circle = (r: number, cx = 0, cy = 0): ThreeNS.Shape => {
    const p = new THREE.Shape();
    p.absarc(cx, cy, r, 0, Math.PI * 2, false);
    return p;
  };

  const holeCircle = (r: number, cx = 0, cy = 0) => {
    const p = new THREE.Path();
    p.absarc(cx, cy, r, 0, Math.PI * 2, true);
    return p;
  };

  /**
   * A closed outline with every corner filleted — the shape language of a
   * bridge. Points are [x, y, radius]. Corners are quadratic fillets, which
   * read as machined at this size.
   */
  const trace = <P extends ThreeNS.Path>(p: P, pts: [number, number, number][]): P => {
    const n = pts.length;
    const at = (i: number) => pts[(i + n) % n];
    for (let i = 0; i < n; i++) {
      const [x, y, r] = at(i);
      const [px, py] = at(i - 1);
      const [nx, ny] = at(i + 1);
      const li = Math.hypot(x - px, y - py);
      const lo = Math.hypot(nx - x, ny - y);
      const rr = Math.min(r, li * 0.48, lo * 0.48);
      const ax = x + ((px - x) / li) * rr;
      const ay = y + ((py - y) / li) * rr;
      const bx = x + ((nx - x) / lo) * rr;
      const by = y + ((ny - y) / lo) * rr;
      if (i === 0) p.moveTo(ax, ay);
      else p.lineTo(ax, ay);
      p.quadraticCurveTo(x, y, bx, by);
    }
    p.closePath();
    return p;
  };
  const rounded = (pts: [number, number, number][]) => trace(new THREE.Shape(), pts);
  const holeRounded = (pts: [number, number, number][]) => trace(new THREE.Path(), pts.slice().reverse());

  /**
   * A watch wheel: ogival (cycloid-like) teeth, a rim, a hub and crossed-out
   * spokes. Teeth are rounded at the tip the way horological gearing is, not
   * involute like a gearbox.
   */
  const wheel = (opts: { teeth: number; r: number; module?: number; hub?: number; rim?: number; spokes?: number; spokeW?: number; bore?: number }) => {
    const { teeth, r } = opts;
    const tooth = opts.module ?? (2 * Math.PI * r) / teeth / 2.2;
    const root = r - tooth * 1.25;
    const s = new THREE.Shape();
    const pitch = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * pitch;
      // root land, rising flank, rounded tip, falling flank
      const pts: [number, number][] = [
        [a0, root],
        [a0 + pitch * 0.12, root],
        [a0 + pitch * 0.2, root + (r - root) * 0.55],
        [a0 + pitch * 0.25, r - (r - root) * 0.12],
        [a0 + pitch * 0.32, r],
        [a0 + pitch * 0.39, r - (r - root) * 0.12],
        [a0 + pitch * 0.44, root + (r - root) * 0.55],
        [a0 + pitch * 0.52, root],
      ];
      pts.forEach(([a, rad], k) => {
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0 && k === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
    }
    s.closePath();
    const rim = opts.rim ?? Math.max(0.35, r * 0.12);
    const hub = opts.hub ?? Math.max(0.6, r * 0.2);
    const spokes = opts.spokes ?? 0;
    if (spokes > 0) {
      const inner = root - rim;
      const sw = (opts.spokeW ?? Math.max(0.28, r * 0.07)) / 2;
      for (let k = 0; k < spokes; k++) {
        const a0 = (k / spokes) * Math.PI * 2;
        const a1 = ((k + 1) / spokes) * Math.PI * 2;
        const da0 = sw / inner;
        const db0 = sw / hub;
        const h = new THREE.Path();
        const steps = 18;
        // outer arc of the window
        for (let j = 0; j <= steps; j++) {
          const a = a0 + da0 + ((a1 - da0) - (a0 + da0)) * (j / steps);
          const x = Math.cos(a) * inner;
          const y = Math.sin(a) * inner;
          if (j === 0) h.moveTo(x, y);
          else h.lineTo(x, y);
        }
        // inner arc, back the other way
        for (let j = 0; j <= steps; j++) {
          const a = a1 - db0 * 1.2 - ((a1 - db0 * 1.2) - (a0 + db0 * 1.2)) * (j / steps);
          h.lineTo(Math.cos(a) * (hub + 0.15), Math.sin(a) * (hub + 0.15));
        }
        h.closePath();
        s.holes.push(h);
      }
    }
    if (opts.bore) s.holes.push(holeCircle(opts.bore));
    return s;
  };

  /** Swiss lever escape wheel: fifteen club teeth, each with its impulse face. */
  const escapeWheel = (r: number, teeth = 15) => {
    const s = new THREE.Shape();
    const pitch = (Math.PI * 2) / teeth;
    const root = r * 0.72;
    for (let i = 0; i < teeth; i++) {
      const a = i * pitch;
      const pts: [number, number][] = [
        [a, root],
        [a + pitch * 0.42, r * 0.97], // long leading flank to the locking corner
        [a + pitch * 0.5, r],
        [a + pitch * 0.62, r * 0.93], // the club: impulse face
        [a + pitch * 0.66, r * 0.86],
        [a + pitch * 0.7, root],
      ];
      pts.forEach(([ang, rad], k) => {
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;
        if (i === 0 && k === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
    }
    s.closePath();
    // four spokes
    const inner = root * 0.82;
    const hub = r * 0.22;
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI * 2 + 0.22;
      const a1 = ((k + 1) / 4) * Math.PI * 2 - 0.22;
      const h = new THREE.Path();
      h.absarc(0, 0, inner, a0, a1, false);
      h.absarc(0, 0, hub + 0.12, a1 - 0.35, a0 + 0.35, true);
      h.closePath();
      s.holes.push(h);
    }
    return s;
  };

  /**
   * A lathe profile turned about the watch axis (Z). LatheGeometry turns about
   * Y, so the result is rotated; profile points are [radius, z].
   */
  const lathe = (profile: V2[], segments = 128, phiLength = Math.PI * 2) => {
    const g = new THREE.LatheGeometry(
      profile.map(([r, z]) => new THREE.Vector2(r, z)),
      segments,
      0,
      phiLength,
    );
    g.rotateX(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  };

  /** A ring of rectangular cross-section, turned: balance rims, chatons, bearings. */
  const ring = (r0: number, r1: number, z0: number, z1: number, chamfer = 0.04, segments = 96) =>
    lathe(
      [
        [r0, z0 + chamfer],
        [r0 + chamfer, z0],
        [r1 - chamfer, z0],
        [r1, z0 + chamfer],
        [r1, z1 - chamfer],
        [r1 - chamfer, z1],
        [r0 + chamfer, z1],
        [r0, z1 - chamfer],
        [r0, z0 + chamfer],
      ],
      segments,
    );

  /** A domed watch-screw head with its slot: [head, slot] geometries, head at z 0..h. */
  const screw = (r = 0.55, h = 0.28) => {
    const head = lathe(
      [
        [0, h],
        [r * 0.55, h * 0.97],
        [r * 0.85, h * 0.85],
        [r, h * 0.55],
        [r, 0],
        [0.001, 0],
      ],
      40,
    );
    const slot = new THREE.BoxGeometry(r * 2.05, r * 0.26, h * 0.8);
    slot.translate(0, 0, h * 0.75);
    return { head, slot };
  };

  /** A ruby hole jewel: a polished dome with an oil sink and the pivot hole. */
  const jewel = (r = 0.48) => ({
    stone: lathe(
      [
        [0.07, 0.16],
        [0.12, 0.13],
        [r * 0.55, 0.15],
        [r * 0.85, 0.11],
        [r, 0.04],
        [r, 0],
        [0.07, 0],
      ],
      40,
    ),
    chaton: ring(r - 0.02, r + 0.26, -0.02, 0.12, 0.05, 48),
  });

  /** A flat ribbon spiral (hairspring, mainspring): positions updated in place. */
  const ribbon = (points: number, height: number) => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(points * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < points - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const set = (fn: (i: number, out: { x: number; y: number }) => void) => {
      const o = { x: 0, y: 0 };
      for (let i = 0; i < points; i++) {
        fn(i, o);
        const j = i * 6;
        pos[j] = o.x;
        pos[j + 1] = o.y;
        pos[j + 2] = 0;
        pos[j + 3] = o.x;
        pos[j + 4] = o.y;
        pos[j + 5] = height;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
      g.computeBoundingSphere();
    };
    return { geometry: g, set };
  };

  return { extrude, circle, holeCircle, rounded, holeRounded, wheel, escapeWheel, lathe, ring, screw, jewel, ribbon };
}

export type Kit = ReturnType<typeof makeKit>;
