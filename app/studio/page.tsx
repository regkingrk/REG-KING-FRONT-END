import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

/**
 * In-store studio: the plate builder and plate surround builder on their own, for the shop TV.
 * Staff-only: not in the menu or the sitemap, and kept out of search engines.
 */
export const metadata: Metadata = {
  title: "Studio | REG KING",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function StudioPage() {
  return <Studio />;
}
