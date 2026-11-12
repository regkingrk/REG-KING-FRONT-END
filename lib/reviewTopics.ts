/**
 * Which part of the customer journey a review talks about, read from the review's own words.
 * Used only to choose which genuine review to show where (Buy, Make, Sell...). Reviews are
 * never edited, shortened mid-sentence or reworded.
 */
export type ReviewTopic = "buy" | "plates" | "sell" | "delivery" | "service";

const TESTS: Record<Exclude<ReviewTopic, "service">, RegExp> = {
  buy: /\b(private (reg|plate|number)|registration|new reg\b|bought (my|a|the) (new )?(reg|number)|transfer|assign|retention|v750|v5c|certificate)/i,
  sell: /\b(sold my|selling my|sell my|sold (it|the plate)|listed my)\b/i,
  plates: /\b(3d|4d|gel|bevel|show plates?|number plates?|plates? (made|fitted)|fitted|finish|quality)\b/i,
  delivery: /\b(deliver(y|ed)|posted|arrived|royal mail|tracking|next day)\b/i,
};

export function topicsOf(text: string): ReviewTopic[] {
  const out = (Object.keys(TESTS) as (keyof typeof TESTS)[]).filter((k) => TESTS[k].test(text));
  return [...out, "service"];
}

/** A review as the site shows it, with the attribution Google requires. */
export type ShownReview = {
  name: string;
  /** link to the reviewer's Google profile */
  profile: string | null;
  photo: string | null;
  rating: number;
  /** Google's own wording, e.g. "2 months ago" */
  when: string;
  text: string;
  /** the review on Google Maps */
  link: string | null;
  topics: ReviewTopic[];
};
export type ReviewFeed = { score: number | null; count: number | null; profile: string | null; reviews: ShownReview[] };
