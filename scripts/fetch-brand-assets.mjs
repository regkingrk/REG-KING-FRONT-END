// Downloads the OFFICIAL REG KING artwork from the live Shopify store into
// /public/brand so the redesign uses the real files (no redraws).
// Runs automatically before `dev` and `build`; safe to re-run.
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "brand");
const FILES = [
  {
    name: "regking-logo.png",
    // 1200px rendition of transparent_1.png (master is 5029×1765)
    url: "https://regking.co.uk/cdn/shop/files/transparent_1_1200x1200.png?v=1614292192",
  },
  {
    name: "regking-logo@master.png",
    url: "https://regking.co.uk/cdn/shop/files/transparent_1.png?v=1614292192",
  },
  {
    name: "regking-roundel.png",
    url: "https://regking.co.uk/cdn/shop/files/1__2_-removebg-preview.png?v=1614292694",
  },
];

await mkdir(OUT, { recursive: true });

for (const f of FILES) {
  const dest = join(OUT, f.name);
  try {
    await access(dest);
    continue; // already present (or replaced with a supplied original) — keep it
  } catch {}
  try {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`[brand] saved ${f.name}`);
  } catch (err) {
    console.warn(`[brand] could not fetch ${f.name}: ${err.message}. Add it to public/brand manually.`);
  }
}

try {
  await access(join(OUT, "crown.png"));
} catch {
  console.log("[brand] no crown.png yet — scene 1 uses the gold R mark from the official wordmark.");
}
