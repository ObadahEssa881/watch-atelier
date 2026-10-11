"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reserve, type ReservationResult } from "@/lib/api";
import { buildStore, useBuild } from "@/lib/build-store";
import { cases, dials, priceOf, straps, usd } from "@/lib/catalogue";

export function ReserveDialog({ children }: { children: ReactNode }) {
  const b = useBuild();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReservationResult | null>(null);
  const summary = [cases.find((c) => c.id === b.case)?.name, `${dials.find((d) => d.id === b.dial)?.name} dial`, straps.find((s) => s.id === b.strap)?.name, b.engraving.trim() && `“${b.engraving.trim()}”`].filter(Boolean).join(" · ");

  return (
    <Dialog onOpenChange={(open) => !open && setResult(null)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {result?.ok ? (
          <DialogHeader>
            <p className="eyebrow text-gold">Reserved</p>
            <DialogTitle>Your Q-01 is on the bench.</DialogTitle>
            <DialogDescription>
              Reference <span className="num text-ivory">{result.reference}</span>. {usd(result.price)}, assembled and regulated in {result.leadWeeks[0]}–{result.leadWeeks[1]} weeks.
              The atelier will write to you before anything is charged.
            </DialogDescription>
          </DialogHeader>
        ) : (
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setResult(
                await reserve({
                  build: b,
                  name: String(f.get("name") ?? ""),
                  email: String(f.get("email") ?? ""),
                  city: String(f.get("city") ?? "") || undefined,
                  note: String(f.get("note") ?? "") || undefined,
                }),
              );
              setBusy(false);
            }}
          >
            <DialogHeader>
              <p className="eyebrow text-gold">Reserve</p>
              <DialogTitle>Reserve this build.</DialogTitle>
              <DialogDescription>
                {summary} — <span className="num text-ivory">{usd(priceOf(b))}</span>. No payment now: a reservation holds your place on the bench.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="r-name">Name</Label>
              <Input id="r-name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-email">Email</Label>
              <Input id="r-email" name="email" type="email" required maxLength={120} autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-city">City</Label>
              <Input id="r-city" name="city" maxLength={80} autoComplete="address-level2" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-note">A note to the atelier</Label>
              <Textarea id="r-note" name="note" maxLength={500} />
            </div>
            {result && !result.ok && (
              <p role="alert" className="rounded-sm border border-line bg-white/[0.02] p-3 text-[0.85rem] leading-relaxed text-mist">
                {result.message}{" "}
                {result.reason === "offline" && (
                  <>
                    Your build is saved in this page’s link —{" "}
                    <button type="button" className="text-blued underline underline-offset-4" onClick={() => navigator.clipboard?.writeText(buildStore.shareUrl())}>
                      copy it
                    </button>
                    .
                  </>
                )}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" size="lg" className="rounded-full px-6" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Reserve
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
