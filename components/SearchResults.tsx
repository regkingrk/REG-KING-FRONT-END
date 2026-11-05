"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatGBP, normaliseReg, routes, searchUrl, spaceReg, supportEmail } from "@/lib/brand";
import { liveDvlaResults } from "@/lib/dvla";
import { SOURCING } from "@/lib/services";
import { navigate } from "@/lib/nav";
import { SOURCE_INFO, SOURCE_ORDER, STYLE_INFO, STYLE_ORDER, clean, reads, searchAll, spellings, type PlateStyle, type Result, type Source } from "@/lib/search";
import { CHAR_LIMITS, FORMAT_GUIDE, activeCount, catalogue, emptyFilters, passes, toggle as flip, type Filters } from "@/lib/filters";
import { FormatGuide, PriceFields, SlidersIcon, YearField } from "./BuyFilters";
import { ArrowRight, CloseIcon, CrownIcon, SearchIcon } from "./Icons";
import { useMode } from "./ModeProvider";
import { useAccount } from "./AccountProvider";

type Sort = "match" | "low" | "high";
type Side = "rear" | "front";

const productUrl = (m: Result) => (m.handle ? `#plate-${m.handle}` : searchUrl(m.reg));
const price = (n: number) => formatGBP(n, Number.isInteger(n));
const enquiry = (kind: string, reg: string, extra: Record<string, string> = {}) =>
  `${routes.contact}?${new URLSearchParams({ enquiry: kind, reg, ...extra }).toString()}`;

const PAGE = 4;
const MORE = 8;

/* Saved plates: kept in the customer's account (see AccountProvider). */
function useWishlist() {
  const { saved, toggleSaved } = useAccount();
  return { list: saved, toggle: toggleSaved };
}

const HeartIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" strokeLinejoin="round" />
  </svg>
);
const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function SourceTag({ source }: { source: Source }) {
  return (
    <span className="rk-src" data-source={source}>
      {source === "regking" && <CrownIcon />}
      {SOURCE_INFO[source].short}
    </span>
  );
}

function Plate({ reg, side, big }: { reg: string; side: Side; big?: boolean }) {
  return (
    <span className={`rk-splate${big ? " rk-splate--big" : ""}`} data-side={side}>
      {reg}
    </span>
  );
}

/**
 * "Reads as TEST": shown when the plate spells the search using look-alike numbers (TE57, T357),
 * so the word is easy to see. Not shown when the plate already says it plainly.
 */
function readsAs(m: Result, query: string): string | null {
  const q = clean(query);
  if (!q || q.length < 2 || m.score < 70) return null;
  if (clean(m.reg).includes(q)) return null;
  return reads(m.reg).includes(reads(q)) ? q : null;
}

