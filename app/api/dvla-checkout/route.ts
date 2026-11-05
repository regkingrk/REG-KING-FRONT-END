/**
 * POST /api/dvla-checkout  { reg: "AB12CDE", plates?: "gel" | "gel-bike" | ..., assign?: true }
 * Starts checkout for a DVLA registration.
 *
 * DVLA plates aren't Shopify products (there are too many, and they sell elsewhere too), so:
 *   1. ask the feed again, right now, that the plate is still for sale and at what price
 *   2. create a Shopify draft order with the plate at that price (lib/shopify.ts draftCheckout)
 *   3. send the customer to its checkout
 * The order shows in Shopify admin tagged "DVLA" so REG KING knows to buy it from the DVLA.
 *
 * The DVLA purchase is made in the customer's name (or their nominee's) so the DVLA posts the V750
 * certificate straight to them: checkout must collect the exact name and address for it.
 * CONFIRM: how VAT is set up in Shopify for these (DVLA prices already include VAT).
 * CONFIRM: trade prices for physical plates, so they can be added as a second line here.
 */
import { NextResponse } from "next/server";
import { dvlaConfigured, findDvla } from "@/lib/dvlaFeed";
import { draftCheckout } from "@/lib/shopify";
import { ASSIGN } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!dvlaConfigured()) return NextResponse.json({ error: "DVLA registrations can't be bought online yet. Call us and we'll sort it." }, { status: 503 });
  let body: { reg?: string; plates?: string; assign?: boolean } = {};
  try {
    body = await req.json();
  } catch {}
  const row = await findDvla(String(body.reg ?? ""), true).catch(() => undefined);
  if (row === undefined) return NextResponse.json({ error: "We couldn't check with the DVLA just now. Try again in a minute." }, { status: 502 });
  if (row === null) return NextResponse.json({ error: "Sorry, the DVLA has just sold this registration.", gone: true }, { status: 409 });

  const plates = typeof body.plates === "string" && /^[a-z0-9-]{1,20}$/.test(body.plates) ? body.plates : "";
  const url = await draftCheckout(
    [
      { title: row.reg, price: row.price, attributes: [{ key: "Source", value: "DVLA" }, ...(plates ? [{ key: "Physical plates", value: plates }] : [])] },
      ...(body.assign === true ? [{ title: ASSIGN.name, price: ASSIGN.price, attributes: [{ key: "Registration", value: row.reg }] }] : []),
    ],
    ["DVLA", "Website"],
    `DVLA registration ${row.reg}. DVLA price £${row.dvlaPrice.toFixed(2)}, service fee £${(row.price - row.dvlaPrice).toFixed(2)}.`,
  );
  if (!url) return NextResponse.json({ error: "We couldn't start checkout. Call us and we'll sort it." }, { status: 502 });
  return NextResponse.json({ url, reg: row.reg, price: row.price });
}
