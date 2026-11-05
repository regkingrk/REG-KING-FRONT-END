/**
 * GET /api/valuation?reg=AB12CDE
 * Gathers real prices from every connected source at once, then works out the estimate (lib/valuation.ts).
 * A source that isn't set up, or fails, is skipped; the answer says which sources were used.
 *
 * Environment (hosting settings only, never in the code):
 *   SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN   shop and exclusive plates
 *   SHOPIFY_ADMIN_TOKEN                              REG KING sales (read_orders)
 *   VALUATION_DVLA_URL                               DVLA auction results as JSON [{ reg, price }]   CONFIRM the source
 *   VALUATION_MARKET_URL, VALUATION_MARKET_TOKEN     other dealers' asking prices as JSON [{ reg, price }]   CONFIRM a licensed feed
 *   ANTHROPIC_API_KEY (+ optional ANTHROPIC_MODEL)   writes a two-sentence explanation of the range from the
 *                                                    comparables. It explains the numbers; it never sets them.
 */
import { NextResponse } from "next/server";
import { normaliseReg, spaceReg } from "@/lib/brand";
import { EXCLUSIVE_FROM } from "@/lib/exclusive";
import { allPlatePrices, soldPlatePrices } from "@/lib/shopify";
import { estimate, type Comparable, type SourceKey } from "@/lib/valuation";

export const dynamic = "force-dynamic";

async function feed(url: string | undefined, token: string | undefined, source: SourceKey, kind: Comparable["kind"]): Promise<Comparable[]> {
  if (!url) return [];
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`${source} ${res.status}`);
  const rows = (await res.json()) as { reg?: string; price?: number | string }[];
  return rows
    .map((r) => ({ reg: String(r.reg ?? "").trim().toUpperCase(), price: Number(r.price), kind, source }))
    .filter((r) => r.reg && r.price > 0);
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("reg") ?? "";
  const reg = spaceReg(normaliseReg(raw));
  if (reg.replace(/\s/g, "").length < 2 || reg.replace(/\s/g, "").length > 7) {
    return NextResponse.json({ error: "Enter a registration of 2 to 7 characters." }, { status: 400 });
  }

  const [shop, sold, dvla, market] = await Promise.allSettled([
    allPlatePrices().then((ps) =>
      ps.map<Comparable>((p) => ({ reg: p.reg, price: p.price, kind: "asking", source: p.price >= EXCLUSIVE_FROM ? "exclusive" : "shop", handle: p.handle })),
    ),
    soldPlatePrices().then((ps) => ps.map<Comparable>((p) => ({ reg: p.reg, price: p.price, kind: "sold", source: "sold", handle: p.handle, date: p.date }))),
    feed(process.env.VALUATION_DVLA_URL, undefined, "dvla", "sold"),
    feed(process.env.VALUATION_MARKET_URL, process.env.VALUATION_MARKET_TOKEN, "market", "asking"),
  ]);
  const comps = [shop, sold, dvla, market].flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const v = estimate(reg, comps);
  if (!v) return NextResponse.json({ error: "We couldn't find enough similar plates to value this one." }, { status: 404 });
  v.summary = await explain(reg, v).catch(() => undefined);
  return NextResponse.json(v, { headers: { "Cache-Control": "private, max-age=300" } });
}

/** A short, plain explanation of the estimate, written from the comparables only. */
async function explain(reg: string, v: NonNullable<ReturnType<typeof estimate>>): Promise<string | undefined> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return undefined;
  const lines = v.matches.map((m) => `${m.reg}: £${m.price} (${m.kind === "sold" ? `sold${m.date ? " " + m.date : ""}` : "for sale"})`).join("\n");
  const own = v.exactSold.map((m) => `${m.reg} itself sold for £${m.price}${m.date ? " on " + m.date : ""}`).join("\n");
  const prompt = `You write one or two short sentences for a UK private number plate valuation page. Plain British English, no hype, no em dashes.
Explain why ${reg} is estimated at £${v.low} to £${v.high}, using only the facts below. Do not give any other price or range, and do not promise a sale.
Plate style: ${v.style}. Confidence: ${v.strength}.
Closest comparable plates:
${lines}
${own}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 160, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) return undefined;
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === "text")?.text?.trim();
  // Never show a price the maths didn't produce.
  const prices = [...(text ?? "").matchAll(/£\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  const allowed = new Set([v.low, v.high, ...[...v.matches, ...v.exactSold].flatMap((m) => [Math.floor(m.price), Math.round(m.price)])]);
  if (!text || prices.some((p) => !allowed.has(p))) return undefined;
  return text;
}