/** One plate in the list: plate, price, fit, and Buy. "More" opens offer / enquire / text me. */
function Row({ m, side, saved, onSave, browsing, query = "" }: { m: Result; side: Side; saved: boolean; onSave: () => void; browsing?: boolean; query?: string }) {
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const { addOffer } = useAccount();
  const off = m.was ? Math.round((1 - m.price / m.was) * 100) : 0;
  const id = `rk-row-${m.reg.replace(/\W/g, "")}`;

  const send = (e: FormEvent, kind: "offer" | "text") => {
    e.preventDefault();
    if (kind === "offer" && !offer) return;
    if (kind === "text" && phone.replace(/\D/g, "").length < 10) return;
    if (kind === "offer") addOffer(m.reg, Number(offer));
    navigate(enquiry(kind, m.reg, kind === "offer" ? { offer } : { phone }), kind);
    setSent(kind === "offer" ? `Offer of £${Number(offer).toLocaleString("en-GB")} sent. We'll get back to you.` : "Done. We'll text you the details shortly.");
  };

  return (
    <article className="rk-row" data-open={open || undefined} data-kind={m.kind} data-source={m.source}>
      <div className="rk-row__main">
        <a className="rk-row__plate" href={productUrl(m)} aria-label={`${m.reg}, ${price(m.price)}`}>
          <Plate reg={m.reg} side={side} />
          {off > 0 && <span className="rk-row__off">{off}% off</span>}
        </a>
        <p className="rk-row__price">
          {m.was && <s>{price(m.was)}</s>}
          <b data-sale={m.was ? "" : undefined}>{price(m.price)}</b>
        </p>
        <div className="rk-row__acts">
          <button type="button" className="rk-row__save" aria-pressed={saved} aria-label={saved ? `Remove ${m.reg} from saved` : `Save ${m.reg}`} onClick={onSave}>
            <HeartIcon on={saved} />
          </button>
          <button type="button" className="rk-row__more" aria-expanded={open} aria-controls={id} aria-label={open ? `Hide details for ${m.reg}` : `Show details for ${m.reg}`} onClick={() => setOpen((o) => !o)} data-row-open>
            <ChevronIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className="rk-row__drawer" id={id}>
          <dl className="rk-row__facts">
            {readsAs(m, query) && (
              <div>
                <dt>Reads as</dt>
                <dd>{readsAs(m, query)}</dd>
              </div>
            )}
            <div>
              <dt>Seller</dt>
              <dd>{m.source === "regking" ? "REG KING" : m.source === "dvla" ? "New from the DVLA" : "Customer plate"}</dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>{STYLE_INFO[m.style].name}</dd>
            </div>
            <div>
              <dt>Fits</dt>
              <dd>{m.fits ? `Vehicles from ${m.fits.label}` : "Any vehicle"}</dd>
            </div>
          </dl>
          <div className="rk-row__go">
            <a className="rk-btn rk-btn--gold rk-row__buy" href={productUrl(m)}>
              View plate
            </a>
            <span className="rk-row__fin">Finance available{m.source !== "dvla" ? ", or reserve with a deposit" : ""}</span>
          </div>
          {sent ? (
            <p className="rk-row__sent" role="status">
              {sent}
            </p>
          ) : (
            <div className="rk-row__opts">
{/* Offers on customer plates only: REG KING's own stock and DVLA plates have fixed prices. */}
              {m.source === "customer" && (
                            <form className="rk-opt" onSubmit={(e) => send(e, "offer")}>
                <label htmlFor={`${id}-offer`}>Make an offer</label>
                <div className="rk-opt__field">
                  <span aria-hidden>£</span>
                  <input id={`${id}-offer`} inputMode="numeric" placeholder={String(Math.round(m.price * 0.85))} value={offer} onChange={(e) => setOffer(e.target.value.replace(/\D/g, "").slice(0, 7))} />
                  <button type="submit" aria-label="Send offer">
                    <ArrowRight />
                  </button>
                </div>
              </form>
              )}
              <form className="rk-opt" onSubmit={(e) => send(e, "text")}>
                <label htmlFor={`${id}-phone`}>Text me the details</label>
                <div className="rk-opt__field">
                  <input id={`${id}-phone`} type="tel" inputMode="tel" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <button type="submit" aria-label="Text me">
                    <ArrowRight />
                  </button>
                </div>
              </form>
              <div className="rk-opt">
                <span className="rk-opt__k">Questions?</span>
                <button type="button" className="rk-opt__btn" onClick={() => navigate(enquiry("question", m.reg), "enquire")}>
                  Enquire about {m.reg}
                </button>
              </div>
            </div>
          )}
          {m.sample && <span className="rk-sample">Sample</span>}
        </div>
      )}
    </article>
  );
}

/** "Can't see the one you want?": the plate sourcing service (£9.99), with their search carried over. */
function FindIt({ query }: { query: string }) {
  const { go } = useMode();
  const [reg, setReg] = useState(query);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      sessionStorage.setItem("rk-source", reg.trim());
    } catch {}
    go("buy-sourcing");
  };
  return (
    <section className="rk-findit" aria-labelledby="findit-title">
      <div className="rk-wrap rk-findit__in">
        <div>
          <h2 id="findit-title">Can&apos;t see the one you want?</h2>
          <p>Our plate sourcing service searches for it for you. {formatGBP(SOURCING.price, false)}, refunded in full if we can&apos;t find anything suitable.</p>
        </div>
        <form className="rk-findit__form" onSubmit={onSubmit}>
          <label className="rk-visually-hidden" htmlFor="rk-find-reg">
            Name, word or phrase you want
          </label>
          <input id="rk-find-reg" className="rk-sellform__plate" value={reg} placeholder="NAME OR WORD" onChange={(e) => setReg(normaliseReg(e.target.value))} autoCapitalize="characters" autoComplete="off" maxLength={20} />
          <button type="submit" className="rk-btn rk-btn--gold">
            Request a search
          </button>
          <span className="rk-findit__alt">or email {supportEmail}</span>
        </form>
      </div>
    </section>
  );
}

