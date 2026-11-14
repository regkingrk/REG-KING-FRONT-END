/**
 * Plate builder options, in the order and groups the REG KING team set out (21 Oct 2026):
 * vehicle → road legal or show → set or single (front or rear) → one style → a size for each plate
 * → style → size → extras → delivery.
 *
 * Retail and trade prices from REG KING's price sheet (2 Nov 2026). Trade prices are for plates bought
 * with a registration (plate pages); the Make section uses retail.
 * `null` = no published price → shown as "Price on request".
 * For production, load this from the same price list the workshop tool uses.
 */

import { spaceReg } from "./brand";
import { bottomFont, DEFAULT_BOTTOM_SIZE } from "./bottomText";
import { ACCESSORY_PRICES, surroundSummary, type SurroundConfig } from "./accessories";

export type Price = { set: number | null; single: number | null };

/** The surround upsell in Extras: none yet, skipped, standard black, or personalised. */
export type SurroundChoice = { kind: "none" } | { kind: "standard" } | { kind: "custom"; cfg: SurroundConfig } | null;

export type PlateLook = "printed" | "printed-bike" | "gel" | "gel-bike" | "raised" | "raised-bike" | "raised-deep" | "gel-4d" | "gel-4d-bike" | "metal-white" | "metal-silver" | "bevel" | "bevel-matt" | "bevel-x" | "bevel-matt-x";

export type StyleOption = Price & {
  name: string;
  /** How the live plate preview draws it. */
  look: PlateLook;
  /** Made with the smaller 64mm motorbike characters, on car plates too (Bike Retro, Bike Vintage). */
  small?: boolean;
};

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */
/** Two choices only: everything that isn't a motorbike (vans, SUVs, imports, oversized) is covered by the size tabs. */
export type Vehicle = "Car" | "Bike";
export const VEHICLES: { key: Vehicle; label: string; line: string }[] = [
  { key: "Car", label: "Car, van or SUV", line: "Front & rear plates" },
  { key: "Bike", label: "Motorbike", line: "Rear plate" },
];
export const vehicleLabel = (v: Vehicle | null) => VEHICLES.find((x) => x.key === v)?.label ?? "";

/** Motorbikes carry a rear plate only, so they take a single rear plate. */
export const rearOnly = (v: Vehicle | null) => v === "Bike";

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const st = (name: string, look: PlateLook, set: number | null = null, single: number | null = null): StyleOption => ({ name, look, set, single });

/** Every style, with the prices the workshop tool publishes (null = price on request). */
export const STYLES: Record<string, StyleOption> = Object.fromEntries(
  [
    st("Printed", "printed", 19.99, 13),
    st("Metal Press", "raised", 50, 30),
    st("3D Gel", "gel", 35, 20),
    st("4D 3MM", "raised", 35, 20),
    st("4D 6MM", "raised-deep", 55, 30),
    st("4D Gel 3MM", "gel-4d", 60, 35),
    st("Retro", "bevel", 70, 40),
    // RK: off sale for now (not in the lists below), kept so it can come back. See docs/saved/rk-style.
    st("RK", "bevel"),
    st("Vintage", "bevel-matt", 70, 40),
    st("Retro X", "bevel-x", 80, 45),
    st("Vintage X", "bevel-matt-x", 80, 45),
    st("Bike Print", "printed-bike", 30, 15),
    st("Metro Print", "printed", 30, 15),
    st("Bike Gel", "gel-bike", 40, 25),
    // CONFIRM: prices for Bike Retro and Bike Vintage (REG KING to set; shown as price on request until then)
    { ...st("Bike Retro", "bevel"), small: true },
    { ...st("Bike Vintage", "bevel-matt"), small: true },
    st("4D 3MM Bike", "raised-bike", 40, 25),
    st("4D Bike Gel", "gel-4d-bike", 65, 40),
    st("Onyx", "raised", 60, 35),
    st("Shadow", "raised", 60, 35),
    st("Metal Press Black & White", "metal-white", 60, 35),
    st("Metal Press Black & Silver", "metal-silver", 60, 35),
  ].map((s) => [s.name, s]),
);

/** The lowest price for a set of plates (road legal, car), for "from" prices: worked out, never typed. */
export function fromSetPrice(): number | null {
  const sets = CAR_LEGAL.map((n) => STYLES[n]?.set).filter((p): p is number => typeof p === "number");
  return sets.length ? Math.min(...sets) : null;
}

/** Cars, vans and SUVs. */
export const CAR_LEGAL = ["Printed", "Metal Press", "3D Gel", "4D 3MM", "4D 6MM", "4D Gel 3MM", "Retro", "Vintage", "Retro X", "Vintage X"];
export const CAR_SHOW = [
  "Printed",
  "Metal Press",
  "Bike Print",
  "Metro Print",
  "3D Gel",
  "Bike Gel",
  "Bike Retro",
  "Bike Vintage",
  "4D 3MM",
  "4D 3MM Bike",
  "4D 6MM",
  "4D Bike Gel",
  "4D Gel 3MM",
  "Onyx",
  "Shadow",
  "Retro",
  "Vintage",
  "Retro X",
  "Vintage X",
  "Metal Press Black & White",
  "Metal Press Black & Silver",
];
/** Motorbikes: the same styles for road legal and show. */
export const BIKE_STYLES = ["Bike Print", "Bike Gel", "Bike Retro", "Bike Vintage", "4D 3MM Bike", "4D Bike Gel"];

/** Styles offered for this vehicle, once road legal or show is chosen. */
export const stylesFor = (v: Vehicle | null, legal: Legal | null): StyleOption[] =>
  (v === "Bike" ? BIKE_STYLES : legal === "Show" ? CAR_SHOW : CAR_LEGAL).map((n) => STYLES[n]);

/* ------------------------------------------------------------------ */
/* Sizes                                                               */
/* ------------------------------------------------------------------ */
export type SizeOption = {
  key: string;
  label: string;
  group: string;
  /** Only offered when the reg has this many characters or fewer (spaces not counted). */
  maxChars?: number;
  /** Plate size in mm (approximate, for the example drawings) and its shape. */
  w: number;
  h: number;
  hex?: boolean;
};

