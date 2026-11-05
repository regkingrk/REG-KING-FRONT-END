/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three is ESM-only; let Next transpile it for older targets.
  transpilePackages: ["three"],
};

export default nextConfig;
