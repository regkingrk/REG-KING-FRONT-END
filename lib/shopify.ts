/**
 * Shopify Storefront API (server side only).
 * Set in the hosting environment, never in the code:
 *   SHOPIFY_STORE_DOMAIN       e.g. regking.myshopify.com
 *   SHOPIFY_STOREFRONT_TOKEN   Storefront API access token (Shopify admin > Apps > Develop apps)
 *   SHOPIFY_API_VERSION        optional, defaults below
 */
// Shopify supports each API version for about a year: move this on each spring and autumn.
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-10";

export type ShopPolicy = { title: string; body: string; url: string };
export type PolicyKey = "privacyPolicy" | "termsOfService";

export function shopifyConfigured() {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN);
}

async function storefront<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN as string,
    },
    body: JSON.stringify(variables ? { query, variables } : { query }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Shopify Storefront API ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors || !json.data) throw new Error(`Shopify Storefront API error: ${JSON.stringify(json.errors)}`);
  return json.data;
}

/**
 * The shop's own policy text, exactly as written in Shopify (Settings > Policies).
 * Returns null when the store isn't connected or the policy is empty.
 */
export async function getPolicy(key: PolicyKey): Promise<ShopPolicy | null> {
  if (!shopifyConfigured()) return null;
  const data = await storefront<{ shop: Record<PolicyKey, ShopPolicy | null> }>(
    `{ shop { ${key} { title body url } } }`,
  );
  const p = data.shop[key];
  return p && p.body.trim() ? p : null;
}

/** Every plate for sale in the shop, with its price. Cached for an hour. Used by the valuation. */
export async function allPlatePrices(): Promise<{ reg: string; handle: string; price: number }[]> {
  if (!shopifyConfigured()) return [];
  type Page = {
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: { title: string; handle: string; availableForSale: boolean; priceRange: { minVariantPrice: { amount: string } } }[];
    };
  };
  const out: { reg: string; handle: string; price: number }[] = [];
  let after: string | null = null;
  for (let i = 0; i < 40; i++) {
    const data: Page = await storefront<Page>(
      `{ products(first: 250${after ? `, after: ${JSON.stringify(after)}` : ""}) { pageInfo { hasNextPage endCursor } nodes { title handle availableForSale priceRange { minVariantPrice { amount } } } } }`,
    );
    data.products.nodes.forEach((n) => {
      const price = Number(n.priceRange.minVariantPrice.amount);
      if (n.availableForSale && price > 0) out.push({ reg: n.title.trim().toUpperCase(), handle: n.handle, price });
    });
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return out;
}

/**
 * Plates sold through REG KING in the last two years: the plate and the price paid, nothing about
 * the buyer. Needs the Admin API (server only):
 *   SHOPIFY_ADMIN_TOKEN   Admin API access token with read_orders (and read_all_orders for over 60 days)
 */
export async function soldPlatePrices(): Promise<{ reg: string; handle?: string; price: number; date?: string }[]> {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!process.env.SHOPIFY_STORE_DOMAIN || !token) return [];
  const since = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);
  type Page = {
    orders: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: { createdAt: string; lineItems: { nodes: { title: string; product: { handle: string; productType: string } | null; originalUnitPriceSet: { shopMoney: { amount: string } } }[] } }[];
    };
  };
  const out: { reg: string; handle?: string; price: number; date?: string }[] = [];
  let after: string | null = null;
  for (let i = 0; i < 20; i++) {
    const query = `{ orders(first: 100, query: "financial_status:paid created_at:>=${since}"${after ? `, after: ${JSON.stringify(after)}` : ""}) { pageInfo { hasNextPage endCursor } nodes { createdAt lineItems(first: 10) { nodes { title product { handle productType } originalUnitPriceSet { shopMoney { amount } } } } } } }`;
    const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`Shopify Admin API ${res.status}`);
    const json = (await res.json()) as { data?: Page };
    if (!json.data) break;
    json.data.orders.nodes.forEach((o) =>
      o.lineItems.nodes.forEach((li) => {
        const price = Number(li.originalUnitPriceSet.shopMoney.amount);
        // Plates only: line items whose title is a registration (accessories and fees are left out).
        const reg = li.title.trim().toUpperCase();
        if (price > 0 && /^[A-Z0-9]{1,4} ?[A-Z0-9]{1,4}$/.test(reg) && /\d/.test(reg) && /[A-Z]/.test(reg)) out.push({ reg, handle: li.product?.handle, price, date: o.createdAt.slice(0, 10) });
      }),
    );
    if (!json.data.orders.pageInfo.hasNextPage) break;
    after = json.data.orders.pageInfo.endCursor;
  }
  return out;
}

