"use client";

import { linkFor } from "@/lib/routes";
import { useEffect, useState, type FormEvent } from "react";
import { DEPOSIT_RATE, depositFor, exclusivePlates, faqs, formatGBP, instagram, normaliseReg, payl8rDisclaimer, platesForSale, plateStyles, reviewScores, reviews, routes, supportEmail } from "@/lib/brand";
import { STOCK, STYLE_INFO, earliest, styleOf } from "@/lib/search";
import { SITEMAP, sectionOf } from "@/lib/sitemap";
import { DVLA_NO_DEPOSIT } from "@/lib/dvlaPricing";
import { Carousel } from "./Carousel";
import { PlatePair } from "./PlatePair";
import { CAT_GROUPS, emptyFilters, type CatKey } from "@/lib/filters";
import { ArrowRight, StarIcon } from "./Icons";
import { useMode } from "./ModeProvider";
import { AboutPage, ContactPage, FaqPage, FinancePage, GalleryPage, PoliciesPage } from "./InfoPages";

/* ------------------------------------------------------------------ */
/* Buy plates: Exclusive plates showroom                               */
/* ------------------------------------------------------------------ */

/**
 * Featured plates as a showroom: one plate at a time, large, with an index of the featured regs
 * to move between them. Nothing moves on its own.
 */