const IN = 25.4;
const CAR_SIZES: SizeOption[] = [
  { key: "Normal", label: "Standard", group: "Standard", w: 520, h: 111 },
  { key: '18"', label: "18 inch", group: "Standard", maxChars: 7, w: 18 * IN, h: 111 },
  { key: '16"', label: "16 inch", group: "Standard", maxChars: 6, w: 16 * IN, h: 111 },
  { key: '14"', label: "14 inch", group: "Standard", maxChars: 5, w: 14 * IN, h: 111 },
  { key: '8"', label: "8 inch", group: "Standard", maxChars: 4, w: 8 * IN, h: 111 },
  { key: "Hex Normal", label: "Hex Normal", group: "Hex", maxChars: 7, w: 520, h: 111, hex: true },
  { key: "Hex Medium", label: "Hex Medium", group: "Hex", maxChars: 6, w: 16 * IN, h: 111, hex: true },
  { key: "Hex Small", label: "Hex Small", group: "Hex", maxChars: 5, w: 14 * IN, h: 111, hex: true },
  // As listed by the team: Hex XS up to 7 characters (confirm, as the other small sizes step down).
  { key: "Hex XS", label: "Hex XS", group: "Hex", maxChars: 7, w: 11 * IN, h: 111, hex: true },
];
const VAN_SIZES: SizeOption[] = [
  { key: "Oversized", label: "Oversized (533 × 152mm)", group: "Van & SUV", w: 533, h: 152 },
  { key: "Square", label: "Square (289 × 203mm)", group: "Van & SUV", w: 289, h: 203 },
  { key: "4x4", label: "4x4", group: "Van & SUV", w: 279, h: 203 },
];
const IMPORT_LEGAL: SizeOption[] = [
  { key: "13x7", label: "Jap import 13 × 7", group: "Imports", w: 13 * IN, h: 7 * IN },
  { key: "12x6", label: "American import 12 × 6", group: "Imports", w: 12 * IN, h: 6 * IN },
];
const IMPORT_SHOW: SizeOption[] = [
  { key: "13x6.5", label: "Jap import 13 × 6.5", group: "Imports", w: 13 * IN, h: 6.5 * IN },
  { key: "13x6", label: "Jap import 13 × 6", group: "Imports", w: 13 * IN, h: 6 * IN },
  // two lines on a short plate, split at the space in the reg (AK11F on top, YK underneath)
  { key: "8x6", label: "8 × 6, two lines", group: "Two lines", w: 8 * IN, h: 6 * IN },
];
const BIKE_LEGAL: SizeOption[] = [{ key: "9x7", label: "9 × 7", group: "Bike", w: 9 * IN, h: 7 * IN }];
const BIKE_SHOW: SizeOption[] = [...BIKE_LEGAL, { key: "8x6", label: "8 × 6", group: "Bike", w: 8 * IN, h: 6 * IN }, { key: "5x7", label: "5 × 7", group: "Bike", w: 5 * IN, h: 7 * IN }];

export const ALL_SIZES = [...CAR_SIZES, ...VAN_SIZES, ...IMPORT_LEGAL, ...IMPORT_SHOW, ...BIKE_SHOW];

/**
 * Show plates for cars: any length the customer picks, plain or hex, 111mm tall, on one line.
 * The shortest offered is the shortest the reg fits at full size (never squeezed or overhanging).
 * CONFIRM: the lengths REG KING can make (set here to one-line plates up to the 533mm oversized length).
 */
export const CUSTOM_LEN = { min: 289, max: 533 } as const;
export const customSizeKey = (w: number, hex: boolean) => `Custom${hex ? " Hex" : ""} ${Math.round(w)}mm`;
/** A custom size from its key ("Custom 430mm", "Custom Hex 480mm"), or null. */
export function customSize(key: string | null | undefined): SizeOption | null {
  const m = (key ?? "").match(/^Custom( Hex)? (\d{3})mm$/);
  if (!m) return null;
  const w = Number(m[2]);
  if (w < CUSTOM_LEN.min || w > CUSTOM_LEN.max) return null;
  return { key: key!, label: `Custom ${m[1] ? "hex " : ""}${w}mm`, group: "Custom", w, h: 111, hex: !!m[1] };
}
/** Whether this plate can have a custom length: show plates for cars, vans and SUVs. */
export const offersCustom = (v: Vehicle | null, legal: Legal | null) => legal === "Show" && v !== "Bike";

/* ------------------------------------------------------------------ */
/* Shortest road-legal length                                          */
/* ------------------------------------------------------------------ */
/**
 * The legal layout for one-line car plates (DVLA INF104, plates fitted from 1 September 2001), in mm:
 * characters 79 high and 50 wide, 11 between characters, 33 between the two groups, at least 11 to every edge.
 * "1" and "I" are 14 wide: measured from the legal font file (the same width as the 14mm stroke).
 */
export const LEGAL_MM = { charH: 79, charW: 50, narrowW: 14, gap: 11, groupGap: 33, margin: 11 } as const;
const PLATE_H = 111;

/**
 * On a hex plate the cut corners come in towards the text, so the end of the text has to sit further in
 * to keep 11mm from the slanted edges. Worked out from the measured HEX outline for a 111mm plate.
 */
