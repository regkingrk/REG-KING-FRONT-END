/**
 * GET /api/reviews
 * REG KING's Google rating, review count and the reviews Google's Places API returns (up to 5),
 * fetched on the server with GOOGLE_PLACES_API_KEY so the key never reaches the browser.
 * Without the key it returns no reviews and the site shows the score saved in lib/brand.ts.
 *
 * The place is checked against REG KING's own Google listing (its Maps id), so another business
 * with a similar name can never be shown by mistake.
 */
import { NextResponse } from "next/server";
import { topicsOf, type ReviewFeed } from "@/lib/reviewTopics";

export const revalidate = 21600;

const OUR_CID = "15230537073648082145";
const FIELDS = ["id", "rating", "userRatingCount", "reviews", "googleMapsUri"];
const EMPTY: ReviewFeed = { score: null, count: null, profile: null, reviews: [] };

type Place = {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

async function findPlace(key: string): Promise<Place | null> {
  const headers = { "X-Goog-Api-Key": key, "Content-Type": "application/json" };
  const id = process.env.GOOGLE_PLACE_ID;
  if (id) {
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=en-GB`, {
      headers: { ...headers, "X-Goog-FieldMask": FIELDS.join(",") },
      next: { revalidate },
    });
    return r.ok ? ((await r.json()) as Place) : null;
  }
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { ...headers, "X-Goog-FieldMask": FIELDS.map((f) => `places.${f}`).join(",") },
    body: JSON.stringify({ textQuery: "REG KING, 48a Willenhall Rd, Bilston WV14 6NW", regionCode: "GB", languageCode: "en-GB" }),
    next: { revalidate },
  });
  if (!r.ok) return null;
  const places = ((await r.json()) as { places?: Place[] }).places ?? [];
  return places.find((p) => p.googleMapsUri?.includes(OUR_CID)) ?? null;
}

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json(EMPTY);
  try {
    const p = await findPlace(key);
    if (!p) return NextResponse.json(EMPTY);
    const feed: ReviewFeed = {
      score: typeof p.rating === "number" ? p.rating : null,
      count: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      profile: p.googleMapsUri ?? null,
      reviews: (p.reviews ?? [])
        .map((v) => {
          const text = (v.originalText?.text ?? v.text?.text ?? "").trim();
          return {
            name: v.authorAttribution?.displayName ?? "A Google user",
            profile: v.authorAttribution?.uri ?? null,
            photo: v.authorAttribution?.photoUri ?? null,
            rating: v.rating ?? 0,
            when: v.relativePublishTimeDescription ?? "",
            text,
            link: v.googleMapsUri ?? null,
            topics: topicsOf(text),
          };
        })
        // only full-marks reviews with words in them are featured; every review is on Google
        .filter((v) => v.rating === 5 && v.text.length >= 40),
    };
    return NextResponse.json(feed);
  } catch {
    return NextResponse.json(EMPTY);
  }
}
