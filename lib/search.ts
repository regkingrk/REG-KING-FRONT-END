/**
 * Plate search: matches stock against a name, word or reg, and suggests
 * valid UK plate formats that spell it (the idea behind REG KING's Plate Finder).
 *
 * STOCK below is every plate on the REG KING store. The only made-up plates are the DVLA ones
 * (marked `sample`), shown until the DVLA feed is connected.
 */

import { DVLA_FEED } from "./features";
import { shopPlates } from "./valuationData";
import { regkingStock } from "./stock";
import { dvlaTotal } from "./dvlaPricing";

/**
 * Where a plate comes from. Search merges all three; REG KING's own stock always ranks first.
 * - regking: plates REG KING owns (Shopify)
 * - customer: plates customers are selling through REG KING
 * - dvla: unissued plates from the DVLA feed
 */
export type Source = "regking" | "customer" | "dvla";
export const SOURCE_ORDER: Source[] = DVLA_FEED ? ["regking", "customer", "dvla"] : ["regking", "customer"];
export const SOURCE_INFO: Record<Source, { name: string; short: string; line: string }> = {
  regking: { name: "REG KING stock", short: "REG KING", line: "Owned and sold by REG KING." },
  customer: { name: "Customer plates", short: "Customer plate", line: "Listed by a private seller through REG KING." },
  dvla: { name: "DVLA registrations", short: "DVLA", line: "Never issued before. The DVLA posts the V750 certificate straight to you." },
};

export type StockPlate = { reg: string; price: number; handle?: string; sample?: boolean; source?: Source };

/**
 * Every plate for sale on the REG KING store (full Shopify export, lib/valuationData.ts):
 * REG KING's own plates (tagged regking-stock, lib/stock.ts) and plates customers are selling.
 * The live site reads the same from Shopify.
 */
const OWN = new Set(regkingStock.map((p) => p.handle));
export const STOCK: StockPlate[] = shopPlates.map(([reg, price, handle]) => {
  const h = handle ?? reg.toLowerCase().replace(/ /g, "-");
  return { reg, price, handle: h, source: OWN.has(h) ? "regking" : "customer" };
});

/** Digits read as letters on plates. */
const DIGIT_AS_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "3": "E", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B" };
/** Letters that can be written as a digit. */
const LETTER_AS_DIGIT: Record<string, string> = { O: "0", I: "1", L: "1", Z: "2", E: "3", A: "4", S: "5", G: "6", T: "7", B: "8" };

export const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
/** How a plate "reads": digits turned into the letters they look like. */
export const reads = (s: string) =>
  clean(s)
    .split("")
    .map((c) => DIGIT_AS_LETTER[c] ?? c)
    .join("");

