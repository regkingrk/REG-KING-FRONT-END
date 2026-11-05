/**
 * Buy filters: shared by the dropdown under the hero search and the sidebar on the results page.
 *
 * PROTOTYPE: categories are worked out from word lists below. On the live site each plate gets
 * its categories as Shopify tags (or collections), so the team decides what goes where.
 */

import { exclusivePlates } from "./brand";
import { DVLA_FEED } from "./features";
import { STYLE_ORDER, browseAll, clean, reads, styleOf, type PlateStyle, type Result, type Source } from "./search";

export type StockType = "all" | Source;

export const STOCK_TYPES: { key: StockType; label: string; line: string }[] = [
  { key: "all", label: "All plates", line: "Everything below" },
  { key: "regking", label: "REG KING owned", line: "Our own plates, ready to transfer" },
  { key: "customer", label: "Customer owned", line: "Plates our customers are selling through us" },
  { key: "dvla", label: "Open market (DVLA)", line: "Brand new plates never issued before" },
].filter((t) => DVLA_FEED || t.key !== "dvla") as { key: StockType; label: string; line: string }[];

/** Plain-English guide to each format, for the "What do the formats mean?" panels. */
export const FORMAT_GUIDE: Record<PlateStyle, { name: string; years: string; example: string; how: string; fits: string }> = {
  current: {
    name: "Current style",
    years: "2001 to today",
    example: "AB12 CDE",
    how: "The two numbers show when it was issued. 12 means March 2012, 62 means September 2012. The letters around them are the area and a random part.",
    fits: "Fits vehicles from the year shown or newer.",
  },
  prefix: {
    name: "Prefix",
    years: "1983 to 2001",
    example: "A123 BCD",
    how: "The single letter at the front is the year. A is 1983, B is 1984 and so on up to Y in 2001.",
    fits: "Fits vehicles from that year or newer.",
  },
  suffix: {
    name: "Suffix",
    years: "1963 to 1983",
    example: "ABC 123D",
    how: "Same idea as prefix, but the year letter is on the end. A is 1963, Y is 1982.",
    fits: "Fits vehicles from that year or newer.",
  },
  dateless: {
    name: "Dateless",
    years: "Before 1963",
    example: "ABC 123",
    how: "Just letters and numbers with no year in them, like 1 AB or ABC 1. The shortest and most sought after plates are dateless.",
    fits: "Fits any vehicle, new or old. That's why they usually cost more.",
  },
  irish: {
    name: "Northern Irish",
    years: "Issued in Northern Ireland",
    example: "ABZ 1234",
    how: "They look like dateless plates, but the letters include an I or a Z. They can still be used anywhere in the UK.",
    fits: "Fits any vehicle. Often the cheapest way to get a dateless look.",
  },
};

/**
 * Six main categories, each with its subcategories (REG KING's list, 2 Nov 2026).
 * A plate can sit in more than one. PROTOTYPE: matched from the word lists and rules below; on the
 * live site the team tags each plate in Shopify.
 */
export type CatGroupKey = "names" | "car" | "countries" | "funny" | "words" | "exclusive";
export type CatKey =
  | "male"
  | "female"
  | "othernames"
  | "brands"
  | "models"
  | "performance"
  | "enthusiasts"
  | "countries"
  | "nationalities"
  | "heritage"
  | "funny"
  | "cheeky"
  | "rude"
  | "single"
  | "phrases"
  | "business"
  | "initials"
  | "rare"
  | "short"
  | "dateless"
  | "premium";

type Cat = { key: CatKey; group: CatGroupKey; label: string; words?: string[]; tokens?: string[]; test?: (r: Result) => boolean };
export type CatGroup = { key: CatGroupKey; label: string; line: string; subs: CatKey[] };

const digitRuns = (reg: string) => reg.match(/\d+/g) ?? [];