export function ExclusivePlates() {
  const { go } = useMode();
  const plates = exclusivePlates.map((r) => platesForSale.find((p) => p.reg === r)).filter(Boolean) as (typeof platesForSale)[number][];
  const [i, setI] = useState(0);
  if (!plates.length) return null;
  const p = plates[i];
  const fits = earliest(p.reg);
  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    go(`plate-${p.handle}`);
  };
  return (
    <section className="rk-show" id="rk-exclusive" aria-labelledby="featured-title">
      <div className="rk-wrap rk-show__in">
        <div className="rk-show__head">
          <h2 id="featured-title">Featured plates</h2>
          <a
            href="#buy-regking"
            onClick={(e) => {
              e.preventDefault();
              go("buy-regking");
            }}
          >
            View all plates
          </a>
        </div>

        <div className="rk-show__body">
          <div className="rk-show__stage">
            <a key={p.reg} className="rk-show__plate" href={`#plate-${p.handle}`} onClick={open} data-exclusive={p.reg}>
              <PlatePair reg={p.reg} size="lg" />
            </a>
            <div className="rk-show__info">
              <div className="rk-show__title">
                <h3>{p.reg}</h3>
                <p className="rk-show__price">{formatGBP(p.price, Number.isInteger(p.price))}</p>
              </div>
              <dl className="rk-show__facts">
                <div>
                  <dt>Format</dt>
                  <dd>{STYLE_INFO[styleOf(p.reg)].name}</dd>
                </div>
                <div>
                  <dt>Fits vehicles from</dt>
                  <dd>{fits ? fits.label : "Any age"}</dd>
                </div>
                <div>
                  <dt>Seller</dt>
                  <dd>REG KING</dd>
                </div>
              </dl>
              <a className="rk-show__go" href={`#plate-${p.handle}`} onClick={open}>
                View this plate <ArrowRight />
              </a>
            </div>
          </div>

          <ol className="rk-show__index" aria-label="Featured plates">
            {plates.map((x, n) => (
              <li key={x.reg}>
                <button type="button" aria-pressed={n === i} data-show={x.reg} onClick={() => {
                    setI(n);
                    // On phones the plate is above the list: bring it into view.
                    if (window.innerWidth < 900) document.querySelector(".rk-show__stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="rk-show__n">{String(n + 1).padStart(2, "0")}</span>
                  <span className="rk-show__reg">{x.reg}</span>
                  <span className="rk-show__p">{formatGBP(x.price, Number.isInteger(x.price))}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/**
 * Plate categories: each opens every plate in that category (the same filters as the search).
 */
export function PlateCategories() {
  const { setFilters, setBrowse } = useMode();
  const open = (cats: CatKey[]) => {
    setFilters({ ...emptyFilters(), cats });
    setBrowse(true);
    window.scrollTo({ top: 0 });
  };
  return (
    <section className="rk-cats" id="rk-categories" aria-labelledby="cats-title">
      <div className="rk-wrap rk-cats__in">
        <h2 id="cats-title" className="rk-cats__t">
          Shop by category
        </h2>
        <div className="rk-cats__grid">
          {CAT_GROUPS.map((c) => (
            <button key={c.key} type="button" className="rk-cat" data-cat-tile={c.key} onClick={() => open(c.subs)}>
              <span className="rk-cat__name">{c.label}</span>
              <span className="rk-cat__line">{c.line}</span>
              <ArrowRight />
            </button>
          ))}
          <button type="button" className="rk-cat rk-cat--all" data-cat-tile="all" onClick={() => open([])}>
            <span className="rk-cat__name">All plates</span>
            <span className="rk-cat__line">Browse everything with filters</span>
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews (real ones only)                                            */
/* ------------------------------------------------------------------ */

const Stars = ({ n = 5 }: { n?: number }) => (
  <span className="rk-stars" aria-hidden>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < n ? "is-on" : undefined}>
        <StarIcon />
      </span>
    ))}
  </span>
);

/**
 * Reviews from Trustpilot and Google, as a carousel under the featured plates.
 * The cards are real reviews; their full text loads from the official feeds at launch.
 */
export function Reviews() {
  const tp = reviewScores.trustpilot;
  return (
    <section className="rk-section rk-section--tight rk-reviews" id="rk-reviews" aria-labelledby="reviews-title">
      <div className="rk-wrap">
        <div className="rk-reviews__head">
          <h2 id="reviews-title" className="rk-shead__t">
            Reviews
          </h2>
          <div className="rk-reviews__scores">
            <a className="rk-reviews__score" href={tp.url}>
              <Stars />
              <span>
                <b>{tp.score}</b> out of 5 on Trustpilot
                <small>
                  {tp.label}, from {tp.count} reviews
                </small>
              </span>
            </a>
            {reviewScores.google ? (
              <a className="rk-reviews__score" href={reviewScores.google.url}>
                <Stars />
                <span>
                  <b>{reviewScores.google.score}</b> out of 5 on Google
                  <small>from {reviewScores.google.count} reviews</small>
                </span>
              </a>
            ) : null}
          </div>
        </div>
        {reviews.length > 0 && (
          <Carousel label="Customer reviews" interval={0} className="rk-carousel--reviews">
            {reviews.map((r) => (
              <article key={r.name + r.date} className="rk-rcard" data-review={r.source}>
                <Stars n={r.rating} />
                {r.text ? <blockquote>{r.text}</blockquote> : <p className="rk-rcard__rating">{r.rating}-star review</p>}
                <p className="rk-rcard__who">
                  <b>{r.name}</b>
                  <span>{r.date}</span>
                </p>
                <a className="rk-rcard__src" href={r.url}>
                  {r.text ? `On ${r.source}` : `Read it on ${r.source}`} <ArrowRight />
                </a>
              </article>
            ))}
          </Carousel>
        )}
        <p className="rk-bfine">A selection of our reviews. Read every review on Trustpilot and Google.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Buy plates: where plates come from                                  */
/* ------------------------------------------------------------------ */

const SOURCE_INTRO: Record<string, string> = {
  regking: "Plates REG KING owns outright. Buy today and we handle the transfer.",
  customer: "Plates our customers are selling through REG KING. We advertise them and manage the sale and transfer.",
};

export function BuySources() {
  const { item, go } = useMode();
  const all = sectionOf("buy");
  // Plate sourcing and brokerage are services, not places plates come from, so they aren't tabs here.
  const buy = { ...all, items: all.items.filter((i) => i.key !== "sourcing" && i.key !== "brokerage") };
  const [tab, setTab] = useState<string>(item && buy.items.some((i) => i.key === item) ? item : "regking");
  // Menu links (#buy-customer) switch the tab even when Buy is already open.
  useEffect(() => {
    if (item && buy.items.some((i) => i.key === item)) setTab(item);
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = buy.items.find((i) => i.key === tab) ?? buy.items[0];
  const customer = STOCK.filter((s) => s.sample).slice(0, 8);

  return (
    <section className="rk-section rk-section--tight" id="rk-buyfrom" aria-labelledby="buyfrom-title">
      <div className="rk-wrap">
        <div className="rk-shead">
          <h2 id="buyfrom-title" className="rk-shead__t">
            Buy plates
          </h2>
        </div>
        <div className="rk-srctabs" role="tablist" aria-label="Where the plates come from">
          {buy.items.map((i) => (
            <button key={i.key} type="button" role="tab" aria-selected={tab === i.key} id={`rk-src-${i.key}`} data-src={i.key} onClick={() => setTab(i.key)}>
              <b>{i.label}</b>
              <span>{i.line}</span>
            </button>
          ))}
        </div>

        <div className="rk-srcpanel" role="tabpanel" aria-labelledby={`rk-src-${active.key}`}>
          <p className="rk-srcpanel__intro">{SOURCE_INTRO[active.key]}</p>

          {active.key === "regking" && (
            <div className="rk-srcgrid">
              {platesForSale.map((p) => (
                <a key={p.handle} className="rk-pcard" href={`#plate-${p.handle}`} onClick={(e) => { e.preventDefault(); go(`plate-${p.handle}`); }}>
                  <span className="rk-card__plate">{p.reg}</span>
                  <span className="rk-pcard__row">
                    <span className="rk-pcard__price">{formatGBP(p.price, Number.isInteger(p.price))}</span>
                    <span className="rk-pcard__go" aria-hidden>
                      <ArrowRight />
                    </span>
                  </span>
                </a>
              ))}
            </div>
          )}

          {active.key === "customer" && (
            <>
              <div className="rk-srcgrid">
                {customer.map((p) => (
                  <div key={p.reg} className="rk-pcard rk-pcard--sample">
                    <span className="rk-card__plate">{p.reg}</span>
                    <span className="rk-pcard__row">
                      <span className="rk-pcard__price">{formatGBP(p.price, true)}</span>
                      <span className="rk-tag-sample">Sample</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="rk-bfine">Prototype: these are sample listings. Real customer plates appear here once seller accounts go live.</p>
              <a
                className="rk-btn rk-btn--ink"
                href="#sell"
                onClick={(e) => {
                  e.preventDefault();
                  go("sell");
                }}
              >
                Sell your plate with us <ArrowRight />
              </a>
            </>
          )}

        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Information                                                         */
/* ------------------------------------------------------------------ */

/** Deposits: 10% to reserve, comes off the price, non-refundable. Wording from REG KING's current deposit page. */
function DepositsPage() {
  const { go } = useMode();
  const pct = Math.round(DEPOSIT_RATE * 100);
  const [price, setPrice] = useState("1500");
  const n = Math.max(0, Number(price.replace(/[^\d.]/g, "")) || 0);
  const dep = depositFor(n);
  const money = (v: number) => formatGBP(v, Number.isInteger(v));
  const steps = [
    { t: `Pay ${pct}% now`, d: `Your deposit is ${pct}% of the plate's price. On a £1,500 plate, that's £150.` },
    { t: "It comes off the price", d: "Your deposit is taken off the total, so you only pay the rest later." },
    { t: "We hold the plate for you", d: "Nobody else can buy it while we hold it, for the period we agree with you." },
    { t: "Pay the balance, it's yours", d: "Settle the balance within the agreed time and the plate is secured in your name." },
  ];
  return (
    <div className="rk-dep">
      <p className="rk-info__lede">Found the plate you want but not ready to pay in full? Reserve it with a {pct}% deposit and we hold it for you.</p>

      <div className="rk-dep__calc">
        <label htmlFor="rk-dep-price">Plate price</label>
        <div className="rk-dep__in">
          <span aria-hidden>£</span>
          <input id="rk-dep-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} autoComplete="off" />
        </div>
        <dl>
          <div>
            <dt>Deposit today ({pct}%)</dt>
            <dd data-dep>{money(dep)}</dd>
          </div>
          <div>
            <dt>Balance to pay later</dt>
            <dd>{money(Math.max(0, Math.round((n - dep) * 100) / 100))}</dd>
          </div>
        </dl>
      </div>

      <h2 className="rk-dep__h">How it works</h2>
      <ol className="rk-dep__steps">
        {steps.map((s, i) => (
          <li key={s.t}>
            <span className="rk-dep__n" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <b>{s.t}</b>
              <span>{s.d}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="rk-dep__note" role="note">
        <b>Deposits are non-refundable</b>
        <span>If you decide not to go ahead with the purchase, the deposit is kept. Please make sure you want the plate before you reserve it.</span>
      </div>

      <div className="rk-dep__note" role="note" data-dep-dvla>
        <b>No deposits on DVLA plates</b>
        <span>{DVLA_NO_DEPOSIT}</span>
      </div>

      <div className="rk-dep__acts">
        <button type="button" className="rk-btn rk-btn--gold" onClick={() => go("buy-regking")}>
          Find a plate to reserve <ArrowRight />
        </button>
        <p>
          Questions first? Email <b className="rk-dep__mail">{supportEmail}</b> or message us on{" "}
          <a href={instagram.href} target="_blank" rel="noopener noreferrer">
            Instagram {instagram.handle}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function InfoBody({ page }: { page: string }) {
  const { go } = useMode();
  switch (page) {
    case "deposits":
      return <DepositsPage />;
    case "finance":
      return <FinancePage />;
    case "faqs":
      return <FaqPage />;
    case "policies":
      return <PoliciesPage />;
    case "gallery":
      return <GalleryPage />;
    case "about":
      return <AboutPage />;
    case "contact":
      return <ContactPage />;
    default:
      return null;
  }
}

/** Information pages: a list of pages on the left (a row of tabs on phones), the page on the right. */
export function InfoView() {
  const { info, go } = useMode();
  const section = sectionOf("info");
  const page = section.items.find((i) => i.key === info) ?? section.items[0];
  // Phones: the page list scrolls sideways, so bring the open page into view.
  useEffect(() => {
    const a = document.querySelector<HTMLElement>(`.rk-info__nav a[data-info="${page.key}"]`);
    const ul = a?.closest("ul");
    if (a && ul && ul.scrollWidth > ul.clientWidth) ul.scrollTo({ left: a.offsetLeft - ul.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
  }, [page.key]);
  return (
    <section className="rk-section rk-info" id="rk-info" aria-labelledby="info-title">
      <div className="rk-wrap rk-info__in">
        <nav className="rk-info__nav" aria-label="Information">
          <p className="rk-info__k">Information</p>
          <ul>
            {section.items.map((i) => (
              <li key={i.key}>
                <a
                  href={linkFor(i.hash)}
                  aria-current={i.key === page.key ? "page" : undefined}
                  data-info={i.key}
                  onClick={(e) => {
                    e.preventDefault();
                    go(i.hash);
                  }}
                >
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="rk-info__page">
          <h1 id="info-title" className="rk-info__t">
            {page.label}
          </h1>
          <InfoBody page={page.key} />
        </article>
      </div>
    </section>
  );
}
