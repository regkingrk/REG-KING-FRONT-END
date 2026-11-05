"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatGBP, modeUrl, normaliseReg, routes, sellOptions, sellSmallPrint, sellSteps, spaceReg, type SellOption } from "@/lib/brand";
import { SOURCES, estimate, snapshotComparables, type Valuation } from "@/lib/valuation";
import { VALUATION_DATA_DATE } from "@/lib/valuationData";
import { plateNews, type NewsResult } from "@/lib/plateNews";
import { STYLE_INFO } from "@/lib/search";
import { navigate } from "@/lib/nav";
import { QuickLinks } from "./HomeSections";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";
import { SearchResults } from "./SearchResults";
import { BasketPanel } from "./MakeTools";
import { BuySources, InfoView, Reviews } from "./SectionViews";
import { NewThisWeek } from "./NewThisWeek";
import { BuyingGuide } from "./BuyingGuide";
import { AsSeenWith } from "./AsSeenWith";
import { PlateView } from "./PlateView";
import { DVLA_FEED } from "@/lib/features";
import { AccountPortal } from "./AccountPortal";
import { AdminPortal, isAdminTab } from "./AdminPortal";
import { Checkout } from "./Checkout";
import { SellWizard } from "./SellWizard";
import { Brokerage, Sourcing } from "./Brokerage";
import { AccessoriesView } from "./AccessoriesView";
import { ExclusiveVault } from "./ExclusiveVault";
import { useAccount } from "./AccountProvider";

/**
 * Value your plate: enter a reg, get a guide price drawn from several sources of real prices
 * (lib/valuation.ts), then a prompt to list it with REG KING.
 * Live site: /api/valuation gathers the sources on the server. The preview has no server, so it
 * uses the Shopify snapshots in the repo with the same maths.
 */
async function valuePlate(reg: string): Promise<Valuation | null> {
  try {
    const res = await fetch(`/api/valuation?reg=${encodeURIComponent(reg.replace(/\s/g, ""))}`, { headers: { Accept: "application/json" } });
    if ((res.headers.get("content-type") ?? "").includes("application/json")) {
      return res.ok ? ((await res.json()) as Valuation) : null;
    }
  } catch {}
  return estimate(reg, snapshotComparables());
}

const VALUE_MIN_MS = 900;
const PROMPT_AFTER_MS = 1100;

