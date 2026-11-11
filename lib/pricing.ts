/**
 * Prices a basket on the server, for checkout. Nothing the browser says about money is used:
 * every price is worked out again here from the same rules the site shows (the plate builder,
 * accessories, delivery, the member discount) and registrations are checked live with Shopify or
 * the DVLA. The result becomes a Shopify draft order (app/api/checkout).
 */
import { ACC_PRODUCTS } from "./accessoryShop";
import { logoLines, surroundLines, type LogoPlateConfig, type SurroundConfig } from "./accessories";
import { DEPOSIT_RATE, MEMBER_DISCOUNT } from "./brand";
import { OUR_INCLUDED, OWN_STOCK_DISCOUNT, isComplete, priceLines, spacingNote, summary, type BuildConfig, type Pricing } from "./builder";
import { DELIVERY, FREE_STANDARD_OVER, type DeliveryKey } from "./checkoutRules";
import { ASSIGN } from "./services";
import type { DraftLine } from "./shopify";

/** What the checkout page sends: the basket's own data (never its prices) and the customer's choices. */
export type CheckoutRequest = {
  items: unknown[];
  ship?: string;
  /** Signed in or joining today: 5% off made-to-order items. */
  member?: boolean;
  pay?: "card" | "pay-in-3" | "finance" | "deposit";
  email?: string;
};

export type LiveLookups = {
  /** A REG KING or customer plate, live from Shopify; null when sold. Throws when Shopify can't be reached. */
  plate: (handle: string) => Promise<{ reg: string; price: number; variantId: string; ours: boolean } | null>;
  /** A DVLA plate, live from the feed; null when sold. Throws when the feed can't be reached. */
  dvla: (reg: string) => Promise<{ reg: string; price: number; dvlaPrice: number } | null>;
};

export type Priced = { lines: DraftLine[]; total: number; tags: string[]; notes: string[]; shipping: { title: string; price: number } | null };

