import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const display = Bricolage_Grotesque({ variable: "--f-display", subsets: ["latin"], weight: ["500", "700", "800"] });
const body = Figtree({ variable: "--f-body", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = Geist_Mono({ variable: "--f-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND.name}: sites that don't look AI-made`,
  description: "Paste any site. See what makes it look AI-made, pick one of three real art directions, watch it rebuild live, publish, and cancel Lovable.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        {/* the real fonts of the three directions shown in the scroll story */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@500;700;800&family=Geist+Mono:wght@400;600&family=IBM+Plex+Serif:wght@500;600&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
