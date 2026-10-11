import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "@/lib/content";

export const alt = `${brand.name} ${brand.model} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The shared-link card: the hero photograph, the line, the maison. */
export default async function OpengraphImage() {
  const still = await readFile(join(process.cwd(), "public/stills/hero.png"));
  const bg = `data:image/png;base64,${still.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0b0a09",
          backgroundImage: `linear-gradient(90deg, rgba(11,10,9,0.96) 0%, rgba(11,10,9,0.7) 40%, rgba(11,10,9,0) 70%), url(${bg})`,
          backgroundSize: "100% 100%, 1008px 630px",
          backgroundPosition: "0 0, 260px 0",
          color: "#ede6da",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 14, textTransform: "uppercase" }}>{brand.name}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 0.95 }}>Eight beats</div>
          <div style={{ fontSize: 96, lineHeight: 0.95, fontStyle: "italic", color: "#d9d1c4" }}>a second.</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#cfae74", fontFamily: "monospace" }}>
          {`${brand.calibre.toUpperCase()} · 28,800 VPH · 70 H · 31 JEWELS`}
        </div>
      </div>
    ),
    size,
  );
}
