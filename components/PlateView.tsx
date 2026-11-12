"use client";

import { linkFor } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { depositFor, formatGBP, supportEmail, payl8rDisclaimer, platesForSale, reviewScores, routes } from "@/lib/brand";
import { PROVIDERS, phone, whatsapp, type ProviderKey } from "@/lib/infoContent";
import { earliest, styleOf } from "@/lib/search";
import { Carousel } from "./Carousel";
import { PlatePair } from "./PlatePair";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";
import { useMake } from "./MakeProvider";
import { navigate } from "@/lib/nav";
import { useAccount } from "./AccountProvider";
import { newThisWeek } from "@/lib/newThisWeek";
import { exclusive } from "@/lib/exclusive";
import { customerPlates, regkingStock } from "@/lib/stock";
import { shopPlates } from "@/lib/valuationData";
import { OUR_INCLUDED, OWN_STOCK_DISCOUNT, emptyBuild, priceLines, summary, total as sumLines, type BuildConfig, type Pricing } from "@/lib/builder";
import { Plate3D } from "./Plate3D";
import { PlateBuilder } from "./PlateBuilder";
import { PLATE_MEANINGS } from "@/lib/plateMeanings";
import { DVLA_FACTS, getDvlaPlate, regFromDvlaHandle, startDeposit, startDvlaCheckout, type DvlaPlate } from "@/lib/dvla";
import { DEPOSIT_RATE } from "@/lib/brand";
import { DVLA_FEE_RATE, DVLA_NO_DEPOSIT, dvlaFee } from "@/lib/dvlaPricing";
import { ASSIGN, DVLA_FEE_COVERS } from "@/lib/services";

/** Who's selling it: REG KING's own stock, a customer's plate, or DVLA stock we list. */
export type PlateSource = "regking" | "customer" | "dvla";

/** Every plate the prototype can show a page for, each once, with who's selling it. */
export const ALL_PLATES: { reg: string; price: number; handle: string; source: PlateSource }[] = (() => {
  const seen = new Set<string>();
  const out: { reg: string; price: number; handle: string; source: PlateSource }[] = [];
  const add = (list: readonly { reg: string; price: number; handle: string; ours?: boolean }[], source?: PlateSource) =>
    list.forEach((p) => {
      if (seen.has(p.handle)) return;
      seen.add(p.handle);
      out.push({ reg: p.reg, price: p.price, handle: p.handle, source: source ?? (p.ours === false ? "customer" : "regking") });
    });
  add(platesForSale, "regking");
  add(regkingStock, "regking");
  add(customerPlates, "customer");
  add(newThisWeek);
  add(exclusive.map(({ reg, price, handle }) => ({ reg, price, handle })), "regking");
  // Every other plate on the store (full export, lib/valuationData.ts), so any plate the valuation or
  // search links to has a page. REG KING's own plates are all in regkingStock above, so these are customer plates.
  add(shopPlates.map(([reg, price, handle]) => ({ reg, price, handle: handle ?? reg.toLowerCase().replace(/ /g, "-") })), "customer");
  return out;
})();

/** REG KING's own plates come with a set of plates in one of these styles (as their listings say). */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The first month a vehicle can carry this plate, or null for dateless (any vehicle). */
function firstMonth(reg: string): { y: number; m: number; label: string } | null {
  const e = earliest(reg);
  if (!e) return null;
  const mm = e.label.match(/^([A-Za-z]{3}) (\d{4})$/);
  if (mm) {
    const m = MONTHS.indexOf(mm[1].slice(0, 3));
    return { y: Number(mm[2]), m: m < 0 ? 0 : m, label: e.label };
  }
  return { y: e.year, m: 0, label: String(e.year) };
}

/**
 * A plate's own page: the plate under a spotlight (front or rear), price and how to buy,
 * a "will it fit my vehicle?" check, what's included, how buying works, and more plates.
 */
