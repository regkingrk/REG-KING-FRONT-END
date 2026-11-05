"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { formatGBP, normaliseReg, spaceReg, supportEmail } from "@/lib/brand";
import { phone } from "@/lib/infoContent";
import { BROKERAGE, SOURCING } from "@/lib/services";
import { startServiceCheckout } from "@/lib/dvla";
import { useMode } from "./ModeProvider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const money = (n: number) => formatGBP(n, Number.isInteger(n));

/** Shared frame: heading, how it works on the left, the form on the right. */
function ServicePage({ id, title, price, lede, steps, terms, alt, children }: { id: string; title: string; price?: number; lede: string; steps: { t: string; d: string }[]; terms: string[]; alt?: ReactNode; children: ReactNode }) {
  return (
    <section className="rk-section bk" id="rk-broker" aria-labelledby={`${id}-t`} data-service={id}>
      <div className="rk-wrap bk__in">
        <header className="bk__head">
          {/* h2: these pages sit under the homepage hero, which already has the page's h1 */}
          <h2 id={`${id}-t`} className="bk__title">{title}</h2>
          {price !== undefined && <p className="bk__price">{money(price)}</p>}
          <p>{lede}</p>
        </header>
        <div className="bk__grid">
          <div className="bk__how">
            <h2>How it works</h2>
            <ol>
              {steps.map((s) => (
                <li key={s.t}>
                  <b>{s.t}</b>
                  <span>{s.d}</span>
                </li>
              ))}
            </ol>
            <h3>Good to know</h3>
            <ul className="bk__terms">
              {terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {alt && <p className="bk__alt">{alt}</p>}
          </div>
          <div className="bk__card">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, optional, err, children }: { label: string; optional?: boolean; err?: string | false; children: ReactNode }) {
  return (
    <label className="bk-f">
      <span>
        {label} {optional && <i>(optional)</i>}
      </span>
      {children}
      {err && <small className="bk-err">{err}</small>}
    </label>
  );
}

/** Name, mobile and email: asked on both services. */
function useContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const ok = { name: name.trim().length >= 2, tel: tel.replace(/\D/g, "").length >= 10, email: EMAIL.test(email.trim()) };
  const fields = (tried: boolean) => (
    <>
      <div className="bk-row">
        <Field label="Your name" err={tried && !ok.name && "Enter your name."}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !ok.name} data-bk="name" />
        </Field>
        <Field label="Mobile" err={tried && !ok.tel && "Enter a phone number we can call."}>
          <input type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" aria-invalid={tried && !ok.tel} data-bk="tel" />
        </Field>
      </div>
      <Field label="Email" err={tried && !ok.email && "Enter an email address like name@example.com."}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={tried && !ok.email} data-bk="email" />
      </Field>
    </>
  );
  return { name, email, tel, ok, fields };
}

