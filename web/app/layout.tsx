import type { Metadata, Viewport } from "next";
import { Header } from "@/components/site/header";
import { MotionProvider } from "@/components/site/motion-provider";
import { ServiceWorker } from "@/components/site/sw-register";
import { StageStatus } from "@/components/sections/stage-status";
import { Stage } from "@/components/watch/stage";
import { brand } from "@/lib/content";
import { fontVars } from "@/lib/fonts";
import { MOTION_SCRIPT } from "@/lib/motion";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const description = "The Q-01 automatic: a 40 mm watch whose movement you take apart by scrolling — rotor, barrel, going train, Swiss lever escapement, balance at 4 Hz. A design concept.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${brand.name} ${brand.model} — ${brand.tagline}`,
  description,
  openGraph: { type: "website", title: `${brand.name} ${brand.model}`, description, siteName: brand.name },
  twitter: { card: "summary_large_image", title: `${brand.name} ${brand.model}`, description },
};

export const viewport: Viewport = { themeColor: "#0b0a09", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>
        <a href="#caseback" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-sm focus:bg-gold focus:px-3 focus:py-2 focus:text-ink">
          Skip to the movement
        </a>
        <Stage />
        <Header />
        <main className="relative z-10">{children}</main>
        <StageStatus />
        <MotionProvider />
        <ServiceWorker />
      </body>
    </html>
  );
}
