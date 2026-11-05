"use client";

/**
 * Checkout (#checkout), for the custom-built site: one page from the basket to a placed order.
 *
 *   1. Your details
 *   2. Registration: whose name it goes in (DVLA posts the certificate to them)   [registrations]
 *   3. Documents: ID and proof of the reg                                         [road legal plates]
 *   4. Delivery: delivered or collected from the HQ                               [anything physical]
 *   5. Payment: card, Pay in 3, Payl8r finance or a deposit, then pay
 *
 * Steps that don't apply to the basket are left out. Answered steps fold into one line with Change.
 *
 * PREVIEW: nothing is charged or ordered. Card details are never typed into REG KING's own page:
 * on the live site the payment step shows the payment provider's secure card form (Stripe Payment
 * Element or similar) in the space marked for it, and DVLA plates are bought before the card is
 * charged (see the developer brief).
 */
import { useMemo, useState } from "react";
import { DEPOSIT_RATE, MEMBER_DISCOUNT, formatGBP, payl8rDisclaimer, supportEmail } from "@/lib/brand";
import { HQ, phone } from "@/lib/infoContent";
import { docsReady, LEGAL_DOCS_LIST } from "@/lib/builder";
import { lineTotal, useMake, type BasketItem, type RegistrationData } from "./MakeProvider";
import { useAccount } from "./AccountProvider";
import { useMode } from "./ModeProvider";
import { BrandLogo } from "./BrandLogo";

const money = (n: number) => formatGBP(n, Number.isInteger(n));
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Delivery, from REG KING's current shipping policy on Shopify (standard £3.99, express £5.99,
 * free standard delivery over £50). CONFIRM with REG KING before launch: that policy is from 2021.
 */
export const DELIVERY = [
  { key: "standard", name: "Standard delivery", line: "3 to 5 working days", price: 3.99 },
  { key: "express", name: "Express delivery", line: "1 to 3 working days", price: 5.99 },
  { key: "collect", name: "Collect from the HQ", line: HQ.lines.join(", "), price: 0 },
] as const;
export const FREE_STANDARD_OVER = 50;

type Step = "details" | "registration" | "call" | "documents" | "delivery" | "payment";
type Pay = "card" | "pay-in-3" | "finance" | "deposit";

/**
 * Call booking for REG KING's own (and customers') registrations: the customer picks a day and a time
 * for us to ring and go through the transfer. CONFIRM with REG KING: the days and times staff can
 * call (shown here as Monday to Saturday, 10am to 5pm, the next three weeks).
 */
const CALL_DAYS_AHEAD = 21;
const CALL_CLOSED = [0]; // Sunday
const CALL_TIMES = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const longDay = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

const isPhysical = (b: BasketItem) => b.kind !== "registration" || !!b.data.plates;
const needsDocs = (b: BasketItem) =>
  (b.kind === "plates" && b.data.cfg.legal === "Legal" && !docsReady(b.data.cfg)) || (b.kind === "registration" && b.data.platesLegal);

