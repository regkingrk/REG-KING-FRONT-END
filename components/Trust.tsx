"use client";

import { useEffect, useState } from "react";
import { COMPANY, reviewScores, supportEmail } from "@/lib/brand";
import { HQ, phone, whatsapp } from "@/lib/infoContent";
import type { ReviewFeed, ReviewTopic, ShownReview } from "@/lib/reviewTopics";
import { GoogleG } from "./HeroProof";
import { ArrowRight, StarIcon } from "./Icons";
import { useMode } from "./ModeProvider";

/**
 * Trust across the customer journey (Task 8): the Google score, one genuine review that matches the
 * page, how to reach the team, and REG KING's verified business details. Every number comes from
 * REG KING's own profiles; every review is Google's own text with its author, unedited.
 */

/* ------------------------------------------------------------------ */
/* Google reviews: one request per visit, shared by every block        */
/* ------------------------------------------------------------------ */
let feedPromise: Promise<ReviewFeed | null> | null = null;
function loadFeed() {
  feedPromise ??= fetch("/api/reviews")
    .then((r) => (r.ok ? (r.json() as Promise<ReviewFeed>) : null))
    .catch(() => null);
  return feedPromise;
}
function useFeed() {
  const [feed, setFeed] = useState<ReviewFeed | null>(null);
  useEffect(() => {
    let live = true;
    loadFeed().then((f) => live && setFeed(f));
    return () => {
      live = false;
    };
  }, []);
  return feed;
}

/** The Google score: live when the feed has it, otherwise as read from the profile (lib/brand.ts). */
function useGoogleScore() {
  const feed = useFeed();
  const saved = reviewScores.google;
  const score = feed?.score ?? saved?.score ?? null;
  const count = feed?.count ?? saved?.count ?? null;
  const url = saved?.url ?? feed?.profile ?? null;
  return score !== null && count !== null && url ? { score, count, url } : null;
}

const fmtCount = (n: number) => n.toLocaleString("en-GB");

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span className="tr-stars" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} data-on={i < Math.round(n) || undefined}>
          <StarIcon />
        </i>
      ))}
    </span>
  );
}

/** One line: the Google logo, score, stars and review count, linking to the profile. */
export function GoogleScore({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  const g = useGoogleScore();
  if (!g) return null;
  return (
    <a className="tr-score" data-tone={tone} data-compact={compact || undefined} href={g.url} target="_blank" rel="noopener noreferrer" aria-label={`${g.score.toFixed(1)} out of 5 from ${fmtCount(g.count)} Google reviews. Read them on Google.`}>
      <GoogleG className="tr-score__g" />
      <b>{g.score.toFixed(1)}</b>
      <Stars n={g.score} />
      <span>{compact ? `${fmtCount(g.count)} reviews` : `from ${fmtCount(g.count)} Google reviews`}</span>
    </a>
  );
}

/**
 * One genuine Google review about this part of the journey. It shows only when Google's feed has
 * a review that talks about it (no review is better than one that doesn't fit), with Google's own
 * attribution: the reviewer's name and profile, when it was posted, and a link to it on Google.
 */
export function ReviewQuote({ topic, tone = "light" }: { topic: ReviewTopic; tone?: "light" | "dark" }) {
  const feed = useFeed();
  const r: ShownReview | undefined = feed?.reviews.find((v) => v.topics.includes(topic));
  if (!r) return null;
  return (
    <figure className="tr-quote" data-tone={tone}>
      <Stars n={r.rating} />
      <blockquote>
        <p>{r.text}</p>
      </blockquote>
      <figcaption>
        {r.photo && <img src={r.photo} alt="" width={28} height={28} referrerPolicy="no-referrer" />}
        <span>
          {r.profile ? (
            <a href={r.profile} target="_blank" rel="noopener noreferrer">
              {r.name}
            </a>
          ) : (
            <b>{r.name}</b>
          )}
          <small>
            {r.when ? `${r.when}, ` : ""}
            {r.link ? (
              <a href={r.link} target="_blank" rel="noopener noreferrer">
                on Google
              </a>
            ) : (
              "on Google"
            )}
          </small>
        </span>
      </figcaption>
    </figure>
  );
}

/** Today's phone and online hours, e.g. "Open today 8am to 10pm". */
function todayOnline() {
  const d = new Date().getDay();
  const row = d === 0 ? HQ.onlineHours[2] : d === 6 ? HQ.onlineHours[1] : HQ.onlineHours[0];
  return row ? `Phone and WhatsApp today: ${row.time}` : null;
}

/** How to reach the team, for the place in the journey it sits in. */
export function SupportStrip({ title, line, tone = "light" }: { title: string; line: string; tone?: "light" | "dark" }) {
  const { go } = useMode();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayOnline()), []);
  return (
    <aside className="tr-help" data-tone={tone} aria-label={title}>
      <div className="tr-help__say">
        <h3>{title}</h3>
        <p>{line}</p>
        {today && <p className="tr-help__hours">{today}</p>}
      </div>
      <ul className="tr-help__ways">
        <li>
          <a href={`tel:${phone.tel}`}>
            <small>Call</small>
            {phone.display}
          </a>
        </li>
        <li>
          <a href={whatsapp.href} target="_blank" rel="noopener noreferrer">
            <small>WhatsApp</small>
            {whatsapp.display}
          </a>
        </li>
        <li>
          <a href={`mailto:${supportEmail}`}>
            <small>Email</small>
            {supportEmail}
          </a>
        </li>
        <li>
          <a href="/contact" onClick={(e) => (e.preventDefault(), go("info-contact"))}>
            <small>Visit</small>
            {HQ.lines[0]}, {HQ.lines[2]}
          </a>
        </li>
      </ul>
    </aside>
  );
}