function hexEndInset(h = PLATE_H) {
  const near = (p: [number, number], a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const A: [number, number] = [h * HEX.top, 0], B: [number, number] = [0, h * HEX.point], C: [number, number] = [h * HEX.bottom, h];
  const top = (h - LEGAL_MM.charH) / 2, bottom = top + LEGAL_MM.charH;
  // The upside-down hex is the same outline turned over, and the text is centred, so one answer covers both.
  for (let x = LEGAL_MM.margin; x < 80; x += 0.1) {
    if ([top, bottom].every((y) => near([x, y], A, B) >= LEGAL_MM.margin && near([x, y], B, C) >= LEGAL_MM.margin)) return x;
  }
  return 80;
}
// Worked out on first use (HEX is defined further down this file).
let hexInset = 0;

/** How far the characters must sit from each end of a one-line plate, in mm (more on a hex, for the cut corners). */
export const legalEndInset = (hex = false) => (hex ? (hexInset ||= hexEndInset()) : LEGAL_MM.margin);

/* ------------------------------------------------------------------ */
/* Custom spacing (show plates)                                        */
/* ------------------------------------------------------------------ */
/** The reg's characters, without its spaces. */
export const regChars = (reg: string) => reg.replace(/\s/g, "").toUpperCase();
/** Show plates: the most spaces a customer can put between two characters. */
export const MAX_GAP = 3;
/** The gaps as typed: how many spaces sit between each pair of characters (0 = together, up to MAX_GAP). */
export function typedGaps(reg: string): number[] {
  const out: number[] = [];
  let pending = 0, first = true;
  for (const ch of reg.trim().toUpperCase()) {
    if (/\s/.test(ch)) pending = Math.min(MAX_GAP, pending + 1);
    else {
      if (!first) out.push(pending);
      pending = 0;
      first = false;
    }
  }
  return out;
}
/**
 * Spacing REG KING has set up for particular plates, used when that reg is typed for a show plate.
 * TL11 CKY: the T on its own, then L11CKY together with the two 1s a little apart.
 */
export const SPACING_PRESETS: Record<string, number[]> = {
  TL11CKY: [1, 0, 0.5, 0, 0, 0],
};
/** Whether a reg is typed with its usual spacing (as the reg box sets it out on road-legal plates). */
const standardSpacing = (reg: string) => reg.trim().toUpperCase() === spaceReg(reg).trim();
/**
 * The custom gaps that apply to this plate, or null for the standard spacing (road legal and bikes always).
 * Show plates are spaced however the customer types them; a reg typed the usual way takes any spacing
 * REG KING has set up for it.
 */
export function plateGaps(c: Pick<BuildConfig, "legal" | "vehicle" | "spacing">, reg: string): number[] | null {
  if (c.legal !== "Show" || c.vehicle === "Bike" || regChars(reg).length < 2) return null;
  if (!standardSpacing(reg)) return typedGaps(reg);
  if (!c.spacing) return null;
  return c.spacing.length === regChars(reg).length - 1 ? c.spacing : null;
}
/** The plate's characters with its custom gaps spelled out, for the order: "T (space) L1 (small gap) 1CKY". */
export function spacedReg(reg: string, gaps: number[]): string {
  const name = (g: number) => (g === 1 ? "space" : g === 0.5 ? "small gap" : Number.isInteger(g) ? `${g} spaces` : `${g} space gap`);
  return [...regChars(reg)].map((ch, i) => (i === 0 || !gaps[i - 1] ? "" : ` (${name(gaps[i - 1])}) `) + ch).join("");
}

/** "custom spacing T (space) L1 (small gap) 1CKY" when a show plate's gaps differ from the reg as typed (for the order and its summary), else null. */
export function spacingNote(c: Pick<BuildConfig, "legal" | "vehicle" | "spacing">, reg: string): string | null {
  const gaps = plateGaps(c, reg);
  if (!gaps) return null;
  const usual = typedGaps(spaceReg(reg));
  return gaps.some((g, i) => g !== usual[i]) ? `custom spacing ${spacedReg(reg, gaps)}` : null;
}

/** Widths in the plate font, as fractions of the font size (measured from the font file: 0.7em cap height). */
const FONT_EM = { cap: 0.7, char: 0.541, narrow: 0.222, space: 0.195, bearing: 0.049 };
/** Width of the reg's ink in ems of the plate font, edge of the first letter to edge of the last. */
export const plateTextEm = (reg: string, gaps?: number[] | null) => {
  const t = reg.trim();
  if (!t) return 0;
  if (gaps) {
    const chars = [...regChars(t)];
    const adv = chars.reduce((a, ch) => a + (ch === "1" || ch === "I" ? FONT_EM.narrow : FONT_EM.char), 0) + gaps.reduce((a, g) => a + g * FONT_EM.space, 0);
    return adv - 2 * FONT_EM.bearing;
  }
  const adv = [...t].reduce((a, ch) => a + (ch === " " ? FONT_EM.space : ch === "1" || ch === "I" ? FONT_EM.narrow : FONT_EM.char), 0);
  return adv - 2 * FONT_EM.bearing;
};
/** The badge panel on the left of a plate (UK / EV identifiers), in mm. */
export const BADGE_MM = 50;
/**
 * Plate-font size, as a % of the plate's width, that draws the reg as it's made: 79mm characters,
 * shrinking only when a long reg can't fit across a short plate inside the legal end margins.
 */
export function plateFontPct(reg: string, w: number, opts: { hex?: boolean; badge?: boolean; gaps?: number[] | null } = {}) {
  const real = LEGAL_MM.charH / FONT_EM.cap; // font size in mm for 79mm characters
  const room = w - 2 * legalEndInset(opts.hex) - (opts.badge ? BADGE_MM : 0);
  const em = plateTextEm(reg, opts.gaps);
  const mm = em > 0 ? Math.min(real, room / em) : real;
  return (mm / w) * 100;
}

/** The shortest a one-line road-legal plate can be for this reg, in whole mm (rounded up). */
export function legalLength(reg: string, hex = false, gaps?: number[] | null): number {
  const groups = reg.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const chars = groups.join("");
  if (!chars) return 0;
  const glyphs = [...chars].reduce((a, ch) => a + (ch === "1" || ch === "I" ? LEGAL_MM.narrowW : LEGAL_MM.charW), 0);
  const ends = 2 * (hex ? (hexInset ||= hexEndInset()) : LEGAL_MM.margin);
  // custom spacing: each gap runs from the normal letter gap (together) to the gap between groups (a space) and beyond
  if (gaps) return Math.ceil(ends + glyphs + gaps.reduce((a, g) => a + LEGAL_MM.gap + g * (LEGAL_MM.groupGap - LEGAL_MM.gap), 0));
  return Math.ceil(ends + glyphs + LEGAL_MM.gap * (chars.length - groups.length) + LEGAL_MM.groupGap * (groups.length - 1));
}

export const sizeLabel = (key: string | null) => (ALL_SIZES.find((s) => s.key === key) ?? customSize(key))?.label ?? key ?? "";
export const sizeInfo = (key: string | null) => ALL_SIZES.find((s) => s.key === key) ?? customSize(key);

/** Characters on the plate, not counting spaces. */
export const regLength = (reg: string) => reg.replace(/\s/g, "").length;

/** Every size this vehicle and plate type can have, before the reg-length rule. */
export function allSizesFor(v: Vehicle | null, legal: Legal | null): SizeOption[] {
  if (v === "Bike") return legal === "Show" ? BIKE_SHOW : BIKE_LEGAL;
  return [...CAR_SIZES, ...VAN_SIZES, ...IMPORT_LEGAL, ...(legal === "Show" ? IMPORT_SHOW : [])];
}

/** One-line car plates, where the legal length rule is worked out from the reg. */
const oneLine = (s: SizeOption) => s.group === "Standard" || s.group === "Hex" || s.group === "Custom" || s.key === "Oversized";
/** Whether the shortest-legal option applies: road-legal car plates once a reg is typed. */
export const offersShortest = (v: Vehicle | null, legal: Legal | null, reg: string) => legal === "Legal" && v !== "Bike" && regLength(reg) > 0;

/**
 * Sizes that fit: smaller plates only appear for shorter regs (the sizes and limits REG KING provided),
 * and only sizes the reg goes on at its full size, never squeezed. With no reg typed yet, all are shown.
 * `extras`: a badge (UK / EV) takes 50mm off the length for the reg.
 */
export function sizesFor(v: Vehicle | null, legal: Legal | null, reg = "", styles: (string | null | undefined)[] = [], gaps?: number[] | null, extras: string[] = []): SizeOption[] {
  const chars = regLength(reg);
  return allSizesFor(v, legal).filter((s) => (!s.maxChars || chars === 0 || legal === "Show" || chars <= s.maxChars) && fitsFullSize(s, reg, { v, legal, styles, gaps, badge: hasBadge(extras) }));
}

/** Badges sit in a 50mm panel at the left of a car plate, so the reg has that much less room. */
const BADGE_LOOKS: ExtraLook[] = ["uk", "ev", "ev-uk", "flag", "badge"];
export const hasBadge = (extras: string[]) => extras.some((n) => BADGE_LOOKS.includes(EXTRAS.find((e) => e.name === n)?.look as ExtraLook));
/** Styles drawn with the smaller 64mm motorbike characters (also on car plates). */
const SMALL_LOOKS: PlateLook[] = ["printed-bike", "gel-bike", "raised-bike", "gel-4d-bike"];
/** Whether a style is drawn with the smaller 64mm motorbike characters (by its look, or flagged on the style). */
export const smallChars = (look: PlateLook, styleName?: string | null) => SMALL_LOOKS.includes(look) || !!(styleName && STYLES[styleName]?.small);
const BIKE_CHAR_MM = 64;
/**
 * Two-line plates: bikes, and the squarer car sizes (Square, 4x4 and the import sizes). The reg goes
 * four characters on top and three underneath (split at its space). Square and 4x4 take full 79mm
 * characters; the shallower import plates take smaller characters so both lines fit the height.
 * Returns null for one-line plates.
 */
export function twoLineLayout(w: number, h: number, bike: boolean): { charH: number; gap: number } | null {
  if (bike) return { charH: BIKE_CHAR_MM, gap: 14 };
  if (w / h >= 2.6) return null;
  if (h >= 197) return { charH: 79, gap: 19 };
  return { charH: Math.min(BIKE_CHAR_MM, Math.floor((h - 28) / 2)), gap: 12 };
}
/** A bike plate's two lines: split at the space, or after the first four characters (as drawn). */
export function bikeSplitLines(reg: string): string[] {
  const r = reg.trim().toUpperCase();
  const i = r.indexOf(" ");
  if (i > 0) return [r.slice(0, i), r.slice(i + 1)];
  return r.length > 4 ? [r.slice(0, 4), r.slice(4)] : [r];
}

/**
 * Whether the reg goes on this plate at its full size, never squeezed, worked out from the measured
 * character widths of the font each style uses, the gaps (the customer's own spacing on show plates),
 * the ends (set in further on a hex), a badge panel, and the character height the style is made at.
 *
 * Road-legal plates keep their own rule: the legal layout on one-line plates (79mm characters, legal
 * gaps and ends). Show plates are checked on every size, as the plate is actually drawn: one line on a
 * car plate, and on a bike the two lines at 64mm.
 */
function fitsFullSize(s: SizeOption, reg: string, o: { v: Vehicle | null; legal: Legal | null; styles: (string | null | undefined)[]; gaps?: number[] | null; badge: boolean }) {
  if (!regLength(reg)) return true;
  const show = o.legal === "Show";
  const metro = o.styles.includes("Metro Print");
  const bike = o.v === "Bike";
  // Two-line plates (bikes, Square, 4x4, imports): four characters on top, three underneath, each
  // line inside 11mm ends and both lines inside the height
  const two = !oneLine(s) ? twoLineLayout(s.w, s.h, bike) : null;
  if (two && (show || !bike)) {
    const lines = bikeSplitLines(reg);
    const k = two.charH / LEGAL_MM.charH;
    const fitsAcross = lines.every((l) => 2 * LEGAL_MM.margin + (legalLength(l) - 2 * LEGAL_MM.margin) * k <= s.w);
    const tall = lines.length * two.charH + (lines.length - 1) * two.gap;
    return fitsAcross && tall <= s.h - 8;
  }
  if (!show && !oneLine(s)) return true;
  const ends = 2 * legalEndInset(s.hex);
  const full = metro ? metroLength(reg, s.hex, o.gaps) : legalLength(reg, s.hex, o.gaps);
  // the smaller 64mm characters take proportionally less room (the ends stay the same)
  const small = !metro && o.styles.some((n) => !!n && !!STYLES[n] && smallChars(STYLES[n].look, n));
  const need = small ? ends + (full - ends) * (BIKE_CHAR_MM / LEGAL_MM.charH) : full;
  const room = s.w - (o.badge && !bike ? BADGE_MM : 0);
  return need <= room;
}

/** Metro's measured widths (mm, at 60mm high): characters, the narrow I and 1, the gaps, and the ends. */
const METRO_MM = { charW: 56.7, narrowI: 12.9, narrow1: 21.5, gap: 6.2, groupGap: 27.6 } as const;
function metroLength(reg: string, hex = false, gaps?: number[] | null): number {
  const groups = reg.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const chars = groups.join("");
  const glyphs = [...chars].reduce((a, ch) => a + (ch === "I" ? METRO_MM.narrowI : ch === "1" ? METRO_MM.narrow1 : METRO_MM.charW), 0);
  const ends = 2 * (hex ? (hexInset ||= hexEndInset()) : LEGAL_MM.margin);
  if (gaps) return Math.ceil(ends + glyphs + gaps.reduce((a, g) => a + METRO_MM.gap + g * (METRO_MM.groupGap - METRO_MM.gap), 0));
  return Math.ceil(ends + glyphs + METRO_MM.gap * (chars.length - groups.length) + METRO_MM.groupGap * (groups.length - 1));
}

/** Whether a size is long enough for this reg on a road-legal plate (two-line sizes aren't checked). */
export const legalFor = (s: SizeOption, reg: string) => !oneLine(s) || s.w >= legalLength(reg, s.hex);
/** The shortest of the given sizes that's long enough for the reg, per tab. */
export const shortestLegalOf = (list: SizeOption[], reg: string) =>
  list.filter((s) => oneLine(s) && legalFor(s, reg)).sort((x, y) => x.w - y.w)[0] ?? null;

export const sizeFits = (key: string | null, v: Vehicle | null, legal: Legal | null, reg: string, styles: (string | null | undefined)[] = [], gaps?: number[] | null, extras: string[] = []) => {
  if (!key) return false;
  const custom = customSize(key);
  if (custom) return offersCustom(v, legal) && fitsFullSize(custom, reg, { v, legal, styles, gaps, badge: hasBadge(extras) });
  return sizesFor(v, legal, reg, styles, gaps, extras).some((s) => s.key === key);
};

/**
 * The lengths a custom plate can be for this reg, style(s), spacing and badge: from the shortest it fits
 * at full size up to the longest made. Null when it doesn't fit even the longest.
 */
export function customRange(v: Vehicle | null, legal: Legal | null, reg: string, hex: boolean, styles: (string | null | undefined)[] = [], gaps?: number[] | null, extras: string[] = []): { min: number; max: number } | null {
  if (!offersCustom(v, legal)) return null;
  for (let w = CUSTOM_LEN.min; w <= CUSTOM_LEN.max; w++) {
    if (fitsFullSize({ key: "", label: "", group: "Custom", w, h: 111, hex }, reg, { v, legal, styles, gaps, badge: hasBadge(extras) })) return { min: w, max: CUSTOM_LEN.max };
  }
  return null;
}

/**
 * Whether this finished plate design can be made as chosen: each plate's size takes the reg at full
 * size with its style, spacing and badge. Checked in the builder and again on the server at checkout.
 */
export function buildFits(c: BuildConfig, reg: string): boolean {
  const gaps = plateGaps(c, reg);
  const same = !c.rearSize || c.rearSize === c.size;
  const extras = Array.isArray(c.extras) ? c.extras : [];
  const front = sizeFits(c.size, c.vehicle, c.legal, reg, [c.style, same ? c.rearStyle : null], gaps, extras);
  const rear = !c.rearSize || sizeFits(c.rearSize, c.vehicle, c.legal, reg, [c.rearStyle ?? c.style], gaps, extras);
  // no printed border on a hex plate
  const border = hasHexSize(c) && extras.some((x) => EXTRAS.find((e) => e.name === x)?.look === "border");
  return front && rear && !border;
}

/* ------------------------------------------------------------------ */
/* Extras and fitting                                                  */
/* ------------------------------------------------------------------ */
export type ExtraOption = Price & { name: string; look: ExtraLook };
export type ExtraLook = "tint" | "fade" | "border" | "flag" | "ev" | "uk" | "ev-uk" | "badge" | "surround" | "text";

/**
 * REG KING's extras, priced per plate (a set is two plates).
 * Road legal and show: printed border and the three badges. Show plates also get tints and custom bottom text.
 */
export const EXTRAS: ExtraOption[] = [
  { name: "Printed Border", set: 10, single: 5, look: "border" },
  { name: "UK Badge", set: 10, single: 5, look: "uk" },
  { name: "EV Badge", set: 10, single: 5, look: "ev" },
  { name: "UK EV Badge", set: 10, single: 5, look: "ev-uk" },
  { name: "Tinted", set: 10, single: 5, look: "tint" },
  { name: "Faded Tint", set: 15, single: 8, look: "fade" },
  { name: "Custom Text", set: 10, single: 5, look: "text" },
];
/** An extra as it reads on the order: custom text with its words, a faded tint with its direction. */
export function extraLabel(e: ExtraOption, c: Pick<BuildConfig, "bottomText" | "fadeFrom" | "bottomFont" | "bottomSize">): string {
  if (e.look === "text" && c.bottomText?.trim()) return `Custom Text: "${c.bottomText.trim()}" in ${bottomFont(c.bottomFont).label}, ${c.bottomSize ?? DEFAULT_BOTTOM_SIZE}mm`;
  if (e.look === "fade") return `${e.name} (darker at the ${c.fadeFrom === "bottom" ? "bottom" : "top"})`;
  return e.name;
}
/** Only one from each group can go on a plate: one badge, one tint. */
export const EXTRA_GROUPS: ExtraLook[][] = [
  ["uk", "ev", "ev-uk"],
  ["tint", "fade"],
];
/** Longest custom text at the bottom of a show plate. */
export const BOTTOM_TEXT_MAX = 30;

export const FITTING: Price = { set: 15, single: 10 };

/** Looks that break the road-legal rules (tints, fades, non-approved badges): show plates only. */
const SHOW_ONLY_LOOKS: ExtraLook[] = ["tint", "fade", "text"];

/** Hex plates don't take a printed border (REG KING, 13 Nov 2026). */
export const hasHexSize = (c: Pick<BuildConfig, "size" | "rearSize">) => isHex(c.size) || isHex(c.rearSize);
export const extrasFor = (_v: Vehicle | null, legal: Legal | null = null, hex = false) =>
  EXTRAS.filter((e) => !(legal === "Legal" && SHOW_ONLY_LOOKS.includes(e.look)) && !(hex && e.look === "border"));
/** Drop the printed border once a hex size is chosen on either plate. */
export const withoutHexBorder = <T extends Pick<BuildConfig, "size" | "rearSize" | "extras">>(c: T): T =>
  hasHexSize(c) ? { ...c, extras: c.extras.filter((x) => EXTRAS.find((e) => e.name === x)?.look !== "border") } : c;

/** Turn an extra on or off; turning one on drops any other from its group (one badge, one tint). */
export function toggleExtra(extras: string[], name: string): string[] {
  if (extras.includes(name)) return extras.filter((e) => e !== name);
  const look = EXTRAS.find((e) => e.name === name)?.look;
  const group = EXTRA_GROUPS.find((g) => look && g.includes(look)) ?? [];
  return [...extras.filter((x) => !group.includes(EXTRAS.find((e) => e.name === x)?.look as ExtraLook)), name];
}

/* ------------------------------------------------------------------ */
/* The configuration                                                   */
/* ------------------------------------------------------------------ */
export type Legal = "Legal" | "Show";
export type Qty = "Set" | "Single";
export type Side = "Front" | "Rear";
/** For a set: are the front and rear plates the same? */
export type Match = "Same" | "Different";
export type Delivery = "Deliver" | "Collect" | "CollectFit";
/** How the customer fits the plates themselves (free, so it still comes in the box if we fit them). */
export type Kit = "Pads" | "Screws" | "None";
/** Road legal only: the documents the law says we must see. Prototype keeps the file names only. */
export type LegalDocs = { identity: string | null; entitlement: string | null; later: boolean };

/** Fitting kits: usually KIT_WAS, free with every order (confirm with REG KING before launch). */
export const KIT_WAS = 2.99;
export const KITS: { key: Kit; name: string; line: string; recommended?: boolean }[] = [
  { key: "Pads", name: "Sticky pad kit", line: "Strong double-sided pads. No drilling.", recommended: true },
  { key: "Screws", name: "Screw kit", line: "Screws with caps in black, white and yellow." },
  { key: "None", name: "No kit needed", line: "You already have a way to fit them." },
];

/**
 * Cut out (show plates on two lines): the plate follows the letters. The empty squares beside the shorter
 * line are removed, leaving a stepped shape, 10mm clear all round the letters. Points in mm, y down from
 * the top left of the plate. null when the plate isn't two lines or both lines are the same length.
 */
export function cutOutPoints(reg: string, w: number, h: number, bike: boolean, small = false): [number, number][] | null {
  const two = twoLineLayout(w, h, bike);
  const lines = bikeSplitLines(reg);
  if (!two || lines.length < 2) return null;
  const charH = Math.min(two.charH, small ? 64 : 79);
  const k = charH / LEGAL_MM.charH;
  const width = (l: string) => k * ([...l].reduce((a, ch) => a + (ch === "1" || ch === "I" ? LEGAL_MM.narrowW : LEGAL_MM.charW), 0) + LEGAL_MM.gap * (l.length - 1));
  const M = 10;
  const half = [width(lines[0]) / 2 + M, width(lines[1]) / 2 + M].map((x) => Math.min(w / 2, x));
  if (Math.abs(half[0] - half[1]) < 1) return null;
  const mid = (h - (2 * charH + two.gap)) / 2 + charH + two.gap / 2;
  const c = w / 2;
  const corners: [number, number][] = [
    [c - half[0], 0], [c + half[0], 0], [c + half[0], mid], [c + half[1], mid],
    [c + half[1], h], [c - half[1], h], [c - half[1], mid], [c - half[0], mid],
  ];
  return roundCorners(corners, 8);
}

/** Rounds every corner of a closed polygon (radius r mm, less where the sides are short). */
function roundCorners(pts: [number, number][], r: number): [number, number][] {
  const out: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const d = Math.min(r, la / 2, lb / 2);
    const s0: [number, number] = [p[0] + ((a[0] - p[0]) / la) * d, p[1] + ((a[1] - p[1]) / la) * d];
    const e0: [number, number] = [p[0] + ((b[0] - p[0]) / lb) * d, p[1] + ((b[1] - p[1]) / lb) * d];
    for (let t = 0; t <= 8; t++) {
      const u = t / 8, v = 1 - u;
      out.push([v * v * s0[0] + 2 * v * u * p[0] + u * u * e0[0], v * v * s0[1] + 2 * v * u * p[1] + u * u * e0[1]]);
    }
  }
  return out;
}