export function Checkout() {
  const { basket } = useMake();
  const { customer } = useAccount();
  const { go } = useMode();

  const regs = basket.filter((b): b is Extract<BasketItem, { kind: "registration" }> => b.kind === "registration");
  const physical = basket.some(isPhysical);
  const docsNeeded = basket.some(needsDocs);
  const callNeeded = regs.some((r) => r.data.source !== "dvla");
  const steps: Step[] = ["details", ...(regs.length ? (["registration"] as Step[]) : []), ...(callNeeded ? (["call"] as Step[]) : []), ...(docsNeeded ? (["documents"] as Step[]) : []), ...(physical ? (["delivery"] as Step[]) : []), "payment"];

  const [done, setDone] = useState<Set<Step>>(new Set());
  const [editing, setEditing] = useState<Step | null>(null);
  const open: Step | null = editing ?? steps.find((s) => !done.has(s)) ?? null;
  const finish = (s: Step) => {
    setDone((d) => new Set(d).add(s));
    setEditing(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  };

  // 1. details
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [tel, setTel] = useState(customer?.phone ?? "");
  const [join, setJoin] = useState(false);
  // 2. registration: the name it goes in, and the address the certificate is posted to
  const [gift, setGift] = useState(false);
  const [holder, setHolder] = useState("");
  const [addr, setAddr] = useState({ line1: customer?.address?.line1 ?? "", line2: customer?.address?.line2 ?? "", town: customer?.address?.town ?? "", postcode: customer?.address?.postcode ?? "" });
  const [vehicle, setVehicle] = useState("");
  // call
  const [callDay, setCallDay] = useState("");
  const [callTime, setCallTime] = useState("");
  const [callTel, setCallTel] = useState("");
  const [callNote, setCallNote] = useState("");
  // 3. documents
  const [idFile, setIdFile] = useState("");
  const [proofFile, setProofFile] = useState("");
  const [later, setLater] = useState(false);
  // 4. delivery
  const [ship, setShip] = useState<(typeof DELIVERY)[number]["key"] | "">("");
  // 5. payment
  const regPay = regs[0]?.data.pay;
  const depositable = regs.some((r) => r.data.source !== "dvla");
  const [pay, setPay] = useState<Pay>(regPay === "deposit" && depositable ? "deposit" : regPay === "monthly" ? "finance" : "card");
  const [terms, setTerms] = useState(false);
  const [depOk, setDepOk] = useState(false);
  const [dvlaOk, setDvlaOk] = useState(false);
  const [tried, setTried] = useState<Step | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");

  // Money
  const sums = useMemo(() => {
    const all = lineTotal(basket.flatMap((b) => b.lines));
    const made = lineTotal(basket.filter((b) => b.kind === "plates" || b.kind === "surrounds" || b.kind === "logo").flatMap((b) => b.lines)).known;
    const member = customer || join ? r2(made * MEMBER_DISCOUNT) : 0;
    const physicalValue = lineTotal(basket.filter((b) => b.kind !== "registration").flatMap((b) => b.lines)).known + regs.reduce((a, r) => a + lineTotal(r.lines.slice(1)).known, 0);
    const opt = DELIVERY.find((d) => d.key === ship);
    const delivery = !physical || !opt ? 0 : opt.key === "standard" && physicalValue >= FREE_STANDARD_OVER ? 0 : opt.price;
    const total = r2(all.known - member + delivery);
    // A deposit covers the registrations only; everything else is paid in full today.
    const regValue = regs.filter((r) => r.data.source !== "dvla").reduce((a, r) => a + r.data.price, 0);
    const deposit = r2(regValue * DEPOSIT_RATE);
    const today = pay === "deposit" ? r2(total - regValue + deposit) : total;
    return { all, member, delivery, total, deposit, today, later: r2(total - today), onRequest: all.onRequest, freeStandard: physicalValue >= FREE_STANDARD_OVER };
  }, [basket, customer, join, ship, physical, pay, regs]);

  if (placed)
    return (
      <section className="rk-section co co--lux" aria-labelledby="co-done-t" data-checkout="done">
        <div className="rk-wrap co-done">
          <p className="co-preview" role="note">
            Preview: no payment was taken and nothing was ordered.
          </p>
          <h1 id="co-done-t" className="co-title">
            Order placed
          </h1>
          <p className="co-done__ref">
            Order <b>{placed}</b>. We&apos;ve emailed the details to {email}.
          </p>
          <h2 className="co-h2">What happens next</h2>
          <ol className="co-next">
            {regs.some((r) => r.data.source === "dvla") && <li>We buy your DVLA plate in your name. Your card is only charged once the DVLA confirms, and the DVLA posts the V750 certificate straight to you.</li>}
            {callNeeded && callDay && (
              <li>
                We call you on {longDay(callDay)} at {callTime} to go through the transfer and the next steps. You&apos;ll get a reminder by email.
              </li>
            )}
            {regs.some((r) => r.data.source !== "dvla") && <li>We start the transfer and email you the next steps for your registration. You can follow every stage in your account.</li>}
            {docsNeeded && (later ? <li>Upload your ID and proof of the reg from your account. We make road legal plates once we&apos;ve checked them.</li> : <li>We check your documents, then make your plates.</li>)}
            {physical && <li>{ship === "collect" ? `We'll email you when your order is ready to collect from ${HQ.lines[0]}, ${HQ.lines[2]}.` : "We make and post your order, and email you the tracking number."}</li>}
            {pay === "deposit" && <li>Pay the balance of {money(sums.later)} within the time we agree to complete your purchase.</li>}
          </ol>
          <div className="co-done__acts">
            <a className="co-btn" href="#account-orders" onClick={(e) => (e.preventDefault(), go("account-orders"))}>
              See your orders
            </a>
            <a className="co-btn co-btn--line" href="#buy" onClick={(e) => (e.preventDefault(), go("buy"))}>
              Back to the shop
            </a>
          </div>
        </div>
      </section>
    );

  if (!basket.length)
    return (
      <section className="rk-section co co--lux" aria-labelledby="co-empty-t" data-checkout="empty">
        <div className="rk-wrap co-empty">
          <h1 id="co-empty-t" className="co-title">
            Your basket is empty
          </h1>
          <p>Find a registration, or make plates, surrounds or logo plates, and they&apos;ll come here to check out.</p>
          <div className="co-done__acts">
            <a className="co-btn" href="#buy" onClick={(e) => (e.preventDefault(), go("buy"))}>
              Find a plate
            </a>
            <a className="co-btn co-btn--line" href="#make" onClick={(e) => (e.preventDefault(), go("make"))}>
              Make plates
            </a>
          </div>
        </div>
      </section>
    );

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const addrOk = !!addr.line1.trim() && !!addr.town.trim() && /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(addr.postcode.trim());
  const valid: Record<Step, boolean> = {
    details: !!name.trim() && emailOk && tel.replace(/\D/g, "").length >= 10,
    registration: (!gift || !!holder.trim()) && addrOk,
    call: !!callDay && !!callTime && (callTel || tel).replace(/\D/g, "").length >= 10,
    documents: later || (!!idFile && !!proofFile),
    delivery: !!ship && (ship === "collect" || addrOk),
    payment: terms && (pay !== "deposit" || depOk) && (!regs.some((r) => r.data.source === "dvla") || dvlaOk),
  };
  const next = (s: Step) => {
    if (!valid[s]) return setTried(s);
    setTried(null);
    finish(s);
  };
  const summaryOf: Record<Step, string> = {
    details: `${name}, ${email}`,
    registration: `In the name of ${gift ? holder : name}, ${addr.postcode.toUpperCase()}`,
    call: callDay ? `${longDay(callDay)} at ${callTime}` : "",
    documents: later ? "Upload from your account after checkout" : "ID and proof of the reg uploaded",
    delivery: DELIVERY.find((d) => d.key === ship)?.name ?? "",
    payment: "",
  };
  const title: Record<Step, string> = { details: "Your details", registration: "The registration", call: "Your call with us", documents: "Documents for road legal plates", delivery: "Delivery", payment: "Payment" };
  const err = (s: Step, ok: boolean, msg: string) => (tried === s && !ok ? <p className="co-err">{msg}</p> : null);

  const address = (
    <fieldset className="co-addr">
      <legend>{regs.length ? "Address (the certificate and any plates go here)" : "Delivery address"}</legend>
      <div className="co-row">
        <label className="co-field co-field--pc">
          <span>Postcode</span>
          <input value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value.toUpperCase() })} autoComplete="postal-code" data-co="postcode" />
        </label>
        <button type="button" className="co-btn co-btn--line" disabled title="The postcode finder connects on the live site">
          Find address
        </button>
      </div>
      <label className="co-field">
        <span>Address line 1</span>
        <input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="address-line1" data-co="line1" />
      </label>
      <label className="co-field">
        <span>Address line 2 (optional)</span>
        <input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} autoComplete="address-line2" />
      </label>
      <label className="co-field">
        <span>Town or city</span>
        <input value={addr.town} onChange={(e) => setAddr({ ...addr, town: e.target.value })} autoComplete="address-level2" data-co="town" />
      </label>
    </fieldset>
  );

  const body = (s: Step) => {
    switch (s) {
      case "details":
        return (
          <>
            <label className="co-field">
              <span>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-co="name" />
            </label>
            <label className="co-field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-co="email" />
            </label>
            <label className="co-field">
              <span>Phone</span>
              <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" data-co="tel" />
            </label>
            {!customer && (
              <label className="co-check co-check--quiet">
                <input type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} data-co="join" />
                <span>Save my details for next time (optional)</span>
              </label>
            )}
            {err(s, valid.details, "Add your name, a working email address and a phone number.")}
          </>
        );
      case "registration":
        return (
          <>
            {regs.map((r) => (
              <RegNote key={r.id} d={r.data} />
            ))}
            <div className="co-choice" role="radiogroup" aria-label="Whose name the registration goes in">
              <button type="button" role="radio" aria-checked={!gift} onClick={() => setGift(false)} data-co="holder-me">
                <b>My name</b>
                <small>{name || "As in your details"}</small>
              </button>
              <button type="button" role="radio" aria-checked={gift} onClick={() => setGift(true)} data-co="holder-gift">
                <b>Someone else&apos;s name</b>
                <small>For a gift, or a vehicle that isn&apos;t yours</small>
              </button>
            </div>
            {gift && (
              <label className="co-field">
                <span>Their full name, exactly as it should appear on the documents</span>
                <input value={holder} onChange={(e) => setHolder(e.target.value)} data-co="holder" />
              </label>
            )}
            {address}
            <label className="co-field">
              <span>The vehicle it&apos;s going on (optional)</span>
              <input value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} placeholder="Its current reg, if you know it" data-co="vehicle" />
            </label>
            {err(s, valid.registration, gift && !holder.trim() ? "Add the name the registration should go in." : "Add the full address with a UK postcode.")}
          </>
        );
      case "call": {
        const days: Date[] = [];
        for (let i = 1; i <= CALL_DAYS_AHEAD; i++) {
          const d = new Date();
          d.setHours(12, 0, 0, 0);
          d.setDate(d.getDate() + i);
          days.push(d);
        }
        return (
          <>
            <p className="co-p co-call__lead">
              One of the team calls you to go through the transfer of {regs.filter((r) => r.data.source !== "dvla").map((r) => r.data.reg).join(" and ")} and agree the next steps. Pick a time that suits you.
            </p>
            <div className="co-days" role="radiogroup" aria-label="Day">
              {days.map((d) => {
                const k = dayKey(d);
                const closed = CALL_CLOSED.includes(d.getDay());
                return (
                  <button key={k} type="button" role="radio" aria-checked={callDay === k} disabled={closed} onClick={() => (setCallDay(k), setCallTime(""))} data-co-day={k}>
                    <small>{d.toLocaleDateString("en-GB", { weekday: "short" })}</small>
                    <b>{d.getDate()}</b>
                    <small>{d.toLocaleDateString("en-GB", { month: "short" })}</small>
                  </button>
                );
              })}
            </div>
            {callDay && (
              <div className="co-times" role="radiogroup" aria-label={`Time on ${longDay(callDay)}`}>
                {CALL_TIMES.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={callTime === t} onClick={() => setCallTime(t)} data-co-time={t}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {callDay && callTime && (
              <p className="co-call__pick" role="status">
                We&apos;ll call you on <b>{longDay(callDay)}</b> at <b>{callTime}</b>.
              </p>
            )}
            <label className="co-field">
              <span>Number to call</span>
              <input type="tel" value={callTel || tel} onChange={(e) => setCallTel(e.target.value)} autoComplete="tel" data-co="call-tel" />
            </label>
            <label className="co-field">
              <span>Anything we should know before we call? (optional)</span>
              <input value={callNote} onChange={(e) => setCallNote(e.target.value)} placeholder="e.g. the car it's going on, or a question" />
            </label>
            {err(s, valid.call, !callDay || !callTime ? "Pick a day and a time for your call." : "Add a phone number we can call.")}
          </>
        );
      }
      case "documents":
        return (
          <>
            <p className="co-p">By law we must see these before we make road legal plates.</p>
            <label className="co-file">
              <span>{LEGAL_DOCS_LIST.identity}</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.heic" onChange={(e) => setIdFile(e.target.files?.[0]?.name ?? "")} disabled={later} data-co="id" />
              {idFile && <small>{idFile}</small>}
            </label>
            <label className="co-file">
              <span>{LEGAL_DOCS_LIST.entitlement}</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.heic" onChange={(e) => setProofFile(e.target.files?.[0]?.name ?? "")} disabled={later} data-co="proof" />
              {proofFile && <small>{proofFile}</small>}
            </label>
            <label className="co-check">
              <input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} data-co="later" />
              <span>I&apos;ll upload them from my account after checkout. My plates are made once they&apos;re checked.</span>
            </label>
            {err(s, valid.documents, "Upload both documents, or tick the box to send them later.")}
          </>
        );
      case "delivery":
        return (
          <>
            <div className="co-choice co-choice--list" role="radiogroup" aria-label="Delivery">
              {DELIVERY.map((d) => {
                const free = d.key === "standard" && sums.freeStandard;
                return (
                  <button key={d.key} type="button" role="radio" aria-checked={ship === d.key} onClick={() => setShip(d.key)} data-co={`ship-${d.key}`}>
                    <b>{d.name}</b>
                    <small>{d.line}</small>
                    <em>{d.price === 0 || free ? "Free" : money(d.price)}</em>
                  </button>
                );
              })}
            </div>
            {sums.freeStandard && <p className="co-p">Standard delivery is free on orders over {money(FREE_STANDARD_OVER)}.</p>}
            {ship && ship !== "collect" && !regs.length && address}
            {ship && ship !== "collect" && regs.length > 0 && <p className="co-p">We post to the address you gave for the registration: {[addr.line1, addr.town, addr.postcode].filter(Boolean).join(", ")}.</p>}
            {ship === "collect" && <p className="co-p">We&apos;ll email you when it&apos;s ready. Bring your order email.</p>}
            {err(s, valid.delivery, ship ? "Add the full delivery address with a UK postcode." : "Choose how you'd like it.")}
          </>
        );
      case "payment":
        return (
          <>
            <div className="co-choice co-choice--list" role="radiogroup" aria-label="How to pay">
              <button type="button" role="radio" aria-checked={pay === "card"} onClick={() => setPay("card")} data-co="pay-card">
                <b>Card, Apple Pay or Google Pay</b>
                <small>Pay {money(sums.total)} now</small>
              </button>
              <button type="button" role="radio" aria-checked={pay === "pay-in-3"} onClick={() => setPay("pay-in-3")} data-co="pay-in-3">
                <b>Pay in 3</b>
                <small>Klarna, Clearpay or PayPal, interest free, subject to status</small>
              </button>
              {regs.length > 0 && (
                <button type="button" role="radio" aria-checked={pay === "finance"} onClick={() => setPay("finance")} data-co="pay-finance">
                  <b>Monthly finance with Payl8r</b>
                  <small>Spread the cost, subject to status</small>
                </button>
              )}
              {depositable && (
                <button type="button" role="radio" aria-checked={pay === "deposit"} onClick={() => setPay("deposit")} data-co="pay-deposit">
                  <b>Reserve with a {Math.round(DEPOSIT_RATE * 100)}% deposit</b>
                  <small>
                    {money(sums.deposit)} deposit on the registration{sums.today > sums.deposit ? ", plus the rest of your order" : ""} today
                  </small>
                </button>
              )}
            </div>

            {(pay === "card" || pay === "deposit") && (
              <div className="co-provider" aria-label="Secure card form">
                <b>Secure card form</b>
                <span>On the live site the payment provider&apos;s card form appears here. Card details go straight to them and never reach REG KING.</span>
              </div>
            )}
            {pay === "pay-in-3" && <p className="co-p">You&apos;ll choose Klarna, Clearpay or PayPal and finish with them, then come back here.</p>}
            {pay === "finance" && <p className="co-p co-small">{payl8rDisclaimer}</p>}

            {pay === "deposit" && (
              <label className="co-check">
                <input type="checkbox" checked={depOk} onChange={(e) => setDepOk(e.target.checked)} data-co="dep-ok" />
                <span>I understand the deposit is non-refundable. If I don&apos;t go ahead, REG KING keeps it.</span>
              </label>
            )}
            {regs.some((r) => r.data.source === "dvla") && (
              <label className="co-check">
                <input type="checkbox" checked={dvlaOk} onChange={(e) => setDvlaOk(e.target.checked)} data-co="dvla-ok" />
                <span>I understand a DVLA plate is only mine once the DVLA confirms. If it&apos;s sold before then, I won&apos;t be charged.</span>
              </label>
            )}
            <label className="co-check">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} data-co="terms" />
              <span>
                I agree to the <a href="/terms-of-service">terms and conditions</a> and have read the <a href="/privacy-policy">privacy policy</a>.
              </span>
            </label>
            {err(s, valid.payment, "Tick the boxes above to continue.")}
            <button
              type="button"
              className="co-btn co-pay"
              onClick={() => {
                if (!valid.payment) return setTried("payment");
                setPlaced("RK-EXAMPLE");
                window.scrollTo({ top: 0 });
              }}
              data-co="place"
            >
              {(pay === "card" || pay === "deposit") && <LockIcon />}
              {pay === "finance" ? "Continue to Payl8r" : pay === "pay-in-3" ? "Continue to Pay in 3" : `Pay ${money(sums.today)}${pay === "deposit" ? " today" : ""}`}
            </button>
            {(pay === "card" || pay === "deposit") && <p className="co-fine">Card payments are taken by our payment provider. REG KING never sees your card number.</p>}
          </>
        );
    }
  };

  // One question per screen: the step that's open, with dots for progress and the order folded below.
  const cur = open ?? "payment";
  const at = steps.indexOf(cur);
  const prev = at > 0 ? steps[at - 1] : null;
  const ask: Record<Step, string> = {
    details: "Who's ordering?",
    registration: regs.length > 1 ? "Whose name do the registrations go in?" : "Whose name does the registration go in?",
    call: "When can we call you?",
    documents: "Your documents for road legal plates",
    delivery: "How would you like it?",
    payment: "How would you like to pay?",
  };
  const totalText = money(sums.total) + (sums.onRequest ? " + items priced on request" : "");
  return (
    <section className="rk-section co co--lux co--one co--shop" aria-labelledby="co-title" data-checkout>
      <div className="co-brandbar">
        <a href="#buy" onClick={(e) => (e.preventDefault(), go("buy"))} aria-label="REG KING home">
          <BrandLogo className="co-brandbar__logo" />
        </a>
        <a className="co-brandbar__bag" href="#make" onClick={(e) => (e.preventDefault(), go("make"))} aria-label="Back to your basket">
          <BagIcon />
        </a>
      </div>
      <details className="co-fold">
        <summary>
          <span className="co-fold__open">
            Order summary
            <i aria-hidden />
          </span>
          <span className="co-fold__total">
            {pay === "deposit" && <small>{money(sums.today)} today</small>}
            {money(sums.total)}
          </span>
        </summary>
        <div className="co-sum">
          <ul className="co-items">
            {basket.map((b) => (
              <li key={b.id}>
                <span className="co-thumb" aria-hidden>
                  {b.kind === "registration" || b.kind === "plates" ? (
                    <>
                      <i data-side="front">{b.data.reg}</i>
                      <i data-side="rear">{b.data.reg}</i>
                    </>
                  ) : (
                    <i data-side="none">{b.title.slice(0, 1)}</i>
                  )}
                  <em>1</em>
                </span>
                <span className="co-items__what">
                  <b>{b.kind === "registration" ? b.data.reg : b.title}</b>
                  {b.detail && <small>{b.detail}</small>}
                </span>
                <span className="co-items__price">{lineTotal(b.lines).onRequest ? "To confirm" : money(lineTotal(b.lines).known)}</span>
              </li>
            ))}
          </ul>
          <form
            className="co-code"
            onSubmit={(e) => {
              e.preventDefault();
              setCodeMsg(code.trim() ? "That code isn't recognised." : "");
            }}
          >
            <label>
              <span className="rk-visually-hidden">Discount code</span>
              <input value={code} onChange={(e) => (setCode(e.target.value.toUpperCase()), setCodeMsg(""))} placeholder="Discount code" data-co="code" />
            </label>
            <button type="submit" disabled={!code.trim()}>
              Apply
            </button>
          </form>
          {codeMsg && (
            <p className="co-code__msg" role="status">
              {codeMsg}
            </p>
          )}
          <dl className="co-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(sums.all.known)}</dd>
            </div>
            {sums.member > 0 && (
              <div>
                <dt>Account discount</dt>
                <dd>-{money(sums.member)}</dd>
              </div>
            )}
            {physical && (
              <div>
                <dt>Delivery</dt>
                <dd>{ship ? (sums.delivery ? money(sums.delivery) : "Free") : "Not chosen yet"}</dd>
              </div>
            )}
            <div className="is-total">
              <dt>Total</dt>
              <dd>
                <small>GBP</small> {totalText}
              </dd>
            </div>
            {pay === "deposit" && (
              <>
                <div>
                  <dt>Due today</dt>
                  <dd>{money(sums.today)}</dd>
                </div>
                <div>
                  <dt>Balance later</dt>
                  <dd>{money(sums.later)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </details>
      <div className="rk-wrap co-one">
        <h1 id="co-title" className="rk-visually-hidden">
          Checkout
        </h1>
        <div className="co-dots" aria-label={`Step ${at + 1} of ${steps.length}: ${title[cur]}`}>
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              className="co-dot"
              data-state={i < at || (done.has(s) && s !== cur) ? "done" : i === at ? "now" : "later"}
              disabled={!(done.has(s) || i <= at)}
              onClick={() => setEditing(s)}
              aria-label={title[s]}
              aria-current={s === cur ? "step" : undefined}
            />
          ))}
        </div>
        <p className="co-one__step">
          Step {at + 1} of {steps.length}
        </p>

        <div className="co-step is-open co-one__card" data-co-step={cur} key={cur}>
          <h2 className="co-one__q">
            <span className="co-step__t">{ask[cur]}</span>
          </h2>
          <div className="co-step__b">
            {body(cur)}
            {cur !== "payment" && (
              <button type="button" className="co-btn co-next-btn" onClick={() => next(cur)} data-co-next={cur}>
                Next
              </button>
            )}
          </div>
          {prev && (
            <button type="button" className="co-back" onClick={() => (setEditing(prev), window.scrollTo({ top: 0, behavior: "smooth" }))} data-co-back>
              Back
            </button>
          )}
        </div>


        <ul className="co-trust">
          <li>
            <LockIcon />
            Card details go straight to our payment provider
          </li>
          <li>
            <PhoneIcon />
            Real people on {phone.display}
          </li>
          {regs.length > 0 && (
            <li>
              <DocIcon />
              We handle the DVLA paperwork
            </li>
          )}
        </ul>
        <p className="co-one__help">
          Questions? Call {phone.display} or email {supportEmail}.{" "}
          <a className="co-link" href="#make" onClick={(e) => (e.preventDefault(), go("make"))}>
            Back to your basket
          </a>
        </p>
        <p className="co-preview" role="note">
          Preview: no payment is taken and nothing is ordered.
        </p>
      </div>
    </section>
  );
}

const BagIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);
const DocIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 3h9l4 4v14H6zM9 13l2 2 4-4" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const TickMark = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** What happens with each registration, said once at the top of its step. */
function RegNote({ d }: { d: RegistrationData }) {
  return (
    <p className="co-regnote">
      <span className="co-reg">{d.reg}</span>
      {d.source === "dvla"
        ? "New from the DVLA. We buy it in the name below and the DVLA posts the V750 certificate to this address."
        : d.assign
          ? "We transfer it and put it on your vehicle for you."
          : "We transfer it into the name below and email you the next steps."}
    </p>
  );
}
