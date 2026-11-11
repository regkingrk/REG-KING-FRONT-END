import type { MetadataRoute } from "next";

// Search engines stay out until launch. At launch, LAUNCH=1 is set in Vercel and this opens up.
export default function robots(): MetadataRoute.Robots {
  if (process.env.LAUNCH !== "1") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, host: "https://regking.co.uk" };
}
