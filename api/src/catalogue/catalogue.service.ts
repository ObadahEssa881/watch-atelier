import { Injectable } from "@nestjs/common";
import { CASES, DIALS, ENGRAVING, STRAPS } from "./catalogue.data";
import type { BuildDto } from "./build.dto";

export interface Quote {
  price: number;
  currency: "USD";
  leadWeeks: [number, number];
  lines: { item: string; price: number }[];
}

@Injectable()
export class CatalogueService {
  all() {
    return { cases: CASES, dials: DIALS, straps: STRAPS, engraving: ENGRAVING, currency: "USD" as const };
  }

  /** Prices a build on the server, so a client can never set its own price. */
  quote(b: BuildDto): Quote {
    const c = CASES.find((x) => x.id === b.case)!;
    const d = DIALS.find((x) => x.id === b.dial)!;
    const s = STRAPS.find((x) => x.id === b.strap)!;
    const engraved = b.engraving.trim().length > 0;
    const lines = [
      { item: `Q-01, ${c.name}`, price: c.price },
      { item: `${d.name} dial`, price: d.price },
      { item: s.name, price: s.price },
      ...(engraved ? [{ item: `Engraving: “${b.engraving.trim()}”`, price: ENGRAVING.price }] : []),
    ];
    const extra = engraved && c.id !== "rosegold" ? ENGRAVING.extraWeeks : 0;
    return {
      price: lines.reduce((a, l) => a + l.price, 0),
      currency: "USD",
      leadWeeks: [c.leadWeeks[0] + extra, c.leadWeeks[1] + extra],
      lines,
    };
  }
}
