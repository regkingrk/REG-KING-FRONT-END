"use client";

import { useEffect, useRef, useState } from "react";
import { COMPANY, reviewScores, supportEmail } from "@/lib/brand";
import { HQ, phone, whatsapp } from "@/lib/infoContent";
import type { ReviewFeed, ReviewTopic, ShownReview } from "@/lib/reviewTopics";
import { GoogleG } from "./HeroProof";
import { ArrowRight, CrownIcon, StarIcon } from "./Icons";
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

/** How long each point stays highlighted before the next. */
const WHY_MS = 3600;

export const WhyBuy = () => <WhyUs kind="buy" />;

/** The trust band at the bottom of Buy, Sell and Make: four points that light up in turn. */
export function WhyUs({ kind }: { kind: "buy" | "sell" | "make" }) {
  const { go } = useMode();
  // The four points light up in turn while the section is on screen, like the steps elsewhere on
  // the site. Hovering or focusing one holds it; reduced motion keeps them all still and equal.
  const [lit, setLit] = useState(0);
  const [hold, setHold] = useState(false);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  const box = useRef<HTMLUListElement>(null);
  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.4 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  const running = seen && !hold && !still;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLit((i) => (i + 1) % 4), WHY_MS);
    return () => clearInterval(t);
  }, [running, lit]);

  const g = useGoogleScore();
  const ico = (d: string) => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
  const since = {
    k: "since",
    icon: <CrownIcon />,
    t: "Established 2017",
    link: (
      <a href="/about" onClick={(e) => (e.preventDefault(), go("info-about"))}>
        Our story <ArrowRight />
      </a>
    ),
  };
  const reviews = {
    k: "reviews",
    icon: ico("M12 3.2l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z"),
    t: g ? `${g.score.toFixed(1)} on Google` : "Genuine reviews",
    link: (
      <a href={g?.url ?? reviewScores.trustpilot.url} target="_blank" rel="noopener noreferrer">
        {g ? `Read ${fmtCount(g.count)} reviews` : "Read our reviews"} <ArrowRight />
      </a>
    ),
  };
  const visit = {
    k: "visit",
    icon: ico("M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"),
    t: "Bilston showroom",
    link: (
      <a href={HQ.directions} target="_blank" rel="noopener noreferrer">
        Get directions <ArrowRight />
      </a>
    ),
  };
  const support = {
    k: "support",
    icon: ico("M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H5a1 1 0 0 1-1-1zM20 13h-3v6h2a1 1 0 0 0 1-1zM17 19c0 1.1-1.8 2-4 2"),
    t: "Support throughout",
    link: (
      <a href="/contact" onClick={(e) => (e.preventDefault(), go("info-contact"))}>
        Contact us <ArrowRight />
      </a>
    ),
  };
  // Free to list: confirmed by REG KING (12 Nov 2026), "we just charge when it sells".
  const free = {
    k: "free",
    icon: ico("M3 12.5V4h8.5L21 13.5 13.5 21zM7.5 8.5h.01"),
    t: "Free to list",
    link: (
      <a href="#rk-ways" onClick={(e) => (e.preventDefault(), document.getElementById("rk-ways")?.scrollIntoView({ behavior: "smooth", block: "start" }))}>
        Ways to sell <ArrowRight />
      </a>
    ),
  };
  // Made in-house and the 12-month warranty: REG KING's own wording on the Make page (27 Oct 2026).
  const inhouse = {
    k: "inhouse",
    icon: ico("M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"),
    t: "Made in-house",
    link: (
      <a href="/gallery" onClick={(e) => (e.preventDefault(), go("info-gallery"))}>
        See our work <ArrowRight />
      </a>
    ),
  };
  const warranty = {
    k: "warranty",
    icon: ico("M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6zM9 12l2 2 4-4"),
    t: "12-month warranty",
    link: (
      <a href="#mih-title" onClick={(e) => (e.preventDefault(), document.getElementById("mih-title")?.scrollIntoView({ behavior: "smooth", block: "start" }))}>
        What it covers <ArrowRight />
      </a>
    ),
  };
  const BAND = {
    buy: { title: "Why buy with REG KING?", line: "Your registration. Our priority.", points: [since, reviews, visit, support] },
    sell: { title: "Why sell with REG KING?", line: "Listing is free. We only charge when it sells.", points: [since, reviews, free, support] },
    make: { title: "Why order with REG KING?", line: "Made with precision. Backed by quality.", points: [inhouse, warranty, reviews, visit] },
  }[kind];
  const points = BAND.points;

  return (
    <section className="tr-why" id={`rk-why${kind}`} aria-labelledby={`why${kind}-title`}>
      <div className="rk-wrap tr-why__in">
        <div className="tr-why__head">
          <h2 id={`why${kind}-title`}>{BAND.title}</h2>
          <p>{BAND.line}</p>
        </div>
        <ul className="tr-why__pillars" ref={box} data-running={running || undefined} style={{ ["--why-ms" as string]: `${WHY_MS}ms` }}>
          {points.map((p, i) => (
            <li
              key={p.k}
              className="tr-pill"
              data-lit={!still && i === lit ? "" : undefined}
              onMouseEnter={() => (setLit(i), setHold(true))}
              onMouseLeave={() => setHold(false)}
              onFocus={() => (setLit(i), setHold(true))}
              onBlur={() => setHold(false)}
            >
              <i className="tr-pill__bar" aria-hidden key={`${lit}-${running}`} />
              <span className="tr-pill__icon">{p.icon}</span>
              <h3>{p.t}</h3>
              {p.link}
            </li>
          ))}
        </ul>
        <ReviewQuote topic={kind === "make" ? "plates" : kind} />
      </div>
    </section>
  );
}