export class CheckoutError extends Error {
  constructor(message: string, public status = 400, public gone?: string) {
    super(message);
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const str = (x: unknown, max = 200) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const REG = /^[A-Z0-9]{1,4}( [A-Z0-9]{1,4})?$/;
const cleanReg = (x: unknown) => {
  const r = str(x, 10).toUpperCase().replace(/\s+/g, " ");
  return REG.test(r) && /[0-9]/.test(r) && r.replace(" ", "").length <= 7 ? r : "";
};
const ON_REQUEST = "Part of your basket doesn't have a price yet. Call us and we'll price it for you.";

/** The plate builder's lines as one priced order line (all amounts must be known). */
function plateLine(reg: string, cfg: BuildConfig, pricing: Pricing | undefined, label: string): { line: DraftLine; amount: number } {
  const lines = priceLines(cfg, pricing);
  if (lines.some((l) => l.amount === null)) throw new CheckoutError(ON_REQUEST, 409);
  const amount = r2(lines.reduce((a, l) => a + (l.amount as number), 0));
  const spec = [summary(cfg), spacingNote(cfg, reg)].filter(Boolean).join(", ");
  return {
    amount,
    line: {
      title: label,
      price: amount,
      physical: true,
      attributes: [
        { key: "Registration", value: reg },
        { key: "Plates", value: spec },
        { key: "Price breakdown", value: lines.map((l) => `${l.label} £${(l.amount as number).toFixed(2)}`).join("; ") },
        ...(cfg.legal === "Legal" ? [{ key: "Road legal", value: "ID and proof of entitlement needed before making" }] : []),
      ],
    },
  };
}

export async function priceBasket(req: CheckoutRequest, live: LiveLookups): Promise<Priced> {
  if (!Array.isArray(req.items) || req.items.length === 0) throw new CheckoutError("Your basket is empty.");
  if (req.items.length > 30) throw new CheckoutError("That's more items than we can take online. Call us and we'll sort it.");
  const pay = req.pay === "deposit" || req.pay === "finance" || req.pay === "pay-in-3" ? req.pay : "card";

  const lines: DraftLine[] = [];
  const tags = new Set<string>(["Website"]);
  const notes: string[] = [];
  const madeLines: DraftLine[] = []; // made-to-order items, for the member discount
  let physicalValue = 0; // for free standard delivery
  let physical = false;

  for (const raw of req.items) {
    if (!isObj(raw) || !isObj(raw.data)) throw new CheckoutError("Something in your basket didn't come through. Remove it and add it again.");
    const d = raw.data;
    switch (raw.kind) {
      case "plates": {
        const reg = cleanReg(d.reg);
        const cfg = d.cfg as unknown as BuildConfig;
        if (!reg || !isObj(cfg) || !isComplete(cfg)) throw new CheckoutError("A plate in your basket isn't finished. Open it from the basket and finish it.");
        const { line, amount } = plateLine(reg, cfg, undefined, `Number plates: ${reg}`);
        lines.push(line);
        madeLines.push(line);
        physicalValue += amount;
        physical = true;
        tags.add("Plates");
        if (cfg.legal === "Legal") tags.add("Road legal");
        break;
      }
      case "surrounds":
      case "logo": {
        const pl = raw.kind === "surrounds" ? surroundLines(d.cfg as unknown as SurroundConfig) : logoLines(d.cfg as unknown as LogoPlateConfig);
        if (pl.some((l) => l.amount === null)) throw new CheckoutError(ON_REQUEST, 409);
        const amount = r2(pl.reduce((a, l) => a + (l.amount as number), 0));
        const reg = raw.kind === "surrounds" ? cleanReg(d.reg) : "";
        const line: DraftLine = { title: pl.map((l) => l.label).join(", "), price: amount, physical: true, attributes: [...(reg ? [{ key: "Registration", value: reg }] : []), { key: "Design", value: JSON.stringify(d.cfg).slice(0, 500) }] };
        lines.push(line);
        madeLines.push(line);
        physicalValue += amount;
        physical = true;
        tags.add(raw.kind === "surrounds" ? "Surrounds" : "Logo plates");
        break;
      }
      case "accessory": {
        const p = ACC_PRODUCTS.find((x) => x.key === d.key);
        const qty = d.qty === undefined ? 1 : Number(d.qty);
        if (!p || !Number.isInteger(qty) || qty < 1 || qty > 20) throw new CheckoutError("An accessory in your basket isn't available any more. Remove it and try again.");
        if (p.price === null || p.price === undefined) throw new CheckoutError(ON_REQUEST, 409);
        const amount = r2(p.price * qty);
        lines.push({ title: p.name, price: p.price, quantity: qty, physical: true });
        physicalValue += amount;
        physical = true;
        tags.add("Accessories");
        break;
      }
      case "registration": {
        const handle = str(d.handle, 60).toLowerCase();
        if (!/^[a-z0-9-]{2,60}$/.test(handle)) throw new CheckoutError("We couldn't find a registration in your basket. Remove it and add it again.");
        const dvla = handle.startsWith("dvla-");
        let reg: string;
        let price: number;
        let ours = false;
        const holdLabel = (r: string) => `Sorry, ${r} has just sold. Remove it from your basket to carry on.`;
        if (dvla) {
          const row = await live.dvla(handle.slice(5).toUpperCase()).catch(() => undefined);
          if (row === undefined) throw new CheckoutError("We couldn't check with the DVLA just now. Try again in a minute.", 502);
          if (row === null) throw new CheckoutError(holdLabel(cleanReg(d.reg) || "this registration"), 409, handle);
          reg = row.reg;
          price = row.price;
          tags.add("DVLA");
          notes.push(`DVLA registration ${row.reg}: DVLA price £${row.dvlaPrice.toFixed(2)}, our fee £${(row.price - row.dvlaPrice).toFixed(2)}. Buy it from the DVLA in the holder's name.`);
          lines.push({ title: `${reg} registration (DVLA)`, price, attributes: [{ key: "Source", value: "DVLA" }] });
        } else {
          const p = await live.plate(handle).catch(() => undefined);
          if (p === undefined) throw new CheckoutError("We couldn't check the plate just now. Try again in a minute, or call us.", 502);
          if (p === null) throw new CheckoutError(holdLabel(cleanReg(d.reg) || "this registration"), 409, handle);
          reg = p.reg;
          price = p.price;
          ours = p.ours;
          tags.add(ours ? "REG KING stock" : "Customer plate");
          if (pay === "deposit") {
            // a deposit reserves the plate: 10% now, taken off the price; the balance is invoiced later
            const deposit = r2(price * DEPOSIT_RATE);
            tags.add("Deposit");
            notes.push(`${reg}: deposit £${deposit.toFixed(2)} of £${price.toFixed(2)}, balance £${r2(price - deposit).toFixed(2)} to invoice. Mark the plate reserved.`);
            lines.push({ title: `Deposit for ${reg} (${Math.round(DEPOSIT_RATE * 100)}% of £${price.toFixed(2)})`, price: deposit, attributes: [{ key: "Registration", value: reg }, { key: "Full price", value: price.toFixed(2) }] });
          } else {
            lines.push({ title: `${reg} registration`, price, variantId: p.variantId });
          }
        }
        if (d.platesCfg && isObj(d.platesCfg)) {
          const cfg = d.platesCfg as unknown as BuildConfig;
          if (!isComplete(cfg)) throw new CheckoutError(`The plates for ${reg} aren't finished. Open the registration again and finish them.`);
          // plates with a registration are at our trade price; with our own plates a set is included
          const pricing: Pricing = ours ? { mode: "trade", included: OUR_INCLUDED, offRetail: OWN_STOCK_DISCOUNT } : { mode: "trade", included: [] };
          const { line, amount } = plateLine(reg, cfg, pricing, `Number plates for ${reg}`);
          lines.push(line); // at £0 too, when the plates are included: the workshop still needs the details
          physicalValue += amount;
          physical = true;
        }
        if (d.assign === true && !ours) {
          lines.push({ title: ASSIGN.name, price: ASSIGN.price, attributes: [{ key: "Registration", value: reg }] });
          // the checkout page counts everything after the registration itself towards free delivery
          physicalValue += ASSIGN.price;
        }
        break;
      }
      default:
        throw new CheckoutError("Something in your basket didn't come through. Remove it and add it again.");
    }
  }

  // Member discount: 5% off made-to-order items (plates, surrounds, logo plates), rounded once on
  // their total as the checkout page shows it, then shared across those lines (the last takes the pennies)
  if (req.member && madeLines.length) {
    const made = madeLines.reduce((a, l) => a + l.price, 0);
    let left = r2(made * MEMBER_DISCOUNT);
    madeLines.forEach((l, i) => {
      const off = i === madeLines.length - 1 ? left : Math.min(left, r2(l.price * MEMBER_DISCOUNT));
      left = r2(left - off);
      if (off > 0) l.discount = { amount: off, title: `Member discount ${Math.round(MEMBER_DISCOUNT * 100)}%` };
    });
  }

  // Delivery
  let shipping: Priced["shipping"] = null;
  if (physical) {
    const opt = DELIVERY.find((x) => x.key === (req.ship as DeliveryKey));
    if (!opt) throw new CheckoutError("Choose delivery or collection.");
    const price = opt.key === "standard" && physicalValue >= FREE_STANDARD_OVER ? 0 : opt.price;
    shipping = { title: opt.name, price };
    if (opt.key === "collect") tags.add("Collection");
  }

  const goods = lines.reduce((a, l) => a + l.price * (l.quantity ?? 1) - (l.discount?.amount ?? 0), 0);
  const total = r2(goods + (shipping?.price ?? 0));
  if (pay === "finance") tags.add("Payl8r");
  return { lines, total, tags: [...tags], notes, shipping };
}
