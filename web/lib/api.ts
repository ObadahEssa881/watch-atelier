import { priceOf, type Build } from "./catalogue";

/**
 * The atelier's API (NestJS, in `api/`). Set NEXT_PUBLIC_API_URL to its
 * address. Every call falls back gracefully: prices are computed locally,
 * and a reservation reports honestly that the booking service is offline.
 */
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export interface Quote {
  price: number;
  currency: "USD";
  leadWeeks: [number, number];
  source: "api" | "local";
}

const localLead = (b: Build): [number, number] => (b.case === "rosegold" ? [14, 18] : b.engraving.trim() ? [10, 12] : [8, 10]);

export async function quote(b: Build, signal?: AbortSignal): Promise<Quote> {
  if (BASE) {
    try {
      const r = await fetch(`${BASE}/quotes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b), signal });
      if (r.ok) {
        const j = (await r.json()) as Omit<Quote, "source">;
        return { ...j, source: "api" };
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
    }
  }
  return { price: priceOf(b), currency: "USD", leadWeeks: localLead(b), source: "local" };
}

export interface ReservationRequest {
  build: Build;
  name: string;
  email: string;
  city?: string;
  note?: string;
}
export type ReservationResult =
  | { ok: true; reference: string; price: number; leadWeeks: [number, number] }
  | { ok: false; reason: "offline" | "invalid" | "busy"; message: string };

export async function reserve(req: ReservationRequest): Promise<ReservationResult> {
  if (!BASE) return { ok: false, reason: "offline", message: "The atelier’s booking service isn’t connected to this preview." };
  try {
    const r = await fetch(`${BASE}/reservations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) });
    if (r.status === 429) return { ok: false, reason: "busy", message: "Too many requests — please try again in a minute." };
    const j = await r.json();
    if (!r.ok) return { ok: false, reason: "invalid", message: Array.isArray(j.message) ? j.message.join(" ") : String(j.message ?? "Please check the form.") };
    return { ok: true, reference: j.reference, price: j.price, leadWeeks: j.leadWeeks };
  } catch {
    return { ok: false, reason: "offline", message: "The atelier’s booking service didn’t answer." };
  }
}
