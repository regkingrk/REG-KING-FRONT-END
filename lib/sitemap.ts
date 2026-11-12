import { DVLA_FEED } from "./features";

/**
 * The site's four sections and what sits under each. The header menu, the mobile menu,
 * the footer and the links inside pages all come from this list.
 *
 * Each item has a hash (#buy-regking). Hashes are plain words joined by dashes so they work
 * as shareable links everywhere.
 */

export type SectionKey = "buy" | "sell" | "make" | "acc" | "info";
export type SiteItem = { key: string; label: string; line: string; hash: string };
export type SiteSection = { key: SectionKey; label: string; line: string; hash: string; items: SiteItem[] };

export const SITEMAP: SiteSection[] = [
  {
    key: "buy",
    label: "Buy plates",
    line: DVLA_FEED ? "Private plates from REG KING, our customers and the DVLA" : "Private plates from REG KING and our customers",
    hash: "buy",
    items: [
      { key: "exclusive", label: "Exclusive plates", line: "Our rarest plates, from £15,000", hash: "buy-exclusive" },
      { key: "regking", label: "Plates owned by REG KING", line: "Our own stock, ready to transfer", hash: "buy-regking" },
      { key: "customer", label: "Customer plates", line: "Plates our customers are selling", hash: "buy-customer" },
      { key: "sourcing", label: "Plate sourcing", line: "We search for the plate you want, £9.99", hash: "buy-sourcing" },
      { key: "brokerage", label: "Brokerage", line: "Sale agreed? We finalise it for you", hash: "buy-brokerage" },
    ],
  },
  {
    key: "sell",
    label: "Sell plates",
    line: "We advertise your plate for you",
    hash: "sell",
    items: [
      { key: "valuation", label: "Value my plate", line: "A free valuation from our team", hash: "sell-valuation" },
      { key: "uplift", label: "Increased price sale", line: "You get your asking price", hash: "sell-increased" },
      { key: "commission", label: "Commission based, 10%", line: "10% when it sells", hash: "sell-commission" },
      { key: "brokerage", label: "Brokerage", line: "Sale agreed? We finalise it for you", hash: "sell-brokerage" },
    ],
  },
  {
    key: "make",
    label: "Make",
    line: "Number plates made at our HQ in Bilston",
    hash: "make",
    items: [
      { key: "plates", label: "Number plates", line: "Build your plates, see them live", hash: "make-plates" },
      // These two open the Accessories pages (see parseHash), so they live in one place.
      { key: "surrounds", label: "Plate surrounds", line: "Framed or frameless, your colours", hash: "make-surrounds" },
      { key: "logo", label: "Logo plates", line: "Your logo, printed or 4D", hash: "make-logo" },
    ],
  },
  {
    key: "acc",
    label: "Accessories",
    line: "Surrounds, logo plates and everything to fit them",
    hash: "accessories",
    items: [
      { key: "surrounds", label: "Plate surrounds", line: "Framed or frameless, your colours", hash: "accessories-surrounds" },
      { key: "logo", label: "Logo plates", line: "Your logo, printed or 4D", hash: "accessories-logo" },
      { key: "fixings", label: "Fitting & fixings", line: "Kits, sticky pads and screws", hash: "accessories-fixings" },
      { key: "mounting", label: "Mounting kits", line: "Plate clips and magnet kits", hash: "accessories-mounting" },
    ],
  },
  {
    key: "info",
    label: "Information",
    line: "Help, policies and who we are",
    hash: "info",
    items: [
      { key: "deposits", label: "Deposits", line: "Reserve a plate with a deposit", hash: "info-deposits" },
      { key: "finance", label: "Finance", line: "Spread the cost with Payl8r", hash: "info-finance" },
      { key: "faqs", label: "FAQs", line: "Answers to common questions", hash: "info-faqs" },
      { key: "policies", label: "Policies", line: "Privacy, terms and refunds", hash: "info-policies" },
      { key: "gallery", label: "Gallery", line: "Plates we've made", hash: "info-gallery" },
      { key: "about", label: "About us", line: "REG KING since 2017", hash: "info-about" },
      { key: "contact", label: "Contact", line: "Get in touch", hash: "info-contact" },
    ],
  },
];

/** Read a hash (#sell-commission) as its section and item. */
export function parseHash(hash: string): { section: SectionKey; item: string | null } | null {
  const h = hash.replace(/^#/, "").toLowerCase();
  if (!h) return null;
  // Older links
  if (h === "build" || h === "auctions" || h === "tools") return { section: h === "build" ? "make" : "buy", item: null };
  if (h === "make-legal" || h === "make-show" || h === "make-bike") return { section: "make", item: "plates" }; // older links
  if (h === "info-team") return { section: "info", item: "about" }; // the team page was withdrawn
  if (h === "value") return { section: "sell", item: "valuation" };
  if (h === "sell-monthly") return { section: "sell", item: null }; // the monthly fee option was withdrawn
  if (h === "buy-dvla") return { section: "buy", item: null }; // DVLA plates are in the general search, not a tab
  // Surrounds and logo plates moved from Make to Accessories
  if (h === "make-surrounds") return { section: "acc", item: "surrounds" };
  if (h === "make-logo") return { section: "acc", item: "logo" };
  // A single accessory's own page: #accessories-item-screws
  const accItem = h.match(/^accessories-item-([a-z0-9-]+)$/);
  if (accItem) return { section: "acc", item: `item-${accItem[1]}` };
  for (const s of SITEMAP) {
    if (h === s.hash) return { section: s.key, item: null };
    const it = s.items.find((i) => i.hash === h);
    if (it) return { section: s.key, item: it.key };
  }
  return null;
}

export const sectionOf = (k: SectionKey) => SITEMAP.find((s) => s.key === k)!;
