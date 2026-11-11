/**
 * Addresses from the old Shopify site (regking.co.uk), so links people saved and Google results
 * keep working after the switch. Plates keep their exact address (/products/<handle>); everything
 * else moves with a permanent (301) redirect, which tells Google where the page went.
 *
 * Taken from the live store on 11 November 2026: 11 collections, 33 pages, the products that
 * aren't plates. Re-check before launch in case pages were added since.
 */

/** Products that aren't registrations: where their old address now goes. */
export const PRODUCT_REDIRECTS: Record<string, string> = {
  // the old "Build Your Plate" product and the plate-style listings → the plate builder
  "build-your-own-number-plate": "/#make-plates",
  "normal-standard-plates": "/#make-plates",
  "3d-gel-gloss-black": "/#make-plates",
  "4d-plates": "/#make-plates",
  plates: "/#make-plates",
  // accessories → their own pages in the Accessories shop
  "number-plate-sticky-pads": "/#accessories-item-pads",
  "number-plate-screw-kit": "/#accessories-item-screws",
  "number-plate-holder": "/#accessories-item-plate-holder",
  "suction-cups": "/#accessories-mounting",
};

/** Old collections → the matching part of the new site. Anything not listed goes to Buy. */
export const COLLECTION_REDIRECTS: Record<string, string> = {
  "exclusive-plates": "/#buy-exclusive",
  "plates-rk-stock-offer-eligable": "/#buy-regking",
  "customer-plates-for-sale": "/#buy-customer",
  "plates-for-sale": "/#buy",
  all: "/#buy",
  frontpage: "/",
  "3d-gel": "/#make-plates",
  "4d-plates": "/#make-plates",
  "home-page-collection": "/#make-plates",
  extras: "/#accessories",
  "asset-pack-67722805250-example-products": "/",
};

/**
 * Old pages with REG KING's own written content (local search pages, guides, policies). They stay
 * at the same address, shown in the new design, with the wording loaded live from Shopify.
 */
export const CONTENT_PAGES = [
  "number-plate-shop-near-me",
  "registration-plates-near-me",
  "plates-near-me",
  "number-plate-maker-near-me",
  "number-plate-shop-near-me-bilston-reg-king",
  "legal-number-plates",
  "3d-number-plates",
  "4d-number-plates",
  "replacement-number-plates",
  "buying-a-customer-owned-registration",
  "reg-king-physical-number-plate-warranty-policy",
  "plate-deposits",
  "legal-notice",
  "refund-policy",
  "shipping-policy",
] as const;

/** Old pages that move: page-builder pages, duplicates and empty pages → their new home. */
export const PAGE_REDIRECTS: Record<string, string> = {
  "contact-us": "/#info-contact",
  faqs: "/#info-faqs",
  "regking-finance": "/#info-finance",
  "apply-for-payl8r-finance": "/#info-finance",
  "payl8r-powered-by-dopple": "/#info-finance",
  "regking-gallery-kwqo": "/#info-gallery",
  "standard-pagejiza6": "/#info-gallery",
  "sell-your-playe": "/#sell",
  "sell-your-platef2idb": "/#sell",
  se: "/#sell",
  "se-1": "/#sell",
  "plate-deposit5sjpk": "/pages/plate-deposits",
  "search-for-a-plate": "/#buy",
  "number-plates-near-me": "/pages/number-plate-shop-near-me", // empty page
  "privacy-policy": "/privacy-policy",
  "terms-of-service": "/terms-of-service",
};

/** Shopify's built-in addresses. */
export const OTHER_REDIRECTS: { source: string; destination: string }[] = [
  { source: "/policies/privacy-policy", destination: "/privacy-policy" },
  { source: "/policies/terms-of-service", destination: "/terms-of-service" },
  { source: "/policies/refund-policy", destination: "/pages/refund-policy" },
  { source: "/policies/shipping-policy", destination: "/pages/shipping-policy" },
  { source: "/cart", destination: "/#checkout" },
  { source: "/account", destination: "/#account" },
  { source: "/account/:path*", destination: "/#account" },
  { source: "/collections", destination: "/#buy" },
  { source: "/blogs/:path*", destination: "/" },
];

/** Every fixed redirect, in the shape next.config's redirects() wants (all permanent). */
export function oldSiteRedirects() {
  const out: { source: string; destination: string; permanent: true }[] = [];
  for (const [h, to] of Object.entries(PRODUCT_REDIRECTS)) out.push({ source: `/products/${h}`, destination: to, permanent: true });
  for (const [h, to] of Object.entries(COLLECTION_REDIRECTS)) out.push({ source: `/collections/${h}`, destination: to, permanent: true });
  // a product seen inside a collection: /collections/x/products/y → /products/y
  out.push({ source: "/collections/:c/products/:handle", destination: "/products/:handle", permanent: true });
  // any other collection → Buy
  out.push({ source: "/collections/:c", destination: "/#buy", permanent: true });
  for (const [h, to] of Object.entries(PAGE_REDIRECTS)) out.push({ source: `/pages/${h}`, destination: to, permanent: true });
  for (const r of OTHER_REDIRECTS) out.push({ ...r, permanent: true });
  return out;
}

export const isContentPage = (handle: string) => (CONTENT_PAGES as readonly string[]).includes(handle);
