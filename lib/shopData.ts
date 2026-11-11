import { SHOP } from "./data/shop.generated";

/** One plate for sale, as the sync script reads it from Shopify. */
export type ShopPlate = { reg: string; handle: string; price: number; added: string; ours: boolean };
/** Every plate for sale on the store, newest first, and when that was read. */
export type ShopData = { date: string; plates: ShopPlate[] };

/** The store as read at the last build, or null when not synced (then the saved copies are used). */
export const shop: ShopData | null = SHOP;

/** "11 Nov 2026" from "2026-11-11". */
export const shopDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
