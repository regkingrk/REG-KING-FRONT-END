"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatGBP, modeUrl, normaliseReg, routes, sellOptions, sellSmallPrint, sellSteps, spaceReg, type SellOption } from "@/lib/brand";
import { navigate } from "@/lib/nav";
import { QuickLinks } from "./HomeSections";
import { ArrowRight, CrownIcon } from "./Icons";
import { useMode } from "./ModeProvider";
import { SearchResults } from "./SearchResults";
import { BasketPanel } from "./MakeTools";
import { BuySources, InfoView, Reviews } from "./SectionViews";
import { NewThisWeek } from "./NewThisWeek";
import { BuyingGuide } from "./BuyingGuide";
import { AsSeenWith } from "./AsSeenWith";
import { GoogleScore, WhyBuy, WhyUs } from "./Trust";
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
 * Value my plate: a request to the REG KING team, not an automatic price. The reg comes from the
 * plate box at the top of Sell (set to "Value my plate"); the customer adds their name, email and
 * phone; the request is saved for the team (/api/valuation-request), who value the plate and get in
 * touch. Then we invite them to create a free account.
 */
function ValueCard() {
  const { valueAsk, setValueAsk, go } = useMode();
  const { customer } = useAccount();
  const box = useRef<HTMLElement>(null);
  const [reg, setReg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [trap, setTrap] = useState("");
  const [held, setHeld] = useState<"" | "vehicle" | "retention" | "unsure">("");
  const [note, setNote] = useState("");
  const [makeAccount, setMakeAccount] = useState(true);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  // A question that has just appeared is brought into view (the pop-up scrolls on small screens).
  const reveal = useCallback((el: HTMLElement | null) => {
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, []);
  // A reg from the plate box opens the form here, filled in with what we already know.
  useEffect(() => {
    if (!valueAsk) return;
    setReg(spaceReg(valueAsk.reg.toUpperCase()));
    setState("form");
    setError("");
    setTried(false);
    setHeld("");
    setNote("");
    if (customer) {
      setName((n) => n || customer.name);
      setEmail((e) => e || customer.email);
      setTel((t) => t || customer.phone);
    }
    // first empty field gets the cursor
    window.setTimeout(() => [...(box.current?.querySelectorAll<HTMLInputElement>("[data-vr]") ?? [])].find((el) => !el.value)?.focus({ preventScroll: true }), 80);
  }, [valueAsk]); // eslint-disable-line react-hooks/exhaustive-deps
  // While the pop-up is open: Escape closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!valueAsk) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setValueAsk(null);
    window.addEventListener("keydown", onKey);
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = was;
    };
  }, [valueAsk, setValueAsk]);

  if (!valueAsk) return null;
  const close = () => setValueAsk(null);

  const ok = {
    reg: reg.replace(/\s/g, "").length >= 2,
    name: name.trim().length > 0,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    tel: tel.replace(/\D/g, "").length >= 10,
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const first = (["reg", "name", "email", "tel"] as const).find((k) => !ok[k]);
    if (first) {
      document.querySelector<HTMLElement>(`[data-vr="${first}"]`)?.focus();
      return;
    }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/valuation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg, name, email, phone: tel, held: held || undefined, note: note.trim() || undefined, website: trap, source: "sell-page" }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; ref?: string; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      setRef(j.ref ?? "");
      setState("sent");
      if (makeAccount && !customer) {
        try {
          sessionStorage.setItem("rk-signup", JSON.stringify({ email: email.trim(), name: name.trim() }));
        } catch {}
      }
    } catch (err) {
      setError((err as Error).message || "We couldn't send your request. Call 01922 333451 or WhatsApp 07838 371339 and we'll value it for you.");
      setState("form");
    }
  };
  const again = () => {
    setValueAsk(null);
    window.setTimeout(() => document.getElementById("rk-reg")?.focus(), 50);
  };
  const toAccount = () => {
    try {
      sessionStorage.setItem("rk-signup", JSON.stringify({ email: email.trim(), name: name.trim() }));
    } catch {}
    setValueAsk(null);
    go("account");
  };

  const first = name.trim().split(" ")[0];
  // One question at a time: each appears once the one before is filled in.
  const show = { email: ok.name && name.trim().length >= 2, tel: ok.email, more: ok.tel };
  show.email ||= tried;
  show.tel ||= tried && show.email;
  return (
    <div className="vp-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()} data-vpop>
      <section className="vp" id="sell-valuation" role="dialog" aria-modal="true" aria-labelledby="value-title" ref={box}>
        <button type="button" className="vp__x" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {state === "sent" ? (
          <>
            <header className="vp__top">
              <span className="vp__tick" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 id="value-title">Request received</h2>
              <span className="vp__plate vp__plate--shown">{reg}</span>
            </header>
            <div className="vp__body" role="status">
              <p className="vp__msg">
                Thanks{first ? `, ${first}` : ""}. Our team will value {reg} and contact you on <b>{tel}</b> or at <b>{email.trim()}</b>.
              </p>
              {ref && (
                <p className="vp__ref">
                  Reference <b>{ref}</b>
                </p>
              )}
              {!customer && (
                <div className="vp__acct">
                  <div>
                    <b>{makeAccount ? "Finish your free account" : "Create your free account"}</b>
                    <span>
                      {makeAccount
                        ? `One quick step: confirm your email address and your account is ready.`
                        : `List ${reg} in a few taps when you're ready, keep a wishlist and keep track of your plates.`}
                    </span>
                  </div>
                  <button type="button" className="vp__go" onClick={toAccount} data-vr-account>
                    {makeAccount ? "Confirm my email" : "Create my account"} <ArrowRight />
                  </button>
                </div>
              )}
              <button type="button" className="vp__again" onClick={again}>
                Value another plate
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <header className="vp__top">
              <p className="vp__kicker">
                <CrownIcon /> Free from the REG KING team
              </p>
              <h2 id="value-title">Value my plate</h2>
              <label className="vp__regf">
                <span className="rk-visually-hidden">Registration</span>
                <input className="vp__plate" value={reg} onChange={(e) => setReg(spaceReg(e.target.value))} maxLength={8} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-invalid={tried && !ok.reg} data-vr="reg" />
                {tried && !ok.reg && <small className="vp__err vp__err--top">Enter your registration.</small>}
              </label>
            </header>
            <div className="vp__body">
              <p className="vp__lede">Where should we send your valuation?</p>
              <div className="vp__fields">
                <label className="vp__f">
                  <span>Your name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} aria-invalid={tried && !ok.name} data-vr="name" />
                  {tried && !ok.name && <small className="vp__err">Enter your name.</small>}
                </label>
                {show.email && (
                  <label className="vp__f vp__rise" ref={reveal}>
                    <span>Email</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} aria-invalid={tried && !ok.email} data-vr="email" />
                    {tried && !ok.email && <small className="vp__err">Enter a valid email address.</small>}
                  </label>
                )}
                {show.tel && (
                  <label className="vp__f vp__rise" ref={reveal}>
                    <span>Phone number</span>
                    <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" maxLength={20} aria-invalid={tried && !ok.tel} data-vr="tel" />
                    {tried && !ok.tel && <small className="vp__err">Enter a phone number we can call.</small>}
                  </label>
                )}
              </div>
              {show.more && (
                <div className="vp__more vp__rise" ref={reveal}>
                  <p className="vp__more-h">
                    A bit more about your plate <i>(optional)</i>
                  </p>
                  <div className="vp__chips" role="radiogroup" aria-label="Where is the registration now?">
                    {(
                      [
                        ["vehicle", "On a vehicle"],
                        ["retention", "On a certificate"],
                        ["unsure", "Not sure"],
                      ] as const
                    ).map(([k, t]) => (
                      <button key={k} type="button" role="radio" aria-checked={held === k} onClick={() => setHeld(held === k ? "" : k)} data-vr-held={k}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <label className="vp__f">
                    <span className="rk-visually-hidden">Anything we should know?</span>
                    <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Anything we should know? For example, what it means or a price you've been offered." data-vr-note />
                  </label>
                  {!customer && (
                    <label className="vp__acctopt">
                      <input type="checkbox" checked={makeAccount} onChange={(e) => setMakeAccount(e.target.checked)} data-vr-makeacct />
                      <span>
                        <b>Create my free REG KING account</b>
                        <small>List your plate in a few taps when you&apos;re ready, and keep a wishlist.</small>
                      </span>
                    </label>
                  )}
                </div>
              )}
              {/* hidden from people; only bots fill it in */}
              <input className="rk-vreq__trap" tabIndex={-1} autoComplete="off" aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
              {error && (
                <p className="vp__fail" role="alert">
                  {error}
                </p>
              )}
              {(show.more || tried) && (
                <button type="submit" className="vp__go vp__rise" disabled={state === "sending"} data-vr-send>
                  {state === "sending" ? "Sending…" : "Get my free valuation"}
                </button>
              )}
              <ol className="vp__next" aria-label="What happens next">
                <li>Our team looks at your reg</li>
                <li>We contact you with a valuation</li>
                <li>You decide whether to sell</li>
              </ol>
              <div className="vp__foot">
                <GoogleScore compact />
                <p>
                  We only use your details for your valuation. <a href="/privacy-policy">Privacy policy</a>
                </p>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

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
          <WhyBuy />
          <AsSeenWith />
        </>
      )}
      {mode === "buy" && !results && buyItem && <BuySources />}
      {mode === "sell" && sellReg && (
        <>
          <SellFlow />
          <SellSteps />
          <WhyUs kind="sell" />
          <OtherTab label="Looking to buy a plate instead?" to="buy" />
        </>
      )}
      {mode === "sell" && !sellReg && (
        <>
          <ValueCard />
          <SellSteps />
          <WhyUs kind="sell" />
          <OtherTab label="Looking to buy a plate instead?" to="buy" />
        </>
      )}
      {mode === "build" && (
        <>
          <BasketPanel />
          <MadeInHouse />
          <MakeInfo />
          <WhyUs kind="make" />
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

