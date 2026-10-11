import { brand } from "@/lib/content";

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-ink">
      <div className="wrap-x flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-[1.6rem] tracking-[0.42em] text-ivory uppercase">{brand.name}</p>
          <p className="mt-3 max-w-[30rem] text-[0.85rem] leading-relaxed text-mist">{brand.note}</p>
        </div>
        <div className="font-mono text-[0.7rem] tracking-[0.08em] text-mist md:text-end">
          <p>
            Designed and built by{" "}
            <a href="https://portfolio-obadah.vercel.app" target="_blank" rel="noreferrer" className="text-ivory underline-offset-4 hover:text-gold hover:underline">
              Obadah AboEssa
            </a>
          </p>
          <p className="mt-2">three.js · GSAP · Lenis · Next.js · Tailwind · shadcn/ui · NestJS — every finish generated in code</p>
        </div>
      </div>
    </footer>
  );
}
