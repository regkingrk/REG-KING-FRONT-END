"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatGBP, supportEmail } from "@/lib/brand";
import { phone } from "@/lib/infoContent";
import { EXCLUSIVE_CATS, EXCLUSIVE_SNAPSHOT_DATE, catOf, exclusive } from "@/lib/exclusive";
import { CAT_GROUPS, PRICE_STEPS, catOfKey, inCategory, inGroup } from "@/lib/filters";
import { STOCK_SNAPSHOT_DATE, customerPlates, regkingStock } from "@/lib/stock";
import type { Result } from "@/lib/search";
import { ArrowRight } from "./Icons";
import { BrandLogo } from "./BrandLogo";
import { STYLE_INFO, STYLE_ORDER, earliest, styleOf, type PlateStyle } from "@/lib/search";
import { CloseIcon } from "./Icons";
import { Field, SlidersIcon, YEARS } from "./BuyFilters";
import { useMode } from "./ModeProvider";
import { PlateReel, dateRange } from "./NewThisWeek";

const money = (n: number) => formatGBP(n, Number.isInteger(n));
const PAGE = 12;
/** REG KING's own photo of two Lamborghinis in the unit, behind the title and New this week. */
const GARAGE_PHOTO = "media/exclusive-garage.jpg";

/**
 * A short spec line under each exclusive plate, worked out from the registration itself:
 * which vehicles it can go on. Nothing here is made up.
 */
function plateFact(reg: string) {
  const e = earliest(reg);
  return e ? `Fits vehicles from ${e.label}` : "Fits any vehicle";
}

/** Open the contact form on "Buying", with the reg filled in when there is one. */
function useEnquire() {
  const { go } = useMode();
  return (reg?: string, note?: string) => {
    try {
      sessionStorage.setItem(
        "rk-contact",
        JSON.stringify(
          reg
            ? { topic: "buy", sub: "plate", reg, note: `I'd like to talk privately about buying ${reg}. ` }
            : { topic: "buy", sub: "find", note: note ?? "I'd like to talk privately about your exclusive plates. " },
        ),
      );
    } catch {}
    go("info-contact");
  };
}

/**
 * Exclusive plates (#buy-exclusive), REG KING stock and customer plates: new in stock, then the
 * collection by number of characters (or category) with a price order toggle. No intro and no
 * entrance animation: the page opens as it is.
 */
