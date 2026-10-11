/**
 * Every word the site says, in one place.
 *
 * Qasioun and the Q-01 are a design concept (named for the mountain above
 * Damascus). The watch's own specifications are plausible but fictional; the
 * horology — how a lever escapement, a barrel or a rotor works, and the dates —
 * is real, and written to be checkable.
 */

export const brand = {
  name: "Qasioun",
  model: "Q-01",
  calibre: "Calibre Q-01",
  tagline: "Eight beats a second.",
  note: "A design concept. Qasioun and the Q-01 are fictional; prices and reservations are illustrative.",
} as const;

export const heroSpecs = ["Automatic", "28,800 vph", "70 h reserve", "31 jewels"];

/** One chapter per stop of the disassembly. The 3D scene reads `id`. */
export interface Chapter {
  id: ChapterId;
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  facts: string[];
  footnote?: string;
}

export type ChapterId = "caseback" | "rotor" | "barrel" | "train" | "escapement" | "balance" | "jewels" | "finishing";

export const chapters: Chapter[] = [
  {
    id: "caseback",
    index: "01",
    eyebrow: "The caseback",
    title: "Turn it over.",
    body: "A watch keeps most of itself out of sight. The Q-01 does not: its back is a sapphire crystal, so the movement that runs it is always in view — and every part of it is finished as if you would look.",
    facts: ["Sapphire exhibition back", "Screw-down, 100 m", "Calibre Q-01, 28.6 mm"],
  },
  {
    id: "rotor",
    index: "02",
    eyebrow: "The rotor",
    title: "Your wrist is the engine.",
    body: "The half-moon of gold is the rotor, an oscillating weight. Every movement of your arm swings it around a ball bearing, and a pair of reverser wheels turns both directions of swing into winding. Wear it daily and you will rarely need the crown.",
    facts: ["Bidirectional winding", "Ceramic ball bearing", "18k gold oscillating weight"],
    footnote: "Self-winding watches date to the 1770s and Abraham-Louis Perrelet’s “perpétuelles”; the full rotor reached the wrist in the 1930s.",
  },
  {
    id: "barrel",
    index: "03",
    eyebrow: "Barrel & mainspring",
    title: "Seventy hours, coiled.",
    body: "Lift the bridges and you find the barrel: a toothed drum holding the mainspring, a ribbon of cobalt-nickel alloy wound tight. As it unwinds it turns the barrel, and the barrel turns everything else. When the spring is full, a slipping bridle lets it slide against the barrel wall instead of breaking — so the rotor can never over-wind it.",
    facts: ["70 h power reserve", "Slipping bridle", "Co-Ni alloy mainspring"],
  },
  {
    id: "train",
    index: "04",
    eyebrow: "The going train",
    title: "Time, divided by gears.",
    body: "From the barrel the energy runs through the going train, and each wheel’s speed is a unit of time. The centre wheel turns once an hour and carries the minute hand; the fourth wheel turns once a minute and carries the seconds. The wheels on this page turn at exactly those speeds.",
    facts: ["Centre wheel · 1 turn / hour", "Fourth wheel · 1 turn / minute", "Gilded, chamfered spokes"],
  },
  {
    id: "escapement",
    index: "05",
    eyebrow: "The escapement",
    title: "Let go eight times a second.",
    body: "Left alone, the mainspring would empty itself in seconds. The Swiss lever escapement holds it back: the pallet fork’s two ruby stones lock the escape wheel’s fifteen club teeth and release one at a time, and each release gives the balance a small push through its impulse jewel. The tick you hear is a tooth landing on a pallet stone.",
    facts: ["Swiss lever escapement", "15-tooth escape wheel", "2 ruby pallet stones"],
  },
  {
    id: "balance",
    index: "06",
    eyebrow: "Balance & hairspring",
    title: "The heart.",
    body: "The balance wheel and its hairspring are the watch’s oscillator. It swings about 280° each way, four times a second — 28,800 vibrations an hour — while the hairspring breathes in and out with it. Free-sprung: the rate is set by the masses on the rim, not by an index a knock could nudge.",
    facts: ["4 Hz · 28,800 vph", "Free-sprung, 4 inertia masses", "Shock-protected"],
  },
  {
    id: "jewels",
    index: "07",
    eyebrow: "The jewels",
    title: "Thirty-one rubies, none for show.",
    body: "Every red dot is a bearing. Synthetic ruby — aluminium oxide, nine on the Mohs scale, second only to diamond — holds the steel pivots so they turn with almost no wear, each set in a polished gold chaton.",
    facts: ["31 jewels", "Hole and cap jewels", "Gold chatons"],
    footnote: "Jewel bearings were patented in London in 1704; rubies have been grown in a flame, by Verneuil’s process, since the early 1900s.",
  },
  {
    id: "finishing",
    index: "08",
    eyebrow: "The finishing",
    title: "Hours you will never see.",
    body: "Côtes de Genève run across the bridges in unbroken stripes. The mainplate is covered in perlage, overlapping circles of grain. Every bridge edge is bevelled and polished by hand — anglage — and the screws are heated until their surface turns a deep blue, at around 290 °C.",
    facts: ["Côtes de Genève", "Perlage", "Anglage", "Heat-blued screws"],
  },
];

export const specs: { group: string; rows: [string, string][] }[] = [
  {
    group: "Movement",
    rows: [
      ["Calibre", "Q-01, self-winding mechanical"],
      ["Frequency", "28,800 vph (4 Hz)"],
      ["Power reserve", "70 hours"],
      ["Jewels", "31"],
      ["Escapement", "Swiss lever, 15-tooth escape wheel"],
      ["Balance", "Free-sprung, 4 inertia masses, shock-protected"],
      ["Diameter · height", "28.6 mm (12¾ lignes) · 5.6 mm"],
      ["Regulation", "Five positions, −2 / +4 s per day"],
    ],
  },
  {
    group: "Case",
    rows: [
      ["Diameter · height", "40 mm · 11.6 mm"],
      ["Lug width", "20 mm"],
      ["Crystal", "Box sapphire, anti-reflective inside"],
      ["Caseback", "Screw-down, sapphire exhibition window"],
      ["Water resistance", "100 m"],
    ],
  },
  {
    group: "Finishing",
    rows: [
      ["Bridges", "Côtes de Genève, hand-bevelled edges"],
      ["Mainplate", "Perlage"],
      ["Screws", "Heat-blued and polished"],
      ["Rotor", "18k gold, engraved"],
    ],
  },
];