export interface BuildConfig {
  /** Show plates on two lines: the plate is cut to follow the letters (see cutOutPoints). */
  cutOut?: boolean;
  vehicle: Vehicle | null;
  legal: Legal | null;
  qty: Qty | null;
  side: Side | null;
  match: Match | null;
  /** The style and size for the front plate (or both, when they match). */
  style: string | null;
  size: string | null;
  /** Only used when a set's front and rear are different. */
  rearStyle: string | null;
  rearSize: string | null;
  /** Hex plates: true for the upside-down hex (narrow edge at the top). Applies to every hex plate in the order. */
  hexFlip?: boolean;
  extras: string[];
  /** Plates bought with a registration on its plate page: REG KING already has the documents, so no ID step. */
  withPlate?: boolean;
  /** Custom Text extra (show plates): the words along the bottom of the plate. */
  bottomText?: string;
  /** Custom Text: font (see lib/bottomText) and capital height in mm. */
  bottomFont?: string;
  bottomSize?: number;
  /** Faded Tint extra: which edge the tint is darkest at, fading away across the plate. Default "top". */
  fadeFrom?: "top" | "bottom";
  /**
   * Show plates only: custom gaps between the characters, one per pair (the reg's spaces don't count),
   * in spaces: 0 = together, 1 = a normal space. Road-legal plates always keep the standard spacing.
   */
  spacing?: number[] | null;
  /** Plate surrounds offered with the extras ("Complete your look"). */
  surround: SurroundChoice;
  extrasDone: boolean;
  /** How the plates reach the customer. Fitting is only offered on collection. */
  delivery: Delivery | null;
  kit: Kit | null;
  docs: LegalDocs;
  docsDone: boolean;
}