export const CAT_GROUPS: CatGroup[] = [
  { key: "names", label: "Name plates", line: "Male, female and other names", subs: ["male", "female", "othernames"] },
  { key: "car", label: "Car related", line: "Brands, models and performance", subs: ["brands", "models", "performance", "enthusiasts"] },
  { key: "countries", label: "Countries & cultures", line: "Countries, nationalities and heritage", subs: ["countries", "nationalities", "heritage"] },
  { key: "funny", label: "Funny & rude plates", line: "Funny, cheeky and rude", subs: ["funny", "cheeky", "rude"] },
  { key: "words", label: "Words & phrases", line: "Words, phrases, business and initials", subs: ["single", "phrases", "business", "initials"] },
  { key: "exclusive", label: "Exclusive plates", line: "Rare, short, dateless and premium", subs: ["rare", "short", "dateless", "premium"] },
];

export const CATEGORIES: Cat[] = [
  // Name plates
  { key: "male", group: "names", label: "Male names", words: ["ADAM", "ARMAN", "AHMED", "ALI", "AMIR", "DANNY", "JAMES", "JACK", "HARRY", "HASSAN", "MATTY", "OMAR", "RAZ", "SAMMY", "ZAIN"] },
  { key: "female", group: "names", label: "Female names", words: ["ANN", "AMY", "AISHA", "ZARA", "SARAH", "SOPHIE", "MAYA", "LILY", "EMMA", "ELLA", "RIA", "NINA", "SANA", "AMBER"] },
  { key: "othernames", group: "names", label: "Other names", words: ["GILL", "SANDHU", "SIDHU", "BAJWA", "CHEEMA", "KHAN", "SINGH", "KAUR", "SAM", "ALEX", "JO"] },
  // Car related
  { key: "brands", group: "car", label: "Car brands", words: ["BMW", "AUDI", "BENZ", "MERC", "LAMBO", "FORD", "SEAT", "MINI", "KIA", "JAG"], tokens: ["VW"] },
  { key: "models", group: "car", label: "Car models", words: ["GTI", "EVO", "VXR", "RRS", "GOLF"], tokens: ["M3", "M4", "M5", "S3", "RS3", "RS6", "A3", "A4"] },
  { key: "performance", group: "car", label: "Performance related", words: ["AMG", "TURBO", "SPORT", "BHP", "RACE", "FAST", "V8"], tokens: ["RS", "ST", "GT"] },
  { key: "enthusiasts", group: "car", label: "Car enthusiasts", words: ["CARS", "AUTO", "DRIFT", "MODS", "REVS", "PETROL", "MOTOR"] },
  // Countries & cultures
  { key: "countries", group: "countries", label: "Countries", words: ["PAK", "IND", "IRAQ", "EIRE", "WALES", "ITALY", "SPAIN", "USA"], tokens: ["UK", "GB"] },
  { key: "nationalities", group: "countries", label: "Nationalities", words: ["KURD", "SCOT", "BRIT", "IRISH", "WELSH", "DESI"] },
  { key: "heritage", group: "countries", label: "Cultural & heritage plates", words: ["JATT", "JAT", "RAJPUT", "ARAIN", "SIKH", "KHALSA"], test: (r) => digitRuns(r.reg).includes("786") },
  // Funny & rude plates
  { key: "funny", group: "funny", label: "Funny plates", words: ["LOL", "HAHA", "OOPS", "NOPE", "FAT"] },
  { key: "cheeky", group: "funny", label: "Cheeky plates", words: ["BAD", "BOI", "SAUCY", "SXY", "HOT", "CHEEKY"] },
  { key: "rude", group: "funny", label: "Rude plates", words: ["BUM", "SEXY"] },
  // Words & phrases
  { key: "single", group: "words", label: "Single words", words: ["BOSS", "KING", "QUEEN", "MONEY", "LUCKY", "HERO", "LEGEND", "BLESS", "AMEN", "GOD"] },
  { key: "phrases", group: "words", label: "Phrases", words: ["ISAY", "ONIT", "MYCAR", "BIGBOSS", "NOWAY"] },
  { key: "business", group: "words", label: "Business related", words: ["CABS", "TAXI", "HAIR", "BUILD", "LAW", "DOC", "DENT", "MOT", "VAN"] },
  // Initials: dateless-style plates made of two or three letters and a short number, like ABC 1 or 1 AB.
  { key: "initials", group: "words", label: "Initials", test: (r) => /^([A-Z]{2,3} \d{1,3}|\d{1,3} [A-Z]{2,3})$/.test(r.reg) },
  // Exclusive plates
  { key: "rare", group: "exclusive", label: "Rare plates", test: (r) => digitRuns(r.reg).join("") === "1" || clean(r.reg).length <= 3 },
  { key: "short", group: "exclusive", label: "Short plates", test: (r) => clean(r.reg).length <= 4 },
  { key: "dateless", group: "exclusive", label: "Dateless plates", test: (r) => styleOf(r.reg) === "dateless" },
  { key: "premium", group: "exclusive", label: "Premium registrations", test: (r) => exclusivePlates.includes(r.reg) || r.price >= 15000 },
];