/** What DVLA registration means, in plain words, without suggesting the DVLA endorses us. */
// Checked against GOV.UK "Register as a number plate supplier" and DVLA leaflets INF136 and INF195/2 (12 Nov 2026).
export const DVLA_MEANS = `Any business that makes or sells number plates has to register with the DVLA. REG KING is a registered number plate supplier, reference ${COMPANY.dvlaRef}. It means we see original ID and proof of entitlement before we make road legal plates, and keep records of the plates we supply for three years. It isn't an endorsement of REG KING or our products by the DVLA.`;

/* ------------------------------------------------------------------ */
/* Buy: Why buy with REG KING?                                         */
/* ------------------------------------------------------------------ */

export function WhyBuy() {
  const { go } = useMode();
  return (
    <section className="tr-why" id="rk-whybuy" aria-labelledby="whybuy-title">
      <div className="rk-wrap tr-why__in">
        <header className="tr-why__head">
          <h2 id="whybuy-title">Why buy with REG KING?</h2>
          <GoogleScore tone="dark" />
        </header>

        <ul className="tr-why__pillars">
          <li className="tr-pill">
            <span className="tr-pill__mark" aria-hidden>
              2017
            </span>
            <h3>Established since 2017</h3>
            <p>REG KING began in 2017 with two private registrations. Today we buy, sell and make number plates from our own showroom in Bilston, open since August 2025.</p>
            <a href="/about" onClick={(e) => (e.preventDefault(), go("info-about"))}>
              Our story <ArrowRight />
            </a>
          </li>

          <li className="tr-pill">
            <span className="tr-pill__mark" aria-hidden>
              <GoogleG className="tr-pill__g" />
            </span>
            <h3>Genuine customer reviews</h3>
            <p>Read what our customers say on Google and Trustpilot, in their own words, and check our reputation for yourself.</p>
            <GoogleScore tone="dark" compact />
            <a href={reviewScores.trustpilot.url} target="_blank" rel="noopener noreferrer">
              {reviewScores.trustpilot.score} out of 5 on Trustpilot <ArrowRight />
            </a>
          </li>

          <li className="tr-pill tr-pill--visit">
            <img className="tr-pill__photo" src="/media/accessories-wall.jpg" alt="The plate wall inside the REG KING showroom in Bilston" loading="lazy" decoding="async" width={1381} height={1400} />
            <h3>A real business you can visit</h3>
            <address>
              REG KING
              {HQ.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
            <a href={HQ.directions} target="_blank" rel="noopener noreferrer">
              Get directions <ArrowRight />
            </a>
          </li>

          <li className="tr-pill">
            <span className="tr-pill__mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16v11H8l-4 4zM8 9h8M8 12h5" />
              </svg>
            </span>
            <h3>Support throughout your purchase</h3>
            <p>After you order, one of the team calls you to go through your documents and the transfer. How long it takes depends on the plate and on DVLA, so we tell you what to expect for yours.</p>
            <a href="/contact" onClick={(e) => (e.preventDefault(), go("info-contact"))}>
              Contact the team <ArrowRight />
            </a>
          </li>
        </ul>

        <ReviewQuote topic="buy" tone="dark" />

        <div className="tr-why__promise">
          <h3>Your registration. Our priority.</h3>
          <p>
            At REG KING, we understand that purchasing a private registration is an important investment. That&apos;s why we focus on clear communication, transparent processes and professional support throughout your purchase.
          </p>
        </div>
      </div>
    </section>
  );
}
