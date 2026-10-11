import { Button } from "@/components/ui/button";
import { SoundToggle } from "./sound-toggle";

const NAV = [
  { href: "#caseback", label: "The movement" },
  { href: "#configure", label: "Configure" },
  { href: "#specifications", label: "Specifications" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/40 to-transparent" />
      <div className="wrap-x relative flex h-[72px] items-center justify-between gap-6">
        <a href="#top" className="font-display text-[1.35rem] tracking-[0.42em] text-ivory uppercase" aria-label="Qasioun, back to top">
          Qasioun
        </a>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="text-[0.82rem] tracking-[0.04em] text-mist transition-colors hover:text-ivory">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <SoundToggle className="live-only hidden sm:inline-flex" />
          <Button asChild size="sm" className="rounded-full px-4 tracking-[0.06em]">
            <a href="#reserve">Reserve</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