export type ShopPage = { title: string; body: string; seoTitle: string | null; seoDescription: string | null };

/**
 * One of REG KING's own content pages from Shopify (Online Store > Pages), cached for an hour.
 * The wording is the shop's, written in Shopify admin, never here.
 */
export async function getPage(handle: string): Promise<ShopPage | null> {
  if (!shopifyConfigured() || !/^[a-z0-9-]{1,80}$/.test(handle)) return null;
  const data = await storefront<{ page: { title: string; body: string; bodySummary: string; seo: { title: string | null; description: string | null } | null } | null }>(
    `query Page($handle: String!) { page(handle: $handle) { title body bodySummary seo { title description } } }`,
    { handle },
  );
  const p = data.page;
  if (!p) return null;
  return { title: p.title, body: p.body, seoTitle: p.seo?.title || null, seoDescription: p.seo?.description || p.bodySummary || null };
}

/**
 * A plate for checkout, asked now (not cached): its reg, price, product variant (so the order uses
 * the real product and its stock goes down) and whether it's REG KING's own stock.
 * null when it's gone or not for sale.
 */
export async function plateForCheckout(handle: string): Promise<{ reg: string; price: number; variantId: string; ours: boolean } | null> {
  if (!shopifyConfigured() || !/^[a-z0-9-]{2,60}$/.test(handle)) return null;
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN as string },
    body: JSON.stringify({
      query: `query($h: String!) { product(handle: $h) { title tags variants(first: 1) { nodes { id availableForSale price { amount } } } } }`,
      variables: { h: handle },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify Storefront API ${res.status}`);
  const json = (await res.json()) as { data?: { product: { title: string; tags: string[]; variants: { nodes: { id: string; availableForSale: boolean; price: { amount: string } }[] } } | null } };
  const p = json.data?.product;
  const v = p?.variants.nodes[0];
  if (!p || !v || !v.availableForSale) return null;
  return { reg: p.title.trim().toUpperCase(), price: Number(v.price.amount), variantId: v.id, ours: p.tags.includes("regking-stock") };
}

/** One plate in the shop by its handle, asked now (not cached). null when it's gone or not for sale. */
export async function platePrice(handle: string): Promise<{ reg: string; price: number } | null> {
  if (!shopifyConfigured() || !/^[a-z0-9-]{2,60}$/.test(handle)) return null;
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN as string },
    body: JSON.stringify({ query: `{ product(handle: ${JSON.stringify(handle)}) { title availableForSale priceRange { minVariantPrice { amount } } } }` }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify Storefront API ${res.status}`);
  const json = (await res.json()) as { data?: { product: { title: string; availableForSale: boolean; priceRange: { minVariantPrice: { amount: string } } } | null } };
  const p = json.data?.product;
  if (!p || !p.availableForSale) return null;
  return { reg: p.title.trim().toUpperCase(), price: Number(p.priceRange.minVariantPrice.amount) };
}

/**
 * One line of a draft order. With `variantId` it's the shop's own product (its stock goes down when
 * paid) at the price in Shopify; without, a custom line at `price`. `discount`: money off this line.
 */
export type DraftLine = {
  title: string;
  price: number;
  variantId?: string;
  quantity?: number;
  physical?: boolean;
  discount?: { amount: number; title: string };
  attributes?: { key: string; value: string }[];
};
export type DraftOptions = {
  email?: string;
  /** Delivery charge, shown at checkout as the delivery line. */
  shipping?: { title: string; price: number };
  /** Hold the shop's own products (stock plates) for this many minutes while the customer pays. */
  holdMinutes?: number;
  /** The delivery address given on the site, so Shopify's checkout doesn't ask again. UK only. */
  address?: { name: string; line1: string; line2?: string; town: string; postcode: string; phone?: string };
};

