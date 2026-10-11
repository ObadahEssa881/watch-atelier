/**
 * The Q-01's options and prices — the source of truth. The web app keeps a
 * copy (web/lib/catalogue.ts) so its configurator works offline; keep the
 * two in step.
 */
export const CASES = [
  { id: "steel", name: "316L steel", detail: "Polished bezel, brushed flanks", price: 6400, leadWeeks: [8, 10] },
  { id: "titanium", name: "Grade 5 titanium", detail: "Lighter, warmer grey, bead-blasted lugs", price: 7200, leadWeeks: [8, 10] },
  { id: "rosegold", name: "18k 5N rose gold", detail: "Solid gold case and crown", price: 18900, leadWeeks: [14, 18] },
] as const;

export const DIALS = [
  { id: "ink", name: "Ink", detail: "Black sunburst", price: 0 },
  { id: "opaline", name: "Opaline", detail: "Silver, fine grain", price: 0 },
  { id: "blued", name: "Blued", detail: "The blue of a heat-blued screw", price: 300 },
  { id: "olive", name: "Olive", detail: "Deep green sunburst", price: 300 },
] as const;

export const STRAPS = [
  { id: "black", name: "Black calf", detail: "Hand-stitched, steel pin buckle", price: 0 },
  { id: "cognac", name: "Cognac calf", detail: "Hand-stitched, aged edges", price: 0 },
  { id: "midnight", name: "Midnight calf", detail: "Hand-stitched, tone-on-tone", price: 0 },
] as const;

export const ENGRAVING = { price: 150, maxLength: 22, extraWeeks: 2 } as const;

export type CaseId = (typeof CASES)[number]["id"];
export type DialId = (typeof DIALS)[number]["id"];
export type StrapId = (typeof STRAPS)[number]["id"];
export const CASE_IDS = CASES.map((c) => c.id);
export const DIAL_IDS = DIALS.map((d) => d.id);
export const STRAP_IDS = STRAPS.map((s) => s.id);
