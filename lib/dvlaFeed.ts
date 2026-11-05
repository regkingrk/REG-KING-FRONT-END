/**
 * DVLA registrations feed (server only: reads keys from the hosting settings).
 *
 * REG KING can sell registrations the DVLA has never issued. There is no public DVLA API for this
 * stock, so the source has to be agreed first: a DVLA dealer arrangement or a licensed data
 * supplier. Scraping the DVLA site isn't allowed. CONFIRM the source and its format.
 *
 * Environment (Vercel settings, never in the code):
 *   DVLA_STOCK_URL      the agreed feed. Expected to answer JSON [{ reg, price }],
 *                       price in pounds as the DVLA sells it (includes VAT and the assignment fee).
 *                       With ?reg=AB12CDE it should answer that one plate, or 404 when it's gone.
 *   DVLA_STOCK_TOKEN    the feed's key, if it has one (sent as a Bearer token)
 * REG KING's service fee is added here (lib/dvlaPricing.ts), so every price on the site includes it.
 *
 * If the agreed feed looks different, only this file changes. The routes and pages stay the same.
 */
import { normaliseReg, spaceReg } from "./brand";
import { DVLA_FEED } from "./features";
import { dvlaTotal } from "./dvlaPricing";

export type DvlaRow = { reg: string; price: number; dvlaPrice: number };

const compact = (r: string) => normaliseReg(r).replace(/\s/g, "");

export function dvlaConfigured() {
  return DVLA_FEED && !!process.env.DVLA_STOCK_URL;
}

function priced(raw: { reg?: string; price?: number | string }): DvlaRow | null {
  const reg = compact(String(raw.reg ?? ""));
  const dvlaPrice = Number(raw.price);
  if (reg.length < 2 || reg.length > 7 || !(dvlaPrice > 0)) return null;
  return { reg: spaceReg(reg), dvlaPrice, price: dvlaTotal(dvlaPrice) };
}

async function get(url: string, fresh: boolean) {
  const token = process.env.DVLA_STOCK_TOKEN;
  return fetch(url, {
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 3600 } }),
  });
}

/** Every plate in the feed that contains the search (letters and numbers only). Cached for an hour. */
export async function searchDvla(q: string, limit = 120): Promise<DvlaRow[]> {
  if (!dvlaConfigured()) return [];
  const res = await get(process.env.DVLA_STOCK_URL!, false);
  if (!res.ok) throw new Error(`DVLA feed ${res.status}`);
  const want = compact(q);
  return ((await res.json()) as { reg?: string; price?: number | string }[])
    .map(priced)
    .filter((r): r is DvlaRow => !!r && (!want || compact(r.reg).includes(want)))
    .slice(0, limit);
}

/**
 * One plate. fresh: ask the feed now rather than the hour-old copy, used right before checkout
 * so nobody pays for a plate the DVLA has already sold.
 */
export async function findDvla(reg: string, fresh = false): Promise<DvlaRow | null> {
  if (!dvlaConfigured()) return null;
  const url = new URL(process.env.DVLA_STOCK_URL!);
  url.searchParams.set("reg", compact(reg));
  const res = await get(url.toString(), fresh);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`DVLA feed ${res.status}`);
  const body = (await res.json()) as unknown;
  const row = Array.isArray(body) ? body.find((r) => compact(String(r?.reg ?? "")) === compact(reg)) : body;
  return row ? priced(row as { reg?: string; price?: number }) : null;
}
