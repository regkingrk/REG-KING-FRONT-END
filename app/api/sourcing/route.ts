/**
 * POST /api/sourcing  { details: { "Name, word or phrase": "JAMES", Budget: "£2,000", ... } }
 * Opens checkout for the shop's "Plate source request" product (£9.99) with the request attached,
 * so it arrives in Shopify admin as an order with everything REG KING needs to start searching.
 */
import { NextResponse } from "next/server";
import { productCheckout } from "@/lib/shopify";
import { SOURCING } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let details: Record<string, unknown> = {};
  try {
    details = ((await req.json()) as { details?: Record<string, unknown> }).details ?? {};
  } catch {}
  const attrs = Object.entries(details)
    .filter(([k, v]) => typeof v === "string" && k.length <= 40)
    .slice(0, 10)
    .map(([key, value]) => ({ key, value: String(value).trim() }));
  if (!attrs.some((a) => a.key === "Name, word or phrase" && a.value)) {
    return NextResponse.json({ error: "Tell us the name, word or phrase you're looking for." }, { status: 400 });
  }
  const url = await productCheckout(SOURCING.handle, attrs).catch(() => null);
  if (!url) return NextResponse.json({ error: "We couldn't open checkout. Call us and we'll take your request by phone." }, { status: 502 });
  return NextResponse.json({ url });
}