/** Starts on Car, the most common choice; the vehicle menu changes it. */
export const emptyBuild = (): BuildConfig => ({
  vehicle: "Car",
  legal: null,
  qty: null,
  side: null,
  match: null,
  style: null,
  size: null,
  rearStyle: null,
  rearSize: null,
  extras: [],
  surround: null,
  extrasDone: false,
  delivery: null,
  kit: null,
  docs: { identity: null, entitlement: null, later: false },
  docsDone: false,
});

/** A set whose front and rear plates are chosen separately. */
/**
 * A set (front and rear) always shares one style, but each plate can be a different size.
 * (The old "different front and rear designs" option is gone: kept as a no-op for saved baskets.)
 */
export const isSplit = (_c: BuildConfig) => false;
/** A set picks a size for the front and the rear separately. */
export const twoSizes = (c: BuildConfig) => !rearOnly(c.vehicle) && c.qty === "Set";

/** The style / size on one side of the car. */
export const styleOf = (c: BuildConfig, _side: "front" | "rear") => c.style;
export const sizeOf = (c: BuildConfig, side: "front" | "rear") => (side === "rear" && twoSizes(c) ? c.rearSize : c.size);

/** Drop any choice the new vehicle / plate type doesn't offer. */
function tidy(c: BuildConfig): BuildConfig {
  const next = { ...c };
  const styles = stylesFor(next.vehicle, next.legal).map((s) => s.name);
  const sizes = allSizesFor(next.vehicle, next.legal).map((s) => s.key);
  if (next.style && !styles.includes(next.style)) next.style = null;
  if (next.rearStyle && !styles.includes(next.rearStyle)) next.rearStyle = null;
  const keep = (k: string) => sizes.includes(k) || (!!customSize(k) && offersCustom(next.vehicle, next.legal));
  if (next.size && !keep(next.size)) next.size = null;
  if (next.rearSize && !keep(next.rearSize)) next.rearSize = null;
  next.extras = next.extras.filter((x) => extrasFor(next.vehicle, next.legal).some((e) => e.name === x));
  return next;
}

