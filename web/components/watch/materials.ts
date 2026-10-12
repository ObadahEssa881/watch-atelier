import type * as ThreeNS from "three";
import type { CaseId, DialId, StrapId } from "@/lib/catalogue";
import { tiled, type Maps } from "./textures";

/**
 * Every surface of the watch, as the atelier would finish it.
 *
 * r186 notes (omni-channel threejs skill): colours from hex strings are sRGB;
 * physical lighting, so metals need an environment, not lights; anisotropy is
 * how brushed metal is done (the highlight stretched across the grain), and
 * every data map here is NoColorSpace.
 */

export interface CaseFinish {
  polished: ThreeNS.MeshPhysicalMaterial;
  satin: ThreeNS.MeshPhysicalMaterial;
  /** Hands and indices: faceted so they catch light from every angle. */
  hands: ThreeNS.MeshPhysicalMaterial;
}

const CASE_COLOURS: Record<CaseId, { base: string; polishRough: number; satinRough: number }> = {
  steel: { base: "#cfd3d8", polishRough: 0.07, satinRough: 0.3 },
  titanium: { base: "#a7a39d", polishRough: 0.16, satinRough: 0.42 },
  rosegold: { base: "#e7a98b", polishRough: 0.06, satinRough: 0.26 },
};

export const DIALS: Record<DialId, { color: string; metal: number; rough: number; sun: boolean; print: string }> = {
  ink: { color: "#121418", metal: 0.65, rough: 0.32, sun: true, print: "#ece6da" },
  opaline: { color: "#d8d5ce", metal: 0.25, rough: 0.48, sun: false, print: "#1a1a1c" },
  blued: { color: "#1b3474", metal: 0.7, rough: 0.3, sun: true, print: "#eef1f7" },
  olive: { color: "#2c3824", metal: 0.6, rough: 0.33, sun: true, print: "#eee9da" },
};

export const STRAPS: Record<StrapId, { color: string; sheen: string; stitch: string }> = {
  black: { color: "#151312", sheen: "#5a5550", stitch: "#2b2826" },
  cognac: { color: "#7a4422", sheen: "#d9a27a", stitch: "#e8d5b8" },
  midnight: { color: "#1a2133", sheen: "#5d6b8c", stitch: "#2a3349" },
};