export function ExclusiveVault({ kind = "exclusive" }: { kind?: CollectionKind }) {
  return (
    <section className="vlt" id="rk-info" aria-labelledby="vlt-title">
      <ExclusivePage key={kind} kind={kind} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The page, built from the same parts as the rest of Buy: the dark      */
/* New this week band with its drifting plates, then the white Buy       */
/* section with its tabs and plate cards.                                */
/* ------------------------------------------------------------------ */

type Order = "high" | "low";
type Seller = "all" | "ours" | "customer";
type XFilters = { styles: PlateStyle[]; min: number; max: number; year: number; seller: Seller };
const NO_FILTERS: XFilters = { styles: [], min: 0, max: 0, year: 0, seller: "all" };
const X_PRICES = [15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 250000];

/** Does a plate pass the filters? `skip` leaves one filter out, for the counts beside its options. */
function passesX(p: { reg: string; price: number; ours?: boolean }, f: XFilters, skip?: keyof XFilters) {
  if (skip !== "styles" && f.styles.length && !f.styles.includes(styleOf(p.reg))) return false;
  if (f.min && p.price < f.min) return false;
  if (f.max && p.price > f.max) return false;
  if (f.year) {
    const e = earliest(p.reg);
    if (e && e.year > f.year) return false;
  }
  if (f.seller === "ours" && !p.ours) return false;
  if (f.seller === "customer" && p.ours) return false;
  return true;
}
const filtersOn = (f: XFilters) => (f.styles.length ? 1 : 0) + (f.min || f.max ? 1 : 0) + (f.year ? 1 : 0) + (f.seller !== "all" ? 1 : 0);

/* ---------- the three collections that share this page ---------- */
export type CollectionKind = "exclusive" | "regking" | "customer";
type Plate = { reg: string; handle: string; price: number; added: string; ours?: boolean };
/** One tab in the bar above the plates. `big` is the large numeral used on Exclusive plates. */
type Tab = { key: string; big?: string; label: string; test: (p: Plate) => boolean; none: string; looking: string; subs?: Tab[] };

const charTabs: Tab[] = EXCLUSIVE_CATS.map((c) => ({
  key: c.key,
  big: c.key === "other" ? "Other" : c.key,
  label: c.key === "other" ? "Exclusive plates" : "Characters",
  test: (p) => catOf(p.reg) === c.key,
  none: c.key === "other" ? "other exclusive plates" : `${c.key}-character plates`,
  looking: c.key === "other" ? "I'm looking for an exclusive plate. " : `I'm looking for a ${c.key}-character plate. `,
}));
/** As a search result, so the category rules can read its price and style. */
const asResult = (p: Plate) => ({ reg: p.reg, price: p.price, style: styleOf(p.reg) }) as Result;
/** The six main categories, each with its subcategories as chips under the bar. */
const categoryTabs = (_plates: Plate[]): Tab[] => [
  { key: "all", label: "All plates", test: () => true, none: "plates", looking: "I'm looking for a plate. " },
  ...CAT_GROUPS.map<Tab>((g) => ({
    key: g.key,
    label: g.label,
    test: (p) => inGroup(asResult(p), g.key),
    none: g.label.toLowerCase(),
    looking: `I'm looking for a plate in ${g.label.toLowerCase()}. `,
    subs: g.subs.map((k) => {
      const c = catOfKey(k);
      return {
        key: k,
        label: c.label,
        test: (p: Plate) => inCategory(asResult(p), k),
        none: c.label.toLowerCase(),
        looking: `I'm looking for ${c.label.toLowerCase()}. `,
      };
    }),
  })),
];

type Collection = {
  kind: CollectionKind;
  title: ReactNode;
  name: string;
  plates: Plate[];
  tabs: Tab[];
  tabsLabel: string;
  prices: number[];
  /** Exclusive plates mix our stock and customers' plates, so it can filter by seller. */
  seller: boolean;
  snapshot: string;
  /** New this week: the seven days up to the snapshot. */
  today: string;
  weekStart: string;
  enquire: string;
};

const COLLECTIONS: Record<CollectionKind, () => Collection> = {
  exclusive: () => ({
    kind: "exclusive",
    title: (
      <>
        Exclusive <span>Plates</span>
      </>
    ),
    name: "exclusive plates",
    plates: exclusive.map((p) => ({ ...p, ours: !!p.ours })),
    tabs: charTabs,
    tabsLabel: "Number of characters",
    prices: X_PRICES,
    seller: true,
    snapshot: EXCLUSIVE_SNAPSHOT_DATE,
    today: "2026-10-27",
    weekStart: "2026-10-21",
    enquire: "I'd like to talk privately about your exclusive plates. ",
  }),
  regking: () => {
    const plates = regkingStock.map((p) => ({ ...p, ours: true }));
    return {
      kind: "regking",
      title: (
        <>
          <BrandLogo className="xp-hero__logo" priority /> <span>Stock</span>
        </>
      ),
      name: "REG KING stock",
      plates,
      tabs: categoryTabs(plates),
      tabsLabel: "Categories",
      prices: [...PRICE_STEPS, 50000, 100000],
      seller: false,
      snapshot: STOCK_SNAPSHOT_DATE,
      today: "2026-10-28",
      weekStart: "2026-10-22",
      enquire: "I'd like to ask about a plate from your own stock. ",
    };
  },
  customer: () => {
    const plates = customerPlates.map((p) => ({ ...p, ours: false }));
    return {
      kind: "customer",
      title: (
        <>
          Customer <span>Plates</span>
        </>
      ),
      name: "customer plates",
      plates,
      tabs: categoryTabs(plates),
      tabsLabel: "Categories",
      prices: [...PRICE_STEPS, 50000, 100000],
      seller: false,
      snapshot: STOCK_SNAPSHOT_DATE,
      today: "2026-10-28",
      weekStart: "2026-10-22",
      enquire: "I'd like to ask about one of your customer plates. ",
    };
  },
};

function ExclusivePage({ kind }: { kind: CollectionKind }) {
  const { go } = useMode();
  const enquire = useEnquire();
  const C = useMemo(() => COLLECTIONS[kind](), [kind]);
  const all = C.plates;
  const [xf, setXf] = useState<XFilters>(NO_FILTERS);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    const ok = all.filter((p) => passesX(p, xf));
    C.tabs.forEach((t) => (c[t.key] = ok.filter(t.test).length));
    return c;
  }, [xf, C]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstWithPlates = C.tabs.find((t) => counts[t.key] > 0)?.key ?? C.tabs[0].key;
  const [cat, setCat] = useState<string>(firstWithPlates);
  const top = C.tabs.find((t) => t.key === cat) ?? C.tabs[0];
  // A subcategory chip under the bar narrows the main category further (null = all of it).
  const [sub, setSub] = useState<string | null>(null);
  const tab = (sub && top.subs?.find((t) => t.key === sub)) || top;
  const [order, setOrder] = useState<Order>("high");
  const [shown, setShown] = useState(PAGE);
  const [filterOpen, setFilterOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const setF = (p: Partial<XFilters>) => {
    setXf((f) => ({ ...f, ...p }));
    setShown(PAGE);
  };
  const nOn = filtersOn(xf);
  // If the filters leave the open tab empty, move to the first tab that has plates.
  useEffect(() => {
    if (counts[cat] > 0) return;
    const next = C.tabs.find((t) => counts[t.key] > 0)?.key;
    if (next) setCat(next);
  }, [counts]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFilterOpen(false);
    document.addEventListener("keydown", onKey);
    const lock = window.matchMedia("(max-width: 960px)").matches;
    if (lock) document.documentElement.classList.add("rk-noscroll");
    panelRef.current?.querySelector<HTMLElement>("button, input, select")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("rk-noscroll");
    };
  }, [filterOpen]);

  const thisWeek = all.filter((p) => p.added >= C.weekStart && p.added <= C.today);
  const list = useMemo(() => {
    const l = all.filter((p) => tab.test(p) && passesX(p, xf));
    return [...l].sort((a, b) => (order === "high" ? b.price - a.price : a.price - b.price) || a.reg.localeCompare(b.reg));
  }, [tab, order, xf]); // eslint-disable-line react-hooks/exhaustive-deps
  const subCount = (t: Tab) => all.filter((p) => t.test(p) && passesX(p, xf)).length;
  const matching = all.filter((p) => passesX(p, xf)).length;
  const styleCount = (st: PlateStyle) => all.filter((p) => styleOf(p.reg) === st && passesX(p, xf, "styles")).length;
  // Phone: the category tabs scroll sideways, with arrows to show there are more.
  const catsRef = useRef<HTMLDivElement>(null);
  const [catEnds, setCatEnds] = useState({ start: true, end: false });
  const readCatEnds = () => {
    const el = catsRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 2, end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setCatEnds((o) => (o.start === start && o.end === end ? o : { start, end }));
  };
  useEffect(() => {
    readCatEnds();
    window.addEventListener("resize", readCatEnds);
    return () => window.removeEventListener("resize", readCatEnds);
  }, []);
  const nudgeCats = (dir: number) => catsRef.current?.scrollBy({ left: dir * catsRef.current.clientWidth * 0.7, behavior: "smooth" });
  const subsRef = useRef<HTMLDivElement>(null);
  const pick = (c: string) => {
    setCat(c);
    setSub(null);
    setShown(PAGE);
    // Keep the chosen tab in view and start its subcategory chips from the left.
    requestAnimationFrame(() => {
      const bar = catsRef.current, btn = bar?.querySelector<HTMLElement>(`[data-xp-cat="${c}"]`);
      if (bar && btn) bar.scrollTo({ left: Math.max(0, btn.offsetLeft - bar.offsetLeft - 8), behavior: "smooth" });
      subsRef.current?.scrollTo({ left: 0 });
    });
  };

  return (
    <>
    <div className="vlt__page" data-kind={kind}>
      <div className="xp-top">
      <div className="xp-top__bg" style={{ backgroundImage: `url(${GARAGE_PHOTO})` }} aria-hidden />
      <section className="rk-new xp-hero" aria-labelledby="vlt-title">
        <div className="rk-wrap xp-hero__in">
          <h1 id="vlt-title" className="xp-hero__t">
            {C.title}
          </h1>
          <XFilterDropdown
            prices={C.prices}
            seller={C.seller}
            f={xf}
            set={setF}
            count={matching}
            onShow={() => document.getElementById("xp-browse")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>
      </section>

      {thisWeek.length > 0 && (
        <PlateReel
          titleId="xp-week"
          plates={thisWeek}
          kicker={`${thisWeek.length} ${thisWeek.length === 1 ? "plate" : "plates"} added · ${dateRange(thisWeek[thisWeek.length - 1].added, C.today)}`}
          title={
            <>
              <span>New</span> this week
            </>
          }
          rows={2}
          bare
        />
      )}
      </div>

      <section className="rk-section rk-section--tight xp-coll" id="xp-browse" aria-labelledby="xp-coll-t">
        <div className="rk-wrap">
          <div className="xp-ch">
            <h2 id="xp-coll-t" className="rk-shead__t">
              The collection
            </h2>
            <div className="xp-tools">
            <button type="button" className="xp-filterbtn" aria-expanded={filterOpen} aria-controls="xp-filter" onClick={() => setFilterOpen(true)} data-xp-filter>
              <SlidersIcon />
              Filter
              {nOn > 0 && <i>{nOn}</i>}
            </button>
            <label className="xp-sort">
              <span>Price</span>
              <select value={order} onChange={(e) => setOrder(e.target.value as Order)} data-xp-sort>
                <option value="high">High to low</option>
                <option value="low">Low to high</option>
              </select>
            </label>
            </div>
          </div>

          <div className="xp-catsbar" data-overflow={!(catEnds.start && catEnds.end) || undefined}>
          <button type="button" className="xp-catsbar__arrow" data-dir="prev" aria-label="Previous categories" onClick={() => nudgeCats(-1)} disabled={catEnds.start} data-xp-cats-prev>
            <ArrowRight style={{ transform: "scaleX(-1)" }} />
          </button>
          <div className="xp-cats" role="tablist" aria-label={C.tabsLabel} data-words={C.tabs[0].big ? undefined : ""} ref={catsRef} onScroll={readCatEnds}>
            {C.tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={cat === t.key} onClick={() => pick(t.key)} data-xp-cat={t.key} data-empty={!counts[t.key] || undefined}>
                {t.big ? <b>{t.big}</b> : null}
                <span>{t.label}</span>
                <i>{counts[t.key] ? `${counts[t.key]} in stock` : "None in stock"}</i>
              </button>
            ))}
          </div>
          <button type="button" className="xp-catsbar__arrow" data-dir="next" aria-label="More categories" onClick={() => nudgeCats(1)} disabled={catEnds.end} data-xp-cats-next>
            <ArrowRight />
          </button>
          </div>
          {top.subs && (
            <div className="xp-subs" ref={subsRef} role="group" aria-label={`${top.label}: subcategories`} data-xp-subs>
              <button type="button" aria-pressed={!sub} onClick={() => { setSub(null); setShown(PAGE); }} data-xp-sub="all">
                All {top.label.toLowerCase()} <i>{counts[top.key] ?? 0}</i>
              </button>
              {top.subs.map((t) => {
                const n = subCount(t);
                return (
                  <button key={t.key} type="button" aria-pressed={sub === t.key} disabled={!n} onClick={() => { setSub(t.key); setShown(PAGE); }} data-xp-sub={t.key}>
                    {t.label} <i>{n}</i>
                  </button>
                );
              })}
            </div>
          )}

          <div role="tabpanel">
            {list.length === 0 && nOn > 0 ? (
              <div className="xp-none">
                <p>No {tab.none} match your filters.</p>
                <button type="button" className="xp-link" onClick={() => setXf(NO_FILTERS)}>
                  Clear filters
                </button>
              </div>
            ) : list.length === 0 ? (
              <div className="xp-none">
                <p>
                  No {tab.none} in stock right now. Tell us you&apos;re looking and we&apos;ll contact you first when one comes up.
                </p>
                <button
                  type="button"
                  className="xp-link"
                  onClick={() => enquire(undefined, tab.looking)}
                >
                  Tell us what you&apos;re after <ArrowRight />
                </button>
              </div>
            ) : (
              <>
                <ul className="xp-grid" aria-live="polite">
                  {list.slice(0, shown).map((p) => (
                    <li key={p.handle}>
                      <a
                        className="xp-tile"
                        href={`#plate-${p.handle}`}
                        data-xp-plate={p.handle}
                        onClick={(e) => {
                          e.preventDefault();
                          go(`plate-${p.handle}`);
                        }}
                      >
                        <span className="xp-tile__plate">{p.reg}</span>
                        <span className="xp-tile__price">{money(p.price)}</span>
                        <span className="xp-tile__fit">
                          {plateFact(p.reg)}
                          {C.seller && p.ours && <span className="xp-tile__own"> · REG KING stock</span>}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                {list.length > shown && (
                  <button type="button" className="xp-link xp-more" onClick={() => setShown((s) => s + PAGE)}>
                    Show more <span className="xp-more__n">{shown} of {list.length} shown</span>
                  </button>
                )}
              </>
            )}
            <p className="rk-bfine">Prices from the REG KING store on {C.snapshot}.</p>
          </div>
        </div>
      </section>

      <section className="xp-talk" aria-labelledby="xp-talk-t">
        <div className="rk-wrap xp-talk__in">
          <div className="xp-talk__lead">
            <h2 id="xp-talk-t">
              Talk to <span>us</span>
            </h2>
            <p>Ask about any plate here, or tell us what you&apos;re looking for. Every enquiry is handled privately.</p>
            <button type="button" className="rk-btn rk-btn--ink" onClick={() => enquire(undefined, C.enquire)} data-xp-enquire>
              Enquire privately
            </button>
          </div>
          <dl className="xp-talk__ways">
            <div>
              <dt>Call</dt>
              <dd className="xp-talk__tel">{phone.display}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className="xp-talk__sel">{supportEmail}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>

      {/* Filter: a tab on the left edge on desktop, a sheet from the bottom on phones (same as Buy search). */}
      <div className="rk-sr__scrim" hidden={!filterOpen} onClick={() => setFilterOpen(false)} />
      <button type="button" className="rk-sr__tab xp-tab" aria-expanded={filterOpen} aria-controls="xp-filter" onClick={() => setFilterOpen(true)} hidden={filterOpen} data-xp-tab>
        <SlidersIcon />
        <span>Filter</span>
        {nOn > 0 && <i>{nOn}</i>}
      </button>
      <aside id="xp-filter" className="rk-refine xp-filter" data-open={filterOpen || undefined} ref={panelRef} aria-label={`Filter ${C.name}`}>
        <div className="rk-refine__head">
          <h2>Filter</h2>
          {nOn > 0 && (
            <button type="button" className="rk-blink" onClick={() => setF(NO_FILTERS)}>
              Reset
            </button>
          )}
          <button type="button" className="rk-refine__close" onClick={() => setFilterOpen(false)} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <fieldset className="rk-refine__set">
          <legend>Plate style</legend>
          <label className="rk-check">
            <input type="checkbox" checked={xf.styles.length === 0} onChange={() => setF({ styles: [] })} data-xstyle="all" />
            <span className="rk-check__box" aria-hidden />
            <span className="rk-check__t">All formats</span>
            <span className="rk-check__n">{all.filter((p) => passesX(p, xf, "styles")).length}</span>
          </label>
          {STYLE_ORDER.filter((st) => styleCount(st) > 0 || xf.styles.includes(st)).map((st) => (
            <label key={st} className="rk-check">
              <input
                type="checkbox"
                checked={xf.styles.includes(st)}
                onChange={() => setF({ styles: xf.styles.includes(st) ? xf.styles.filter((x) => x !== st) : [...xf.styles, st] })}
                data-xstyle={st}
              />
              <span className="rk-check__box" aria-hidden />
              <span className="rk-check__t">{STYLE_INFO[st].name}</span>
              <span className="rk-check__n">{styleCount(st)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="rk-refine__set">
          <legend>Price</legend>
          <div className="rk-fprice">
            <Field label="Min price">
              <select value={xf.min} onChange={(e) => setF({ min: Number(e.target.value) })} data-xf="min">
                <option value={0}>No min</option>
                {C.prices.filter((v) => !xf.max || v < xf.max).map((v) => (
                  <option key={v} value={v}>
                    {money(v)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Max price">
              <select value={xf.max} onChange={(e) => setF({ max: Number(e.target.value) })} data-xf="max">
                <option value={0}>No max</option>
                {C.prices.filter((v) => v > xf.min).map((v) => (
                  <option key={v} value={v}>
                    {money(v)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="rk-refine__set">
          <legend>Car year</legend>
          <Field label="My vehicle was first registered in">
            <select value={xf.year} onChange={(e) => setF({ year: Number(e.target.value) })} data-xf="year">
              <option value={0}>Any year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
          <p className="rk-refine__hint">A plate can&apos;t make a vehicle look newer than it is. We&apos;ll only show ones that fit.</p>
        </fieldset>

        {C.seller && (
        <fieldset className="rk-refine__set">
          <legend>Sold by</legend>
          <div className="rk-rchips">
            {(
              [
                ["all", "Everyone"],
                ["ours", "REG KING stock"],
                ["customer", "Customer plates"],
              ] as const
            ).map(([k, t]) => (
              <button key={k} type="button" role="radio" aria-checked={xf.seller === k} onClick={() => setF({ seller: k })} data-xseller={k}>
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        )}

        <button type="button" className="rk-btn rk-btn--ink rk-refine__done" onClick={() => setFilterOpen(false)} data-xf-done>
          Show {matching} plate{matching === 1 ? "" : "s"}
        </button>
      </aside>
    </>
  );
}

/** The same "Filter plates" dropdown as the Buy page, for the exclusive plates. */
function XFilterDropdown({ f, set, count, onShow, prices, seller }: { f: XFilters; set: (p: Partial<XFilters>) => void; count: number; onShow: () => void; prices: number[]; seller: boolean }) {
  const [open, setOpen] = useState(false);
  const n = filtersOn(f);
  const style = f.styles.length === 1 ? f.styles[0] : f.styles.length ? "several" : "all";
  return (
    <div className="rk-fdrop xp-fdrop" data-open={open || undefined}>
      <button type="button" className="rk-fdrop__btn" aria-expanded={open} aria-controls="xp-fdrop" onClick={() => setOpen((o) => !o)} data-xp-fdrop>
        <SlidersIcon />
        Filter plates
        {n > 0 && <i>{n}</i>}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="rk-fdrop__panel" id="xp-fdrop">
          <div className="rk-fdrop__grid">
            <Field label="Plate style">
              <select value={style} onChange={(e) => set({ styles: e.target.value === "all" ? [] : [e.target.value as PlateStyle] })} data-xd="style">
                <option value="all">All formats</option>
                {style === "several" && <option value="several">Several formats</option>}
                {STYLE_ORDER.map((st) => (
                  <option key={st} value={st}>
                    {STYLE_INFO[st].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="My vehicle's year">
              <select value={f.year} onChange={(e) => set({ year: Number(e.target.value) })} data-xd="year">
                <option value={0}>Any year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            {seller && (
            <Field label="Sold by">
              <select value={f.seller} onChange={(e) => set({ seller: e.target.value as Seller })} data-xd="seller">
                <option value="all">Everyone</option>
                <option value="ours">REG KING stock</option>
                <option value="customer">Customer plates</option>
              </select>
            </Field>
            )}
            <div className="rk-fprice">
              <Field label="Min price">
                <select value={f.min} onChange={(e) => set({ min: Number(e.target.value) })} data-xd="min">
                  <option value={0}>No min</option>
                  {prices.filter((v) => !f.max || v < f.max).map((v) => (
                    <option key={v} value={v}>
                      {money(v)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Max price">
                <select value={f.max} onChange={(e) => set({ max: Number(e.target.value) })} data-xd="max">
                  <option value={0}>No max</option>
                  {prices.filter((v) => v > f.min).map((v) => (
                    <option key={v} value={v}>
                      {money(v)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="rk-fdrop__foot">
            {n > 0 && (
              <button type="button" className="rk-fdrop__reset" onClick={() => set(NO_FILTERS)}>
                Clear filters
              </button>
            )}
            <button
              type="button"
              className="rk-btn rk-btn--gold rk-fdrop__show"
              onClick={() => {
                setOpen(false);
                onShow();
              }}
              disabled={count === 0}
              data-xd-show
            >
              {count === 0 ? "No plates match" : `Show ${count} plate${count === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
