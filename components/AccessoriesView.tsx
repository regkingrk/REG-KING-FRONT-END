"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { formatGBP, supportEmail } from "@/lib/brand";
import { phone } from "@/lib/infoContent";
import { ACC_PRODUCTS, type AccCategory, type AccProduct } from "@/lib/accessoryShop";
import { ProductShot } from "./ProductShot";
import { RealPhotos } from "./RealPhotos";
import { useMode } from "./ModeProvider";
import { newId, useMake } from "./MakeProvider";
import { BasketPanel, LogoPlateCreator, SurroundCreator } from "./MakeTools";

/**
 * Accessories. The main page is the shop: a header, category filters and a grid of products.
 * Plate surrounds and logo plates open their own builders (#accessories-surrounds, #accessories-logo).
 * Everything shares the Make basket, so plates and accessories check out together.
 */
export function AccessoriesView() {
  const { acc } = useMode();
  if (acc === "surrounds" || acc === "logo") return <AccessoryBuilder which={acc} />;
  const item = acc?.startsWith("item-") ? ACC_PRODUCTS.find((p) => p.key === acc.slice(5) && !p.builder) : null;
  if (item) return <ProductPage p={item} />;
  return <AccessoryShop start={acc === "customisation" || acc === "fixings" || acc === "mounting" ? acc : "all"} />;
}

/* ------------------------------------------------------------------ */
/* The shop                                                             */
/* ------------------------------------------------------------------ */

type Tab = "all" | AccCategory;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "customisation", label: "Surrounds & logo plates" },
  { key: "fixings", label: "Fitting & fixings" },
  { key: "mounting", label: "Mounting kits" },
];

/**
 * What each small product's plate says, in the plate font, until there are real photos to show.
 * REG KING's own photos are used when a product has one.
 */
const PLATE_WORDS: Partial<Record<AccProduct["art"], string>> = {
  kit: "FIT KIT",
  pads: "PADS x10",
  pads6: "6MM PADS",
  screws: "SCREWS",
  clips: "CLIPS",
  magnets: "MAGNETS",
  surround: "SURROUND",
};

