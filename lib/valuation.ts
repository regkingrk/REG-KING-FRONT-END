/**
 * Plate valuation: one estimate drawn from several sources of real prices.
 *
 * Every source gives "comparables": registrations with a real price, either an asking price
 * (listed for sale) or a sold price (what someone actually paid). The estimate scores each
 * comparable for how alike it is to the customer's reg (format, length, characters), keeps the
 * closest, and takes the middle of their prices, with sold prices counting for more than asking.
 *
 * Sources (see app/api/valuation/route.ts for the live versions):
 *   shop       REG KING shop. Every plate for sale on the Shopify store.            (live from Shopify)
 *   exclusive  REG KING exclusive plates, £15,000 and up.                           (live from Shopify)
 *   sold       Plates sold through REG KING. Shopify orders.                        (needs the Admin API token)
 *   dvla       DVLA auction results.                                                (needs a results file or feed: CONFIRM)
 *   market     Asking prices at other UK dealers.                                   (needs a licensed feed or permission: CONFIRM)
 * A source that isn't connected gives nothing and isn't shown to the customer.
 *
 * PROTOTYPE: the preview has no server, so it uses a full export of the Shopify store kept in this repo
 * (lib/valuationData.ts: every plate for sale and every plate sold in the last two years). Same scoring and maths as the live version.
 */
import { platesForSale } from "./brand";
import { exclusive } from "./exclusive";
import { newThisWeek } from "./newThisWeek";
import { shopPlates, soldPlates } from "./valuationData";
import { EXCLUSIVE_FROM } from "./exclusive";
import { styleOf, type PlateStyle } from "./search";

export type SourceKey = "shop" | "exclusive" | "sold" | "dvla" | "market";
export type Comparable = { reg: string; price: number; kind: "asking" | "sold"; source: SourceKey; handle?: string; /** Sold prices: when, yyyy-mm-dd. */ date?: string };

export const SOURCES: Record<SourceKey, { name: string; line: string }> = {
  shop: { name: "REG KING shop", line: "Plates for sale with us now" },
  exclusive: { name: "REG KING exclusive plates", line: "Our plates from £15,000" },
  sold: { name: "REG KING sales", line: "What plates sold for through us" },
  dvla: { name: "DVLA auctions", line: "Prices paid at DVLA auctions" },
  market: { name: "Other UK dealers", line: "Asking prices elsewhere" },
};

export type Valuation = {
  reg: string;
  style: PlateStyle;
  low: number;
  high: number;
  /** How many comparables the range is built from. */
  count: number;
  /** Which sources those comparables came from, most first. */
  sources: { key: SourceKey; count: number }[];
  /** The closest few, to show the customer. */
  matches: Comparable[];
  /** "good" when there are plenty of close matches; "limited" when the range leans on loose ones. */
  strength: "good" | "fair" | "limited";
  /** The same reg, if it's already listed in one of the sources. */
  exact: Comparable | null;
  /** The same reg's own sales history through REG KING, newest first. */
  exactSold: Comparable[];
  /** Similar plates the customer could buy right now, closest first. */
  forSale: Comparable[];
  /** Live site, when an AI key is set: a short plain-English explanation of the range. Never changes the numbers. */
  summary?: string;
};

const bare = (r: string) => r.replace(/\s/g, "").toUpperCase();

/** How alike two registrations are, 0 to 1: format first, then length, then shared characters. */
export function similarity(a: string, b: string) {
  const A = bare(a);
  const B = bare(b);
  const format = styleOf(a) === styleOf(b) ? 1 : 0.3;
  const length = Math.max(0, 1 - Math.abs(A.length - B.length) * 0.25);
  let same = 0;
  for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] === B[i]) same++;
  const pos = same / Math.max(A.length, B.length);
  const pool = [...B];
  let shared = 0;
  for (const ch of A) {
    const j = pool.indexOf(ch);
    if (j >= 0) {
      shared++;
      pool.splice(j, 1);
    }
  }
  const bag = shared / Math.max(A.length, B.length);
  // The characters matter most (AM12 RRA is a much better guide to AM12 RRX than TU12 RRK is);
  // a different format or length counts against it.
  return format * (0.25 * length + 0.75 * (0.5 * pos + 0.5 * bag));
}