function ValueCard() {
  const { setSellReg, setSellOption, setMode, mode, go } = useMode();
  const [reg, setReg] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "none">("idle");
  const [result, setResult] = useState<Valuation | null>(null);
  const [valued, setValued] = useState("");
  const [prompt, setPrompt] = useState(false);
  const [pick, setPick] = useState<SellOption>("uplift");
  const [news, setNews] = useState<NewsResult | null>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const r = spaceReg(reg.trim().toUpperCase());
    if (r.replace(/\s/g, "").length < 2) return;
    setValued(r);
    setState("working");
    setNews(null);
    // The news check runs alongside; it fills in when it's back.
    plateNews(r).then(setNews);
    const [v] = await Promise.all([valuePlate(r), new Promise((ok) => window.setTimeout(ok, VALUE_MIN_MS))]);
    setResult(v);
    setState(v ? "done" : "none");
  };
  // Once the value has landed, ask whether they'd like to list it.
  useEffect(() => {
    if (state !== "done") return;
    const t = window.setTimeout(() => setPrompt(true), PROMPT_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [state]);
  useEffect(() => {
    if (!prompt) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPrompt(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompt]);

  const reset = () => {
    setReg("");
    setResult(null);
    setPrompt(false);
    setState("idle");
    requestAnimationFrame(() => document.getElementById("rk-value-reg")?.focus());
  };
  const list = (opt: SellOption | "") => {
    try {
      if (result) sessionStorage.setItem("rk-valuation", JSON.stringify({ reg: valued, low: result.low, high: result.high }));
    } catch {}
    setPrompt(false);
    setSellOption(opt);
    setSellReg(valued);
    if (mode !== "sell") setMode("sell");
    window.scrollTo({ top: 0 });
  };
  const range = result ? priceRange(result.low, result.high) : "";

  return (
    <section className="rk-valuer" id="sell-valuation" aria-labelledby="value-title">
      <div className="rk-wrap rk-valuer__in">
        <h2 id="value-title">Value your plate</h2>

        {state === "idle" || state === "working" ? (
          <form className="rk-valuer__form" onSubmit={onSubmit}>
            <label htmlFor="rk-value-reg" className="rk-valuer__label">
              Enter your reg
            </label>
            <input
              id="rk-value-reg"
              className="rk-valuer__plate"
              placeholder="YOUR REG"
              value={reg}
              onChange={(e) => setReg(spaceReg(e.target.value))}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={8}
              disabled={state === "working"}
            />
            <button type="submit" className="rk-valuer__go" disabled={state === "working"}>
              {state === "working" ? "Checking prices…" : "Value my plate"}
            </button>
          </form>
        ) : state === "none" ? (
          <div className="rk-valuer__result" aria-live="polite">
            <span className="rk-valuer__plate rk-valuer__plate--shown">{valued}</span>
            <p className="rk-valuer__basis">We couldn&apos;t find enough similar plates to value {valued}. Our team can value it for you, free.</p>
            <button type="button" className="rk-valuer__go" onClick={() => list("")}>
              Ask us to value it
            </button>
            <button type="button" className="rk-valuer__again" onClick={reset}>
              Value another plate
            </button>
          </div>
        ) : (
          result && (
            <div className="rk-valuer__result" aria-live="polite">
              <span className="rk-valuer__plate rk-valuer__plate--shown">{valued}</span>
              <p className="rk-valuer__est">Estimated value</p>
              <p className="rk-valuer__price" data-value-price>
                {range}
              </p>
              <p className="rk-valuer__basis">
                {result.strength === "limited"
                  ? `Only a few similar plates to go on, so treat this as a rough guide.`
                  : `From the ${result.count} most similar ${STYLE_INFO[result.style].name.toLowerCase()} plates we found.`}
              </p>

              {(result.exact || result.exactSold.length > 0) && (
                <div className="rk-valuer__exact">
                  {result.exactSold.length > 0 && (
                    <p>
                      {valued} sold through REG KING for <b>{formatGBP(result.exactSold[0].price, Number.isInteger(result.exactSold[0].price))}</b>
                      {result.exactSold[0].date ? ` in ${monthYear(result.exactSold[0].date)}` : ""}.
                    </p>
                  )}
                  {result.exact && (
                    <p>
                      {valued} is listed with us now at <b>{formatGBP(result.exact.price, Number.isInteger(result.exact.price))}</b>.
                    </p>
                  )}
                </div>
              )}

              <div className="rk-vx">
                <section className="rk-vx__sec" aria-labelledby="vx-why">
                  <h3 id="vx-why">Why this range</h3>
                  {result.summary && <p className="rk-vx__ai">{result.summary}</p>}
                  <ul className="rk-vx__comps">
                    {result.matches.map((m) => {
                      const row = (
                        <>
                          <span className="rk-valuer__mini">{m.reg}</span>
                          <span className="rk-vx__kind" data-kind={m.kind}>
                            {m.kind === "sold" ? `Sold${m.date ? ` ${monthYear(m.date)}` : ""}` : m.source === "market" ? "For sale elsewhere" : "For sale with us"}
                          </span>
                          <b>{formatGBP(m.price, Number.isInteger(m.price))}</b>
                        </>
                      );
                      return (
                        <li key={m.reg + m.kind + (m.date ?? "")}>
                          {m.handle && m.kind === "asking" ? (
                            <a href={`#plate-${m.handle}`} onClick={(e) => { e.preventDefault(); go(`plate-${m.handle}`); }}>
                              {row}
                            </a>
                          ) : (
                            <span className="rk-valuer__mrow">{row}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="rk-vx__src">
                    Based on {result.sources.map((x) => `${x.count} ${x.count === 1 ? "price" : "prices"} from ${SOURCES[x.key].name}`).join(", ")}.
                  </p>
                </section>

                {result.forSale.length > 0 && (
                  <section className="rk-vx__sec" aria-labelledby="vx-sale">
                    <h3 id="vx-sale">Similar plates for sale now</h3>
                    <ul className="rk-vx__sale">
                      {result.forSale.map((m) => (
                        <li key={m.reg}>
                          <a href={`#plate-${m.handle}`} onClick={(e) => { e.preventDefault(); go(`plate-${m.handle}`); }} data-vx-sale={m.reg}>
                            <span className="rk-valuer__mini">{m.reg}</span>
                            <b>{formatGBP(m.price, Number.isInteger(m.price))}</b>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="rk-vx__sec" aria-labelledby="vx-news" aria-live="polite">
                  <h3 id="vx-news">In the news</h3>
                  {news === null ? (
                    <p className="rk-vx__muted">Checking UK news for {valued}.</p>
                  ) : !news.checked ? (
                    <p className="rk-vx__muted">
                      {news.reason === "preview" ? `Preview: on the live site we check UK news for stories about ${valued}.` : "We couldn't check the news just now."}
                    </p>
                  ) : news.stories.length === 0 ? (
                    <p className="rk-vx__muted">We didn&apos;t find any news stories about {valued}.</p>
                  ) : (
                    <ul className="rk-vx__news">
                      {news.stories.map((n) => (
                        <li key={n.url}>
                          <a href={n.url} target="_blank" rel="noopener noreferrer">
                            <b>{n.title}</b>
                            <span>
                              {n.source}
                              {n.date ? `, ${monthYear(n.date)}` : ""}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <div className="rk-valuer__sell">
                <b>Want to sell {valued}?</b>
                <span>We&apos;ll advertise it for you and manage the sale and DVLA transfer.</span>
                <button type="button" className="rk-valuer__go" onClick={() => setPrompt(true)} data-value-list>
                  List my plate <ArrowRight />
                </button>
                <button type="button" className="rk-valuer__again" onClick={reset}>
                  Value another plate
                </button>
              </div>
            </div>
          )
        )}

        <p className="rk-valuer__note">
          Please note: this tool is AI based. It compares your reg with similar registrations and their real prices to estimate what your plate is worth. It&apos;s a guide only, and a valuation from our team may differ.
        </p>
        <p className="rk-bfine">Prototype: prices come from REG KING&apos;s Shopify store, every plate for sale and what plates sold for ({VALUATION_DATA_DATE}). The live site reads them fresh, and adds DVLA auction results and other dealers&apos; prices once those sources are confirmed.</p>
      </div>

      {prompt && result && (
        <div className="rk-lprompt" role="dialog" aria-modal="false" aria-labelledby="lprompt-t" ref={promptRef} data-list-prompt>
          <div className="rk-lprompt__in">
            <button type="button" className="rk-lprompt__x" onClick={() => setPrompt(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <div className="rk-lprompt__head">
              <span className="rk-lprompt__plate">{valued}</span>
              <div>
                <h3 id="lprompt-t">List {valued} with REG KING</h3>
                <p>
                  Guide price <b>{range}</b>. Choose how you&apos;d like to sell.
                </p>
              </div>
            </div>
            <div className="rk-lprompt__opts" role="radiogroup" aria-label="How to sell">
              {sellOptions.map((o) => (
                <button key={o.key} type="button" role="radio" aria-checked={pick === o.key} onClick={() => setPick(o.key)} data-lprompt-opt={o.key}>
                  <b>{o.title}</b>
                  <span>{o.fee}</span>
                </button>
              ))}
            </div>
            <div className="rk-lprompt__acts">
              <button type="button" className="rk-lprompt__go" onClick={() => list(pick)} data-lprompt-go>
                List my plate
              </button>
              <button type="button" className="rk-lprompt__no" onClick={() => setPrompt(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** "2026-03-14" to "Mar 2026". */
const monthYear = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

const priceRange = (low: number, high: number) => (low === high ? formatGBP(low, true) : `${formatGBP(low, true)} to ${formatGBP(high, true)}`);

/**
 * Sell page: once a reg is entered, the same List a Plate form as the account area, with that reg filled in.
 * Plate details first, the customer's details last; each plate goes to REG KING as Under Review.
 */
function SellFlow() {
  const { sellReg, sellOption } = useMode();
  return (
    <section className="rk-section lw-page" aria-labelledby="sellflow-title">
      <div className="rk-wrap lw-page__in">
        <h2 id="sellflow-title" className="lw-page__h">
          List your plate
        </h2>
        <p className="lw-page__lede">A few quick questions and it&apos;s with us. We check every plate before it goes on the site.</p>
        <SellWizard startReg={sellReg} startPkg={sellOption} />
      </div>
    </section>
  );
}

/** How long each way stays lit before the next one. */
const WAY_MS = 3200;

function SellSteps() {
  const { sellOption, setSellOption, setMode } = useMode();
  // The ways light up in turn while the section is on screen. Hovering or focusing one
  // holds it; reduced motion keeps them all still.
  const [lit, setLit] = useState(0);
  const [hold, setHold] = useState(false);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  // Any card's details open: stop cycling, so the open card stays put while it's being read.
  const [openN, setOpenN] = useState(0);
  const running = seen && !hold && !still && openN === 0;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLit((i) => (i + 1) % sellOptions.length), WAY_MS);
    return () => clearInterval(t);
  }, [running, lit]);
  return (
    <>
      <section className="rk-section rk-section--tight rk-ways3sec" id="rk-ways" aria-labelledby="ways-title">
        <div className="rk-wrap">
          <div className="rk-ways3__head">
            <h2 id="ways-title" className="rk-shead__t">
              Two ways to sell
            </h2>
            <p>
              We give <span className="rk-hl rk-ways3__you">you</span> control
            </p>
          </div>
          <div className="rk-ways3" ref={box} data-running={running || undefined} style={{ ["--way-ms" as string]: `${WAY_MS}ms` }}>
            {sellOptions.map((o, i) => (
              <article
                key={o.key}
                id={`sell-${o.key === "uplift" ? "increased" : o.key}`}
                data-picked={sellOption === o.key || undefined}
                data-lit={!still && i === lit ? "" : undefined}
                onMouseEnter={() => {
                  setLit(i);
                  setHold(true);
                }}
                onMouseLeave={() => setHold(false)}
                onFocus={() => {
                  setLit(i);
                  setHold(true);
                }}
                onBlur={() => setHold(false)}
              >
                <span className="rk-ways3__n" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="rk-ways3__bar" aria-hidden key={`${lit}-${running}`} />
                <h3>{o.title}</h3>
                <p className="rk-ways3__fee">{o.fee}</p>
                <p>{o.line}</p>
                <WayDetails
                  o={o}
                  onToggle={(on) => {
                    setOpenN((n) => Math.max(0, n + (on ? 1 : -1)));
                    if (on) setLit(i);
                  }}
                />
                <button
                  type="button"
                  className="rk-btn rk-btn--ink rk-ways3__go"
                  data-sellway={o.key}
                  onClick={() => {
                    setSellOption(o.key);
                    setMode("sell");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => document.getElementById("rk-reg")?.focus({ preventScroll: true }), 400);
                  }}
                >
                  {sellOption === o.key ? "Chosen: enter your reg" : "Sell this way"}
                </button>
              </article>
            ))}
          </div>
          <p className="rk-ways3__small">{sellSmallPrint}</p>
        </div>
      </section>
      <section className="rk-section rk-section--tight rk-sellhow" aria-labelledby="how-title">
        <div className="rk-wrap">
          <div className="rk-shead">
            <h2 id="how-title" className="rk-shead__t">
              How selling works
            </h2>
          </div>
          <ol className="rk-steps rk-steps--row">
            {sellSteps.map((s, i) => (
              <li key={s.title}>
                <span className="rk-steps__n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.line}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

/** What the Make view shows below the builder. */
/** Make: how REG KING makes its plates (wording from REG KING, 27 Oct 2026). */
const WHY = [
  { t: "Made In-House", d: "Every plate is produced at our own premises, never outsourced." },
  { t: "Premium Materials", d: "We use approved, high-quality materials for a professional, long-lasting finish." },
  { t: "Precision Manufacturing", d: "From standard printed plates to 3D gel and 4D styles, every plate is carefully manufactured." },
  { t: "Quality Checked", d: "Every order is inspected before leaving our premises." },
  { t: "12-Month Warranty", d: "All physical number plates come with a 1-year warranty against manufacturing defects." },
  { t: "Road-Legal Options", d: "Our road-legal number plates are manufactured to applicable UK standards, with the required documentation and compliance checks." },
];

function MadeInHouse() {
  return (
    <section className="rk-section rk-mih" aria-labelledby="mih-title">
      <div className="rk-wrap rk-mih__in">
        <div className="rk-mih__intro">
          <h2 id="mih-title" className="rk-mih__t">
            Made <span className="rk-nw">In-House.</span>
            <br />
            <span className="rk-mih__y">Built to Last.</span>
          </h2>
          <div className="rk-mih__copy">
            <p className="rk-mih__lede">At REG KING, quality is at the heart of every number plate we produce.</p>
            <p>Every physical number plate is manufactured in-house by our experienced team, allowing us to maintain complete control over quality, precision and finishing.</p>
            <p>We use only approved, high-quality materials and components, ensuring our plates are manufactured to the highest standards.</p>
          </div>
        </div>

        <h3 className="rk-mih__h">Why Choose REG KING?</h3>
        <ul className="rk-mih__list">
          {WHY.map((w) => (
            <li key={w.t}>
              <b>{w.t}</b>
              <span>{w.d}</span>
            </li>
          ))}
        </ul>

        <p className="rk-mih__sign">
          Made with precision. Backed by quality. <span>Crowned by REG KING.</span>
        </p>
      </div>
    </section>
  );
}

function MakeInfo() {
  const ways = [
    { title: "Delivered to your door", line: "Made to order and posted to you.", icon: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
    { title: "Collect in Bilston", line: "Pick them up from our Wolverhampton shop.", icon: "M4 10v10h16V10M3 10l2-6h14l2 6zM10 20v-6h4v6" },
    { title: "Collect & fit", line: "We'll fit them for you when you collect.", icon: "M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" },
  ];
  return (
    <>
      <section className="rk-section rk-section--tight rk-section--ways" aria-labelledby="ways-title">
        <div className="rk-wrap">
          <div className="rk-shead">
            <h2 id="ways-title" className="rk-shead__t">
              Delivery or collection
            </h2>
          </div>
          <div className="rk-ways">
            {ways.map((w) => (
              <div key={w.title} className="rk-way">
                <span className="rk-steps__n rk-way__icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={w.icon} />
                  </svg>
                </span>
                <div>
                  <h3>{w.title}</h3>
                  <p>{w.line}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function OtherTab({ label, to }: { label: string; to: "buy" | "sell" }) {
  const { setMode } = useMode();
  return (
    <div className="rk-othertab">
      <button
        type="button"
        onClick={() => {
          setMode(to);
          document.getElementById("rk-hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {label} <ArrowRight />
      </button>
    </div>
  );
}

/**
 * Everything below the hero follows the Buy / Sell / Make tab.
 * Buy: plates for sale, auctions, buying tools. Sell: value + how it works.
 * Make: the builder lives in the hero; below it, finishes and delivery.
 */
export function TabViews() {
  const { mode, query, sellReg, info, acc, item, plate, browse, account, vault, page } = useMode();
  const results = mode === "buy" && (!!query || browse);
  const buyItem = mode === "buy" && (item === "regking" || item === "customer" || (DVLA_FEED && item === "dvla")) ? item : null;
  if (info) return <InfoView key={info} />;
  if (acc) return <AccessoriesView />;
  if (page?.startsWith("admin:")) {
    const t = page.slice(6);
    return <AdminPortal tab={isAdminTab(t) ? t : "overview"} />;
  }
  if (page === "checkout") return <Checkout />;
  if (account) return <AccountPortal key={account} tab={account} />;
  if (plate) return <PlateView key={plate} handle={plate} />;
  // Services: Buy > Plate sourcing, and Brokerage (under both Buy and Sell).
  if (mode === "buy" && item === "sourcing") return <Sourcing />;
  if ((mode === "buy" || mode === "sell") && item === "brokerage") return <Brokerage key={mode} side={mode === "sell" ? "sell" : "buy"} />;
  if (vault) return <ExclusiveVault key={item} kind={item === "regking" || item === "customer" ? item : "exclusive"} />;
  return (
    <div key={mode + (query ? ":" + query : browse ? ":browse" : "") + (mode === "sell" && sellReg ? ":sell" : "") + (buyItem ? ":" + buyItem : "")} className="rk-tabview" data-view={mode}>
      {results && (
        <>
          <SearchResults query={query} />
          <QuickLinks />
        </>
      )}
      {/* Buy home: featured plates and reviews, nothing else. The menu's Buy pages
          (REG KING plates, customer plates, DVLA) open on their own. */}
      {mode === "buy" && !results && !buyItem && (
        <>
          <NewThisWeek />
          <BuyingGuide />
          <AsSeenWith />
        </>
      )}
      {mode === "buy" && !results && buyItem && <BuySources />}
      {mode === "sell" && sellReg && (
        <>
          <SellFlow />
          <SellSteps />
          <OtherTab label="Looking to buy a plate instead?" to="buy" />
        </>
      )}
      {mode === "sell" && !sellReg && (
        <>
          <ValueCard />
          <SellSteps />
          <OtherTab label="Looking to buy a plate instead?" to="buy" />
        </>
      )}
      {mode === "build" && (
        <>
          <BasketPanel />
          <MadeInHouse />
          <MakeInfo />
          <OtherTab label="Looking for a private plate instead?" to="buy" />
        </>
      )}
      <a className="rk-visually-hidden" href={routes.buy}>
        Browse all plates for sale
      </a>
    </div>
  );
}

/** "How it works" under each way to sell: opens the full explanation and a worked example. */
function WayDetails({ o, onToggle }: { o: (typeof sellOptions)[number]; onToggle: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const d = o.details as { body: readonly string[]; example: string; ideal: string; note?: string };
  const id = `way-more-${o.key}`;
  return (
    <div className="rk-ways3__more" data-open={open || undefined}>
      <button
        type="button"
        className="rk-ways3__toggle"
        aria-expanded={open}
        aria-controls={id}
        data-way-more={o.key}
        onClick={() => {
          setOpen(!open);
          onToggle(!open);
        }}
      >
        {open ? "Hide details" : "How it works"}
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="rk-ways3__detail" id={id} hidden={!open}>
        {d.body.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <div className="rk-ways3__eg">
          <b>Example</b>
          <p>{d.example}</p>
        </div>
        {d.note && <p className="rk-ways3__note">{d.note}</p>}
        <p className="rk-ways3__ideal">{d.ideal}</p>
      </div>
    </div>
  );
}
