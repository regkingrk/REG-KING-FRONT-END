/**
 * DVLA registrations on the site (browser side). The feed itself is read on the server
 * (lib/dvlaFeed.ts, app/api/dvla-stock). The preview has no server, so it shows SAMPLE DVLA plates
 * made by lib/search.ts, marked as samples.
 */
import { spaceReg } from "./brand";
import { DVLA_FEED } from "./features";
import { dvlaTotal } from "./dvlaPricing";
import { browseAll, dvlaHandle, dvlaResult, dvlaSamplePrice, searchAll, type Result } from "./search";

/** price: what the customer pays (DVLA price plus REG KING's service fee). dvlaPrice: the DVLA's own price. */
export type DvlaPlate = { reg: string; price: number; dvlaPrice: number; handle: string; sample?: boolean };

const inPreview = () => typeof window !== "undefined" && "__RK_LOAD__" in window;

/** #plate-dvla-ab12cde to "AB12 CDE". */
export function regFromDvlaHandle(handle: string): string | null {
  const m = /^dvla-([a-z0-9]{2,7})$/.exec(handle);
  return m ? spaceReg(m[1].toUpperCase()) : null;
}

/**
 * What the customer gets with a DVLA registration. Facts from the DVLA's INF46 leaflet.
 * CONFIRM with REG KING: that the certificate is issued with the customer as purchaser.
 */
export const DVLA_FACTS = [
  "Never issued before. You'll be the first to own it.",
  "Bought in your name. The DVLA posts the V750 certificate of entitlement straight to you.",
  "The certificate lasts 10 years and can be renewed, so it can go on a vehicle whenever you're ready.",
  "You can name someone else to receive it, for example as a gift.",
];

/** One DVLA plate for its page. null: no longer for sale. "error": couldn't ask. */
export async function getDvlaPlate(handle: string): Promise<DvlaPlate | null | "error"> {
  const reg = regFromDvlaHandle(handle);
  if (!reg || !DVLA_FEED) return null;
  if (inPreview()) return { reg, price: dvlaTotal(dvlaSamplePrice(reg)), dvlaPrice: dvlaSamplePrice(reg), handle: dvlaHandle(reg), sample: true };
  try {
    const res = await fetch(`/api/dvla-stock?reg=${encodeURIComponent(reg.replace(/\s/g, ""))}`, { headers: { Accept: "application/json" } });
    if (res.status === 404) return null;
    if (!res.ok) return "error";
    return (await res.json()) as DvlaPlate;
  } catch {
    return "error";
  }
}

/** DVLA plates matching a search. Live: the feed. Preview: the samples already in search results. */
export async function findDvlaPlates(q: string): Promise<DvlaPlate[]> {
  if (!DVLA_FEED) return [];
  if (inPreview()) return toPlates(q.trim() ? searchAll(q) : browseAll(SAMPLE_SEEDS));
  try {
    const res = await fetch(`/api/dvla-stock?q=${encodeURIComponent(q.replace(/\s/g, ""))}`, { headers: { Accept: "application/json" } });
    return res.ok ? ((await res.json()) as DvlaPlate[]) : [];
  } catch {
    return [];
  }
}

/**
 * Live site only: DVLA plates from the feed for the general search, as search results.
 * The preview's sample DVLA plates are already in searchAll, so this returns none there.
 */
export async function liveDvlaResults(q: string): Promise<Result[]> {
  if (!DVLA_FEED || inPreview() || !q.trim()) return [];
  const rows = await findDvlaPlates(q);
  return rows.map((r) => dvlaResult(r.reg, r.price, q)).filter((r) => r.score >= 36);
}

const SAMPLE_SEEDS = ["KING", "ALI", "SAM", "BOSS", "MO", "JAY"];
const toPlates = (rs: Result[]): DvlaPlate[] =>
  rs.filter((r) => r.source === "dvla" && r.handle).map((r) => ({ reg: r.reg, price: r.price, dvlaPrice: dvlaSamplePrice(r.reg), handle: r.handle!, sample: true }));

/**
 * Buy a DVLA plate: the server checks with the DVLA that it's still for sale, then opens checkout.
 * Preview: nothing to check against, so it says what the live site would do.
 */
export async function startDvlaCheckout(reg: string, plates: string, assign = false): Promise<{ url: string } | { error: string; gone?: boolean }> {
  if (inPreview()) return { error: "Preview: on the live site this checks with the DVLA that the plate is still for sale, then opens checkout." };
  try {
    const res = await fetch("/api/dvla-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reg: reg.replace(/\s/g, ""), plates, assign }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; gone?: boolean };
    return json.url ? { url: json.url } : { error: json.error ?? "We couldn't start checkout. Call us and we'll sort it.", gone: json.gone };
  } catch {
    return { error: "We couldn't start checkout. Call us and we'll sort it." };
  }
}

/**
 * Reserve any plate with a deposit: the server works out the deposit from the live price and
 * opens checkout (app/api/deposit). Preview: says what the live site would do.
 */
export async function startDeposit(handle: string, amount: string): Promise<{ url: string } | { error: string; gone?: boolean }> {
  if (inPreview()) return { error: `Preview: on the live site this opens a secure checkout to pay your ${amount} deposit.` };
  try {
    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ handle }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; gone?: boolean };
    return json.url ? { url: json.url } : { error: json.error ?? "We couldn't start checkout. Call us and we'll sort it.", gone: json.gone };
  } catch {
    return { error: "We couldn't start checkout. Call us and we'll sort it." };
  }
}

/** Pay for a service (plate sourcing) with the request attached. Preview: says what the live site would do. */
export async function startServiceCheckout(service: "sourcing", details: Record<string, string>): Promise<{ url: string } | { error: string }> {
  if (inPreview()) return { error: "Preview: on the live site this opens a secure checkout for £9.99, with your request attached for our team." };
  try {
    const res = await fetch(`/api/${service}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ details }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    return json.url ? { url: json.url } : { error: json.error ?? "We couldn't open checkout. Call us and we'll take your request by phone." };
  } catch {
    return { error: "We couldn't open checkout. Call us and we'll take your request by phone." };
  }
}
