import type * as ThreeNS from "three";
import type { Kit } from "./geometry";
import type { Materials } from "./materials";

/**
 * Calibre Q-01, built part by part.
 *
 * Local frame: millimetres, the dial side of the mainplate at z = 0 and +z
 * toward the caseback, so "up" is toward the viewer of the back. Layers, low
 * to high: mainplate → wheels and barrel → bridges and balance cock →
 * ratchet, crown wheel and screws → rotor.
 *
 * Positions follow a classic automatic layout: barrel at ten o'clock (seen
 * from the back), the going train down the right, escapement and balance at
 * six. Every wheel sits at its own height so overlapping discs never touch,
 * the way they do not in a real movement.
 *
 * Driven, not animated: `update` takes the movement's time and derives every
 * angle from it — the train advances in eight jumps a second, released by the
 * escapement, exactly as the real one does.
 */

export interface Explode {
  rotor: number;
  barrel: number;
  train: number;
  pallet: number;
  cock: number;
  cover: number;
}

export interface MovementState {
  /** Seconds of movement time (wall clock, possibly slowed). */
  seconds: number;
  /** Rotor angle in radians. */
  rotor: number;
}

const POS = {
  center: [0, 0],
  barrel: [-5.6, 6.0],
  third: [4.1, 3.4],
  fourth: [6.0, -1.8],
  escape: [4.6, -6.4],
  pallet: [1.9, -8.0],
  balance: [-2.8, -8.9],
  reverserA: [1.4, 4.8],
  reverserB: [3.6, 6.6],
} as const;

const R = 14.3; // 28.6 mm calibre
const PLATE = 1.2;
const BRIDGE_Z = 3.0;
const BRIDGE_T = 1.0;
const TOP = BRIDGE_Z + BRIDGE_T;
const BEATS = 8; // 28,800 vph
const AMPLITUDE = (280 * Math.PI) / 180;

