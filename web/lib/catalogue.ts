/**
 * What a Q-01 can be built from, and what it costs.
 *
 * The NestJS API (`api/src/catalogue/catalogue.data.ts`) is the source of
 * truth and prices every build on the server; this copy lets the configurator
 * work when the API is not reachable. Keep the two in step.
 */

export type CaseId = "steel" | "titanium" | "rosegold";
export type DialId = "ink" | "opaline" | "blued" | "olive";
export type StrapId = "black" | "cognac" | "midnight";

export interface Option<T extends string> {
  id: T;
  name: string;
  detail: string;
  price: number;
  swatch: string;
}

export const cases: Option<CaseId>[] = [
  { id: "steel", name: "316L steel", detail: "Polished bezel, brushed flanks", price: 6400, swatch: "#c9ccd0" },
  { id: "titanium", name: "Grade 5 titanium", detail: "Lighter, warmer grey, bead-blasted lugs", price: 7200, swatch: "#8e8a84" },
  { id: "rosegold", name: "18k 5N rose gold", detail: "Solid gold case and crown", price: 18900, swatch: "#d39a7a" },
];

export const dials: Option<DialId>[] = [
  { id: "ink", name: "Ink", detail: "Black sunburst", price: 0, swatch: "#14161a" },
  { id: "opaline", name: "Opaline", detail: "Silver, fine grain", price: 0, swatch: "#d9d6cf" },
  { id: "blued", name: "Blued", detail: "The blue of a heat-blued screw", price: 300, swatch: "#1d3570" },
  { id: "olive", name: "Olive", detail: "Deep green sunburst", price: 300, swatch: "#2f3a26" },
];

export const straps: Option<StrapId>[] = [
  { id: "black", name: "Black calf", detail: "Hand-stitched, steel pin buckle", price: 0, swatch: "#141211" },
  { id: "cognac", name: "Cognac calf", detail: "Hand-stitched, aged edges", price: 0, swatch: "#7a4320" },
  { id: "midnight", name: "Midnight calf", detail: "Hand-stitched, tone-on-tone", price: 0, swatch: "#1b2233" },
];

export const ENGRAVING_PRICE = 150;
export const ENGRAVING_MAX = 22;

export interface Build {
  case: CaseId;
  dial: DialId;
  strap: StrapId;
  engraving: string;
}

export const defaultBuild: Build = { case: "steel", dial: "ink", strap: "black", engraving: "" };

export function priceOf(b: Build) {
  const c = cases.find((x) => x.id === b.case)!;
  const d = dials.find((x) => x.id === b.dial)!;
  const s = straps.find((x) => x.id === b.strap)!;
  return c.price + d.price + s.price + (b.engraving.trim() ? ENGRAVING_PRICE : 0);
}

export const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