export const catOfKey = (k: CatKey) => CATEGORIES.find((c) => c.key === k)!;
export const groupOf = (k: CatGroupKey) => CAT_GROUPS.find((g) => g.key === k)!;

export function inCategory(r: Result, k: CatKey): boolean {
  const c = catOfKey(k);
  if (c.test?.(r)) return true;
  const rd = reads(r.reg);
  const cl = clean(r.reg);
  const groups = r.reg.split(" ");
  // Short words (ALI, AMG) only count as a whole part of the plate, so random letters don't match.
  const parts = groups.map(reads);
  if (c.words?.some((w) => (w.length <= 3 ? parts.includes(w) || rd === w : rd.includes(w) || cl.includes(w)))) return true;
  return !!c.tokens?.some((t) => groups.includes(t));
}
/** In any of a main category's subcategories. */
export const inGroup = (r: Result, g: CatGroupKey) => groupOf(g).subs.some((k) => inCategory(r, k));

/** Seeds for the browse catalogue: a few words from each category. */
export const BROWSE_SEEDS = CATEGORIES.flatMap((c) => (c.words ?? []).slice(0, 5));

export const PRICE_STEPS = [250, 500, 1000, 2000, 3000, 5000, 10000, 25000];
export const CHAR_LIMITS = [3, 4, 5, 6, 7];

export type Filters = {
  styles: PlateStyle[];
  stock: StockType;
  min: number;
  max: number;
  /** The year the customer's vehicle was first registered. 0 = any. */
  year: number;
  cats: CatKey[];
  /** Most characters (letters and numbers). 0 = any. */
  chars: number;
};

export const emptyFilters = (): Filters => ({ styles: [], stock: "all", min: 0, max: 0, year: 0, cats: [], chars: 0 });

export const activeCount = (f: Filters) =>
  (f.styles.length ? 1 : 0) + (f.stock !== "all" ? 1 : 0) + (f.min || f.max ? 1 : 0) + (f.year ? 1 : 0) + (f.cats.length ? 1 : 0) + (f.chars ? 1 : 0);

/** Every filter except the one named, so counts next to each option stay useful. */
export function passes(r: Result, f: Filters, skip?: keyof Filters): boolean {
  if (skip !== "styles" && f.styles.length && !f.styles.includes(r.style)) return false;
  if (skip !== "stock" && f.stock !== "all" && r.source !== f.stock) return false;
  if (skip !== "min" && f.min && r.price < f.min) return false;
  if (skip !== "max" && f.max && r.price > f.max) return false;
  if (skip !== "year" && f.year && r.fits && r.fits.year > f.year) return false;
  if (skip !== "cats" && f.cats.length && !f.cats.some((k) => inCategory(r, k))) return false;
  if (skip !== "chars" && f.chars && clean(r.reg).length > f.chars) return false;
  return true;
}

export const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export { STYLE_ORDER };

let cached: Result[] | null = null;
/** Everything for sale, built once. */
export const catalogue = () => (cached ??= browseAll(BROWSE_SEEDS));