/** A weighted percentile of prices. */
function quantile(items: { price: number; w: number }[], q: number) {
  const s = [...items].sort((x, y) => x.price - y.price);
  const total = s.reduce((t, x) => t + x.w, 0);
  let run = 0;
  for (const x of s) {
    run += x.w;
    if (run >= total * q) return x.price;
  }
  return s[s.length - 1].price;
}

const roundPrice = (n: number) => (n >= 10000 ? Math.round(n / 500) * 500 : n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 25) * 25);

const CLOSE = 0.7;
const MAX_USED = 15;

export function estimate(reg: string, comps: Comparable[]): Valuation | null {
  const me = bare(reg);
  const exact = comps.find((c) => bare(c.reg) === me && c.kind === "asking") ?? null;
  const exactSold = comps.filter((c) => bare(c.reg) === me && c.kind === "sold").sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const others = comps.filter((c) => bare(c.reg) !== me && c.price > 0);
  if (!others.length) return null;
  const scored = others.map((c) => ({ c, s: similarity(reg, c.reg) })).sort((x, y) => y.s - x.s);
  // Similar plates for sale now: listed with a page to open, same style first.

  const close = scored.filter((x) => x.s >= CLOSE).slice(0, MAX_USED);
  const used = close.length >= 3 ? close : scored.slice(0, 8);
  const shown = new Set(used.slice(0, 5).map((x) => bare(x.c.reg)));
  const forSale = scored.filter((x) => x.c.kind === "asking" && x.c.handle && x.s >= 0.6 && !shown.has(bare(x.c.reg))).slice(0, 6).map((x) => x.c);
  // Sold prices are what people actually paid, so they count for more than asking prices.
  // The closest plates count for much more than the loose ones.
  // With few close matches, the closest ones decide: loose matches barely count.
  const power = close.length >= 3 ? 4 : 8;
  const items = used.map((x) => ({ price: x.c.price, w: x.s ** power * (x.c.kind === "sold" ? 1.5 : 1) }));
  // A range around the weighted middle of the closest prices: at least 10% either side, and never
  // stretched past 25% below or 35% above by one far-off plate.
  const mid = quantile(items, 0.5);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const low = roundPrice(clamp(quantile(items, 0.3), mid * 0.75, mid * 0.9));
  const high = Math.max(low, roundPrice(clamp(quantile(items, 0.7), mid * 1.1, mid * 1.35)));
  const by = new Map<SourceKey, number>();
  used.forEach((x) => by.set(x.c.source, (by.get(x.c.source) ?? 0) + 1));
  return {
    reg,
    style: styleOf(reg),
    low,
    high,
    count: used.length,
    sources: [...by].map(([key, count]) => ({ key, count })).sort((x, y) => y.count - x.count),
    matches: used.slice(0, 5).map((x) => x.c),
    strength: close.length >= 8 ? "good" : close.length >= 3 ? "fair" : "limited",
    exact,
    exactSold,
    forSale,
  };
}

/** The prototype's comparables: the Shopify snapshots kept in this repo. */
export function snapshotComparables(): Comparable[] {
  const seen = new Set<string>();
  const out: Comparable[] = [];
  const add = (c: Comparable) => {
    const k = bare(c.reg);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  shopPlates.forEach(([reg, price, handle]) =>
    add({ reg, price, kind: "asking", source: price >= EXCLUSIVE_FROM ? "exclusive" : "shop", handle: handle ?? reg.toLowerCase().replace(/ /g, "-") }),
  );
  exclusive.forEach((p) => add({ reg: p.reg, price: p.price, kind: "asking", source: "exclusive", handle: p.handle }));
  [...newThisWeek, ...platesForSale].forEach((p) => add({ reg: p.reg, price: p.price, kind: "asking", source: "shop", handle: p.handle }));
  // What plates actually sold for. A plate can sell more than once, so these aren't de-duplicated.
  soldPlates.forEach(([reg, price, date]) => out.push({ reg, price, kind: "sold", source: "sold", date }));
  return out;
}