export function PlateView({ handle }: { handle: string }) {
  const { go } = useMode();
  const { save } = useMake();
  const { rewards } = useAccount();
  const reward = rewards.find((r) => r.handle === handle && new Date(r.expires).getTime() > Date.now());
  const listed = ALL_PLATES.find((p) => p.handle === handle);
  // DVLA plates aren't in the shop: their page asks the DVLA feed (#plate-dvla-ab12cde).
  const dvla = useDvlaPlate(listed ? null : handle);
  const dvlaRow: DvlaPlate | null = !listed && dvla && typeof dvla === "object" ? dvla : null;
  const plate = listed ?? (dvlaRow ? { ...dvlaRow, source: "dvla" as PlateSource } : undefined);
  const [buying, setBuying] = useState<"" | "checking" | string>("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  // Physical plates: asked as a yes or no; yes opens a small builder right here.
  const [want, setWant] = useState<boolean | null>(null);
  // Physical plates: the full plate builder, at trade prices (REG KING stock includes a set).
  const [cfg, setCfg] = useState<BuildConfig>(() => ({ ...emptyBuild(), withPlate: true }));
  const [finOpen, setFinOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);
  const [assign, setAssign] = useState(false);
  const [pay, setPay] = useState<"full" | "deposit" | "monthly">("full");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [offerSent, setOfferSent] = useState("");
  const { addOffer } = useAccount();

  if (!plate && (dvla === "loading" || dvla === "error")) {
    return (
      <section className="rk-section rk-pview__missing" aria-live="polite">
        <div className="rk-wrap">
          <h1 className="rk-info__t">{regFromDvlaHandle(handle)}</h1>
          <p>{dvla === "loading" ? "Checking with the DVLA." : "We can't reach the DVLA right now. Try again in a minute, or call us and we'll check for you."}</p>
        </div>
      </section>
    );
  }

  if (!plate) {
    const wasDvla = !!regFromDvlaHandle(handle);
    return (
      <section className="rk-section rk-pview__missing">
        <div className="rk-wrap">
          <h1 className="rk-info__t">Plate not found</h1>
          <p>{wasDvla ? "The DVLA no longer has this registration for sale. Have a look at our other plates." : "This plate may have sold. Have a look at our other plates."}</p>
          <a
            className="rk-btn rk-btn--gold"
            href={wasDvla ? "#buy" : "#buy-regking"}
            onClick={(e) => {
              e.preventDefault();
              go(wasDvla ? "buy" : "buy-regking");
            }}
          >
            {wasDvla ? "Search plates" : "See our plates"}
          </a>
        </div>
      </section>
    );
  }

  const ours = plate.source === "regking";
  const fromDvla = plate.source === "dvla";
  const crumb = ours ? { h: "buy-regking", t: "Plates owned by REG KING" } : fromDvla ? null : { h: "buy-customer", t: "Customer plates" };
  const pricing: Pricing = ours ? { mode: "trade", included: OUR_INCLUDED, offRetail: OWN_STOCK_DISCOUNT } : { mode: "trade", included: [] };
  const plateLines = want ? priceLines(cfg, pricing) : [];
  const plateSum = sumLines(plateLines);
  /** The plates chosen in the builder, written out for the order (null until a style is picked). */
  const opt = want && cfg.style ? { name: summary(cfg) } : null;
  const money = (n: number) => formatGBP(n, Number.isInteger(n));
  // null when part of the plates is at a trade price still to be confirmed
  const platesPrice = !opt ? 0 : plateSum.onRequest ? null : plateSum.known;
  // Plate Assignment Management: offered on DVLA and customer plates (our own plates include the transfer).
  const canAssign = !ours;
  const assigned = canAssign && assign;
  const extras = [opt ? `plates=${encodeURIComponent(opt.name)}` : "", assigned ? "assign=1" : ""].filter(Boolean).join("&");
  const buyHref = `${routes.buy}/products/${plate.handle}${extras ? `?${extras}` : ""}`;
  const total = plate.price + (opt ? plateSum.known : 0) + (assigned ? ASSIGN.price : 0);
  /**
   * Buy now: the registration (with any plates and the assignment service) goes into the basket and
   * on to checkout. DVLA plates are checked with the DVLA again when the customer pays.
   */
  const toCheckout = (how: "full" | "deposit" | "monthly") => {
    setFinOpen(false);
    setDepOpen(false);
    const lines = [
      { label: `${plate.reg} registration${fromDvla ? " (DVLA price and our fee)" : ""}`, amount: plate.price },
      ...plateLines,
      ...(assigned ? [{ label: ASSIGN.name, amount: ASSIGN.price }] : []),
    ];
    const id = `reg-${plate.handle}`;
    save({
      id,
      kind: "registration",
      title: `${plate.reg} registration`,
      detail: [ours ? "REG KING stock" : fromDvla ? "New from the DVLA" : "Customer plate", opt ? opt.name : null, assigned ? ASSIGN.name : null].filter(Boolean).join(", "),
      lines,
      data: { reg: plate.reg, handle: plate.handle, source: plate.source, price: plate.price, pay: how, plates: opt ? opt.name : null, platesCfg: opt ? cfg : null, platesLegal: !!opt && cfg.legal === "Legal", assign: assigned },
    });
    go("checkout");
  };
  const buyNow = () => toCheckout(pay === "monthly" ? "monthly" : "full");
  const buyDvla = async () => {
    setBuying("checking");
    const r = await startDvlaCheckout(plate.reg, opt ? opt.name : "", assigned);
    if ("url" in r) window.location.href = r.url;
    else setBuying(r.error);
  };
  const others = platesForSale.filter((p) => p.handle !== plate.handle);
  const sendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    addOffer(plate.reg, Number(offer));
    navigate(`${routes.contact}?${new URLSearchParams({ enquiry: "offer", reg: plate.reg, offer }).toString()}`, "offer");
    setOfferSent(`Offer of £${Number(offer).toLocaleString("en-GB")} sent for ${plate.reg}. We'll get back to you.`);
  };
  const link = (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    go(hash);
  };

  return (
    <>
      <section className="rk-pview" aria-labelledby="pview-title">
        <div className="rk-wrap rk-pview__in">
          <nav className="rk-pview__crumbs" aria-label="Breadcrumb">
            <a href="#buy" onClick={link("buy")}>
              Buy plates
            </a>
            <span aria-hidden>/</span>
            {crumb && (
              <>
                <a href={linkFor(crumb.h)} onClick={link(crumb.h)}>
                  {crumb.t}
                </a>
                <span aria-hidden>/</span>
              </>
            )}
            <span aria-current="page">{plate.reg}</span>
          </nav>

          <div className="rk-pview__grid" data-building={want ? "" : undefined}>
            {/* Making plates: the live preview takes the plate's place on the left and stays in view, as on Make */}
            {want ? (
              <div className="rk-make__view pv-liveview">
                <Plate3D reg={plate.reg} c={cfg} />
              </div>
            ) : (
              <PlateStage reg={plate.reg} />
            )}

            <div className="rk-pview__buy">
              <h1 id="pview-title" className="rk-pview__reg">
                {plate.reg}
              </h1>
              {reward ? (
                <>
                  <p className="rk-pview__price">
                    <s className="rk-pview__was">{formatGBP(plate.price, Number.isInteger(plate.price))}</s>{" "}
                    {formatGBP(plate.price - reward.off, Number.isInteger(plate.price - reward.off))}
                  </p>
                  <p className="rk-pview__reward">
                    Plate pack price: £{reward.off} off until{" "}
                    {new Date(reward.expires).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </>
              ) : (
                <p className="rk-pview__price">{formatGBP(plate.price, Number.isInteger(plate.price))}</p>
              )}
              {fromDvla && dvlaRow && (
                <p className="pv-dvla__split" data-dvla-split>
                  DVLA price {formatGBP(dvlaRow.dvlaPrice, Number.isInteger(dvlaRow.dvlaPrice))} plus our {Math.round(DVLA_FEE_RATE * 100)}% service fee of {formatGBP(dvlaFee(dvlaRow.dvlaPrice), Number.isInteger(dvlaFee(dvlaRow.dvlaPrice)))}
                </p>
              )}
              {fromDvla && (
                <details className="pv-fee" data-pv-fee>
                  <summary>What the service fee covers</summary>
                  <ul>
                    {DVLA_FEE_COVERS.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <p>You could buy straight from the DVLA instead. Our fee is for doing it all for you. Putting the plate on your vehicle is a separate option, {ASSIGN.name}.</p>
                </details>
              )}
              <p className="rk-pview__owner">{ours ? "Owned by REG KING. Ready to transfer." : fromDvla ? "New from the DVLA, sold through REG KING." : "Sold by its owner through REG KING."}</p>
              {fromDvla && (
                <ul className="pv-dvla" data-pv-dvla>
                  {DVLA_FACTS.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                  {dvlaRow?.sample && <li className="pv-dvla__sample">Sample DVLA plate for the preview. Live prices come from the DVLA feed.</li>}
                </ul>
              )}

              {/* Extras: one tidy list. Tap a row to add it; plates open their options underneath. */}
              <div className="pvx" data-pvx>
                <h2 className="pvx__h">{ours ? "Included with this plate" : "Add to your order"}</h2>
                <div className="pvx__list">
                  <button type="button" className="pvx__row" role={ours ? undefined : "checkbox"} aria-checked={ours ? undefined : !!want} aria-expanded={ours ? !!want : undefined} data-included={ours || undefined} onClick={() => setWant(!want)} data-pp-yes data-source={plate.source}>
                    <span className="pvx__thumb" aria-hidden>
                      <i data-side="front">{plate.reg}</i>
                      <i data-side="rear">{plate.reg}</i>
                    </span>
                    <span className="pvx__txt">
                      <b>{ours ? "Front and rear plates" : "Physical plates"}</b>
                      <small>{ours ? (want ? "Pick the style you'd like below." : "A front and rear set, made to order. Tap to choose the style.") : "A front and rear set, made to order at our trade price."}</small>
                    </span>
                    <span className="pvx__end">
                      <span className="pvx__price">{ours ? "Included" : "Trade price"}</span>
                      {ours ? (
                        <svg className="pvx__chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      ) : (
                        <span className="pvx__switch" aria-hidden />
                      )}
                    </span>
                  </button>
              {want && (
                <div className="pv-build rk-make" data-pp-mini>
                  {/* phones: the preview sits here, above the steps */}
                  <div className="pv-inlineview">
                    <Plate3D reg={plate.reg} c={cfg} />
                  </div>
                  <PlateBuilder
                    reg={plate.reg}
                    c={cfg}
                    set={(p) => setCfg((x) => ({ ...x, ...p }))}
                    replace={(n) => setCfg({ ...n, withPlate: true })}
                    onRegStep={() => {}}
                    pricing={pricing}
                    title={<>Your <span>plates</span></>}
                  />
                  <p className="pp-mini__note">
                    {fromDvla ? `No documents needed from you. We make road legal plates once the DVLA has issued the certificate for ${plate.reg}.` : `No documents needed. We already have what we need for ${plate.reg}.`}{" "}
                    {ours ? `A set in ${OUR_INCLUDED.join(", ").replace(/, ([^,]*)$/, " or $1")} is included. Any other style, extra or size is ${Math.round(OWN_STOCK_DISCOUNT * 100)}% off our normal price.` : "Everything here is at our trade price."}
                  </p>
                </div>
              )}

                  {canAssign && (
                    <button type="button" className="pvx__row" role="checkbox" aria-checked={assign} onClick={() => setAssign(!assign)} data-assign data-assign-yes>
                      <span className="pvx__icon" aria-hidden>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 17h14l-1.5-5.5a2 2 0 0 0-1.9-1.5H8.4a2 2 0 0 0-1.9 1.5zM7 17v2M17 17v2M9 7l3-3 3 3M12 4v6" />
                        </svg>
                      </span>
                      <span className="pvx__txt">
                        <b>{ASSIGN.name}</b>
                        <small>We assign the plate to your vehicle and handle the whole process.</small>
                      </span>
                      <span className="pvx__end">
                        <span className="pvx__price">{money(ASSIGN.price)}</span>
                        <span className="pvx__switch" aria-hidden />
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {(want || assigned) && (
                <dl className="pv-sum" aria-live="polite" data-pv-sum>
                  <h2 className="pv-sum__h">Your order</h2>
                  <div>
                    <dt>{plate.reg}</dt>
                    <dd>{money(plate.price)}</dd>
                  </div>
                  {opt && (
                    <div>
                      <dt>
                        Plates: {opt.name}
                      </dt>
                      <dd>{platesPrice === null ? (plateSum.known ? `${money(plateSum.known)} + trade price` : "Trade price") : platesPrice === 0 ? "Included" : money(platesPrice)}</dd>
                    </div>
                  )}
                  {assigned && (
                    <div>
                      <dt>{ASSIGN.name}</dt>
                      <dd>{money(ASSIGN.price)}</dd>
                    </div>
                  )}
                  <div className="pv-sum__total">
                    <dt>Total</dt>
                    <dd>{opt && platesPrice === null ? `${money(total)} + plates` : money(total)}</dd>
                  </div>
                </dl>
              )}

              {/* How to pay: pick one, and the main button says what happens next */}
              <div className="pvx" data-pvpay>
                <h2 className="pvx__h">How would you like to pay?</h2>
                <div className={`pvx__pay${fromDvla ? " pvx__pay--two" : ""}`} role="radiogroup" aria-label="How would you like to pay?">
                  <button type="button" role="radio" aria-checked={pay === "full"} onClick={() => setPay("full")} data-pay="full">
                    <b>Pay in full</b>
                    <span>{opt && platesPrice === null ? `${money(total)} + plates` : money(total)}</span>
                  </button>
                  {!fromDvla && (
                    <button type="button" role="radio" aria-checked={pay === "deposit"} onClick={() => setPay("deposit")} data-pay="deposit" data-dep-open>
                      <b>Reserve it</b>
                      <span>{formatGBP(depositFor(plate.price), Number.isInteger(depositFor(plate.price)))} deposit today</span>
                    </button>
                  )}
                  <button type="button" role="radio" aria-checked={pay === "monthly"} onClick={() => setPay("monthly")} data-pay="monthly" data-fin-open>
                    <b>Pay monthly</b>
                    <span>With finance</span>
                  </button>
                </div>
              </div>

              <div className="rk-pview__acts">
                <button
                  type="button"
                  className="rk-btn rk-btn--gold rk-pview__go"
                  onClick={() => (pay === "deposit" ? setDepOpen(true) : pay === "monthly" ? setFinOpen(true) : buyNow())}
                  disabled={buying === "checking"}
                  aria-haspopup={pay === "full" ? undefined : "dialog"}
                  data-pp-buy
                >
                  {buying === "checking"
                    ? "Checking with the DVLA"
                    : pay === "deposit"
                      ? `Reserve for ${formatGBP(depositFor(plate.price), Number.isInteger(depositFor(plate.price)))}`
                      : pay === "monthly"
                        ? "See finance options"
                        : "Buy this plate"}
                </button>
                {buying && buying !== "checking" && (
                  <p className="pv-dvla__msg" role="status">
                    {buying}
                  </p>
                )}
                {/* Make an offer: customer plates only. REG KING's own stock and DVLA plates have fixed prices. */}
                {plate.source === "customer" &&
                  (offerSent ? (
                    <p className="pv-offer__sent" role="status" data-offer-sent>
                      {offerSent}
                    </p>
                  ) : offerOpen ? (
                    <form className="pv-offer" onSubmit={sendOffer} data-offer>
                      <label htmlFor="pv-offer-in">Your offer for {plate.reg}</label>
                      <div className="pv-offer__row">
                        <span className="pv-offer__field">
                          <span aria-hidden>£</span>
                          <input id="pv-offer-in" inputMode="numeric" autoFocus placeholder={String(Math.round(plate.price * 0.85))} value={offer} onChange={(e) => setOffer(e.target.value.replace(/\D/g, "").slice(0, 7))} data-offer-input />
                        </span>
                        <button type="submit" className="pv-offer__send" disabled={!offer} data-offer-send>
                          Send offer
                        </button>
                      </div>
                      <small>We&apos;ll pass it to the owner and reply by phone or email.</small>
                    </form>
                  ) : (
                    <button type="button" className="pv-offer__open" onClick={() => setOfferOpen(true)} data-offer-open>
                      Make an offer
                    </button>
                  ))}
                {fromDvla && (
                  <p className="pv-dvla__nodep" data-dvla-nodep>
                    <b>No deposits on DVLA plates.</b> {DVLA_NO_DEPOSIT}
                  </p>
                )}
              </div>
              <a className="rk-pview__trust" href={reviewScores.trustpilot.url} target="_blank" rel="noopener noreferrer">
                <span className="rk-pview__stars" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} viewBox="0 0 24 24" width="14" height="14">
                      <path fill="#fff" d="M12 2.8l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.6l-5.7 3.3 1.4-6.3L2.9 9.3l6.4-.6L12 2.8z" />
                    </svg>
                  ))}
                </span>
                <span>
                  <b>{reviewScores.trustpilot.score} out of 5</b> from {reviewScores.trustpilot.count} reviews on Trustpilot
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {finOpen && <FinancePopup price={plate.price} reg={plate.reg} onClose={() => setFinOpen(false)} onBuy={buyNow} buyLabel={fromDvla ? "Buy this plate" : "Go to checkout"} />}
      {depOpen && !fromDvla && <DepositPopup price={plate.price} reg={plate.reg} handle={plate.handle} onClose={() => setDepOpen(false)} onMore={() => (setDepOpen(false), go("info-deposits"))} onPay={() => toCheckout("deposit")} />}

      {ours && <PlateDetails reg={plate.reg} handle={plate.handle} />}

      <PlateAnatomy
        reg={plate.reg}
        seller={ours ? "REG KING" : fromDvla ? "The DVLA, through REG KING" : "Its owner, through REG KING"}
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
      />

      <HowBuying
        included={ours ? "Physical number plates included at no extra cost." : "Add physical plates at our trade price when you buy."}
        steps={fromDvla ? [
          // CONFIRM: REG KING's process for DVLA purchases.
          { t: "Buy it", d: "Pay in full or spread the cost with finance. DVLA plates are open-market plates, sold first come, first served, so we check it's still for sale as you check out." },
          { t: "We buy it from the DVLA", d: `We buy ${plate.reg} for you and the DVLA issues the V750 certificate of entitlement.` },
          assigned
            ? { t: "We put it on your vehicle", d: `With ${ASSIGN.name}, we assign ${plate.reg} onto your vehicle for you. You can follow every step in your REG KING account${opt ? ", and we send a photo of your plates before they're posted" : ""}.` }
            : { t: "On your car when you're ready", d: `Put it on a vehicle now or keep it on the certificate. You can follow every step in your REG KING account${opt ? ", and we send a photo of your plates before they're posted" : ""}.` },
        ] : [
          {
            t: "Buy or reserve",
            d: ours ? "Pay in full, spread the cost with finance, or reserve it with a deposit. It's our plate, so there's no waiting on a seller." : "Pay in full, spread the cost with finance, or reserve it with a deposit.",
          },
          {
            t: "We call you",
            d: ours
              ? `We book a call to confirm your number plate style and how you'd like your documents. Physical plates for ${plate.reg} are included.`
              : `We book a call to go through the transfer and your documents${opt ? ", and confirm your plates" : ""}.`,
          },
          ours
            ? { t: "Ready within 24 hours", d: "We send a photo of your plates, then post everything by Royal Mail Special Delivery with tracking." }
            : { t: assigned ? "We put it on your vehicle" : "Follow it in your account", d: `${assigned ? `With ${ASSIGN.name}, we assign ${plate.reg} onto your vehicle for you. ` : ""}You can see where the transfer is up to in your REG KING account${opt ? ", and we send a photo of your plates before they're posted" : ""}.` },
        ]}
      />

      {others.length > 0 && (
        <section className="rk-featured rk-pview__more" aria-labelledby="more-title">
          <div className="rk-wrap rk-featured__in">
            <div className="rk-featured__head">
              <h2 id="more-title">More plates</h2>
            </div>
            <Carousel label="More plates" interval={0} tone="light" className="rk-carousel--featured">
              {others.map((p) => (
                <a key={p.handle} className="rk-fslide" href={`#plate-${p.handle}`} onClick={link(`plate-${p.handle}`)}>
                  <PlatePair reg={p.reg} />
                  <span className="rk-fslide__row">
                    <b className="rk-fslide__reg">{p.reg}</b>
                    <span className="rk-fslide__price">{formatGBP(p.price, Number.isInteger(p.price))}</span>
                  </span>
                </a>
              ))}
            </Carousel>
          </div>
        </section>
      )}
    </>
  );
}

/** How long each step stays lit before the next one. */
const STEP_MS = 3200;

/** How buying works: three steps that light up in turn while on screen, like the Sell page. Hover or focus holds one. */
function HowBuying({ steps, included }: { steps: { t: string; d: string }[]; included: string }) {
  const [lit, setLit] = useState(0);
  const [hold, setHold] = useState(false);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  const box = useRef<HTMLOListElement>(null);
  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  const running = seen && !hold && !still;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLit((i) => (i + 1) % steps.length), STEP_MS);
    return () => clearInterval(t);
  }, [running, lit, steps.length]);
  return (
    <section className="pv-how" aria-labelledby="pv-how-t">
      <div className="rk-wrap pv-how__in">
        <h2 id="pv-how-t">How buying works</h2>
        <ol className="pv-how__steps" ref={box} data-running={running || undefined} style={{ ["--step-ms" as string]: `${STEP_MS}ms` }}>
          {steps.map((st, i) => (
            <li
              key={st.t}
              tabIndex={0}
              data-lit={!still && i === lit ? "" : undefined}
              data-step-lit={!still && i === lit ? "" : undefined}
              data-n={i + 1}
              onMouseEnter={() => (setLit(i), setHold(true))}
              onMouseLeave={() => setHold(false)}
              onFocus={() => (setLit(i), setHold(true))}
              onBlur={() => setHold(false)}
            >
              <span className="pv-how__n" aria-hidden>
                {i + 1}
              </span>
              <b>{st.t}</b>
              <span>{st.d}</span>
              <i className="pv-how__bar" aria-hidden key={`${lit}-${running}`} />
            </li>
          ))}
        </ol>
        <p className="pv-how__note">{included}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* About the plate: the registration read part by part, and a timeline */
/* showing which vehicles it can go on                                 */
/* ------------------------------------------------------------------ */

type Part = { text: string; label: string; note?: string };

/** Split a registration into the parts the DVLA format gives it, with what each part means. */
function partsOf(reg: string): { parts: Part[]; summary: string } {
  const st = styleOf(reg);
  const e = earliest(reg);
  const [a, b] = reg.split(" ");
  if (st === "current")
    return {
      parts: [
        { text: reg.slice(0, 2), label: "Memory tag", note: "Area code" },
        { text: reg.slice(2, 4), label: "Age identifier", note: e ? e.label : undefined },
        { text: b, label: "Random letters" },
      ],
      summary: "Current style: two letters, two numbers, three letters. Used since 2001.",
    };
  if (st === "prefix")
    return {
      parts: [
        { text: reg[0], label: "Year letter", note: e ? e.label : undefined },
        { text: a.slice(1), label: "Numbers" },
        { text: b, label: "Letters" },
      ],
      summary: "Prefix style: starts with the year letter. Used 1983 to 2001.",
    };
  if (st === "suffix")
    return {
      parts: [
        { text: a, label: "Letters" },
        { text: b.slice(0, -1), label: "Numbers" },
        { text: b.slice(-1), label: "Year letter", note: e ? e.label : undefined },
      ],
      summary: "Suffix style: ends with the year letter. Used 1963 to 1983.",
    };
  const words = reg.split(" ");
  return {
    parts: words.map((w) => ({ text: w, label: /^\d+$/.test(w) ? "Numbers" : "Letters" })),
    summary: st === "irish" ? "Northern Irish: no year in it, so it fits a vehicle of any age." : "Dateless: no year in it, so it fits a vehicle of any age.",
  };
}

const FIRST_YEAR = 1963;

/** A DVLA plate for its page: "loading", the plate, null when it's gone, or "error". */
function useDvlaPlate(handle: string | null): DvlaPlate | null | "loading" | "error" {
  const [v, setV] = useState<DvlaPlate | null | "loading" | "error">(() => (handle && regFromDvlaHandle(handle) ? "loading" : null));
  useEffect(() => {
    if (!handle || !regFromDvlaHandle(handle)) {
      setV(null);
      return;
    }
    let on = true;
    setV("loading");
    getDvlaPlate(handle).then((r) => on && setV(r));
    return () => {
      on = false;
    };
  }, [handle]);
  return v;
}

function PlateAnatomy({ reg, seller, month, year, setMonth, setYear }: { reg: string; seller: string; month: string; year: string; setMonth: (v: string) => void; setYear: (v: string) => void }) {
  const { parts, summary } = partsOf(reg);
  const first = firstMonth(reg);
  const now = new Date();
  const span = now.getFullYear() + now.getMonth() / 12 - FIRST_YEAR;
  const at = (y: number, m: number) => Math.min(100, Math.max(0, ((y + m / 12 - FIRST_YEAR) / span) * 100));
  const startPct = first ? at(first.y, first.m) : 0;
  const years = Array.from({ length: now.getFullYear() - FIRST_YEAR + 1 }, (_, i) => String(now.getFullYear() - i));
  const checked = year !== "" && month !== "";
  const carPct = checked ? at(Number(year), Number(month)) : null;
  const fits = !checked ? null : !first || Number(year) > first.y || (Number(year) === first.y && Number(month) >= first.m);
  const chars = reg.replace(/\s/g, "").length;

  return (
    <section className="pa" aria-labelledby="pa-t">
      <div className="rk-wrap pa__in">
        <div className="pa__read">
          <h2 id="pa-t">Reading {reg}</h2>
          <div className="pa-plate" style={{ gridTemplateColumns: parts.map((p) => `${p.text.length}fr`).join(" ") }}>
            {parts.map((p, i) => (
              <div key={i} className="pa-part" data-part={p.label}>
                <span className="pa-part__txt">{p.text}</span>
              </div>
            ))}
          </div>
          <div className="pa-labels" style={{ gridTemplateColumns: parts.map((p) => `${p.text.length}fr`).join(" ") }}>
            {parts.map((p, i) => (
              <div key={i} className="pa-label">
                <i aria-hidden />
                <b>{p.label}</b>
                {p.note && <span>{p.note}</span>}
              </div>
            ))}
          </div>
          <p className="pa__sum">{summary}</p>
          <dl className="pa-facts">
            <div>
              <dt>Characters</dt>
              <dd>{chars}</dd>
            </div>
            <div>
              <dt>Fits vehicles from</dt>
              <dd>{first ? first.label : "Any age"}</dd>
            </div>
            <div>
              <dt>Seller</dt>
              <dd>{seller}</dd>
            </div>
          </dl>
        </div>

        <div className="pa__fit">
          <h2>Will it fit my vehicle?</h2>
          <p>
            {first
              ? `A plate can't make a vehicle look newer than it is. ${reg} can go on anything first registered from ${first.label} onwards.`
              : `${reg} has no year in it, so it can go on a vehicle of any age.`}
          </p>
          <div className="pa-line" aria-hidden>
            <div className="pa-line__track">
              <span className="pa-line__ok" style={{ left: `${startPct}%` }} />
              {first && (
                <span
                  className="pa-line__from"
                  // the label slides so it never runs off either end of the line; its pointer stays on the date
                  style={{ left: `${startPct}%`, transform: `translateX(-${startPct}%)`, ["--pa-at" as string]: `${startPct}%` }}
                >
                  {first.label}
                </span>
              )}
              {carPct !== null && <span className={`pa-line__car${fits ? " is-yes" : " is-no"}`} style={{ left: `${carPct}%` }} />}
            </div>
            <div className="pa-line__ends">
              <span>{FIRST_YEAR}</span>
              <span>Today</span>
            </div>
          </div>
          {first && (
            <form className="pa-check" onSubmit={(e) => e.preventDefault()}>
              <span id="pa-l">When was your vehicle first registered?</span>
              <div role="group" aria-labelledby="pa-l">
                <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} data-fit="month">
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} data-fit="year">
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {fits !== null && (
                <p className={`pa-res${fits ? " is-yes" : " is-no"}`} role="status">
                  {fits ? `Yes, ${reg} can go on your vehicle.` : `No. Your vehicle is older than ${first.label}, so this plate would make it look newer.`}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The showroom: one plate under a spotlight, on a polished floor.     */
/* Front or rear, the customer's choice.                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Finance, in a popup over the plate page so nobody leaves it         */
/* ------------------------------------------------------------------ */

/** Split a price into n payments in pence, any odd pennies on the first. */
function splitInto(total: number, n: number) {
  const pence = Math.round(total * 100);
  const each = Math.floor(pence / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? pence - each * (n - 1) : each) / 100);
}

/** Focus, Escape and scroll lock shared by the plate page popups. */
function usePopup(onClose: () => void) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const body = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = body;
      was?.focus();
    };
  }, [onClose]);
  return close;
}

