import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";

/** UK-plate style characters (matches the REG KING workshop tool). */
const plateFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-plate",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

/** Account dashboard: a clean grotesk for text and a mono for numbers, dates and statuses. */
const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Number Plates Near Me | 3D, 4D & Legal Plates | REG KING",
  description:
    "Looking for number plates near you? REG KING makes legal, 3D, 4D, bevel and replacement number plates while you wait in Bilston, Wolverhampton.",
  metadataBase: new URL("https://regking.co.uk"),
  openGraph: {
    siteName: "REG KING",
    images: ["/brand/regking-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${oswald.variable} ${plateFont.variable} ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
