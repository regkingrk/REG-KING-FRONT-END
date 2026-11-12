import type { NextConfig } from "next";
import { oldSiteRedirects } from "./lib/oldUrls";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three is ESM-only; let Next transpile it for older targets.
  transpilePackages: ["three"],
  // Only regking.co.uk goes into search: any other address the site answers on (the Vercel test
  // and preview addresses) tells search engines not to index it.
  async headers() {
    return [
      {
        source: "/:path*",
        missing: [{ type: "host", value: "(www\\.)?regking\\.co\\.uk" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  // Addresses from the old Shopify site keep working (see lib/oldUrls.ts).
  async redirects() {
    return [
      // the old site's search: /search?q=AB12 → the new search
      { source: "/search", has: [{ type: "query", key: "q", value: "(?<q>.*)" }], destination: "/private-number-plates?q=:q", permanent: true },
      { source: "/search", destination: "/private-number-plates", permanent: true },
      ...oldSiteRedirects(),
    ];
  },
};

export default nextConfig;
