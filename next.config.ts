import type { NextConfig } from "next";
import { oldSiteRedirects } from "./lib/oldUrls";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three is ESM-only; let Next transpile it for older targets.
  transpilePackages: ["three"],
  // Addresses from the old Shopify site keep working (see lib/oldUrls.ts).
  async redirects() {
    return [
      // the old site's search: /search?q=AB12 → the new search
      { source: "/search", has: [{ type: "query", key: "q", value: "(?<q>.*)" }], destination: "/?q=:q", permanent: true },
      { source: "/search", destination: "/#buy", permanent: true },
      ...oldSiteRedirects(),
    ];
  },
};

export default nextConfig;