export function buildMovement(THREE: typeof ThreeNS, kit: Kit, m: Materials, displayFont: string) {
  const group = new THREE.Group();
  group.name = "calibre";
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  const mesh = (geo: ThreeNS.BufferGeometry, mat: ThreeNS.Material | ThreeNS.Material[], parent: ThreeNS.Object3D, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const at = (parent: ThreeNS.Object3D, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };

  /** Planar UVs centred on the part, so radial finishes radiate from its axis. */
  const radialUV = (geo: ThreeNS.BufferGeometry, r: number) => {
    const p = geo.attributes.position;
    const uv = geo.attributes.uv as ThreeNS.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * r) + 0.5, p.getY(i) / (2 * r) + 0.5);
    uv.needsUpdate = true;
    return geo;
  };

  /* ---- mainplate: perlage, polished edge ------------------------------- */
  const plateShape = kit.circle(R);
  mesh(kit.extrude(plateShape, PLATE, 0.08, 96), [m.plate, m.plateEdge], group);

  /* ---- jewels and screws ----------------------------------------------- */
  const jewelGeo = kit.jewel(0.46);
  const jewel = (parent: ThreeNS.Object3D, x: number, y: number, z: number) => {
    const g = at(parent, x, y, z);
    mesh(jewelGeo.chaton, m.goldPolished, g);
    mesh(jewelGeo.stone, m.ruby, g, 0, 0, 0.0);
    return g;
  };
  const screwGeo = kit.screw(0.55, 0.26);
  const screw = (parent: ThreeNS.Object3D, x: number, y: number, z: number, blued = true, turn = Math.random() * Math.PI) => {
    const g = at(parent, x, y, z);
    g.rotation.z = turn;
    mesh(screwGeo.head, blued ? m.blued : m.steel, g);
    mesh(screwGeo.slot, m.dark, g);
    return g;
  };

  /* ---- engraving: gold-filled lettering on a bridge --------------------- */
  const engrave = (parent: ThreeNS.Object3D, lines: { text: string; size: number; tracking?: number }[], w: number, h: number, x: number, y: number, rot: number) => {
    const S = 64; // px per mm
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * S);
    cv.height = Math.round(h * S);
    const g = cv.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const total = lines.reduce((a, l) => a + l.size * 1.35, 0);
    let yy = (cv.height - total * S) / 2;
    for (const l of lines) {
      g.font = `600 ${l.size * S}px ${displayFont}`;
      (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(l.tracking ?? 0.12) * l.size * S}px`;
      yy += (l.size * 1.35 * S) / 2;
      g.fillText(l.text, cv.width / 2, yy);
      yy += (l.size * 1.35 * S) / 2;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    const mat = m.engraving.clone();
    mat.alphaMap = tex;
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    o.position.set(x, y, TOP + 0.004);
    o.rotation.z = rot;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  /* ---- the going train -------------------------------------------------- */
  const wheelGeo = (teeth: number, r: number, spokes: number, t: number) => radialUV(kit.extrude(kit.wheel({ teeth, r, spokes, bore: 0.18 }), t, 0.035, 2, 1), r);
  const pinionGeo = (leaves: number, r: number, h: number) => kit.extrude(kit.wheel({ teeth: leaves, r, rim: 0.2, hub: 0.2 }), h, 0.02, 2, 1);
  const arbor = (h0: number, h1: number, r = 0.16) => {
    const g = new THREE.CylinderGeometry(r, r, h1 - h0, 20);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, (h0 + h1) / 2);
    return g;
  };

  const train = {
    center: at(group, ...POS.center, 0),
    third: at(group, ...POS.third, 0),
    fourth: at(group, ...POS.fourth, 0),
    escape: at(group, ...POS.escape, 0),
    barrel: at(group, ...POS.barrel, 0),
  };
  // centre wheel: 1 turn an hour, low, under the barrel
  mesh(wheelGeo(80, 4.4, 5, 0.18), [m.gilt, m.giltEdge], train.center, 0, 0, 1.28);
  mesh(arbor(PLATE, TOP + 0.4, 0.22), m.steel, train.center);
  // third wheel, with its pinion meshing the centre wheel
  mesh(wheelGeo(75, 3.4, 5, 0.2), [m.gilt, m.giltEdge], train.third, 0, 0, 2.0);
  mesh(pinionGeo(10, 0.62, 0.22), m.steel, train.third, 0, 0, 1.26);
  mesh(arbor(PLATE, TOP), m.steel, train.third);
  // fourth wheel: 1 turn a minute
  mesh(wheelGeo(70, 3.0, 4, 0.2), [m.gilt, m.giltEdge], train.fourth, 0, 0, 1.65);
  mesh(pinionGeo(8, 0.55, 0.22), m.steel, train.fourth, 0, 0, 1.98);
  mesh(arbor(PLATE, TOP), m.steel, train.fourth);
  // escape wheel: fifteen club teeth, polished steel
  mesh(radialUV(kit.extrude(kit.escapeWheel(1.9), 0.18, 0.02, 2, 1), 1.9), [m.steelSatin, m.steel], train.escape, 0, 0, 2.15);
  mesh(pinionGeo(7, 0.5, 0.22), m.steel, train.escape, 0, 0, 1.63);
  mesh(arbor(PLATE, TOP), m.steel, train.escape);

  /* ---- barrel and mainspring -------------------------------------------- */
  const BR = 5.3;
  mesh(radialUV(kit.extrude(kit.wheel({ teeth: 84, r: BR + 0.22, rim: 0.4, hub: 0.6 }), 0.28, 0.03, 2, 1), BR), [m.gilt, m.giltEdge], train.barrel, 0, 0, 1.6);
  mesh(kit.ring(BR - 0.32, BR, 1.6, 2.95, 0.05), m.giltEdge, train.barrel);
  mesh(arbor(1.6, 2.95, 0.95), m.steel, train.barrel);
  const spring = kit.ribbon(900, 1.05);
  {
    const turns = 11;
    spring.set((i, o) => {
      const s = i / 899;
      const a = s * turns * Math.PI * 2;
      const r = 1.05 + s * (BR - 0.45 - 1.05);
      o.x = Math.cos(a) * r;
      o.y = Math.sin(a) * r;
    });
  }
  mesh(spring.geometry, m.mainspring, train.barrel, 0, 0, 1.75);
  // the barrel cover lifts away on its own to show the spring
  const cover = at(train.barrel, 0, 0, 0);
  mesh(radialUV(kit.extrude(kit.circle(BR - 0.05), 0.14, 0.03, 64), BR), [m.gilt, m.giltEdge], cover, 0, 0, 2.82);

  /* ---- escapement: pallet fork with two ruby stones ---------------------- */
  const [px, py] = POS.pallet;
  const [ex, ey] = POS.escape;
  const [bx, by] = POS.balance;
  const pallet = at(group, px, py, 0);
  {
    // stones engage the escape wheel either side of the line to the pivot
    const toP = Math.atan2(py - ey, px - ex);
    const s1 = [ex + Math.cos(toP + 0.75) * 1.95 - px, ey + Math.sin(toP + 0.75) * 1.95 - py];
    const s2 = [ex + Math.cos(toP - 0.75) * 1.95 - px, ey + Math.sin(toP - 0.75) * 1.95 - py];
    const dirB = Math.atan2(by - py, bx - px);
    const L = Math.hypot(bx - px, by - py) - 0.78;
    const fx = Math.cos(dirB) * L;
    const fy = Math.sin(dirB) * L;
    const nx = -Math.sin(dirB);
    const ny = Math.cos(dirB);
    const frame = kit.rounded([
      [s1[0] * 1.05, s1[1] * 1.05, 0.25],
      [s2[0] * 1.05, s2[1] * 1.05, 0.25],
      [-0.5 * Math.cos(toP) - 0.5 * nx, -0.5 * Math.sin(toP) - 0.5 * ny, 0.3],
      [-0.6 * Math.cos(toP) + 0.4 * nx, -0.6 * Math.sin(toP) + 0.4 * ny, 0.3],
    ]);
    mesh(kit.extrude(frame, 0.2, 0.03), [m.steelSatin, m.steel], pallet, 0, 0, 2.12);
    // lever, tapering toward the fork, with two horns
    const lever = kit.rounded([
      [nx * 0.28, ny * 0.28, 0.1],
      [fx * 0.92 + nx * 0.2, fy * 0.92 + ny * 0.2, 0.05],
      [fx + nx * 0.34, fy + ny * 0.34, 0.08],
      [fx + Math.cos(dirB) * 0.08 + nx * 0.12, fy + Math.sin(dirB) * 0.08 + ny * 0.12, 0.03],
      [fx * 0.97 + nx * 0.1, fy * 0.97 + ny * 0.1, 0.02],
      [fx * 0.97 - nx * 0.1, fy * 0.97 - ny * 0.1, 0.02],
      [fx + Math.cos(dirB) * 0.08 - nx * 0.12, fy + Math.sin(dirB) * 0.08 - ny * 0.12, 0.03],
      [fx - nx * 0.34, fy - ny * 0.34, 0.08],
      [fx * 0.92 - nx * 0.2, fy * 0.92 - ny * 0.2, 0.05],
      [-nx * 0.28, -ny * 0.28, 0.1],
    ]);
    mesh(kit.extrude(lever, 0.16, 0.025), [m.steelSatin, m.steel], pallet, 0, 0, 2.06);
    for (const s of [s1, s2]) {
      const stone = mesh(new THREE.BoxGeometry(0.62, 0.24, 0.2), m.ruby, pallet, s[0], s[1], 2.24);
      stone.rotation.z = Math.atan2(s[1] + py - ey, s[0] + px - ex);
    }
    mesh(arbor(PLATE, TOP), m.steel, pallet);
  }

  /* ---- balance wheel and hairspring ------------------------------------ */
  const balance = at(group, bx, by, 0);
  const BAL = 4.45;
  mesh(kit.ring(BAL - 0.42, BAL, 2.25, 2.68, 0.05, 128), m.gilt, balance);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    const arm = mesh(new THREE.BoxGeometry(BAL - 0.6, 0.42, 0.22), [m.gilt, m.gilt, m.gilt, m.gilt, m.giltEdge, m.gilt], balance, Math.cos(a) * (BAL / 2 - 0.05), Math.sin(a) * (BAL / 2 - 0.05), 2.4);
    arm.rotation.z = a;
  }
  // four inertia masses: how a free-sprung balance is regulated
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const mass = new THREE.CylinderGeometry(0.34, 0.34, 0.34, 24);
    mass.rotateX(Math.PI / 2);
    mesh(mass, m.goldPolished, balance, Math.cos(a) * (BAL - 0.21), Math.sin(a) * (BAL - 0.21), 2.85);
  }
  mesh(arbor(1.85, TOP + 0.2, 0.17), m.steel, balance);
  mesh(kit.ring(0.12, 0.66, 1.9, 2.1), m.steel, balance);
  {
    const pin = new THREE.CylinderGeometry(0.1, 0.1, 0.36, 16);
    pin.rotateX(Math.PI / 2);
    mesh(pin, m.ruby, balance, 0.5, 0, 1.98);
  }
  const hair = kit.ribbon(560, 0.15);
  const hairMesh = mesh(hair.geometry, m.hairspring, group, bx, by, 2.84);
  hairMesh.castShadow = false;
  const HS = { r0: 0.42, r1: 2.75, turns: 13 };
  const setHair = (theta: number) =>
    hair.set((i, o) => {
      const s = i / 559;
      // the inner end turns with the balance; the outer end is pinned to the stud
      const a = s * HS.turns * Math.PI * 2 + theta * (1 - s);
      const r = HS.r0 + s * (HS.r1 - HS.r0) * (1 + 0.012 * Math.sin(theta) * (1 - s));
      o.x = Math.cos(a) * r;
      o.y = Math.sin(a) * r;
    });
  setHair(0);
  mesh(kit.ring(0.16, 0.36, 2.78, 3.0), m.steel, balance);

  /* ---- bridges ------------------------------------------------------------ */
  const bridgeMats: ThreeNS.Material[] = [m.bridge, m.anglage];
  const layer = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    group.add(g);
    return g;
  };
  const L = {
    barrel: layer("barrel-bridge"),
    train: layer("train-bridge"),
    pallet: layer("pallet-bridge"),
    cock: layer("balance-cock"),
    rotor: layer("rotor"),
  };

  // barrel bridge, with the ratchet and crown wheels on top
  mesh(
    kit.extrude(
      kit.rounded([
        [-13.0, 4.6, 1.8],
        [-10.2, 9.4, 3.0],
        [-6.4, 12.4, 3.0],
        [-1.4, 11.6, 2.4],
        [1.0, 8.0, 2.0],
        [-0.8, 3.4, 2.0],
        [-4.6, 0.8, 2.6],
        [-10.0, 0.6, 2.4],
      ]),
      BRIDGE_T,
      0.14,
      48,
      3,
    ),
    bridgeMats,
    L.barrel,
    0,
    0,
    BRIDGE_Z,
  );
  const ratchet = at(L.barrel, ...POS.barrel, TOP);
  mesh(radialUV(kit.extrude(kit.wheel({ teeth: 72, r: 3.7, rim: 3.2, hub: 0.4 }), 0.26, 0.04, 2, 1), 3.7), [m.steelSatin, m.steel], ratchet);
  screw(ratchet, 0, 0, 0.26, false);
  const crownWheel = at(L.barrel, -10.4, 6.0, TOP);
  mesh(radialUV(kit.extrude(kit.wheel({ teeth: 36, r: 1.8, rim: 1.5, hub: 0.3 }), 0.22, 0.03, 2, 1), 1.8), [m.steelSatin, m.steel], crownWheel);
  screw(crownWheel, 0, 0, 0.22, false);
  screw(L.barrel, -11.6, 3.4, TOP);
  screw(L.barrel, -1.6, 9.4, TOP);
  screw(L.barrel, -3.6, 2.4, TOP);
  engrave(L.barrel, [{ text: "QASIOUN", size: 0.95, tracking: 0.32 }], 7.4, 1.6, -7.2, 10.2, 0.32);

  // train bridge, with two windows onto the wheels below
  {
    const shape = kit.rounded([
      [1.8, 8.6, 2.0],
      [7.2, 10.2, 2.6],
      [11.6, 6.4, 3.0],
      [12.8, 0.0, 3.0],
      [10.6, -5.6, 2.6],
      [7.2, -8.8, 2.0],
      [4.0, -9.0, 1.6],
      [2.6, -5.0, 1.8],
      [-0.6, -3.4, 2.4],
      [-2.4, 0.8, 2.4],
      [-0.6, 4.6, 2.2],
    ]);
    shape.holes.push(
      kit.holeRounded([
        [6.4, 4.6, 0.9],
        [10.0, 3.8, 0.9],
        [10.4, -0.4, 0.9],
        [7.2, 0.2, 0.9],
      ]),
      kit.holeRounded([
        [1.6, -1.0, 0.7],
        [4.6, -0.2, 0.7],
        [4.6, -3.4, 0.7],
        [2.4, -3.8, 0.7],
      ]),
    );
    mesh(kit.extrude(shape, BRIDGE_T, 0.14, 48, 3), bridgeMats, L.train, 0, 0, BRIDGE_Z);
  }
  jewel(L.train, ...POS.third, TOP);
  jewel(L.train, ...POS.fourth, TOP);
  jewel(L.train, ...POS.escape, TOP);
  screw(L.train, 2.4, 7.4, TOP);
  screw(L.train, 11.0, 2.8, TOP);
  screw(L.train, 9.2, -5.4, TOP);
  screw(L.train, 0.6, -2.4, TOP);
  engrave(
    L.train,
    [
      { text: "Q-01", size: 0.9, tracking: 0.2 },
      { text: "THIRTY-ONE JEWELS", size: 0.42, tracking: 0.18 },
      { text: "ADJUSTED · FIVE POSITIONS", size: 0.34, tracking: 0.16 },
    ],
    6.2,
    2.6,
    7.6,
    -4.6,
    -0.62,
  );
  // reverser wheels: they turn both directions of the rotor into winding
  const reverser: ThreeNS.Group[] = [];
  for (const [x, y] of [POS.reverserA, POS.reverserB]) {
    const g = at(L.train, x, y, TOP);
    const w = at(g, 0, 0, 0);
    mesh(radialUV(kit.extrude(kit.wheel({ teeth: 30, r: 1.35, spokes: 4, rim: 0.3, hub: 0.35 }), 0.16, 0.025, 2, 1), 1.35), [m.gilt, m.giltEdge], w, 0, 0, 0.05);
    jewel(g, 0, 0, 0.22);
    reverser.push(w);
  }

  // pallet bridge
  mesh(
    kit.extrude(
      kit.rounded([
        [0.2, -6.0, 0.8],
        [3.0, -6.6, 0.9],
        [3.6, -9.4, 0.9],
        [0.6, -10.0, 0.8],
      ]),
      BRIDGE_T * 0.9,
      0.12,
      32,
      3,
    ),
    bridgeMats,
    L.pallet,
    0,
    0,
    BRIDGE_Z + 0.1,
  );
  jewel(L.pallet, px, py, TOP);
  screw(L.pallet, 2.6, -9.2, TOP);

  // balance cock: a single arm, its end over the balance staff
  mesh(
    kit.extrude(
      kit.rounded([
        [-12.9, -5.9, 1.2],
        [-10.0, -5.6, 1.6],
        [-6.0, -7.6, 1.2],
        [-2.6, -7.0, 1.4],
        [-0.9, -8.8, 1.0],
        [-2.6, -10.7, 1.4],
        [-6.0, -10.2, 1.2],
        [-9.6, -10.4, 1.6],
        [-12.3, -8.4, 1.2],
      ]),
      BRIDGE_T,
      0.14,
      40,
      3,
    ),
    bridgeMats,
    L.cock,
    0,
    0,
    BRIDGE_Z + 0.05,
  );
  jewel(L.cock, bx, by, TOP + 0.05);
  // shock protection: a gold lyre spring holding the cap jewel
  {
    const lyre = new THREE.TorusGeometry(0.72, 0.06, 8, 40, Math.PI * 1.5);
    mesh(lyre, m.goldPolished, L.cock, bx, by, TOP + 0.22).rotation.z = Math.PI * 0.25;
  }
  screw(L.cock, -11.0, -7.8, TOP + 0.05);
  engrave(L.cock, [{ text: "4 Hz · 28,800", size: 0.42, tracking: 0.18 }], 4.4, 0.8, -8.2, -8.2, 0.08);
  // the hairspring stud, under the cock
  mesh(new THREE.BoxGeometry(0.4, 0.4, 0.3), m.steel, L.cock, bx + Math.cos(HS.turns * Math.PI * 2) * HS.r1, by + Math.sin(HS.turns * Math.PI * 2) * HS.r1, 2.95);

  /* ---- rotor: 18k gold, on a ball bearing --------------------------------- */
  const rotorSpin = at(L.rotor, 0, 0, 0);
  {
    const RR = 13.6;
    const sector = new THREE.Shape();
    sector.absarc(0, 0, RR - 2.1, 0, Math.PI, false);
    sector.absarc(0, 0, 2.7, Math.PI, 0, true);
    sector.closePath();
    for (const c of [Math.PI * 0.28, Math.PI * 0.72]) {
      const h = new THREE.Path();
      h.absarc(0, 0, RR - 3.6, c - 0.34, c + 0.34, false);
      h.absarc(0, 0, 5.2, c + 0.26, c - 0.26, true);
      h.closePath();
      sector.holes.push(h);
    }
    mesh(radialUV(kit.extrude(sector, 0.42, 0.06, 64, 2), RR), [m.gold, m.goldPolished], rotorSpin, 0, 0, 4.55);
    // the heavy rim: most of the rotor's mass sits at its edge
    const rim = new THREE.Shape();
    rim.absarc(0, 0, RR, 0, Math.PI, false);
    rim.absarc(0, 0, RR - 2.2, Math.PI, 0, true);
    rim.closePath();
    mesh(radialUV(kit.extrude(rim, 0.78, 0.1, 96, 3), RR), [m.gold, m.goldPolished], rotorSpin, 0, 0, 4.4);
    // engraved along the rim
    const cv = document.createElement("canvas");
    cv.width = cv.height = 2048;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, 2048, 2048);
    g.fillStyle = "#fff";
    g.font = `600 52px ${displayFont}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const text = "QASIOUN  ·  CALIBRE Q-01  ·  AUTOMATIC  ·  XXXI JEWELS";
    const rad = ((RR - 1.1) / (2 * RR)) * 2048;
    const span = Math.PI * 0.82;
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
      // canvas y runs down; the rotor's upper half is canvas's upper half
      const a = Math.PI / 2 + span / 2 - (i / (chars.length - 1)) * span;
      g.save();
      g.translate(1024 + Math.cos(a) * rad, 1024 - Math.sin(a) * rad);
      g.rotate(Math.PI / 2 - a);
      g.fillText(ch, 0, 0);
      g.restore();
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    const ringGeo = new THREE.RingGeometry(RR - 2.0, RR - 0.2, 128, 1, 0, Math.PI);
    radialUV(ringGeo, RR);
    const mat = m.engraving.clone();
    mat.alphaMap = tex;
    mat.color.set("#7a5a2a"); // engraved, so darker than the polished gold around it
    mat.metalness = 0.9;
    mat.roughness = 0.55;
    const o = new THREE.Mesh(ringGeo, mat);
    o.position.z = 4.4 + 0.78 + 0.003;
    rotorSpin.add(o);
  }
  // ceramic ball bearing at the hub, held by three blued screws
  mesh(kit.ring(1.2, 2.8, 4.0, 5.15, 0.08), m.steel, L.rotor);
  mesh(kit.ring(0.5, 1.2, 4.6, 5.25, 0.06), m.steelSatin, rotorSpin);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    screw(rotorSpin, Math.cos(a) * 1.9, Math.sin(a) * 1.9, 5.12, true).scale.setScalar(0.62);
  }

  /* ---- where the camera looks, in this frame ---------------------------- */
  const anchors = {
    centre: V(0, 0, 3),
    rotor: V(0, 0, 5),
    barrel: V(POS.barrel[0], POS.barrel[1], 2.4),
    train: V(4.2, 0.2, 2.2),
    escapement: V((POS.escape[0] + POS.pallet[0]) / 2, (POS.escape[1] + POS.pallet[1]) / 2 - 0.4, 2.3),
    balance: V(bx, by, 2.7),
    jewel: V(POS.third[0], POS.third[1], TOP + 0.1),
    finishing: V(9.6, -3.2, TOP),
  };

  /* ---- motion --------------------------------------------------------------- */
  const base = {
    rotor: L.rotor.position.z,
    barrel: L.barrel.position.z,
    train: L.train.position.z,
    pallet: L.pallet.position.z,
    cock: L.cock.position.z,
    cover: cover.position.z,
  };
  let lastBeat = -1;
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  return {
    group,
    anchors,
    layers: L,
    /** Lifts each layer of the movement toward the viewer, 0 → in place. */
    explode(e: Explode) {
      // a watchmaker lifts each part and sets it aside on the bench: up first,
      // then out of frame, so nothing lifted ever hangs between lens and subject
      const out = (g: ThreeNS.Object3D, k: number, dx: number, dy: number, z0: number, lift: number, tilt: number) => {
        const up = Math.min(1, k / 0.35);
        const away = Math.max(0, (k - 0.2) / 0.8);
        g.position.set(dx * away * away, dy * away * away, z0 + lift * up);
        g.rotation.set(tilt * away, -tilt * 0.6 * away, 0);
        g.visible = k < 0.985;
      };
      out(L.rotor, e.rotor, -46, 30, base.rotor, 6, 0.5);
      out(L.barrel, e.barrel, -44, 26, base.barrel, 5, 0.4);
      out(L.train, e.train, 46, 22, base.train, 5, -0.4);
      out(L.pallet, e.pallet, 30, -44, base.pallet, 4, 0.3);
      out(L.cock, e.cock, -36, -42, base.cock, 5, -0.3);
      out(cover, e.cover, -16, 12, base.cover, 3, 0.6);
    },
    /** Every angle, from the movement's own time. Returns true on a new beat. */
    update(s: MovementState) {
      const beatF = s.seconds * BEATS;
      const k = Math.floor(beatF);
      const phase = beatF - k;
      // the train jumps at each release and is still between them
      const step = (k + ease(phase / 0.1)) / BEATS;
      const fourth = ((step % 60) / 60) * Math.PI * 2;
      train.fourth.rotation.z = -fourth;
      train.third.rotation.z = fourth / 7.5;
      train.center.rotation.z = -((step % 3600) / 3600) * Math.PI * 2;
      train.barrel.rotation.z = ((step % 21600) / 21600) * Math.PI * 2;
      train.escape.rotation.z = ((k + ease(phase / 0.08)) * Math.PI * 2) / 30;
      // the fork flips side as the balance passes through its centre
      const side = k % 2 === 0 ? 1 : -1;
      const flip = ease(phase / 0.06);
      pallet.rotation.z = 0.15 * (side * flip - side * (1 - flip));
      const theta = AMPLITUDE * Math.sin(2 * Math.PI * (BEATS / 2) * s.seconds);
      balance.rotation.z = theta;
      setHair(theta);
      rotorSpin.rotation.z = s.rotor;
      reverser[0].rotation.z = -s.rotor * 4.2;
      reverser[1].rotation.z = s.rotor * 4.2;
      const beat = k !== lastBeat;
      lastBeat = k;
      return beat;
    },
  };
}

export type Movement = ReturnType<typeof buildMovement>;
