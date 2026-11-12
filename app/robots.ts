import type { MetadataRoute } from "next";

/**
 * robots.txt. Until launch (LAUNCH=1 in Vercel) every crawler is kept out. After launch, search and
 * AI search crawlers (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot and the rest) may crawl the
 * public site; searches, the staff studio and the API stay out. GPTBot (OpenAI model training) is
 * left as the default, allowed, until REG KING decides otherwise (Task 7). The Vercel test address is
 * kept out of search by an X-Robots-Tag header (next.config.ts), not here.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.LAUNCH !== "1") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/api/", "/*?q="] }],
    sitemap: "https://regking.co.uk/sitemap.xml",
    host: "https://regking.co.uk",
  };
}