export function withVehicle(c: BuildConfig, v: Vehicle): BuildConfig {
  const next: BuildConfig = { ...c, vehicle: v };
  if (rearOnly(v)) {
    next.qty = "Single";
    next.side = "Rear";
    next.match = null;
    next.rearStyle = null;
    next.rearSize = null;
  } else if (rearOnly(c.vehicle)) {
    next.qty = null;
    next.side = null;
  }
  return tidy(next);
}

/** Road legal or show changes which styles, sizes and extras are allowed. */
export function withLegal(c: BuildConfig, legal: Legal): BuildConfig {
  return tidy(legal === "Show" ? { ...c, legal, docs: { identity: null, entitlement: null, later: false }, docsDone: false } : { ...c, legal, spacing: null });
}

export function withDelivery(c: BuildConfig, delivery: Delivery): BuildConfig {
  return { ...c, delivery };
}

export function withQty(c: BuildConfig, qty: Qty): BuildConfig {
  return qty === "Set" ? { ...c, qty, side: null, match: null, rearStyle: null } : { ...c, qty, match: null, rearStyle: null, rearSize: null };
}

export function withMatch(c: BuildConfig, match: Match): BuildConfig {
  return match === "Same" ? { ...c, match, rearStyle: null, rearSize: null } : { ...c, match };
}

export const LEGAL_NOTE: Record<Legal, string> = {
  Legal: "Road legal plates: documents required",
  Show: "Show plate: not road legal",
};

/** By law, road-legal plates need proof of entitlement and ID; online, these are uploaded with the order. */
export const LEGAL_DOCS = "We'll need your ID and proof you own the reg before we make them.";

/**
 * Road-legal rules, from GOV.UK "Displaying number plates" (checked Oct 2026).
 * Have the team confirm wording before launch.
 */
export const LEGAL_RULES = [
  "Made to British Standard BS AU 145e, with the standard and our supplier mark on the plate",
  "Reflective plate: black characters on white at the front, yellow at the rear",
  "The standard UK plate font and spacing (no italics or custom fonts)",
  "Characters in a single shade of black. Raised 3D and 4D letters are allowed",
  "No patterned, tinted or shaded backgrounds",
  "Optional: Union, England, Scotland or Wales flag with UK, GB, ENG, SCO, CYM or Wales letters, or a green flash on zero-emission vehicles",
];

export const LEGAL_DOCS_LIST = {
  identity: "Photo ID with your name and address, such as a driving licence (or a passport plus a recent utility bill or bank statement)",
  entitlement: "Proof the reg is yours: V5C logbook, the green new keeper slip, V750 certificate of entitlement or V778 retention document",
};

export const SHOW_WARNING =
  "Show signs are for display only. Fitting one to a vehicle on the road is illegal: you could be fined up to £1,000 and the vehicle will fail its MOT.";

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */
export type StepKey = "vehicle" | "legal" | "qty" | "side" | "match" | "style" | "size" | "rearStyle" | "rearSize" | "extras" | "delivery" | "kit" | "docs";

export const STEP_TITLES: Record<StepKey, string> = {
  vehicle: "Vehicle type",
  legal: "Legal or show",
  qty: "Set or single",
  side: "Front or rear",
  match: "Front and rear",
  style: "Style",
  size: "Size",
  rearStyle: "Rear plate style",
  rearSize: "Rear plate size",
  extras: "Extras",
  delivery: "Delivery",
  kit: "Fitting kit",
  docs: "Your documents",
};

/** Step titles, naming the plate when a set's front and rear are chosen separately. */
export const stepTitle = (k: StepKey, c: BuildConfig) =>
  twoSizes(c) && k === "size" ? "Front plate size" : twoSizes(c) && k === "rearSize" ? "Rear plate size" : k === "style" && twoSizes(c) ? "Style (both plates)" : STEP_TITLES[k];

/** The vehicle is chosen from the menu at the top, so the list below starts at road legal or show. */
export const stepsFor = (c: BuildConfig): StepKey[] => {
  const single = rearOnly(c.vehicle);
  return [
    "legal",
    ...(single ? [] : (["qty"] as StepKey[])),
    ...(!single && c.qty === "Single" ? (["side"] as StepKey[]) : []),
    "style",
    "size",
    ...(twoSizes(c) ? (["rearSize"] as StepKey[]) : []),
    "extras",
    "kit",
    // Documents near the end, so customers see the whole order (and price) before being asked for ID.
    ...(c.legal === "Legal" && !c.withPlate ? (["docs"] as StepKey[]) : []),
    // Bought with a registration: delivery is agreed with the registration order, not here.
    ...(c.withPlate ? [] : (["delivery"] as StepKey[])),
  ];
};

export const isAnswered = (k: StepKey, c: BuildConfig) => {
  switch (k) {
    case "vehicle":
      return !!c.vehicle;
    case "legal":
      return !!c.legal;
    case "qty":
      return !!c.qty;
    case "side":
      return !!c.side;
    case "match":
      return !!c.match;
    case "style":
      return !!c.style;
    case "size":
      return !!c.size;
    case "rearStyle":
      return !!c.rearStyle;
    case "rearSize":
      return !!c.rearSize;
    case "extras":
      return c.extrasDone;
    case "delivery":
      return c.delivery !== null;
    case "kit":
      return c.kit !== null;
    case "docs":
      return c.docsDone;
  }
};

/** The first step still waiting for an answer (null when everything is chosen). */
export const currentStep = (c: BuildConfig): StepKey | null => stepsFor(c).find((k) => !isAnswered(k, c)) ?? null;

