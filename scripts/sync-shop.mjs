/**
 * Reads every plate for sale from the REG KING Shopify store and writes lib/data/shop.generated.ts,
 * which the site uses for Exclusive plates, REG KING stock, customer plates, New this week, search
 * and valuations. Runs before every build (`npm run build`); rebuild to refresh.
 *
 * Needs SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN (set in Vercel, never in the code).
 * Without them it leaves the file alone and the site uses its saved copy.
 * With them, if Shopify can't be read the build stops, so a stale or empty list is never published:
 * the site already live stays as it is.
 *
 * Only products published to the Headless sales channel are visible here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "lib/data/shop.generated.ts");
const rules = JSON.parse(readFileSync(join(root, "lib/data/shop-rules.json"), "utf8"));
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || "2026-10";

/**
 * A title that reads as one UK registration: 2 to 7 letters and numbers, at most one space, and at
 * least one number (every UK registration has one, which also keeps out products like "Plates").
 */
export const isReg = (t) => /^[A-Z0-9]+( [A-Z0-9]+)?$/.test(t) && /[0-9]/.test(t) && t.replace(" ", "").length >= 2 && t.replace(" ", "").length <= 7;

/** One Shopify product as a plate for the site, or null when it isn't one we show. */
export function toPlate(p) {
  const reg = String(p.title || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!p.availableForSale) return null; // sold or out of stock
  if (rules.notPlates.includes(p.handle) || rules.heldBackHandles.includes(p.handle) || rules.heldBackRegs.includes(reg)) return null;
  if (!isReg(reg)) return null; // e.g. a pair sold together ("KD11 XJA & KD11 JXA")
  const price = Number(p.priceRange?.minVariantPrice?.amount);
  if (!Number.isFinite(price) || price <= 0) return null;
  return { reg, handle: p.handle, price, added: String(p.createdAt).slice(0, 10), ours: (p.tags || []).includes(rules.oursTag) };
}

const QUERY = `query Plates($after: String) {
  products(first: 250, after: $after, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes { handle title tags createdAt availableForSale priceRange { minVariantPrice { amount } } }
  }
}`;

export async function readShop(fetchImpl = fetch) {
  const plates = [];
  let after = null;
  for (let page = 0; page < 100; page++) {
    const res = await fetchImpl(`https://${domain}/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query: QUERY, variables: { after } }),
    });
    if (!res.ok) throw new Error(`Shopify Storefront API ${res.status}`);
    const json = await res.json();
    if (json.errors || !json.data) throw new Error(`Shopify Storefront API error: ${JSON.stringify(json.errors)}`);
    const { nodes, pageInfo } = json.data.products;
    for (const n of nodes) {
      const p = toPlate(n);
      if (p) plates.push(p);
    }
    if (!pageInfo.hasNextPage) return plates;
    after = pageInfo.endCursor;
  }
  throw new Error("More than 25,000 products: stopped reading to be safe");
}

export function render(plates, date) {
  // one plate per line keeps the file readable and its changes easy to follow
  const lines = plates.map((p) => "    " + JSON.stringify(p) + ",");
  return `import type { ShopData } from "../shopData";

/**
 * Written by scripts/sync-shop.mjs before each build, from the live Shopify store.
 * null = not synced (the preview, or no Shopify connection): the site uses its saved copy.
 * Don't edit by hand.
 */
export const SHOP: ShopData | null = {
  date: ${JSON.stringify(date)},
  plates: [
${lines.join("\n")}
  ],
};
`;
}

async function main() {
  if (!domain || !token) {
    console.log("sync-shop: Shopify not connected (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN), using the saved copy");
    return;
  }
  const plates = await readShop();
  if (plates.length < 50) throw new Error(`Only ${plates.length} plates read from Shopify. Check the products are published to the Headless channel.`);
  writeFileSync(OUT, render(plates, new Date().toISOString().slice(0, 10)));
  console.log(`sync-shop: ${plates.length} plates (${plates.filter((p) => p.ours).length} REG KING stock)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`sync-shop: ${e.message}`);
    process.exit(1);
  });
}