/**
 * A checkout for something that isn't a normal shop product (a deposit, a DVLA plate):
 * creates a Shopify draft order and returns its checkout link. Needs SHOPIFY_ADMIN_TOKEN with
 * write_draft_orders. The order shows in Shopify admin like any other, with the tags given.
 */
export async function draftCheckout(lines: DraftLine[], tags: string[], note: string, opts: DraftOptions = {}): Promise<string | null> {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!process.env.SHOPIFY_STORE_DOMAIN || !token) return null;
  const money = (n: number) => ({ amount: n.toFixed(2), currencyCode: "GBP" });
  const input = {
    tags,
    note,
    allowDiscountCodesInCheckout: true,
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.shipping ? { shippingLine: { title: opts.shipping.title, priceWithCurrency: money(opts.shipping.price) } } : {}),
    ...(opts.address
      ? {
          shippingAddress: {
            firstName: opts.address.name.split(" ")[0],
            lastName: opts.address.name.split(" ").slice(1).join(" ") || undefined,
            address1: opts.address.line1,
            address2: opts.address.line2 || undefined,
            city: opts.address.town,
            zip: opts.address.postcode,
            countryCode: "GB",
            phone: opts.address.phone || undefined,
          },
        }
      : {}),
    ...(opts.holdMinutes && lines.some((l) => l.variantId) ? { reserveInventoryUntil: new Date(Date.now() + opts.holdMinutes * 60000).toISOString() } : {}),
    lineItems: lines.map((l) => ({
      ...(l.variantId ? { variantId: l.variantId } : { title: l.title, originalUnitPriceWithCurrency: money(l.price) }),
      quantity: l.quantity ?? 1,
      requiresShipping: !!l.physical,
      ...(l.discount && l.discount.amount > 0 ? { appliedDiscount: { title: l.discount.title, value: l.discount.amount, valueType: "FIXED_AMOUNT", amountWithCurrency: money(l.discount.amount) } } : {}),
      customAttributes: (l.attributes ?? []).filter((a) => a.value).map((a) => ({ key: a.key, value: a.value.slice(0, 500) })),
    })),
  };
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `mutation($input: DraftOrderInput!) { draftOrderCreate(input: $input) { draftOrder { invoiceUrl } userErrors { message } } }`,
      variables: { input },
    }),
  }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as { data?: { draftOrderCreate?: { draftOrder?: { invoiceUrl?: string }; userErrors?: { message: string }[] } }; errors?: unknown } | null;
  const url = json?.data?.draftOrderCreate?.draftOrder?.invoiceUrl ?? null;
  // shown in the hosting logs, never to the customer
  if (!url) console.error("Shopify draftOrderCreate failed", JSON.stringify(json?.data?.draftOrderCreate?.userErrors ?? json?.errors ?? res?.status));
  return url;
}

/**
 * Checkout for one of the shop's own products with notes attached (e.g. a plate source request):
 * a Storefront cart with the product and its details as line attributes. Returns the checkout link.
 */
export async function productCheckout(handle: string, attributes: { key: string; value: string }[]): Promise<string | null> {
  if (!shopifyConfigured()) return null;
  const call = async <T,>(query: string, variables: Record<string, unknown>) => {
    const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN as string },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    return ((await res.json()) as { data?: T }).data;
  };
  const p = await call<{ product: { variants: { nodes: { id: string; availableForSale: boolean }[] } } | null }>(
    `query($h: String!) { product(handle: $h) { variants(first: 1) { nodes { id availableForSale } } } }`,
    { h: handle },
  );
  const v = p?.product?.variants.nodes[0];
  if (!v?.availableForSale) return null;
  const c = await call<{ cartCreate: { cart: { checkoutUrl: string } | null } }>(
    `mutation($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } } }`,
    { input: { lines: [{ merchandiseId: v.id, quantity: 1, attributes: attributes.filter((a) => a.value).map((a) => ({ key: a.key, value: a.value.slice(0, 500) })) }] } },
  );
  return c?.cartCreate.cart?.checkoutUrl ?? null;
}