/** What a finished step shows when folded away. */
export function answerText(k: StepKey, c: BuildConfig): string {
  switch (k) {
    case "vehicle":
      return vehicleLabel(c.vehicle);
    case "legal":
      return c.legal === "Legal" ? "Road legal plate" : "Show sign";
    case "qty":
      return c.qty === "Set" ? "Set (front & rear)" : "Single plate";
    case "side":
      return c.side === "Front" ? "Front (white)" : "Rear (yellow)";
    case "match":
      return c.match === "Same" ? "Both the same" : "Different front and rear";
    case "style":
      return c.style ?? "";
    case "size":
      return sizeText(c, c.size);
    case "rearStyle":
      return c.rearStyle ?? "";
    case "rearSize":
      return sizeText(c, c.rearSize);
    case "extras": {
      const sur = c.surround?.kind === "standard" ? "standard surrounds" : c.surround?.kind === "custom" ? "personalised surrounds" : null;
      return [...c.extras, sur].filter(Boolean).join(", ") || "None";
    }
    case "delivery":
      return c.delivery === "Deliver" ? "Delivered to you" : c.delivery === "Collect" ? "Collect in Bilston" : "Collect & fit in Bilston";
    case "kit":
      return c.kit === "None" ? "No kit" : `${KITS.find((x) => x.key === c.kit)?.name ?? ""} (free)`;
    case "docs":
      return docsReady(c) ? "ID and proof uploaded" : "Upload later from your account";
  }
}

export const isComplete = (c: BuildConfig) => currentStep(c) === null;
export const docsReady = (c: BuildConfig) => !!c.docs.identity && !!c.docs.entitlement;

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */
/** `was` shows a struck-through usual price (a free kit, say). */
export type Line = { label: string; amount: number | null; was?: number };

/** Rear-only vehicles take one plate: use the single price, or the listed price if that's all there is. */
export const priceOf = (p: Price, c: BuildConfig) =>
  rearOnly(c.vehicle) ? p.single ?? p.set : c.qty === "Single" ? p.single : p.set;

/**
 * How the builder prices things. "retail" is the Make section. "trade" is plates bought with a
 * registration on a plate page: REG KING's trade prices, and on REG KING's own stock a set in one of
 * the `included` styles comes free (as their listings say: Standard, 3D Gel or 4D).
 */
export type Pricing = { mode: "retail" } | { mode: "trade"; included?: string[]; offRetail?: number };
/**
 * REG KING's own registrations: a set in an included style is free, and any other style, extra or
 * size charge is the retail price less this share (REG KING, 2 Nov 2026).
 */
export const OWN_STOCK_DISCOUNT = 0.3;
/** Plate styles included free (as a set) with a REG KING-owned registration. */
export const OUR_INCLUDED = ["Printed", "3D Gel", "4D 3MM"];
const penceOf = (n: number) => Math.round(n * 100) / 100;
const lessShare = (p: Price, d: number): Price => ({ set: p.set === null ? null : penceOf(p.set * (1 - d)), single: p.single === null ? null : penceOf(p.single * (1 - d)) });
export const RETAIL: Pricing = { mode: "retail" };

/**
 * CONFIRM: REG KING's trade prices for plates bought with a registration, per style and extra.
 * Anything missing here shows "Trade price" and is confirmed on the order call; never guessed.
 */
const tp = (set: number, single: number): Price => ({ set, single });
export const TRADE_STYLES: Record<string, Price> = {
  Printed: tp(15, 10),
  "Metal Press": tp(40, 25),
  "3D Gel": tp(30, 15),
  "4D 3MM": tp(30, 15),
  "4D 6MM": tp(45, 25),
  "4D Gel 3MM": tp(50, 30),
  Retro: tp(50, 30),
  Vintage: tp(50, 30),
  "Retro X": tp(60, 35),
  "Vintage X": tp(60, 35),
  "Bike Print": tp(20, 10),
  "Metro Print": tp(20, 10),
  "Bike Gel": tp(30, 20),
  "4D 3MM Bike": tp(30, 20),
  "4D Bike Gel": tp(50, 35),
  Onyx: tp(50, 30),
  Shadow: tp(50, 30),
  "Metal Press Black & White": tp(50, 30),
  "Metal Press Black & Silver": tp(50, 30),
};
export const TRADE_EXTRAS: Record<string, Price> = {
  "Printed Border": tp(6, 3),
  "UK Badge": tp(6, 3),
  "EV Badge": tp(6, 3),
  "UK EV Badge": tp(6, 3),
  Tinted: tp(6, 3),
  "Faded Tint": tp(10, 5),
  "Custom Text": tp(5, 3),
};

/**
 * Size charges on top of the style price, per plate (a set is two plates). Standard 520mm and the
 * 9 x 7 bike plate are included. The 8 x 6 and 5 x 7 bike show sizes count as other sizes (confirmed 2 Nov 2026).
 */
export type SizeCharge = "Shortened" | "Hex" | "Other size";
export const SIZE_CHARGES: Record<SizeCharge, { retail: Price; trade: Price }> = {
  Shortened: { retail: { set: 10, single: 5 }, trade: tp(6, 4) },
  Hex: { retail: { set: 10, single: 5 }, trade: tp(6, 4) },
  "Other size": { retail: { set: 20, single: 10 }, trade: tp(15, 8) },
};
export function sizeCharge(key: string | null): SizeCharge | null {
  const s = sizeInfo(key);
  if (!s || s.key === "Normal" || s.key === "9x7") return null;
  if (s.group === "Hex") return "Hex";
  if (s.group === "Standard") return "Shortened";
  // CONFIRM: a custom length is charged as another size
  return "Other size";
}
/** What a size adds, per plate, under this pricing (null when it's included). */
export function sizeChargePrice(key: string | null, pricing: Pricing = RETAIL): Price | null {
  const k = sizeCharge(key);
  if (!k) return null;
  if (pricing.mode === "retail") return SIZE_CHARGES[k].retail;
  return pricing.offRetail ? lessShare(SIZE_CHARGES[k].retail, pricing.offRetail) : SIZE_CHARGES[k].trade;
}

const NO_PRICE: Price = { set: null, single: null };
/** A style's price under this pricing (0 when it's an included style on REG KING's own stock). */
export function stylePrice(name: string, pricing: Pricing = RETAIL): Price {
  if (pricing.mode === "retail") return STYLES[name] ?? NO_PRICE;
  if (pricing.included?.includes(name)) return { set: 0, single: 0 };
  if (pricing.offRetail) return lessShare(STYLES[name] ?? NO_PRICE, pricing.offRetail);
  return TRADE_STYLES[name] ?? NO_PRICE;
}
/** An extra's price under this pricing. */
export function extraPrice(e: ExtraOption, pricing: Pricing = RETAIL): Price {
  if (pricing.mode === "retail") return e;
  if (pricing.offRetail) return lessShare(e, pricing.offRetail);
  return TRADE_EXTRAS[e.name] ?? NO_PRICE;
}