function AccessoryShop({ start }: { start: Tab }) {
  const { go } = useMode();
  const [tab, setTab] = useState<Tab>(start);
  useEffect(() => setTab(start), [start]);
  // Menu and footer links (Fitting & fixings, Mounting kits) open the page on that tab.
  useEffect(() => {
    if (start === "all") return;
    const t = window.setTimeout(() => document.getElementById("ax-shop")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(t);
  }, [start]);
  const list = tab === "all" ? ACC_PRODUCTS : ACC_PRODUCTS.filter((p) => p.cat === tab);
  const designs = list.filter((p) => p.builder);
  const items = list.filter((p) => !p.builder);
  const ask = () => {
    try {
      sessionStorage.setItem("rk-contact", JSON.stringify({ topic: "make", sub: "fit", note: "I'd like to ask about your plate accessories. " }));
    } catch {}
    go("info-contact");
  };

  return (
    <section className="rk-section acx" id="rk-info" aria-labelledby="acc-title" data-acc="shop">
      <div className="rk-wrap acx__in">
        <header className="acx__head">
          <h1 id="acc-title">Accessories</h1>
          <p>Everything to finish and fit your plates. Order them with your plates and they come together.</p>
        </header>

        <nav className="acx-tabs" role="tablist" aria-label="Accessories" id="ax-shop">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} data-ax-tab={t.key}>
              {t.label}
            </button>
          ))}
        </nav>

        {designs.length > 0 && (
          <ul className="acx-designs" role="tabpanel" aria-label="Design your own">
            {designs.map((p) => (
              <li key={p.key}>
                <button type="button" className="acx-design" onClick={() => go(p.builder!)} data-acc-buy={p.key} data-product={p.key}>
                  <span className="acx-design__show" aria-hidden>
                    {p.key === "surrounds" ? <img className="acx-design__photo" src="examples/surround-card.jpg" alt="" loading="lazy" /> : p.key === "logo" ? <img className="acx-design__photo" src="examples/logo-printed-card.jpg" alt="" loading="lazy" /> : <ProductShot art={p.art} />}
                  </span>
                  <span className="acx-design__body">
                    <b>{p.name}</b>
                    <span>{p.line}. Priced as you design.</span>
                    <em>Design yours</em>
                  </span>
                </button>
                <RealPhotos k={p.key === "surrounds" ? "surrounds" : `logo:printed`} label={p.key === "surrounds" ? "See real surrounds we've made" : "See real logo plates we've made"} className="acx-design__real" />
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <ul className="acx-grid">
            {items.map((p) => (
              <li key={p.key}>
                <ProductCard p={p} />
              </li>
            ))}
          </ul>
        )}

        <aside className="acx-help" aria-labelledby="ax-talk-t">
          <div>
            <h2 id="ax-talk-t">Not sure what you need?</h2>
            <p>
              Tell us your car and how you&apos;d like your plates fitted, and we&apos;ll tell you what to get. Call <b>{phone.display}</b> or email <b>{supportEmail}</b>.
            </p>
          </div>
          <button type="button" className="acx-btn acx-btn--line" onClick={ask} data-ax-ask>
            Ask us
          </button>
        </aside>
      </div>
      <BasketPanel />
    </section>
  );
}

function ProductCard({ p }: { p: AccProduct }) {
  const { save } = useMake();
  const { go } = useMode();
  const [added, setAdded] = useState(false);
  // If a photo can't load, show the plate instead.
  const [noPhoto, setNoPhoto] = useState(false);
  const priced = p.price !== null;

  const act = () => {
    if (!priced) {
      // Not priced yet: ask us, with the form already pointed at it.
      try {
        sessionStorage.setItem("rk-contact", JSON.stringify({ topic: "make", sub: "fit", note: `I'd like to know about ${p.name}. ` }));
      } catch {}
      return go("info-contact");
    }
    save({ id: newId(), kind: "accessory", title: p.name, detail: p.line, lines: [{ label: p.name, amount: p.price! }], data: { key: p.key } });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  const words = PLATE_WORDS[p.art];
  return (
    <article className="acx-card" data-product={p.key}>
      <a className="acx-card__link" href={`#accessories-item-${p.key}`} onClick={(e) => (e.preventDefault(), go(`accessories-item-${p.key}`))} data-acc-open={p.key}>
        <span className="acx-card__show" aria-hidden>
          {p.soon ? <ComingSoon /> : p.photo && !noPhoto ? <img src={p.photo} alt="" loading="lazy" onError={() => setNoPhoto(true)} /> : <span className="acx-plate">{words ?? p.name}</span>}
        </span>
        <h3>{p.name}</h3>
      </a>
      <p>{p.line}</p>
      <div className="acx-card__foot">
        <span className="acx-card__price" data-none={!priced || undefined}>
          {priced ? formatGBP(p.price!, Number.isInteger(p.price)) : p.soon ? "Coming soon" : "Price on request"}
        </span>
        <button type="button" className={priced ? "acx-btn" : "acx-btn acx-btn--line"} onClick={act} data-acc-buy={p.key}>
          {!priced ? "Ask about this" : added ? "Added" : "Add to basket"}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* One accessory's own page (#accessories-item-screws)                  */
/* ------------------------------------------------------------------ */

/** The image for products not on sale yet: a yellow plate reading COMING SOON. */
function ComingSoon() {
  return (
    <span className="acx-soon" role="img" aria-label="Coming soon">
      <span className="acx-soon__plate" aria-hidden>
        COMING SOON
      </span>
    </span>
  );
}

const CAT_NAME: Record<AccCategory, string> = { customisation: "Surrounds & logo plates", fixings: "Fitting & fixings", mounting: "Mounting kits" };

function ProductPage({ p }: { p: AccProduct }) {
  const { save } = useMake();
  const { go } = useMode();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [noPhoto, setNoPhoto] = useState(false);
  useEffect(() => {
    setQty(1);
    setAdded(false);
    setNoPhoto(false);
    window.scrollTo({ top: 0 });
  }, [p.key]);
  const priced = p.price !== null;
  const words = PLATE_WORDS[p.art];
  const link = (h: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    go(h);
  };
  const add = () => {
    save({ id: newId(), kind: "accessory", title: qty > 1 ? `${p.name} × ${qty}` : p.name, detail: p.line, lines: [{ label: qty > 1 ? `${p.name} × ${qty}` : p.name, amount: Math.round(p.price! * qty * 100) / 100 }], data: { key: p.key, qty } });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };
  const ask = () => {
    try {
      sessionStorage.setItem("rk-contact", JSON.stringify({ topic: "make", sub: "fit", note: `I'd like to know about ${p.name}. ` }));
    } catch {}
    go("info-contact");
  };
  const more = ACC_PRODUCTS.filter((x) => !x.builder && x.key !== p.key).sort((a, b) => Number(b.cat === p.cat) - Number(a.cat === p.cat)).slice(0, 3);

  return (
    <section className="rk-section acx acp" id="rk-info" aria-labelledby="acp-title" data-acc="item" data-acc-item={p.key}>
      <div className="rk-wrap acx__in">
        <nav className="acp__crumbs" aria-label="Breadcrumb">
          <a href="#accessories" onClick={link("accessories")}>
            Accessories
          </a>
          <span aria-hidden>/</span>
          <a href={`#accessories-${p.cat}`} onClick={link(`accessories-${p.cat}`)}>
            {CAT_NAME[p.cat]}
          </a>
          <span aria-hidden>/</span>
          <span aria-current="page">{p.name}</span>
        </nav>

        <div className="acp__grid">
          <div className="acp__photo">
            {p.soon ? <ComingSoon /> : p.photo && !noPhoto ? <img src={p.photo} alt={p.name} onError={() => setNoPhoto(true)} /> : <span className="acx-plate">{words ?? p.name}</span>}
          </div>
          <div className="acp__buy">
            <h1 id="acp-title">{p.name}</h1>
            <p className="acp__price" data-none={!priced || undefined}>
              {priced ? formatGBP(p.price!, Number.isInteger(p.price)) : p.soon ? "Coming soon" : "Price on request"}
            </p>
            <p className="acp__line">{p.line}.</p>
            {p.about && p.about.length > 0 && (
              <ul className="acp__about">
                {p.about.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {priced ? (
              <div className="acp__acts">
                <div className="rk-stepper acp__qty" role="group" aria-label="Quantity">
                  <button type="button" aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
                    −
                  </button>
                  <output aria-live="polite">{qty}</output>
                  <button type="button" aria-label="One more" disabled={qty >= 20} onClick={() => setQty(qty + 1)}>
                    +
                  </button>
                </div>
                <button type="button" className="acx-btn acp__add" onClick={add} data-acc-buy={p.key}>
                  {added ? "Added to basket" : `Add to basket · ${formatGBP(p.price! * qty, false)}`}
                </button>
              </div>
            ) : (
              <div className="acp__acts">
                <button type="button" className="acx-btn acp__add" onClick={ask} data-acc-buy={p.key}>
                  Ask about this
                </button>
                <p className="acp__note">We&apos;re adding the price for this soon. Ask us and we&apos;ll tell you.</p>
              </div>
            )}
            <p className="acp__note">Order it with your plates and they come together. Questions? Call {phone.display}.</p>
          </div>
        </div>

        {more.length > 0 && (
          <div className="acp__more">
            <h2>More accessories</h2>
            <ul className="acx-grid">
              {more.map((x) => (
                <li key={x.key}>
                  <ProductCard p={x} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <BasketPanel />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The builders                                                         */
/* ------------------------------------------------------------------ */

function AccessoryBuilder({ which }: { which: "surrounds" | "logo" }) {
  const { go } = useMode();
  const { setTool } = useMake();
  useEffect(() => {
    setTool(which);
  }, [which, setTool]);
  return (
    <section className="rk-section rk-accs" id="rk-info" aria-labelledby="acc-title" data-acc={which}>
      <div className="rk-wrap rk-accs__in">
        <header className="rk-accs__head">
          <button type="button" className="ash__back" onClick={() => go("accessories")} data-acc-back>
            <span aria-hidden>←</span> All accessories
          </button>
          <h1 id="acc-title" className="rk-accs__t">
            {which === "logo" ? "Logo Plates" : "Plate Surrounds"}
          </h1>
          <p className="rk-accs__line">{which === "logo" ? "Your own logo or brand on a plate, printed or 4D." : "Framed or frameless, in your colours, with your text or logo."}</p>
          {which === "surrounds" && <RealPhotos k="surrounds" label="See real surrounds we've made" className="rk-accs__real" />}
        </header>
        <div className="rk-accs__maker">{which === "logo" ? <LogoPlateCreator key="logo" /> : <SurroundCreator key="surrounds" reg="" />}</div>
      </div>
      <BasketPanel />
    </section>
  );
}