export function SearchResults({ query }: { query: string }) {
  const { setQuery, setBrowse, filters: f, setFilters } = useMode();
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const [sort, setSort] = useState<Sort>("match");
  const [oursShown, setOursShown] = useState(PAGE);
  const [side, setSide] = useState<Side>("rear");
  const [savedOnly, setSavedOnly] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [shown, setShown] = useState<Record<PlateStyle, number>>({ dateless: PAGE, current: PAGE, prefix: PAGE, suffix: PAGE, irish: PAGE });
  const { list: saved, toggle } = useWishlist();
  const sheetRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<Filters>) => setFilters((x) => ({ ...x, ...p }));
  const browsing = !query;

  // A search shows plates that read like it; no search (browsing with filters) shows everything.
  const base = useMemo(() => (query ? searchAll(query) : catalogue()), [query]);
  // Live site: DVLA plates from the feed join the results once they arrive.
  const [dvla, setDvla] = useState<Result[]>([]);
  useEffect(() => {
    let on = true;
    setDvla([]);
    liveDvlaResults(query).then((r) => on && setDvla(r));
    return () => {
      on = false;
    };
  }, [query]);
  const all = useMemo(() => {
    const have = new Set(base.map((m) => m.reg.replace(/\s/g, "")));
    return [...base, ...dvla.filter((m) => !have.has(m.reg.replace(/\s/g, "")))];
  }, [base, dvla]);
  const results = all.filter((m) => passes(m, f) && (!savedOnly || saved.includes(m.reg)));
  const sorted = [...results].sort((a, b) =>
    sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) || b.score - a.score || a.price - b.price,
  );
  // The exact plate they typed, if it's for sale, goes on its own at the very top.
  const exact = !browsing ? sorted.find((m) => clean(m.reg) === clean(query) && !m.sample) ?? null : null;
  // REG KING's own stock always comes first, in its own section, whatever the order chosen.
  // Our stock leads only with plates that really read like the search; looser ones sit with the rest.
  const isOurs = (m: Result) => m.source === "regking" && (browsing || m.score >= 70);
  const ours = sorted.filter((m) => isOurs(m) && m !== exact);
  const others = sorted.filter((m) => !isOurs(m) && m !== exact);
  // Best-matching style first; ties keep the usual order (dateless, current, prefix, suffix, Irish).
  const groups = STYLE_ORDER.map((st) => ({ st, items: others.filter((m) => m.style === st) }))
    .filter((g) => g.items.length)
    .map((g, i) => ({ ...g, i, best: Math.max(...g.items.map((m) => m.score)) }))
    .sort((a, b) => b.best - a.best || a.i - b.i);
  const picks = !browsing && sort === "match" && !savedOnly && ours.length === 0 ? others.filter((m) => m.score >= 70).slice(0, 3) : [];
  const ideas = useMemo(() => {
    if (!query) return [];
    const have = new Set(all.map((m) => m.reg));
    return spellings(query, 8).filter((s) => !have.has(s.reg));
  }, [all, query]);
  const filtersOn = activeCount(f);
  // Counts next to each option: what you'd see if you ticked it, with the other filters kept.
  const countIn = (st: PlateStyle) => all.filter((m) => m.style === st && passes(m, f, "styles")).length;

  // Close the refine sheet with Escape; keep the page from scrolling behind it on phones.
  useEffect(() => {
    if (!refineOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRefineOpen(false);
    document.addEventListener("keydown", onKey);
    // Phones only: on desktop, hiding the page scroll shifts the sticky search bar.
    const lock = window.matchMedia("(max-width: 960px)").matches;
    if (lock) document.documentElement.classList.add("rk-noscroll");
    sheetRef.current?.querySelector<HTMLElement>("button, input, select")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("rk-noscroll");
    };
  }, [refineOpen]);

  const jump = (st: string) => document.getElementById(`rk-g-${st}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const clearFilters = () => {
    setFilters(emptyFilters());
    setSavedOnly(false);
  };

  return (
    <div id="rk-results" className="rk-sr">
      {/* Sticky bar: what you searched, how many, sort, saved, refine */}
      <div className="rk-sr__bar">
        <div className="rk-wrap rk-sr__barin">
          <form
            className="rk-sr__q"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim();
              if (v && v !== query) {
                setQuery(v);
                window.scrollTo({ top: 0 });
              }
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            <label className="rk-sr__qfield">
              <span className="rk-visually-hidden">Search plates</span>
              <input id="rk-sr-q" className="rk-sr__qplate" value={draft} onChange={(e) => setDraft(normaliseReg(e.target.value))} maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="SEARCH" />
              <button type="submit" aria-label="Search">
                <SearchIcon />
              </button>
            </label>
            <span className="rk-sr__count" aria-live="polite">
              <b>{results.length}</b> plate{results.length === 1 ? "" : "s"}
            </span>
          </form>
          <div className="rk-sr__tools">
            <label className="rk-sr__sort">
              <span className="rk-visually-hidden">Order by</span>
              <select id="rk-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="match">Best match</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
              <ChevronIcon />
            </label>
            <button type="button" className="rk-sr__chip rk-sr__saved" aria-pressed={savedOnly} onClick={() => setSavedOnly((s) => !s)}>
              <HeartIcon on={savedOnly} />
              <span className="rk-sr__lbl">Saved</span> <i>{saved.length}</i>
            </button>
            <button type="button" className="rk-sr__chip rk-sr__refinebtn" aria-expanded={refineOpen} onClick={() => setRefineOpen(true)}>
              <SlidersIcon />
              <span className="rk-sr__lbl">Refine</span>
              {filtersOn > 0 && <i>{filtersOn}</i>}
            </button>
            <button
              type="button"
              className="rk-sr__x"
              onClick={() => {
                setQuery("");
                setBrowse(false);
              }}
              aria-label={browsing ? "Close" : "Clear search"}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="rk-wrap rk-sr__body">
        {/* Refine: sidebar on desktop, bottom sheet on phones */}
        <div className="rk-sr__scrim" hidden={!refineOpen} onClick={() => setRefineOpen(false)} />
        {/* Desktop: a tab on the left edge opens the Refine panel, so the plates get the full width */}
        <button type="button" className="rk-sr__tab" aria-expanded={refineOpen} aria-controls="rk-refine" onClick={() => setRefineOpen(true)} hidden={refineOpen} data-refine-tab>
          <SlidersIcon />
          <span>Refine</span>
          {filtersOn > 0 && <i>{filtersOn}</i>}
        </button>
        <aside id="rk-refine" className="rk-refine" data-open={refineOpen || undefined} ref={sheetRef} aria-label="Refine results">
          <div className="rk-refine__head">
            <h2>Refine</h2>
            {filtersOn > 0 && (
              <button type="button" className="rk-blink" onClick={clearFilters}>
                Reset
              </button>
            )}
            <button type="button" className="rk-refine__close" onClick={() => setRefineOpen(false)} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="rk-refine__phone">
            <fieldset className="rk-refine__set">
              <legend>Order by</legend>
              <div className="rk-rchips">
                {(
                  [
                    ["match", "Best match"],
                    ["low", "Price: low to high"],
                    ["high", "Price: high to low"],
                  ] as [Sort, string][]
                ).map(([k, t]) => (
                  <button key={k} type="button" role="radio" aria-checked={sort === k} onClick={() => setSort(k)} data-sortchip={k}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="rk-refine__set">
              <legend>Saved plates</legend>
              <div className="rk-rchips">
                <button type="button" role="radio" aria-checked={!savedOnly} onClick={() => setSavedOnly(false)}>
                  All plates
                </button>
                <button type="button" role="radio" aria-checked={savedOnly} onClick={() => setSavedOnly(true)} data-savedchip>
                  Only my saved ({saved.length})
                </button>
              </div>
            </fieldset>
          </div>

          <fieldset className="rk-refine__set">
            <legend>Plate style</legend>
            <label className="rk-check">
              <input type="checkbox" data-style="all" checked={f.styles.length === 0} onChange={() => set({ styles: [] })} />
              <span className="rk-check__box" aria-hidden />
              <span className="rk-check__t">All formats</span>
              <span className="rk-check__n">{all.filter((m) => passes(m, f, "styles")).length}</span>
            </label>
            {STYLE_ORDER.map((st) => (
              <label key={st} className="rk-check">
                <input type="checkbox" data-style={st} checked={f.styles.includes(st)} disabled={!countIn(st) && !f.styles.includes(st)} onChange={() => set({ styles: flip(f.styles, st) })} />
                <span className="rk-check__box" aria-hidden />
                <span className="rk-check__t">
                  {STYLE_INFO[st].name}
                  <small>
                    {FORMAT_GUIDE[st].example} · {FORMAT_GUIDE[st].years}
                  </small>
                </span>
                <span className="rk-check__n">{countIn(st)}</span>
              </label>
            ))}
            <FormatGuide />
          </fieldset>

          <fieldset className="rk-refine__set">
            <legend>Price range</legend>
            <PriceFields f={f} set={set} />
          </fieldset>

          <fieldset className="rk-refine__set">
            <legend>Car year</legend>
            <YearField f={f} set={set} />
            <p className="rk-refine__hint">A plate can&apos;t make a vehicle look newer than it is. We&apos;ll only show ones that fit.</p>
          </fieldset>

          <fieldset className="rk-refine__set">
            <legend>Number of characters</legend>
            <div className="rk-rchips">
              {[0, ...CHAR_LIMITS].map((c) => (
                <button key={c} type="button" role="radio" aria-checked={f.chars === c} data-chars={c} onClick={() => set({ chars: c })}>
                  {c ? `Up to ${c}` : "Any"}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="rk-refine__set">
            <legend>Show plates as</legend>
            <div className="rk-seg" role="radiogroup">
              {(["rear", "front"] as Side[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={side === s} data-side={s} onClick={() => setSide(s)}>
                  <span className="rk-seg__sw" data-side={s} aria-hidden />
                  {s === "rear" ? "Rear" : "Front"}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="button" className="rk-btn rk-btn--ink rk-refine__done" onClick={() => setRefineOpen(false)}>
            Show {results.length} plate{results.length === 1 ? "" : "s"}
          </button>
        </aside>

        <div className="rk-sr__main">
          <p className="rk-sr__mcount" aria-hidden>
            <b>{results.length}</b> plate{results.length === 1 ? "" : "s"}
            {query ? ` for ${spaceReg(query.toUpperCase())}` : ""}
          </p>
          {all.some((m) => m.sample) && (
            <p className="rk-sr__note">
              <b>Prototype</b> Plates from REG KING and our customers are real. DVLA plates are samples until the DVLA feed is connected.
            </p>
          )}

          {exact && (
            <section className="rk-exact" aria-labelledby="rk-exact-t" data-exact={exact.reg}>
              <p className="rk-exact__k" id="rk-exact-t">
                {exact.reg} is for sale
              </p>
              <a className="rk-exact__plate" href={productUrl(exact)}>
                <Plate reg={exact.reg} side={side} big />
              </a>
              <div className="rk-exact__row">
                <div>
                  <b className="rk-exact__price">{price(exact.price)}</b>
                  <span className="rk-exact__meta">
                    {exact.source === "regking" ? "Owned by REG KING" : exact.source === "dvla" ? "New from the DVLA" : "Customer plate"}. {exact.fits ? `Fits vehicles from ${exact.fits.label}` : "Fits any vehicle"}
                  </span>
                </div>
                <div className="rk-exact__acts">
                  <button type="button" className="rk-row__save" aria-pressed={saved.includes(exact.reg)} aria-label={saved.includes(exact.reg) ? `Remove ${exact.reg} from saved` : `Save ${exact.reg}`} onClick={() => toggle(exact.reg)}>
                    <HeartIcon on={saved.includes(exact.reg)} />
                  </button>
                  <a className="rk-btn rk-btn--gold rk-exact__buy" href={productUrl(exact)}>
                    View plate
                  </a>
                </div>
              </div>
            </section>
          )}

          {groups.length + (ours.length ? 1 : 0) > 1 && (
            <nav className="rk-jump" aria-label="Jump to a style">
              {ours.length > 0 && (
                <button type="button" onClick={() => jump("ours")} data-jump="ours" className="rk-jump__ours">
                  <CrownIcon /> Our stock <i>{ours.length}</i>
                </button>
              )}
              {groups.map((g) => (
                <button key={g.st} type="button" onClick={() => jump(g.st)} data-jump={g.st}>
                  {STYLE_INFO[g.st].name} <i>{g.items.length}</i>
                </button>
              ))}
            </nav>
          )}

          {ours.length > 0 && (
            <section id="rk-g-ours" className="rk-group rk-ours" aria-labelledby="rk-gt-ours">
              <header className="rk-group__head">
                <span className="rk-group__i rk-ours__i" aria-hidden>
                  <CrownIcon />
                </span>
                <div>
                  <h2 id="rk-gt-ours">REG KING stock</h2>
                  <p>Our own plates, owned and sold by us.</p>
                </div>
                <span className="rk-group__n">{ours.length}</span>
              </header>
              <div className="rk-rows">
                {ours.slice(0, oursShown).map((m) => (
                  <Row key={m.reg} m={m} side={side} saved={saved.includes(m.reg)} onSave={() => toggle(m.reg)} browsing={!query} query={query} />
                ))}
              </div>
              {ours.length > oursShown && (
                <button type="button" className="rk-group__more" onClick={() => setOursShown((n) => n + MORE)}>
                  View {Math.min(MORE, ours.length - oursShown)} more from our stock <span>{ours.length - oursShown} left</span>
                </button>
              )}
            </section>
          )}

          {picks.length > 0 && (
            <section className="rk-picks" aria-labelledby="picks-title">
              <h2 id="picks-title" className="rk-sr__h">
                Top picks for <span>{query}</span>
              </h2>
              <div className="rk-picks__row">
                {picks.map((m, i) => (
                  <a key={m.reg} href={productUrl(m)} className="rk-pick" data-first={i === 0 || undefined}>
                    <span className="rk-pick__n">0{i + 1}</span>
                    <Plate reg={m.reg} side={side} big />
                    <span className="rk-pick__row">
                      <b>{price(m.price)}</b>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {groups.map((g, gi) => {
            const n = shown[g.st];
            const left = g.items.length - n;
            return (
              <section key={g.st} id={`rk-g-${g.st}`} className="rk-group" aria-labelledby={`rk-gt-${g.st}`}>
                <header className="rk-group__head">
                  <span className="rk-group__i">0{gi + 1}</span>
                  <div>
                    <h2 id={`rk-gt-${g.st}`}>{STYLE_INFO[g.st].name}</h2>
                    <p>{STYLE_INFO[g.st].line}</p>
                  </div>
                  <span className="rk-group__n">{g.items.length}</span>
                </header>
                <div className="rk-rows">
                  {g.items.slice(0, n).map((m) => (
                    <Row key={m.reg} m={m} side={side} saved={saved.includes(m.reg)} onSave={() => toggle(m.reg)} browsing={!query} query={query} />
                  ))}
                </div>
                {left > 0 && (
                  <button type="button" className="rk-group__more" data-more={g.st} onClick={() => setShown((s) => ({ ...s, [g.st]: s[g.st] + MORE }))}>
                    View {Math.min(MORE, left)} more in this style <span>{left} left</span>
                  </button>
                )}
              </section>
            );
          })}

          {results.length === 0 && (
            <div className="rk-rempty">
              <SearchIcon />
              <p>
                <b>{savedOnly ? "No saved plates here yet." : all.length ? "Nothing matches those filters." : `No plates for ${query} right now.`}</b>{" "}
                {all.length > 0 ? (
                  <button type="button" className="rk-blink" onClick={clearFilters}>
                    Show everything
                  </button>
                ) : (
                  "We can still find it for you."
                )}
              </p>
            </div>
          )}

          {ideas.length > 0 && (
            <section className="rk-askabout" aria-labelledby="ask-title">
              <h2 id="ask-title" className="rk-sr__h">
                Not listed, but worth asking about
              </h2>
              <p>Valid plates that spell {query}. Tap one and we&apos;ll check if it can be bought.</p>
              <div className="rk-askabout__row">
                {ideas.map((s) => (
                  <button key={s.reg} type="button" onClick={() => navigate(enquiry("find", s.reg), "find")}>
                    <Plate reg={s.reg} side="front" />
                    <span>Check it</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <FindIt query={query} />
    </div>
  );
}
