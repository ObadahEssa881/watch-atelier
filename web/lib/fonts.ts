import { Geist_Mono, Manrope, Newsreader } from "next/font/google";

/*
 * Three faces (signature-design §5): an editorial serif with an optical-size
 * axis for display — light and large, the voice of a maison; a calm grotesque
 * for the interface; a mono for what a watchmaker would read off a timegrapher.
 * next/font serves them from this site, so no visitor waits on a font host.
 */
export const display = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-disp", display: "swap" });
export const ui = Manrope({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
export const utility = Geist_Mono({ subsets: ["latin"], variable: "--font-utility", display: "swap" });

export const fontVars = [display, ui, utility].map((f) => f.variable).join(" ");
