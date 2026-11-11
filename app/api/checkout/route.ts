/**
 * POST /api/checkout
 * The last step of checkout: prices the basket here on the server (lib/pricing.ts, live checks with
 * Shopify and the DVLA), creates a Shopify draft order with the customer's answers attached, and
 * returns its secure Shopify payment link. Card details only ever go to Shopify.
 *
 * Stock plates are held for the customer for 30 minutes while they pay, so two people can't buy
 * the same plate. The order shows in Shopify admin tagged by what's in it (Plates, DVLA, Deposit...).
 */
import { NextResponse } from "next/server";
import { dvlaConfigured, findDvla } from "@/lib/dvlaFeed";
import { CheckoutError, priceBasket, type CheckoutRequest } from "@/lib/pricing";
import { draftCheckout, plateForCheckout } from "@/lib/shopify";

export const dynamic = "force-dynamic";

const HOLD_MINUTES = 30;
const clip = (x: unknown, max = 200) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: CheckoutRequest & { details?: Record<string, unknown> } = { items: [] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
  }
  const email = clip(body.email, 120);
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  let priced;
  try {
    priced = await priceBasket(body, {
      plate: plateForCheckout,
      dvla: async (reg) => {
        if (!dvlaConfigured()) throw new Error("DVLA feed not connected");
        const row = await findDvla(reg, true);
        return row ? { reg: row.reg, price: row.price, dvlaPrice: row.dvlaPrice } : null;
      },
    });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message, gone: e.gone }, { status: e.status });
    console.error("checkout pricing", e);
    return NextResponse.json({ error: "We couldn't start checkout. Call us and we'll sort it." }, { status: 500 });
  }

  // The customer's answers from the checkout page, for REG KING's team (shown on the order)
  const d = body.details ?? {};
  const note = [
    ...priced.notes,
    clip(d.name) && `Customer: ${clip(d.name)}${clip(d.phone, 30) ? `, ${clip(d.phone, 30)}` : ""}`,
    clip(d.holder) && `Registration holder (V750 / V778 name): ${clip(d.holder)}`,
    clip(d.holderAddress, 300) && `Holder's address: ${clip(d.holderAddress, 300)}`,
    clip(d.vehicle, 60) && `Vehicle: ${clip(d.vehicle, 60)}`,
    clip(d.call, 80) && `Transfer call booked: ${clip(d.call, 80)}${clip(d.callNote, 300) ? `. Note: ${clip(d.callNote, 300)}` : ""}`,
    clip(d.documents, 120) && `Documents: ${clip(d.documents, 120)}`,
    body.pay === "finance" && "Customer chose Payl8r finance.",
    body.pay === "pay-in-3" && "Customer chose Pay in 3.",
    body.member && "Member discount applied (signed in or joining).",
  ]
    .filter(Boolean)
    .join("\n");

  // the delivery address typed on our checkout, so Shopify doesn't ask for it again (not for collection)
  const a = (typeof d.address === "object" && d.address ? d.address : {}) as Record<string, unknown>;
  const address =
    priced.shipping && body.ship !== "collect" && clip(a.line1, 120) && clip(a.town, 60) && /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i.test(clip(a.postcode, 10))
      ? { name: clip(d.name, 80) || "Customer", line1: clip(a.line1, 120), line2: clip(a.line2, 120), town: clip(a.town, 60), postcode: clip(a.postcode, 10).toUpperCase(), phone: clip(d.phone, 30) }
      : undefined;

  const url = await draftCheckout(priced.lines, priced.tags, note, {
    email,
    shipping: priced.shipping ?? undefined,
    holdMinutes: HOLD_MINUTES,
    address,
  });
  if (!url) return NextResponse.json({ error: "We couldn't start checkout. Call us and we'll sort it." }, { status: 502 });
  return NextResponse.json({ url, total: priced.total });
}
