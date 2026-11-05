/**
 * POST /api/deposit  { handle: "am12-rra" }
 * Reserve a plate with a 10% deposit (REG KING's deposit terms: 10% of the price, non-refundable,
 * taken off the price).
 *
 * Not for DVLA plates: they're open-market plates the DVLA sells first come, first served, so they
 * can't be held (lib/dvlaPricing.ts DVLA_NO_DEPOSIT).
 *
 *   1. look up the plate's price now from the shop
 *   2. create a Shopify draft order for the deposit only (lib/shopify.ts draftCheckout)
 *   3. send the customer to its checkout
 * The order shows in Shopify admin tagged "Deposit" with the plate, its full price and the balance,
 * so REG KING can mark the plate as reserved and invoice the balance later.
 * The price always comes from the server, never from the browser.
 *
 * CONFIRM: how long a plate is held, and whether the plate should come off sale automatically
 *          when a deposit is paid (a Shopify Flow on the "Deposit" tag can do this).
 */
import { NextResponse } from "next/server";
import { DEPOSIT_RATE, depositFor } from "@/lib/brand";
import { DVLA_NO_DEPOSIT } from "@/lib/dvlaPricing";
import { draftCheckout, platePrice } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let handle = "";
  try {
    handle = String(((await req.json()) as { handle?: string }).handle ?? "");
  } catch {}
  if (!/^[a-z0-9-]{2,60}$/.test(handle)) return NextResponse.json({ error: "We couldn't find that plate." }, { status: 400 });

  if (handle.startsWith("dvla-")) return NextResponse.json({ error: DVLA_NO_DEPOSIT }, { status: 400 });
  const plate = await platePrice(handle).catch(() => undefined);
  if (plate === undefined) return NextResponse.json({ error: "We couldn't check the plate just now. Try again in a minute, or call us." }, { status: 502 });
  if (plate === null) return NextResponse.json({ error: "Sorry, this plate has just sold.", gone: true }, { status: 409 });

  const deposit = depositFor(plate.price);
  const balance = Math.round((plate.price - deposit) * 100) / 100;
  const url = await draftCheckout(
    [
      {
        title: `Deposit for ${plate.reg}`,
        price: deposit,
        attributes: [
          { key: "Registration", value: plate.reg },
          { key: "Plate price", value: `£${plate.price.toFixed(2)}` },
          { key: "Balance to pay", value: `£${balance.toFixed(2)}` },
        ],
      },
    ],
    ["Deposit", "Website"],
    `${Math.round(DEPOSIT_RATE * 100)}% deposit for ${plate.reg}. Non-refundable. Balance £${balance.toFixed(2)}.`,
  );
  if (!url) return NextResponse.json({ error: "We couldn't start checkout. Call us and we'll sort it." }, { status: 502 });
  return NextResponse.json({ url });
}
