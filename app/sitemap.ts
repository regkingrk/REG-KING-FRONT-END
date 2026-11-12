import type { MetadataRoute } from "next";
import { ACC_PRODUCTS } from "@/lib/accessoryShop";
import { exclusive } from "@/lib/exclusive";
import { CONTENT_PAGES } from "@/lib/oldUrls";
import { ROUTES, SITE_URL } from "@/lib/routes";
import { shop } from "@/lib/shopData";
import { customerPlates, regkingStock } from "@/lib/stock";

/**
 * sitemap.xml: every page search engines should index. The sections (lib/routes.ts), REG KING's
 * written pages and policies, and every plate for sale at its own address. Plates come from the
 * live Shopify copy made at build time (scripts/sync-shop.mjs), or the saved copy without it.
 * Searches, filters, the account area and checkout are left out on purpose.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = shop?.date ? new Date(`${shop.date}T00:00:00Z`) : new Date();
  const page = (path: string, priority: number, lastModified: Date = built): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, lastModified, priority });
  const plates = shop?.plates ?? [...exclusive, ...regkingStock, ...customerPlates].map((p) => ({ handle: p.handle, added: "" }));
  const seen = new Set<string>();
  return [
    page("/", 1),
    ...ROUTES.filter((r) => r.index).map((r) => page(r.path, r.path.split("/").length > 2 ? 0.7 : 0.9)),
    ...ACC_PRODUCTS.filter((a) => !a.builder).map((a) => page(`/accessories/products/${a.key}`, 0.5)),
    ...CONTENT_PAGES.map((h) => page(`/pages/${h}`, 0.6)),
    page("/privacy-policy", 0.2),
    page("/terms-of-service", 0.2),
    ...plates
      .filter((p) => !!p.handle && !seen.has(p.handle) && !!seen.add(p.handle))
      .map((p) => page(`/products/${p.handle}`, 0.5, p.added ? new Date(`${p.added}T00:00:00Z`) : built)),
  ];
}