function CloseX({ btn, onClose, data }: { btn: React.RefObject<HTMLButtonElement | null>; onClose: () => void; data: string }) {
  return (
    <button ref={btn} type="button" className="fin-pop__x" onClick={onClose} aria-label="Close" {...{ [data]: "" }}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

/**
 * Reserve with a deposit, in a popup like finance. REG KING's terms: 10% of the price,
 * non-refundable, taken off the price; the plate is held for an agreed period.
 * Paying opens a secure checkout for the deposit (app/api/deposit).
 */
function DepositPopup({ price, reg, handle, onClose, onMore, onPay }: { price: number; reg: string; handle: string; onClose: () => void; onMore: () => void; onPay?: () => void }) {
  const close = usePopup(onClose);
  const [agree, setAgree] = useState(false);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"" | "working" | string>("");
  const money = (n: number) => formatGBP(n, Number.isInteger(n));
  const dep = depositFor(price);
  const balance = Math.round((price - dep) * 100) / 100;
  const pct = Math.round(DEPOSIT_RATE * 100);
  const pay = async () => {
    setTried(true);
    if (!agree) return;
    if (onPay) return onPay();
    setState("working");
    const r = await startDeposit(handle, money(dep));
    if ("url" in r) window.location.href = r.url;
    else setState(r.error);
  };
  return (
    <div className="fin-pop" onClick={onClose}>
      <div className="fin-pop__card" role="dialog" aria-modal="true" aria-labelledby="dep-pop-t" onClick={(e) => e.stopPropagation()} data-dep-pop>
        <div className="fin-pop__head">
          <div>
            <h2 id="dep-pop-t">Reserve with a deposit</h2>
            <p>
              {reg} at {money(price)}. Pay {pct}% now and we hold it for you.
            </p>
          </div>
          <CloseX btn={close} onClose={onClose} data="data-dep-close" />
        </div>
        <div className="fin-pop__body">
          <ol className="fin-pop__parts" aria-label="Deposit and balance">
            <li>
              <span>Deposit today</span>
              <b>{money(dep)}</b>
            </li>
            <li>
              <span>Balance later</span>
              <b>{money(balance)}</b>
            </li>
          </ol>
          <ul className="fin-pop__points">
            <li>Your deposit comes off the price, so you only pay the rest later.</li>
            <li>We hold {reg} for you for the period we agree, so nobody else can buy it.</li>
            <li>Pay the balance within the agreed time and it&apos;s yours.</li>
          </ul>
          <label className="dep-pop__agree" data-invalid={tried && !agree ? "" : undefined}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-dep-agree />
            <span>I understand the deposit is non-refundable. If I don&apos;t go ahead, REG KING keeps it.</span>
          </label>
          {tried && !agree && <p className="dep-pop__err">Tick the box to confirm you&apos;ve read this.</p>}
          <button type="button" className="fin-pop__apply dep-pop__pay" onClick={pay} disabled={state === "working"} data-dep-pay>
            {state === "working" ? "Opening checkout" : `Pay ${money(dep)} deposit`}
          </button>
          {state && state !== "working" && (
            <p className="dep-pop__msg" role="status">
              {state}
            </p>
          )}
          <p className="fin-pop__small">
            <button type="button" className="dep-pop__more" onClick={onMore}>
              How deposits work
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function FinancePopup({ price, reg, onClose, onBuy, buyLabel }: { price: number; reg: string; onClose: () => void; onBuy: () => void; buyLabel: string }) {
  const [pick, setPick] = useState<ProviderKey>("klarna");
  const close = usePopup(onClose);
  const p = PROVIDERS.find((x) => x.key === pick)!;
  const money = (n: number) => formatGBP(n, false);
  const parts = p.split ? splitInto(price, p.split.parts) : [];

  return (
    <div className="fin-pop" onClick={onClose}>
      <div className="fin-pop__card" role="dialog" aria-modal="true" aria-labelledby="fin-pop-t" onClick={(e) => e.stopPropagation()}>
        <div className="fin-pop__head">
          <div>
            <h2 id="fin-pop-t">Spread the cost</h2>
            <p>
              {reg} at {formatGBP(price, Number.isInteger(price))}. Choose how at checkout.
            </p>
          </div>
          <CloseX btn={close} onClose={onClose} data="data-fin-close" />
        </div>

        <div className="fin-pop__tabs" role="tablist" aria-label="Ways to pay">
          {PROVIDERS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={pick === x.key} onClick={() => setPick(x.key)} data-fin-pick={x.key}>
              <b>{x.name}</b>
              <small>{x.tag}</small>
            </button>
          ))}
        </div>

        <div className="fin-pop__body" role="tabpanel" key={p.key}>
          {p.split ? (
            <>
              <ol className="fin-pop__parts" aria-label={`${p.split.parts} payments`}>
                {parts.map((v, i) => (
                  <li key={i}>
                    <span>{i === 0 ? (p.split!.first === "at checkout" ? "Today" : "When it ships") : `Payment ${i + 1}`}</span>
                    <b>{money(v)}</b>
                  </li>
                ))}
              </ol>
              <p className="fin-pop__note">
                {p.split.parts} interest-free payments, {p.split.every}. {p.name} decides how much you can spend, so for bigger plates use Payl8r or reserve it with a deposit.
              </p>
              <button type="button" className="fin-pop__apply" onClick={onBuy} data-fin-buy>
                {buyLabel}
              </button>
              <p className="fin-pop__then">Choose {p.name} when you pay.</p>
            </>
          ) : (
            <>
              <p className="fin-pop__note">Monthly payments over a longer term, subject to a credit and affordability check.</p>
              <p className="fin-pop__eg">
                <span>Representative example</span>
                <b>£460.00 over 12 months</b>
                <small>2.50% fixed per month. Representative APR 65.5%.</small>
              </p>
              <a className="fin-pop__apply" href={routes.financeApply} target="_blank" rel="noopener noreferrer">
                Apply for Payl8r finance
              </a>
            </>
          )}
          <ul className="fin-pop__points">
            {p.points.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="fin-pop__small">{p.key === "payl8r" ? payl8rDisclaimer : p.small}</p>
        </div>
      </div>
    </div>
  );
}

function PlateStage({ reg }: { reg: string }) {
  const [show, setShow] = useState<"both" | "front" | "rear">("both");
  return (
    <div className="lx-stage">
      <div className="lx-stage__floor">
        <div className="lx-stage__lift" key={show}>
          <PlatePair reg={reg} size="lg" show={show} />
        </div>
      </div>
      <div className="lx-stage__sides" role="radiogroup" aria-label="Which plates to show">
        {(
          [
            ["both", "Front & rear"],
            ["front", "Front only"],
            ["rear", "Rear only"],
          ] as const
        ).map(([k, t]) => (
          <button key={k} type="button" role="radio" aria-checked={show === k} onClick={() => setShow(k)} data-stage-show={k}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * About this plate, for REG KING's own stock: the same details as the current listings
 * (meaning, which vehicles it can go on, what's included, the refund promise, contact first).
 * The £80 and £50 values are as REG KING's listings state them.
 */
const FULL_MONTH: Record<string, string> = { Jan: "January", Mar: "March", Aug: "August", Sep: "September" };

function PlateDetails({ reg, handle }: { reg: string; handle: string }) {
  const meaning = PLATE_MEANINGS[handle];
  const first = earliest(reg);
  return (
    <section className="pd" aria-labelledby="pd-t" data-pd>
      <div className="rk-wrap pd__in">
        <h2 id="pd-t">About {reg}</h2>
        <div className="pd__grid">
          <div className="pd__card">
            <h3>Registration details</h3>
            <dl className="pd__dl">
              <div>
                <dt>Registration</dt>
                <dd className="pd__reg">{reg}</dd>
              </div>
              {meaning && (
                <div>
                  <dt>Meaning</dt>
                  <dd>{meaning}</dd>
                </div>
              )}
              <div>
                <dt>Can go on</dt>
                <dd>{first ? `Vehicles registered on or after 1 ${FULL_MONTH[first.label.slice(0, 3)] ?? first.label.slice(0, 3)} ${first.label.slice(4)}` : "Any vehicle. It's dateless, so it can't make a vehicle look newer."}</dd>
              </div>
            </dl>
          </div>
          <div className="pd__card">
            <h3>What's included</h3>
            <ul className="pd__list">
              <li>
                <b>Held on a DVLA certificate</b>
                <span>Ready for immediate transfer.</span>
              </li>
              <li>
                <b>DVLA transfer fee included</b>
                <span>Worth £80.</span>
              </li>
              <li>
                <b>A set of plates included</b>
                <span>Standard, 3D Gel or 4D. Worth £50.</span>
              </li>
            </ul>
          </div>
          <div className="pd__card">
            <h3>Buy with confidence</h3>
            <p>This registration is owned by REG KING or one of our trusted plate partners.</p>
            <p>In the unlikely event it becomes unavailable and we haven&apos;t been told, we refund you in full straight away.</p>
            <p className="pd__ask">
              Want to check it&apos;s available first? Call <b>{phone.display}</b>, WhatsApp <b>{whatsapp.display}</b> or email <b>{supportEmail}</b>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

