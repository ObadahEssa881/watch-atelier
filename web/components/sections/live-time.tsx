"use client";

import { useEffect, useState } from "react";

/** The visitor's own time — the same time the hands are showing. */
export function LiveTime() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const f = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tickNow = () => setNow(f.format(new Date()));
    tickNow();
    const id = window.setInterval(tickNow, 250);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="num text-ivory/90" suppressHydrationWarning>
      {now ?? "—:—:—"}
    </span>
  );
}
