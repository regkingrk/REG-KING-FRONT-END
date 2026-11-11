/**
 * New this week: plates added to the REG KING Shopify store in the last 7 days.
 * PROTOTYPE SNAPSHOT taken from Shopify on 24 Oct 2026 (products, status active, newest first).
 * At launch this comes live from Shopify: products sorted by CREATED_AT, created in the last 7 days.
 * Left out until fixed in Shopify: UR15 BRO (description says UR15 RBO) and IIL 801 (handle ill-801).
 */
import { shop } from "./shopData";

export const NEW_SNAPSHOT_DATE = shop ? shop.date : "2026-10-24";

export type NewPlate = { reg: string; handle: string; price: number; added: string };

const savedNewThisWeek: NewPlate[] = [
  { reg: "JS60 BED", handle: "js60-bed", price: 950, added: "2026-10-23" },
  { reg: "KU55 MEG", handle: "ku55-meg", price: 3750, added: "2026-10-23" },
  { reg: "188 YHR", handle: "188-yhr", price: 3000, added: "2026-10-23" },
  { reg: "OMA 22R", handle: "oma-22r", price: 15000, added: "2026-10-23" },
  { reg: "B26 YXN", handle: "b26-yxn", price: 1500, added: "2026-10-23" },
  { reg: "T5 LYB", handle: "t5-lyb", price: 475, added: "2026-10-23" },
  { reg: "X6 AHA", handle: "x6-aha", price: 800, added: "2026-10-23" },
  { reg: "S5 YEB", handle: "s5-yeb", price: 495, added: "2026-10-23" },
  { reg: "H6 XTE", handle: "h6-xte", price: 900, added: "2026-10-23" },
  { reg: "OL11 VXA", handle: "ol11-vxa", price: 3999.99, added: "2026-10-22" },
  { reg: "X5 YHB", handle: "x5-yhb", price: 1000, added: "2026-10-21" },
  { reg: "TT10 SNW", handle: "tt10-snw", price: 999, added: "2026-10-21" },
  { reg: "YE53 MRE", handle: "ye53-mre", price: 1200, added: "2026-10-21" },
  { reg: "JA55 BES", handle: "ja55-bes", price: 7000, added: "2026-10-21" },
  { reg: "JA55 HEY", handle: "ja55-hey", price: 8000, added: "2026-10-21" },
  { reg: "SA12 ANS", handle: "sa12-ans", price: 10000, added: "2026-10-21" },
  { reg: "CA12 ANS", handle: "ca12-ans", price: 10000, added: "2026-10-21" },
  { reg: "DA12 SEN", handle: "da12-sen", price: 9000, added: "2026-10-21" },
  { reg: "NA12 ASH", handle: "na12-ash", price: 9000, added: "2026-10-21" },
  { reg: "HA12 ASH", handle: "ha12-ash", price: 7000, added: "2026-10-21" },
  { reg: "HA12 JAT", handle: "ha12-jat", price: 9000, added: "2026-10-21" },
  { reg: "HA12 BYS", handle: "ha12-bys", price: 9000, added: "2026-10-21" },
  { reg: "HA12 DDY", handle: "ha12-ddy", price: 9000, added: "2026-10-21" },
  { reg: "W2 JJJ", handle: "w2-jjj", price: 1100, added: "2026-10-21" },
  { reg: "Y29 JAV", handle: "y29-jav", price: 20000, added: "2026-10-21" },
  { reg: "N44 LDL", handle: "n44-ldl-1", price: 499, added: "2026-10-21" },
  { reg: "N44 YUF", handle: "n44-yuf", price: 499, added: "2026-10-21" },
  { reg: "P88 RRX", handle: "p88-rrx", price: 400, added: "2026-10-21" },
  { reg: "H26 MDD", handle: "h26-mdd", price: 200, added: "2026-10-21" },
  { reg: "S44 KBG", handle: "s44-kbg", price: 3000, added: "2026-10-20" },
  { reg: "EE59 CUZ", handle: "ee59-cuz", price: 999, added: "2026-10-20" },
  { reg: "RA63 UUF", handle: "ra63-uuf", price: 399, added: "2026-10-20" },
  { reg: "AA72 EEZ", handle: "aa72-eez", price: 2500, added: "2026-10-20" },
  { reg: "MA21 AXZ", handle: "ma21-axz", price: 1000, added: "2026-10-20" },
  { reg: "RA02 MAT", handle: "ra02-mat", price: 1500, added: "2026-10-20" },
  { reg: "GA24 DNA", handle: "ga24-dna", price: 1800, added: "2026-10-20" },
  { reg: "ST19 LAD", handle: "st19-lad", price: 1000, added: "2026-10-20" },
  { reg: "HA17 EFA", handle: "ha17-efa", price: 499, added: "2026-10-20" },
  { reg: "RR14 MBO", handle: "rr14-mbo", price: 2499, added: "2026-10-17" },
  { reg: "NX71 MAH", handle: "nx71-mah", price: 725, added: "2026-10-17" },
];

/** Plates added in the 7 days up to the last build (live when synced), newest first. */
export const newThisWeek: NewPlate[] = shop
  ? shop.plates
      .filter((p) => Date.parse(`${shop.date}T00:00:00Z`) - Date.parse(`${p.added}T00:00:00Z`) < 7 * 86400000)
      .map((p) => ({ reg: p.reg, handle: p.handle, price: p.price, added: p.added }))
  : savedNewThisWeek;
