/**
 * GET /api/plate-news?reg=F1
 * Searches UK news for stories that mention a registration (lib/plateNews.ts keeps only the ones
 * that are about plates). Cached for a day per reg.
 *
 * Environment (hosting settings only):
 *   GNEWS_API_KEY   key for gnews.io (a news search API with a paid plan for commercial sites)
 *                   CONFIRM the provider before launch. Any news API that searches by phrase will do;
 *                   only this file changes.
 * Without the key it answers 503 and the valuation simply doesn't show a news section.
 */
import { NextResponse } from "next/server";
import { normaliseReg, spaceReg } from "@/lib/brand";
import { relevant, type NewsStory } from "@/lib/plateNews";

export const dynamic = "force-dynamic";

type GNewsArticle = { title?: string; description?: string; url?: string; publishedAt?: string; source?: { name?: string } };

export async function GET(req: Request) {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return NextResponse.json({ checked: false, reason: "unavailable" }, { status: 503 });
  const bare = normaliseReg(new URL(req.url).searchParams.get("reg") ?? "").replace(/\s/g, "");
  if (bare.length < 2 || bare.length > 7 || !/^[A-Z0-9]+$/.test(bare)) return NextResponse.json({ error: "Enter a registration." }, { status: 400 });
  const reg = spaceReg(bare);

  // The reg as a phrase, with and without its space, alongside plate words.
  const phrases = [...new Set([`"${reg}"`, `"${bare}"`])].join(" OR ");
  const q = `(${phrases}) AND (plate OR registration OR DVLA)`;
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&country=gb&max=25&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { next: { revalidate: 86400 } }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ checked: false, reason: "unavailable" }, { status: 502 });
  const data = (await res.json()) as { articles?: GNewsArticle[] };
  const stories: NewsStory[] = (data.articles ?? [])
    .filter((a) => a.title && a.url && /^https:\/\//.test(a.url))
    .map((a) => ({ title: a.title!, source: a.source?.name ?? "", date: (a.publishedAt ?? "").slice(0, 10), url: a.url!, snippet: a.description ?? "" }));
  return NextResponse.json({ checked: true, stories: relevant(stories, reg) }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
