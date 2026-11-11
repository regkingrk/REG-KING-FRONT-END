import type { ShopData } from "../shopData";

/**
 * Written by scripts/sync-shop.mjs before each build, from the live Shopify store.
 * null = not synced (the preview, or no Shopify connection): the site uses its saved copy.
 * Don't edit by hand.
 */
export const SHOP: ShopData | null = null;