function lcs(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

export type Match = StockPlate & { score: number; kind: "exact" | "close" | "similar" };

/** How well a plate reads as the search, 0-100. */
export function scoreReg(reg: string, query: string): number {
  const q = clean(query);
  const qr = reads(query);
  const pc = clean(reg);
  const pr = reads(reg);
  if (!q) return 0;
  if (pc === q) return 100;
  if (pr === qr) return 95;
  if (pr.includes(qr) || pc.includes(q)) return 85;
  if (qr.includes(pr) && pr.length >= 3) return 70;
  const ratio = lcs(pr, qr) / Math.max(qr.length, 1);
  // Every letter of the search, in order (AR11 MAN for ARMAN) reads as a close match.
  if (ratio === 1 && qr.length >= 3) return 78 - Math.min(8, pr.length - qr.length);
  // Short searches only count when they appear in full; longer ones can be looser.
  return qr.length >= 4 && ratio >= 0.6 ? Math.round(ratio * 60) + (pr[0] === qr[0] ? 8 : 0) : 0;
}

const kindOf = (score: number): Match["kind"] => (score >= 95 ? "exact" : score >= 70 ? "close" : "similar");

export function matchStock(query: string): Match[] {
  if (!clean(query)) return [];
  return STOCK.map((p) => {
    const score = scoreReg(p.reg, query);
    return { ...p, score, kind: kindOf(score) };
  })
    .filter((m) => m.score >= 45)
    .sort((a, b) => b.score - a.score || a.price - b.price);
}

/** UK plate formats, as L (letter) / N (digit) groups. */
const FORMATS: { name: string; groups: string[] }[] = [
  { name: "Current", groups: ["LLNN", "LLL"] },
  ...[1, 2, 3].map((n) => ({ name: "Prefix", groups: ["L" + "N".repeat(n), "LLL"] })),
  ...[1, 2, 3].map((n) => ({ name: "Suffix", groups: ["LLL", "N".repeat(n) + "L"] })),
  ...[1, 2, 3].flatMap((l) => [1, 2, 3, 4].map((n) => ({ name: "Dateless", groups: ["L".repeat(l), "N".repeat(n)] }))),
  ...[1, 2, 3, 4].flatMap((n) => [1, 2, 3].map((l) => ({ name: "Dateless", groups: ["N".repeat(n), "L".repeat(l)] }))),
];

export type Spelling = { reg: string; format: string };

/**
 * Valid-format plates that spell the query, swapping in look-alike digits
 * (A→4, E→3, I→1, S→5…). Ideas only: availability isn't known.
 */
export function spellings(query: string, limit = 6): Spelling[] {
  const q = clean(query);
  if (!q) return [];
  const out = new Map<string, Spelling>();
  for (const f of FORMATS) {
    const pattern = f.groups.join("");
    if (pattern.length !== q.length) continue;
    let reg = "";
    let ok = true;
    let swaps = 0;
    for (let i = 0; i < q.length && ok; i++) {
      const ch = q[i];
      const isDigit = /\d/.test(ch);
      if (pattern[i] === "L") {
        // Digits the customer typed stay digits: only letters are swapped for look-alikes.
        if (!isDigit) reg += ch;
        else ok = false;
      } else {
        if (isDigit) reg += ch;
        else if (LETTER_AS_DIGIT[ch]) {
          reg += LETTER_AS_DIGIT[ch];
          swaps++;
        } else ok = false;
      }
    }
    // Current-style plates can't start with a digit swap that breaks the area code; keep it simple.
    if (!ok || /^0/.test(reg.slice(f.groups[0].indexOf("N")))) continue;
    const spaced = reg.slice(0, f.groups[0].length) + " " + reg.slice(f.groups[0].length);
    if (!out.has(spaced)) out.set(spaced, { reg: spaced, format: f.name });
    void swaps;
  }
  // A number on its own (e.g. 786) isn't a full plate: suggest it with a letter.
  if (/^\d{1,4}$/.test(q)) {
    out.set(`${q} ?`, { reg: `${q} ?`, format: "Dateless + any letter" });
    out.set(`? ${q}`, { reg: `? ${q}`, format: "Any letter + dateless" });
  }
  const inStock = new Set(STOCK.map((s) => clean(s.reg)));
  return [...out.values()].filter((s) => !inStock.has(clean(s.reg))).slice(0, limit);
}

export const PRICE_BANDS = [
  { key: "all", label: "Any price", test: () => true },
  { key: "u1k", label: "Under £1,000", test: (p: number) => p < 1000 },
  { key: "1to3", label: "£1,000 to £3,000", test: (p: number) => p >= 1000 && p <= 3000 },
  { key: "3k", label: "£3,000+", test: (p: number) => p > 3000 },
] as const;
export type PriceBand = (typeof PRICE_BANDS)[number]["key"];

/* ------------------------------------------------------------------ */
/* Results page: every plate grouped by style, like the DVLA and        */
/* Regtransfers lists, with the oldest vehicle each plate can go on.    */
/* ------------------------------------------------------------------ */

export type PlateStyle = "current" | "prefix" | "suffix" | "dateless" | "irish";

export const STYLE_INFO: Record<PlateStyle, { name: string; line: string; example: string }> = {
  current: { name: "Current style", line: "Two letters, two numbers, three letters. Used since 2001.", example: "JA18 CKA" },
  prefix: { name: "Prefix", line: "Starts with the year letter. Used 1983 to 2001.", example: "A30 ACK" },
  suffix: { name: "Suffix", line: "Ends with the year letter. Used 1963 to 1983.", example: "JAC 1K" },
  dateless: { name: "Dateless", line: "No year shown, so they can go on a vehicle of any age.", example: "JCK 1" },
  irish: { name: "Northern Irish", line: "From Northern Ireland, with an I or Z in the letters. No year, so they fit any age.", example: "JAZ 1" },
};
export const STYLE_ORDER: PlateStyle[] = ["dateless", "current", "prefix", "suffix", "irish"];

/** Northern Ireland area codes: the last two letters of an NI plate's letter group. */
const NI_CODES = new Set("AZ BZ CZ DZ EZ FZ GZ HZ IA IB IG IJ IL IW JZ KZ LZ MZ NZ OI OZ PZ RZ SZ TZ UI UZ WZ XI XZ YZ".split(" "));

export function styleOf(reg: string): PlateStyle {
  if (/^[A-Z]{2}\d{2} [A-Z]{3}$/.test(reg)) return "current";
  if (/^[A-Z]\d{1,3} [A-Z]{3}$/.test(reg)) return "prefix";
  if (/^[A-Z]{3} \d{1,3}[A-Z]$/.test(reg)) return "suffix";
  const ni = reg.match(/^([A-Z]{2,3}) \d{1,4}$/);
  if (ni && NI_CODES.has(ni[1].slice(-2))) return "irish";
  return "dateless";
}

const PREFIX_YEAR: Record<string, [number, string]> = {
  A: [1983, "Aug 1983"], B: [1984, "Aug 1984"], C: [1985, "Aug 1985"], D: [1986, "Aug 1986"], E: [1987, "Aug 1987"],
  F: [1988, "Aug 1988"], G: [1989, "Aug 1989"], H: [1990, "Aug 1990"], J: [1991, "Aug 1991"], K: [1992, "Aug 1992"],
  L: [1993, "Aug 1993"], M: [1994, "Aug 1994"], N: [1995, "Aug 1995"], P: [1996, "Aug 1996"], R: [1997, "Aug 1997"],
  S: [1998, "Aug 1998"], T: [1999, "Mar 1999"], V: [1999, "Sep 1999"], W: [2000, "Mar 2000"], X: [2000, "Sep 2000"],
  Y: [2001, "Mar 2001"],
};
/**
 * Suffix year letters. A to D ran for calendar years and E from January 1967. From F
 * (1 August 1967) each letter started on 1 August and ran to 31 July the next year.
 */
const SUFFIX_YEAR: Record<string, [number, string]> = {
  A: [1963, "Jan 1963"], B: [1964, "Jan 1964"], C: [1965, "Jan 1965"], D: [1966, "Jan 1966"], E: [1967, "Jan 1967"],
  F: [1967, "Aug 1967"], G: [1968, "Aug 1968"], H: [1969, "Aug 1969"], J: [1970, "Aug 1970"], K: [1971, "Aug 1971"],
  L: [1972, "Aug 1972"], M: [1973, "Aug 1973"], N: [1974, "Aug 1974"], P: [1975, "Aug 1975"], R: [1976, "Aug 1976"],
  S: [1977, "Aug 1977"], T: [1978, "Aug 1978"], V: [1979, "Aug 1979"], W: [1980, "Aug 1980"], X: [1981, "Aug 1981"],
  Y: [1982, "Aug 1982"],
};

/**
 * A plate can't make a vehicle look newer than it is. Returns the first year
 * (and month) a vehicle can carry this plate, or null for dateless (any vehicle).
 */
export function earliest(reg: string): { year: number; label: string } | null {
  const st = styleOf(reg);
  if (st === "current") {
    const n = Number(reg.slice(2, 4));
    return n >= 50 ? { year: 2000 + n - 50, label: `Sep ${2000 + n - 50}` } : { year: 2000 + n, label: `Mar ${2000 + n}` };
  }
  if (st === "prefix") {
    const y = PREFIX_YEAR[reg[0]];
    return y ? { year: y[0], label: y[1] } : null;
  }
  if (st === "suffix") {
    const y = SUFFIX_YEAR[reg[reg.length - 1]];
    return y ? { year: y[0], label: y[1] } : null;
  }
  return null;
}

export type Result = {
  reg: string;
  price: number;
  was?: number;
  handle?: string;
  sample?: boolean;
  score: number;
  kind: Match["kind"];
  style: PlateStyle;
  fits: { year: number; label: string } | null;
  source: Source;
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILL = "ABCDEFGHJKLMNOPRSTUVWXY";
const YEAR_LETTERS = "ABCDEFGHJKLMNPRSTVWXY";
const AGES = ["02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","51","52","53","54","55","56","57","58","59","60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75"];

/** Price by style and how well it reads; deterministic so a search always shows the same numbers. */
function priceFor(reg: string, style: PlateStyle, score: number) {
  const r = rng(hash(reg + "£"));
  const [lo, hi] = { current: [399, 1599], prefix: [599, 3995], suffix: [499, 2995], dateless: [2995, 14995], irish: [399, 1995] }[style];
  let p = lo + (hi - lo) * r() * r();
  if (score >= 85) p *= 1.6;
  else if (score >= 70) p *= 1.2;
  const step = p > 5000 ? 500 : p > 1000 ? 100 : 50;
  return Math.round(p / step) * step - 1;
}

/** The address of a DVLA registration's page: #plate-dvla-ab12cde. DVLA plates aren't Shopify products. */
export const dvlaHandle = (reg: string) => `dvla-${clean(reg).toLowerCase()}`;
/** SAMPLE: the prototype's DVLA price for a plate (before REG KING's fee), the same wherever it's shown. The live price comes from the feed. */
export const dvlaSamplePrice = (reg: string) => Math.round(priceFor(reg, styleOf(reg), 70) / 1.1 / 10) * 10;
/** A plate from the live DVLA feed, as a search result. */
export function dvlaResult(reg: string, price: number, query: string): Result {
  const style = styleOf(reg);
  const score = query ? scoreReg(reg, query) : 0;
  return { reg, price, handle: dvlaHandle(reg), score, kind: kindOf(score), style, fits: earliest(reg), source: "dvla" };
}
/** A plate shown as DVLA stock gets its own page and a fixed price. */
const asSource = (reg: string, source: Source): Partial<Result> & { source: Source } =>
  source === "dvla" ? { sample: true, source, handle: dvlaHandle(reg), price: dvlaTotal(dvlaSamplePrice(reg)) } : { sample: true, source };

/**
 * SAMPLE plates for the prototype: valid-format regs built around the search,
 * so every search shows a full page. Replace with Shopify stock before launch.
 */
function samplePlates(query: string): string[] {
  const q = clean(query);
  const base = reads(query).replace(/[^A-Z]/g, "");
  const r = rng(hash(q));
  const pick = (s: string) => s[Math.floor(r() * s.length)];
  const num = (max: number) => String(1 + Math.floor(r() * max));
  const out: string[] = [];
  const add = (reg: string) => /^[A-Z0-9 ]{2,8}$/.test(reg) && out.push(reg);

  // A number (786): keep the number and build plates around it.
  if (/^\d{1,3}$/.test(q)) {
    for (let i = 0; i < 4; i++) add(`${pick(YEAR_LETTERS)}${q} ${pick(FILL)}${pick(FILL)}${pick(FILL)}`);
    for (let i = 0; i < 3; i++) add(`${pick(FILL)}${pick(FILL)}${pick(FILL)} ${q}${pick(YEAR_LETTERS)}`);
    for (let i = 0; i < 3; i++) add(`${q} ${pick(FILL)}${i ? pick(FILL) : ""}`);
    for (let i = 0; i < 2; i++) add(`${pick(FILL)} ${q}`);
    return out;
  }
  // Already a full plate (AR12 MXN): near neighbours in the same style.
  const typed = normaliseSpaced(q);
  if (typed && /\d/.test(q)) {
    for (let i = 0; i < 8; i++) {
      const chars = typed.split("");
      const letters = chars.map((c, j) => (/[A-Z]/.test(c) ? j : -1)).filter((j) => j > 1 || styleOf(typed) !== "current");
      const j = letters[Math.floor(r() * letters.length)];
      if (j >= 0) chars[j] = pick(FILL);
      add(chars.join(""));
    }
    return out;
  }
  if (base.length < 2) return out;

  // Current: JA18 CKA (first two letters as the area code, the rest after the age)
  if (base.length >= 4) {
    const rest = base.slice(2, 5);
    for (let i = 0; i < 6; i++) add(`${base.slice(0, 2)}${AGES[Math.floor(r() * AGES.length)]} ${(rest + pick(FILL) + pick(FILL)).slice(0, 3)}`);
  }
  // Prefix: J1 ACK, J4 MES (year letter, number, three letters)
  if (base.length >= 3) {
    const last3 = base.slice(-3);
    if (base.length === 4 && YEAR_LETTERS.includes(base[0])) ["1", "11", "7"].forEach((n) => add(`${base[0]}${n} ${base.slice(1)}`));
    if (base.length === 5 && YEAR_LETTERS.includes(base[0]) && LETTER_AS_DIGIT[base[1]]) add(`${base[0]}${LETTER_AS_DIGIT[base[1]]} ${base.slice(2)}`);
    for (let i = 0; i < 5; i++) add(`${pick(YEAR_LETTERS)}${num(i < 2 ? 9 : 99)} ${last3}`);
  }
  // Suffix: JAC 1K, JAM 3S (three letters, number, year letter)
  if (base.length >= 3) {
    const first3 = base.slice(0, 3);
    if (base.length === 4 && YEAR_LETTERS.includes(base[3])) ["1", "11", "4"].forEach((n) => add(`${first3} ${n}${base[3]}`));
    if (base.length === 5 && LETTER_AS_DIGIT[base[3]] && YEAR_LETTERS.includes(base[4])) add(`${first3} ${LETTER_AS_DIGIT[base[3]]}${base[4]}`);
    for (let i = 0; i < 4; i++) add(`${first3} ${num(i < 2 ? 9 : 99)}${pick(YEAR_LETTERS)}`);
  }
  // Dateless: JCK 1, 1 JAK, JAC 7
  const skel = (base[0] + base.slice(1).replace(/[AEIOU]/g, "")).slice(0, 3);
  const letters = [base.slice(0, 3), skel, base.length <= 3 ? base : base[0] + base.slice(-2)];
  [...new Set(letters)].forEach((l, i) => {
    if (l.length < 2) return;
    add(`${l} ${["1", "7", "11"][i] ?? num(9)}`);
    if (i === 0) add(`${num(9)} ${l}`);
  });
  return out;
}

/** Put the space back into a typed plate (AR12MXN → AR12 MXN) when it fits a known style. */
function normaliseSpaced(q: string): string | null {
  let m;
  if ((m = q.match(/^([A-Z]{2}\d{2})([A-Z]{3})$/))) return `${m[1]} ${m[2]}`;
  if ((m = q.match(/^([A-Z]\d{1,3})([A-Z]{3})$/))) return `${m[1]} ${m[2]}`;
  if ((m = q.match(/^([A-Z]{3})(\d{1,3}[A-Z])$/))) return `${m[1]} ${m[2]}`;
  return null;
}

export function searchAll(query: string): Result[] {
  const q = clean(query);
  if (!q) return [];
  const seen = new Set<string>();
  const out: Result[] = [];
  const push = (reg: string, extra: Partial<Result> & { source: Source }) => {
    const k = clean(reg);
    if (seen.has(k)) return;
    const score = scoreReg(reg, query);
    if (score < 45) return;
    seen.add(k);
    const style = styleOf(reg);
    const price = extra.price ?? priceFor(reg, style, score);
    out.push({
      ...extra,
      reg,
      price,
      score,
      kind: kindOf(score),
      style,
      fits: earliest(reg),
    });
  };
  // 1. REG KING stock, 2. customer plates, 3. DVLA. The live site swaps these for the three feeds.
  matchStock(query).forEach((m) => push(m.reg, { price: m.price, handle: m.handle, source: m.source ?? "customer" }));
  // DVLA plates: SAMPLES until the DVLA feed is connected (dated styles only; the DVLA doesn't sell dateless).
  if (DVLA_FEED)
    samplePlates(query)
      .filter((reg) => styleOf(reg) !== "dateless" && styleOf(reg) !== "irish")
      .forEach((reg) => push(reg, asSource(reg, "dvla")));
  return out.sort(rankResults);
}

/** REG KING first, then customer plates, then DVLA; best match within each. */
export const rankResults = (a: Result, b: Result) =>
  SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) || b.score - a.score || a.price - b.price;

/**
 * Everything for sale, for browsing with filters and no search.
 * Real stock plus SAMPLE plates built around `seeds` (category words) so the prototype has
 * enough to filter. The live site lists the three feeds here instead.
 */
export function browseAll(seeds: string[]): Result[] {
  const seen = new Set<string>();
  const out: Result[] = [];
  const push = (reg: string, extra: Partial<Result> & { source: Source }) => {
    const k = clean(reg);
    if (seen.has(k)) return;
    seen.add(k);
    const style = styleOf(reg);
    out.push({ ...extra, reg, price: extra.price ?? priceFor(reg, style, 70), score: 0, kind: "similar", style, fits: earliest(reg) });
  };
  STOCK.forEach((p) => push(p.reg, { price: p.price, handle: p.handle, source: p.source ?? "customer" }));
  // DVLA SAMPLES (dated styles) until the feed is connected.
  if (DVLA_FEED)
    seeds.forEach((seed) =>
      samplePlates(seed)
        .filter((reg) => styleOf(reg) !== "dateless" && styleOf(reg) !== "irish")
        .slice(0, 2)
        .forEach((reg) => push(reg, asSource(reg, "dvla"))),
    );
  return out.sort((a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) || a.price - b.price);
}