export function priceLines(c: BuildConfig, pricing: Pricing = RETAIL): Line[] {
  const lines: Line[] = [];
  const show = c.legal === "Show";
  if (isSplit(c)) {
    // Different front and rear: each plate is priced as a single of its own style.
    const front = c.style ? STYLES[c.style] : null;
    const rear = c.rearStyle ? STYLES[c.rearStyle] : null;
    if (front) lines.push({ label: `${front.name} front ${show ? "show sign" : "plate"}`, amount: stylePrice(front.name, pricing).single });
    if (rear) lines.push({ label: `${rear.name} rear ${show ? "show sign" : "plate"}`, amount: stylePrice(rear.name, pricing).single });
  } else {
    const s = c.style ? STYLES[c.style] : null;
    if (s && c.qty) {
      const what = show
        ? rearOnly(c.vehicle) || c.qty !== "Set"
          ? "show sign"
          : "show signs (pair)"
        : c.vehicle === "Bike"
          ? "bike plate"
          : c.qty === "Set"
            ? "set (pair)"
            : "single";
      lines.push({ label: `${s.name} ${what}`, amount: priceOf(stylePrice(s.name, pricing), c) });
    }
  }
  // Size charges: one line for the pair when both plates share a priced size type, else one per plate.
  if (c.qty || rearOnly(c.vehicle)) {
    const pair = twoSizes(c);
    const keys = pair ? [c.size, c.rearSize] : [c.size];
    const kinds = keys.map(sizeCharge);
    if (pair && kinds[0] && kinds[0] === kinds[1]) {
      lines.push({ label: `${kinds[0]} size (pair)`, amount: sizeChargePrice(keys[0], pricing)!.set });
    } else {
      keys.forEach((key, i) => {
        const p = sizeChargePrice(key, pricing);
        if (p) lines.push({ label: `${sizeCharge(key)} size${pair ? (i ? " (rear)" : " (front)") : ""}`, amount: p.single });
      });
    }
  }
  for (const x of c.extras) {
    const e = EXTRAS.find((e) => e.name === x);
    if (e) lines.push({ label: extraLabel(e, c), amount: priceOf(extraPrice(e, pricing), c) });
  }
  const pair = !rearOnly(c.vehicle) && c.qty === "Set" ? 2 : 1;
  if (c.surround?.kind === "standard") {
    const p = ACCESSORY_PRICES.standardSurround;
    lines.push({ label: `Standard black surround${pair > 1 ? "s × 2" : ""}`, amount: p === null ? null : p * pair });
  } else if (c.surround?.kind === "custom") {
    const p = ACCESSORY_PRICES.customSurround;
    lines.push({ label: `Personalised ${c.surround.cfg.style} surround${pair > 1 ? "s × 2" : ""}`, amount: p === null ? null : p * pair });
  }
  if (c.kit === "Pads" || c.kit === "Screws") lines.push({ label: KITS.find((x) => x.key === c.kit)!.name, amount: 0, was: KIT_WAS });
  if (c.delivery === "CollectFit") lines.push({ label: "Fitting on collection", amount: priceOf(FITTING, c) });
  return lines;
}

export function total(lines: Line[]) {
  const known = lines.filter((l) => l.amount !== null).reduce((a, l) => a + (l.amount as number), 0);
  const onRequest = lines.some((l) => l.amount === null);
  return { known, onRequest };
}

/* ------------------------------------------------------------------ */
/* Preview helpers                                                     */
/* ------------------------------------------------------------------ */
/** The lettering a style is made in: Metro Print uses the Metro show font, everything else the plate font. */
export const fontOf = (style: string | null): "metro" | null => (style === "Metro Print" ? "metro" : null);
export const lookOf = (style: string | null): PlateLook => (style && STYLES[style]?.look) || "printed";
/**
 * Road legal plates carry the supplying outlet's name and postcode (bottom centre) and the British
 * Standard number (bottom right), permanently and legibly (DVLA INF104). REG KING prints them at
 * the smallest legal size, 3mm tall (the bottom-line markings must be 3mm to 10mm), with the company
 * name in bold and slightly bigger (3.5mm), the postcode in a lighter weight.
 * CONFIRM: BS AU 145e also asks for the name or trademark of the plate's component manufacturer next
 * to the standard number, if that isn't SHOW PLATES LTD.
 */
export const SUPPLIER_NAME = "SHOW PLATES LTD";
export const SUPPLIER_POSTCODE = "WV14 6NW";
export const BS_MARK = "BS AU 145e";
/** Height of the legal markings' capital letters, in mm: the postcode and BS AU 145e at the legal minimum. */
export const LEGAL_MARK_MM = 3;
/** The company name, slightly bigger than the postcode. */
export const LEGAL_NAME_MM = 3.5;

export const isHex = (size: string | null) => /hex/i.test(size ?? "");

/**
 * REG KING's hex outline, measured pixel by pixel from a photo of the plates on the HQ wall, as fractions of the plate's height:
 * the top corners are trimmed back a little, the sides come out to a point a quarter of the way down,
 * then run back in to a narrower bottom edge.
 */
export const HEX = { top: 0.155, point: 0.31, bottom: 0.225 };
/** The hex outline as points, for a plate of width w and height h at (x, y). */
export const hexPoints = (x: number, y: number, w: number, h: number, flip = false): [number, number][] => {
  const pts: [number, number][] = [
    [x + h * HEX.top, y],
    [x + w - h * HEX.top, y],
    [x + w, y + h * HEX.point],
    [x + w - h * HEX.bottom, y + h],
    [x + h * HEX.bottom, y + h],
    [x, y + h * HEX.point],
  ];
  // Upside-down hex: the same outline turned over top to bottom.
  return flip ? pts.map(([px, py]) => [px, y + h - (py - y)]) : pts;
};
/** A size's name, saying "upside down" for a flipped hex. */
export const sizeText = (c: Pick<BuildConfig, "hexFlip">, key: string | null) => sizeLabel(key) + (c.hexFlip && isHex(key) ? " (upside down)" : "");

/** Relative plate width for the preview (a standard UK plate is 520mm ≈ 20.5"). */
export const sizeScale = (size: string | null) => {
  const fixed: Record<string, number> = { "Hex Medium": 0.85, "Hex Small": 0.72, "Hex XS": 0.6, Square: 0.56, "4x4": 0.56 };
  if (size && fixed[size]) return fixed[size];
  const custom = customSize(size);
  if (custom) return Math.max(0.42, Math.min(1, custom.w / 520));
  const m = (size ?? "").match(/(\d+)"/);
  if (m) return Math.max(0.42, Math.min(1, Number(m[1]) / 20.5));
  return 1;
};

/** One-line summary, as the workshop tool writes it. */
export function summary(c: BuildConfig) {
  return [
    vehicleLabel(c.vehicle) || null,
    isSplit(c) ? (c.style && c.rearStyle ? `${c.style} front, ${c.rearStyle} rear` : c.style) : c.style,
    rearOnly(c.vehicle) ? "Rear plate" : c.qty === "Single" && c.side ? `Single (${c.side.toLowerCase()})` : c.qty === "Set" ? "Set (pair)" : null,
    c.legal === "Legal" ? "Road legal" : c.legal === "Show" ? "Show sign" : null,
    twoSizes(c) && c.size && c.rearSize && c.size !== c.rearSize
      ? `${sizeText(c, c.size)} front, ${sizeText(c, c.rearSize)} rear`
      : c.size && c.size !== "Normal"
        ? sizeText(c, c.size)
        : null,
    c.extras.length ? "+ " + c.extras.map((x) => { const e = EXTRAS.find((y) => y.name === x); return e ? extraLabel(e, c) : x; }).join(", ") : null,
    c.surround?.kind === "standard" ? "+ standard surrounds" : c.surround?.kind === "custom" ? `+ ${surroundSummary(c.surround.cfg).replace(/^./, (x) => x.toLowerCase())}` : null,
    c.delivery === "Deliver" ? "delivery" : c.delivery === "Collect" ? "collect" : c.delivery === "CollectFit" ? "collect & fit" : null,
    c.kit === "Pads" ? "sticky pad kit" : c.kit === "Screws" ? "screw kit" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
