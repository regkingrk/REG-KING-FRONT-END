/**
 * "In the news": UK news stories that mention a registration, for the valuation tool.
 * A plate that's been in the papers (a record sale, a famous owner) is worth knowing about.
 *
 * The search runs on the server (app/api/plate-news/route.ts) with a news API key from the
 * hosting settings. The preview has no server, so it says the check runs on the live site.
 *
 * A story only counts if it mentions the registration AND talks about plates, so "F1" doesn't
 * pull in every Formula 1 story.
 */
export type NewsStory = { title: string; source: string; date: string; url: string; snippet: string };
export type NewsResult = { checked: true; stories: NewsStory[] } | { checked: false; reason: "preview" | "unavailable" };

const PLATE_WORDS = /\b(number ?plates?|private plates?|personali[sz]ed plates?|registration|reg plates?|cherished|dvla|plate)\b/i;

/** Does this text mention the reg as a word, with or without its space? */
export function mentions(text: string, reg: string) {
  const bare = reg.replace(/\s+/g, "").toUpperCase();
  const spaced = reg.trim().toUpperCase().replace(/\s+/g, " ");
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^A-Z0-9])(${esc(bare)}|${esc(spaced)}|${esc(spaced.replace(" ", "-"))})([^A-Z0-9]|$)`, "i");
  return re.test(text);
}

/** Keep stories that mention the reg and are about plates. Newest first, no duplicates. */
export function relevant(stories: NewsStory[], reg: string): NewsStory[] {
  const seen = new Set<string>();
  return stories
    .filter((s) => {
      const text = `${s.title} ${s.snippet}`;
      return mentions(text, reg) && PLATE_WORDS.test(text);
    })
    .filter((s) => {
      const k = s.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
}

const inPreview = () => typeof window !== "undefined" && "__RK_LOAD__" in window;

export async function plateNews(reg: string): Promise<NewsResult> {
  if (inPreview()) return { checked: false, reason: "preview" };
  try {
    const res = await fetch(`/api/plate-news?reg=${encodeURIComponent(reg.replace(/\s/g, ""))}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return { checked: false, reason: "unavailable" };
    return (await res.json()) as NewsResult;
  } catch {
    return { checked: false, reason: "unavailable" };
  }
}