export function makeMaterials(THREE: typeof ThreeNS, maps: Maps) {
  const M = (p: ThreeNS.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);

  /* ---- the movement ---- */

  // Rhodium-plated bridges: Côtes de Genève across the faces. UVs are in
  // millimetres, so the stripes run unbroken from one bridge to the next.
  const bridge = M({
    color: "#e4e7eb",
    metalness: 1,
    roughness: 0.26,
    normalMap: tiled(maps.cotesNormal, 1 / 10),
    normalScale: new THREE.Vector2(0.2, 0.2),
    anisotropy: 0.6,
    anisotropyMap: tiled(maps.cotesAniso, 1 / 10),
    envMapIntensity: 1.1,
  });
  // Anglage: the hand-polished chamfer on every edge. A near-perfect mirror.
  const anglage = M({ color: "#eef0f3", metalness: 1, roughness: 0.035, envMapIntensity: 1.3 });
  // The mainplate, perlaged where it shows between the bridges.
  const plate = M({
    color: "#d6dade",
    metalness: 1,
    roughness: 0.34,
    normalMap: tiled(maps.perlageNormal, 1 / 18),
    normalScale: new THREE.Vector2(0.3, 0.3),
    anisotropy: 0.7,
    anisotropyMap: tiled(maps.perlageAniso, 1 / 18),
    envMapIntensity: 1,
  });
  const plateEdge = M({ color: "#c9cdd2", metalness: 1, roughness: 0.18 });
  // Gilded wheels (copper-beryllium, gold-plated), circular-grained.
  const gilt = M({
    color: "#e0a874",
    metalness: 1,
    roughness: 0.24,
    normalMap: maps.grainNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    anisotropy: 0.55,
    anisotropyMap: maps.grainAniso,
    envMapIntensity: 1.15,
  });
  const giltEdge = M({ color: "#eab98a", metalness: 1, roughness: 0.08 });
  // 18k yellow-gold rotor.
  const gold = M({
    color: "#e6bd78",
    metalness: 1,
    roughness: 0.2,
    normalMap: maps.grainNormal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    anisotropy: 0.6,
    anisotropyMap: maps.grainAniso,
    envMapIntensity: 1.2,
  });
  const goldPolished = M({ color: "#f0c987", metalness: 1, roughness: 0.05, envMapIntensity: 1.3 });
  const steel = M({ color: "#d9dce0", metalness: 1, roughness: 0.08, envMapIntensity: 1.2 });
  const steelSatin = M({
    color: "#cfd3d7",
    metalness: 1,
    roughness: 0.22,
    normalMap: maps.grainNormal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    anisotropy: 0.7,
    anisotropyMap: maps.grainAniso,
  });
  // Heat-blued steel: a thin oxide layer, so it shifts colour with the angle.
  const blued = M({
    color: "#2347b0",
    metalness: 1,
    roughness: 0.16,
    iridescence: 0.7,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [260, 420],
    envMapIntensity: 1.25,
  });
  // Synthetic ruby: corundum, n ≈ 1.77. Drawn opaque, deep red with a glow
  // from within: a jewel this small reads by its colour and its highlight,
  // and real transmission makes three render the whole scene a second time.
  const ruby = M({
    color: "#a8102c",
    emissive: "#3c030e",
    metalness: 0,
    roughness: 0.03,
    ior: 1.77,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
    envMapIntensity: 1.6,
  });
  const hairspring = M({ color: "#b8c2d4", metalness: 1, roughness: 0.18, side: THREE.DoubleSide });
  const mainspring = M({ color: "#6f7a8c", metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  // alpha-tested, not transparent: drawn with the opaque parts, before the glass
  const engraving = new THREE.MeshStandardMaterial({ color: "#d9b06a", metalness: 1, roughness: 0.35, alphaTest: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: "#16181b", metalness: 0.6, roughness: 0.5 });

  /* ---- the case ---- */

  const caseFinish: CaseFinish = {
    polished: M({ color: "#cfd3d8", metalness: 1, roughness: 0.07, envMapIntensity: 1.8 }),
    hands: M({ color: "#e6e9ed", metalness: 1, roughness: 0.12, envMapIntensity: 2.4, side: THREE.DoubleSide }),
    satin: M({
      color: "#cfd3d8",
      metalness: 1,
      roughness: 0.3,
      normalMap: tiled(maps.brushedNormal, 1 / 9),
      normalScale: new THREE.Vector2(0.5, 0.5),
      anisotropy: 0.85,
      anisotropyRotation: Math.PI / 2,
      envMapIntensity: 1.6,
    }),
  };
  const setCase = (id: CaseId) => {
    const c = CASE_COLOURS[id];
    caseFinish.polished.color.set(c.base);
    caseFinish.polished.roughness = c.polishRough;
    caseFinish.satin.color.set(c.base);
    caseFinish.satin.roughness = c.satinRough;
    caseFinish.hands.color.set(c.base).offsetHSL(0, 0, 0.06);
  };

  // Box sapphire: n ≈ 1.77, clear, anti-reflective coating read as a faint
  // blue-violet bloom at grazing angles (iridescence). What the eye sees of an
  // AR-coated crystal is its reflection laid over the dial, so that is how it
  // is drawn: a black body that only reflects, added on top. Transmission
  // would refract a millimetre of flat glass — invisible — at the price of a
  // second render of the whole scene every frame.
  const sapphire = M({
    color: "#000000",
    metalness: 0,
    roughness: 0,
    ior: 1.77,
    // anti-reflective coated: most of the crystal's reflection is gone
    iridescence: 0.14,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [180, 340],
    specularIntensity: 0.22,
    envMapIntensity: 1,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const dial = M({
    color: DIALS.ink.color,
    metalness: 0.65,
    roughness: 0.32,
    normalMap: maps.sunNormal,
    normalScale: new THREE.Vector2(0.25, 0.25),
    anisotropy: 0.9,
    anisotropyMap: maps.sunAniso,
    envMapIntensity: 1.1,
  });
  const setDial = (id: DialId) => {
    const d = DIALS[id];
    dial.color.set(d.color);
    dial.metalness = d.metal;
    dial.roughness = d.rough;
    dial.anisotropy = d.sun ? 0.9 : 0.1;
    dial.normalScale.setScalar(d.sun ? 0.25 : 0.08);
  };

  const leather = M({
    color: STRAPS.black.color,
    metalness: 0,
    roughness: 0.62,
    normalMap: tiled(maps.leatherNormal, 1 / 3.2),
    normalScale: new THREE.Vector2(0.45, 0.45),
    sheen: 0.6,
    sheenColor: new THREE.Color(STRAPS.black.sheen),
    sheenRoughness: 0.45,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide,
  });
  const stitch = new THREE.MeshStandardMaterial({ color: STRAPS.black.stitch, roughness: 0.8 });
  const setStrap = (id: StrapId) => {
    const s = STRAPS[id];
    leather.color.set(s.color);
    leather.sheenColor.set(s.sheen);
    stitch.color.set(s.stitch);
  };

  return {
    bridge,
    anglage,
    plate,
    plateEdge,
    gilt,
    giltEdge,
    gold,
    goldPolished,
    steel,
    steelSatin,
    blued,
    ruby,
    hairspring,
    mainspring,
    engraving,
    dark,
    caseFinish,
    sapphire,
    dial,
    leather,
    stitch,
    setCase,
    setDial,
    setStrap,
  };
}

export type Materials = ReturnType<typeof makeMaterials>;
