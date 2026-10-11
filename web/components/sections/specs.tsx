import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { specs } from "@/lib/content";

export function Specs() {
  return (
    <section id="specifications" aria-labelledby="specs-t" className="cv-auto relative bg-ink py-28 md:py-40">
      <div className="wrap-x grid gap-14 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <p data-reveal className="eyebrow text-gold">Specifications</p>
          <h2 id="specs-t" data-reveal="1" className="mt-5 font-display text-[clamp(2.4rem,4.4vw,4rem)] leading-[1] font-light">
            The Q-01, in numbers.
          </h2>
          <p data-reveal="2" className="mt-6 max-w-[22rem] leading-relaxed text-mist">
            What a watchmaker would ask first, answered before you ask.
          </p>
        </div>
        <div className="grid gap-12">
          {specs.map((g, i) => (
            <div key={g.group} data-reveal={i}>
              <h3 className="font-mono text-[0.7rem] font-normal tracking-[0.2em] text-gold uppercase">{g.group}</h3>
              <Table className="mt-3">
                <TableBody>
                  {g.rows.map(([k, v]) => (
                    <TableRow key={k} className="hover:bg-transparent">
                      <TableCell className="w-[40%] py-3.5 ps-0 align-top text-[0.92rem] text-mist">{k}</TableCell>
                      <TableCell className="py-3.5 pe-0 align-top text-[0.95rem] text-ivory">{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