const focusFirst = (keys: string[]) => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-bk="${keys[0]}"]`)?.focus());

/* ------------------------------------------------------------------ */
/* Plate sourcing (Buy): £9.99, terms from the current Shopify product  */
/* ------------------------------------------------------------------ */

export function Sourcing() {
  const { go } = useMode();
  const c = useContact();
  // Carried over from "Can't see the one you want?" in search results.
  const [want, setWant] = useState(() => {
    try {
      const v = sessionStorage.getItem("rk-source") ?? "";
      sessionStorage.removeItem("rk-source");
      return v;
    } catch {
      return "";
    }
  });
  const [budget, setBudget] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"" | "working" | string>("");

  const ok = { want: want.trim().length >= 1, ...c.ok };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const bad = (Object.keys(ok) as (keyof typeof ok)[]).filter((k) => !ok[k]);
    if (bad.length) return focusFirst(bad);
    setState("working");
    const r = await startServiceCheckout("sourcing", { "Name, word or phrase": want.trim(), Budget: budget ? `£${budget}` : "", "Vehicle age": vehicle, Notes: note.trim(), Name: c.name.trim(), Mobile: c.tel.trim(), Email: c.email.trim() });
    if ("url" in r) window.location.href = r.url;
    else setState(r.error);
  };

  return (
    <ServicePage
      id="src"
      title="Plate sourcing"
      price={SOURCING.price}
      lede="Looking for a specific name, word or phrase? Tell us what you're after and we'll search for registrations that match."
      steps={[
        { t: "Tell us what you want", d: "One name, word or phrase, plus your budget if you have one." },
        { t: "Pay the sourcing fee", d: `${money(SOURCING.price)} to start the search.` },
        { t: "We send you the results", d: "We work on every request within 7 days and share what we find." },
      ]}
      terms={SOURCING.terms}
      alt={
        <>
          Rather look yourself?{" "}
          <button type="button" onClick={() => go("buy")}>
            Search plates
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <h2>Your request</h2>
        <Field label="The name, word or phrase you want" err={tried && !ok.want && "Tell us what you're looking for."}>
          <input className="bk-reg" value={want} onChange={(e) => setWant(normaliseReg(e.target.value))} maxLength={20} placeholder="FOR EXAMPLE: JAMES" autoCapitalize="characters" autoComplete="off" aria-invalid={tried && !ok.want} data-bk="want" />
        </Field>
        <div className="bk-row">
          <Field label="Your budget" optional>
            <span className="bk-money">
              <span aria-hidden>£</span>
              <input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d,]/g, ""))} data-bk="budget" />
            </span>
          </Field>
          <Field label="Year your vehicle was first registered" optional>
            <input inputMode="numeric" value={vehicle} onChange={(e) => setVehicle(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="For example: 2016" data-bk="vehicle" />
          </Field>
        </div>
        {c.fields(tried)}
        <Field label="Anything else?" optional>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Styles you like or don't, for example no numbers" data-bk="note" />
        </Field>
        <button type="submit" className="bk-btn" disabled={state === "working"} data-bk-send>
          {state === "working" ? "Opening checkout" : `Pay ${money(SOURCING.price)} and send request`}
        </button>
        {state && state !== "working" && (
          <p className="bk-msg" role="status">
            {state}
          </p>
        )}
        <p className="bk-small">
          Questions first? Call {phone.display} or email {supportEmail}.
        </p>
      </form>
    </ServicePage>
  );
}

/* ------------------------------------------------------------------ */
/* Brokerage (Buy and Sell): finalising a sale that's already agreed.   */
/* The fee isn't shown on the page, only once they've sent the details. */
/* ------------------------------------------------------------------ */

export function Brokerage({ side }: { side: "buy" | "sell" }) {
  const c = useContact();
  const [role, setRole] = useState<"" | "buyer" | "seller">(side === "buy" ? "buyer" : "seller");
  const [reg, setReg] = useState("");
  const [price, setPrice] = useState("");
  const [other, setOther] = useState("");
  const [otherTel, setOtherTel] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);

  const ok = { reg: reg.replace(/\s/g, "").length >= 2, role: !!role, price: Number(price.replace(/[^\d]/g, "")) > 0, ...c.ok };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const bad = (Object.keys(ok) as (keyof typeof ok)[]).filter((k) => !ok[k]);
    if (bad.length) return focusFirst(bad);
    // PROTOTYPE: nothing is sent. At launch this goes to REG KING like the contact form.
    setSent(true);
  };

  return (
    <ServicePage
      id="brk"
      title="Brokerage"
      lede="Already agreed a sale with someone? If the buyer, the seller or both of you want a reputable company to finalise the deal, we'll handle it for you."
      steps={[
        { t: "Tell us about the deal", d: "The registration, the agreed price and who's buying and selling." },
        { t: "We check everything", d: "We speak to both sides and check the documents before anything changes hands." },
        { t: "We finalise the deal", d: "We handle the transfer so the registration moves safely from seller to buyer." },
      ]}
      terms={BROKERAGE.terms}
    >
      {sent ? (
        <div className="bk__sent" role="status" data-bk-sent>
          <h2>Thanks, {c.name.trim().split(" ")[0]}</h2>
          <p>
            We&apos;ve got the details for {reg}. We&apos;ll call you on {c.tel} to go through the deal.
          </p>
          <p className="bk__fee" data-bk-fee>
            Our brokerage fee is <b>{money(BROKERAGE.price)}</b>. Once we&apos;ve spoken, we&apos;ll send you a secure link to pay it.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h2>About the deal</h2>
          <Field label="The registration" err={tried && !ok.reg && "Enter the registration."}>
            <input className="bk-reg" value={reg} onChange={(e) => setReg(spaceReg(e.target.value))} maxLength={8} placeholder="THE REG" autoCapitalize="characters" autoComplete="off" aria-invalid={tried && !ok.reg} data-bk="reg" />
          </Field>
          <div className="bk-f">
            <span id="brk-role">Are you the buyer or the seller?</span>
            <div className="bk-choice" role="radiogroup" aria-labelledby="brk-role">
              {(["buyer", "seller"] as const).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} data-bk={r === "buyer" ? "role" : undefined}>
                  {r === "buyer" ? "I'm buying" : "I'm selling"}
                </button>
              ))}
            </div>
            {tried && !ok.role && <small className="bk-err">Choose one.</small>}
          </div>
          <Field label="Agreed price" err={tried && !ok.price && "Enter the price you've agreed."}>
            <span className="bk-money">
              <span aria-hidden>£</span>
              <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d,]/g, ""))} aria-invalid={tried && !ok.price} data-bk="price" />
            </span>
          </Field>
          <div className="bk-row">
            <Field label={role === "seller" ? "Buyer's name" : "Seller's name"} optional>
              <input value={other} onChange={(e) => setOther(e.target.value)} data-bk="other" />
            </Field>
            <Field label={role === "seller" ? "Buyer's phone" : "Seller's phone"} optional>
              <input type="tel" inputMode="tel" value={otherTel} onChange={(e) => setOtherTel(e.target.value)} data-bk="other-tel" />
            </Field>
          </div>
          <h2 className="bk-sub">Your details</h2>
          {c.fields(tried)}
          <Field label="Anything else?" optional>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-bk="note" />
          </Field>
          <button type="submit" className="bk-btn" data-bk-send>
            Send the details
          </button>
          <p className="bk-small">
            Nothing to pay yet. Questions first? Call {phone.display} or email {supportEmail}.
          </p>
        </form>
      )}
    </ServicePage>
  );
}
