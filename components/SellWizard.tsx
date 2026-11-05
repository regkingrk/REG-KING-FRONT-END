"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatGBP, spaceReg, type SellOption } from "@/lib/brand";
import { MEANINGS, PACKAGES, cleanReg, emptyPlate, packageOf, plateErrors, type PlateDraft, type Submission } from "@/lib/portal";
import { emptyAddress, useAccount, type Address } from "./AccountProvider";
import { SignInInline } from "./ListPlate";
import { useMode } from "./ModeProvider";

const gbp = (n: number) => formatGBP(n, Number.isInteger(n));
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

type StepKey = "plate" | "about" | "price" | "how" | "you" | "check";
const STEPS: { key: StepKey; title: string }[] = [
  { key: "plate", title: "Your plate" },
  { key: "about", title: "What it means" },
  { key: "price", title: "Your price" },
  { key: "how", title: "How to sell" },
  { key: "you", title: "Your details" },
  { key: "check", title: "Check and submit" },
];
/** Which draft fields each step is responsible for. */
const FIELDS: Record<StepKey, (keyof PlateDraft)[]> = {
  plate: ["reg", "held"],
  about: ["meaning"],
  price: ["desired", "offers", "elsewhere", "elsewhereWhere", "elsewherePrice"],
  how: ["pkg", "termsAccepted"],
  you: [],
  check: ["authorised"],
};

/**
 * List a registration, one short step at a time: the plate, what it means, the price, how to sell,
 * the customer's details (skipped when signed in) and a final check. Used on the Sell page and in the account.
 * Each plate goes to REG KING as pending approval; nothing goes on the site automatically.
 */
export function SellWizard({ startReg = "", startPkg = "", onDone }: { startReg?: string; startPkg?: SellOption | ""; onDone?: () => void }) {
  const { customer, signIn, update, submitPlates, submissions } = useAccount();
  const { go } = useMode();
  const [p, setP] = useState<PlateDraft>(() => emptyPlate(spaceReg(startReg), startPkg));
  const [at, setAt] = useState(0);
  const [tried, setTried] = useState<Set<StepKey>>(new Set());
  const [done, setDone] = useState<Submission | null>(null);
  const [failed, setFailed] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // The seller's details: always asked for. A new seller creates their account here with a code we email them.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<Address>(emptyAddress);
  const [marketing, setMarketing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeTried, setCodeTried] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  // Signed in (now or part-way through): fill in what the account already knows.
  useEffect(() => {
    if (!customer) return;
    setName((v) => v || customer.name);
    setEmail((v) => v || customer.email);
    setPhone((v) => v || customer.phone);
    setAddr((v) => (v.line1 ? v : customer.address ?? v));
  }, [customer]);
  useEffect(() => {
    if (codeSent) codeRef.current?.focus();
  }, [codeSent]);

  // A registration typed on the Sell page is filled in for them.
  useEffect(() => {
    if (startReg) setP((x) => ({ ...x, reg: spaceReg(startReg) }));
  }, [startReg]);

  const steps = STEPS.map((s) => (s.key === "you" && !customer ? { ...s, title: "Create your account" } : s));
  const step = steps[Math.min(at, steps.length - 1)];
  const set = (x: Partial<PlateDraft>) => setP((o) => ({ ...o, ...x }));
  const errs = plateErrors(
    p,
    submissions.filter((s) => s.status !== "withdrawn" && s.status !== "sold").map((s) => cleanReg(s.reg)),
  );
  const youOk = {
    name: name.trim().length > 1,
    email: /^\S+@\S+\.\S+$/.test(email.trim()),
    phone: phone.replace(/\D/g, "").length >= 10,
    addr: addr.line1.trim().length > 1 && addr.town.trim().length > 1 && POSTCODE.test(addr.postcode.trim()),
  };
  const stepOk = (k: StepKey) => (k === "you" ? !!customer && Object.values(youOk).every(Boolean) : FIELDS[k].every((f) => !errs[f]));
  const err = (f: keyof PlateDraft) => (tried.has(step.key) ? errs[f] : undefined);
  const youErr = (k: keyof typeof youOk) => tried.has("you") && !youOk[k];
  const reg = cleanReg(p.reg);
  const pkg = p.pkg ? packageOf(p.pkg) : null;
  const toTop = () => requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const next = (e: FormEvent) => {
    e.preventDefault();
    setTried((t) => new Set(t).add(step.key));
    setFailed(false);
    // Details: a new seller gets a code by email to create their account; a signed-in one confirms theirs.
    if (step.key === "you") {
      if (!Object.values(youOk).every(Boolean)) {
        requestAnimationFrame(() => top.current?.querySelector<HTMLElement>("[aria-invalid='true'], .lw-err")?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return;
      }
      if (!customer) {
        if (!codeSent) return setCodeSent(true);
        setCodeTried(true);
        if (code.length < 6) return;
        // PROTOTYPE: any 6 digits create the account in this browser. At launch this is Shopify's sign-in code.
        signIn({ email: email.trim(), name: name.trim(), phone: phone.trim() });
      }
      update({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: { ...addr, postcode: addr.postcode.toUpperCase().trim() }, ...(customer ? {} : { marketing }) });
      setAt(at + 1);
      toTop();
      return;
    }
    if (!stepOk(step.key)) {
      requestAnimationFrame(() => top.current?.querySelector<HTMLElement>("[aria-invalid='true'], .lw-err")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    if (step.key !== "check") {
      setAt(at + 1);
      toTop();
      return;
    }
    // Anything left unanswered earlier sends them back to that step.
    const gap = steps.findIndex((s) => !stepOk(s.key));
    if (gap >= 0 && steps[gap].key !== "check") {
      setTried((t) => new Set(t).add(steps[gap].key));
      setAt(gap);
      toTop();
      return;
    }
    const saved = submitPlates([p]);
    if (!saved) return setFailed(true);
    setDone(saved[0]);
    toTop();
  };
  const goTo = (k: StepKey) => {
    setAt(steps.findIndex((s) => s.key === k));
    toTop();
  };

  if (done)
    return (
      <div className="lw" ref={top}>
        <div className="lw-done" role="status">
          <span className="lw-tick" aria-hidden>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2>Submitted for approval</h2>
          <span className="lw-plate lw-plate--big">{done.reg}</span>
          <p>
            Your reference is <b>{done.ref}</b>. We&apos;ll check the details and be in touch. Nothing goes on the site until we&apos;ve approved it.
          </p>
          <div className="lw-acts">
            <button type="button" className="lw-go" onClick={() => (onDone ? onDone() : go("account-sell"))} data-lw-view>
              View your listings
            </button>
            <button
              type="button"
              className="lw-ghost"
              onClick={() => {
                setP(emptyPlate());
                setAt(0);
                setTried(new Set());
                setDone(null);
              }}
              data-lw-another
            >
              List another plate
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="lw" ref={top}>
      <div className="lw-progress">
        <span className="lw-progress__t">
          Step {at + 1} of {steps.length}
          <b>{step.title}</b>
        </span>
        <ol aria-hidden>
          {steps.map((s, i) => (
            <li key={s.key} data-state={i < at ? "done" : i === at ? "now" : "todo"} />
          ))}
        </ol>
      </div>

      {step.key !== "plate" && reg && (
        <div className="lw-current">
          <span className="lw-plate">{reg}</span>
          <button type="button" className="lw-link" onClick={() => goTo("plate")}>
            Change
          </button>
        </div>
      )}

      <form className="lw-step" onSubmit={next} noValidate key={step.key}>
        {step.key === "plate" && (
          <>
            <Q title="Which registration are you selling?" err={err("reg")}>
              <input
                className="lw-reg"
                value={p.reg}
                onChange={(e) => set({ reg: spaceReg(e.target.value) })}
                maxLength={8}
                placeholder="YOUR REG"
                autoCapitalize="characters"
                aria-invalid={!!err("reg")}
                aria-label="Registration"
                data-f="lw-reg"
              />
            </Q>
            <Q title="Where is it now?" err={err("held")}>
              <Cards
                name="held"
                value={p.held}
                onPick={(v) => set({ held: v })}
                options={[
                  { k: "vehicle", t: "On a vehicle", d: "It's on a car registered to you or someone else." },
                  { k: "retention", t: "On a certificate", d: "It's on a V750 or V778 retention document." },
                ]}
              />
            </Q>
          </>
        )}

        {step.key === "about" && (
          <>
            <Q title="What does it mean?" hint="It helps us describe it to buyers." err={err("meaning")}>
              <Chips name="meaning" value={p.meaning} onPick={(v) => set({ meaning: v })} options={MEANINGS.map((m) => ({ k: m, t: m }))} />
            </Q>
            {p.meaning && p.meaning !== "Unsure" && (
              <Q title="What does it spell?" optional>
                <input value={p.meaningText} onChange={(e) => set({ meaningText: e.target.value })} placeholder="For example: James" data-f="lw-meaning" />
              </Q>
            )}
          </>
        )}

        {step.key === "price" && (
          <>
            <Q title="How much would you like to receive?" hint="This is what you'd get. It isn't the price we advertise it at." err={err("desired")}>
              <span className="lw-money">
                <span aria-hidden>£</span>
                <input
                  inputMode="numeric"
                  value={p.desired ?? ""}
                  onChange={(e) => set({ desired: Number(e.target.value.replace(/[^\d]/g, "")) || null })}
                  aria-invalid={!!err("desired")}
                  aria-label="Amount you'd like to receive"
                  data-f="lw-want"
                />
              </span>
            </Q>
            <Q title="Are you open to offers?" err={err("offers")}>
              <Chips name="offers" value={p.offers} onPick={(v) => set({ offers: v })} options={[{ k: "yes", t: "Yes" }, { k: "no", t: "No" }]} />
            </Q>
            <Q title="Is it for sale anywhere else?" err={err("elsewhere")}>
              <Chips name="elsewhere" value={p.elsewhere} onPick={(v) => set({ elsewhere: v })} options={[{ k: "no", t: "No" }, { k: "yes", t: "Yes" }]} />
            </Q>
            {p.elsewhere === "yes" && (
              <div className="lw-row2">
                <Q title="Where?" err={err("elsewhereWhere")}>
                  <input value={p.elsewhereWhere} onChange={(e) => set({ elsewhereWhere: e.target.value })} aria-invalid={!!err("elsewhereWhere")} data-f="lw-where" />
                </Q>
                <Q title="Price there" err={err("elsewherePrice")}>
                  <span className="lw-money">
                    <span aria-hidden>£</span>
                    <input inputMode="numeric" value={p.elsewherePrice ?? ""} onChange={(e) => set({ elsewherePrice: Number(e.target.value.replace(/[^\d]/g, "")) || null })} aria-invalid={!!err("elsewherePrice")} data-f="lw-there" />
                  </span>
                </Q>
              </div>
            )}
          </>
        )}

        {step.key === "how" && (
          <>
            <Q title="How would you like to sell?" err={err("pkg")}>
              <Cards
                name="pkg"
                value={p.pkg}
                onPick={(v) => p.pkg !== v && set({ pkg: v, termsAccepted: false })}
                options={PACKAGES.map((o) => ({ k: o.key, t: o.title, d: o.line, f: o.fee }))}
              />
            </Q>
            {pkg && (
              <Q title={`Terms for ${pkg.title}`} err={err("termsAccepted")}>
                {pkg.terms ? (
                  <div className="lw-terms">{pkg.terms.map((t, i) => <p key={i}>{t}</p>)}</div>
                ) : (
                  <p className="lw-hint">REG KING&apos;s terms for this option will appear here before launch. (Version: {pkg.termsVersion})</p>
                )}
                <label className="lw-check">
                  <input type="checkbox" checked={p.termsAccepted} onChange={(e) => set({ termsAccepted: e.target.checked })} data-f="lw-terms" />
                  <span>I&apos;ve read and accept the terms for {pkg.title}.</span>
                </label>
              </Q>
            )}
          </>
        )}

        {step.key === "you" &&
          (signingIn ? (
            <div className="lw-signin">
              <SignInInline onCancel={() => setSigningIn(false)} onDone={() => setSigningIn(false)} />
            </div>
          ) : (
            codeSent && !customer ? (
              <div className="lw-q">
                <h3>Check your email</h3>
                <p className="lw-hint">
                  We&apos;ve sent a 6-digit code to <b>{email.trim()}</b>. Enter it to create your account.{" "}
                  <button type="button" className="lw-link" onClick={() => (setCodeSent(false), setCode(""), setCodeTried(false))}>
                    Change details
                  </button>
                </p>
                <label className="ag__code lw-code">
                  <span className="rk-visually-hidden">6-digit code</span>
                  <input
                    ref={codeRef}
                    value={code}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    data-f="lw-code"
                  />
                  <span className="ag__boxes" aria-hidden>
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} data-on={i === Math.min(code.length, 5) || undefined}>
                        {code[i] ?? ""}
                      </span>
                    ))}
                  </span>
                </label>
                {codeTried && code.length < 6 && <p className="lw-err">Enter all 6 digits from the email.</p>}
                <p className="lw-hint">Preview: no email is sent yet. Any 6 digits will create the account on this browser.</p>
              </div>
            ) : (
            <>
              {customer ? (
                <p className="lw-hint lw-hint--lead">Check your details. We&apos;ll use them for this listing and save any changes to your account.</p>
              ) : (
                <p className="lw-hint lw-hint--lead">
                  Selling with REG KING needs an account, so you can follow your plate and its offers. Fill in your details and we&apos;ll email you a code to create it. There&apos;s no password.{" "}
                  <button type="button" className="lw-link" onClick={() => setSigningIn(true)} data-lw-signin>
                    Already have an account? Sign in
                  </button>
                </p>
              )}
              <Q title="Full name" bad={youErr("name")} errText="Enter your full name.">
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={youErr("name")} data-f="lw-name" />
              </Q>
              <div className="lw-row2">
                <Q title="Email" bad={youErr("email")} errText="Enter an email address like name@example.com.">
                  <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={youErr("email")} data-f="lw-email" />
                </Q>
                <Q title="Mobile number" bad={youErr("phone")} errText="Enter a mobile number.">
                  <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" aria-invalid={youErr("phone")} data-f="lw-phone" />
                </Q>
              </div>
              <Q title="Address" bad={youErr("addr")} errText="Enter your address and a UK postcode.">
                <div className="lw-addr">
                  <input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="Address line 1" autoComplete="address-line1" aria-label="Address line 1" data-f="lw-line1" />
                  <input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} placeholder="Address line 2 (optional)" autoComplete="address-line2" aria-label="Address line 2" />
                  <div className="lw-row2">
                    <input value={addr.town} onChange={(e) => setAddr({ ...addr, town: e.target.value })} placeholder="Town or city" autoComplete="address-level2" aria-label="Town or city" data-f="lw-town" />
                    <input value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value })} placeholder="Postcode" autoComplete="postal-code" aria-label="Postcode" data-f="lw-postcode" />
                  </div>
                </div>
              </Q>
              {!customer && (
                <label className="lw-check">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} data-f="lw-news" />
                  <span>Email me about new plates and offers (optional).</span>
                </label>
              )}
              <p className="lw-hint">
                We use these details to review your plate and contact you about it. We never sell your details.{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Privacy policy
                </a>
              </p>
            </>
            )
          ))}

        {step.key === "check" && (
          <>
            <dl className="lw-sum">
              <Line k="Where it is" v={p.held === "vehicle" ? "On a vehicle" : "On a retention certificate"} edit={() => goTo("plate")} />
              <Line k="What it means" v={`${p.meaning}${p.meaningText ? `: ${p.meaningText}` : ""}`} edit={() => goTo("about")} />
              <Line k="You'd like to receive" v={gbp(p.desired ?? 0)} edit={() => goTo("price")} />
              <Line k="Open to offers" v={p.offers === "yes" ? "Yes" : "No"} edit={() => goTo("price")} />
              <Line k="For sale elsewhere" v={p.elsewhere === "yes" ? `Yes, ${p.elsewhereWhere}${p.elsewherePrice ? ` at ${gbp(p.elsewherePrice)}` : ""}` : "No"} edit={() => goTo("price")} />
              <Line k="How you're selling" v={pkg ? `${pkg.title}. ${pkg.fee}` : ""} edit={() => goTo("how")} />
              <Line k="Your details" v={`${name}, ${email}, ${phone}`} edit={() => goTo("you")} />
            </dl>
            <Q err={err("authorised")}>
              <label className="lw-check">
                <input type="checkbox" checked={p.authorised} onChange={(e) => set({ authorised: e.target.checked })} data-f="lw-auth" />
                <span>I own this registration, or I&apos;m authorised by the owner to sell it.</span>
              </label>
            </Q>
          </>
        )}

        {failed && <p className="lw-err lw-err--block">Sorry, we couldn&apos;t save your plate. Nothing has been submitted. Please try again.</p>}

        {!signingIn && (
          <div className="lw-nav">
            {at > 0 && (
              <button type="button" className="lw-back" onClick={() => (setAt(at - 1), toTop())} data-lw-back>
                Back
              </button>
            )}
            <button type="submit" className="lw-go" data-lw-next>
              {step.key === "check" ? "Submit for approval" : step.key === "you" && !customer ? (codeSent ? "Create account" : "Send my code") : "Continue"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

/* ---------- small parts ---------- */

function Q({ title, hint, optional, err, bad, errText, children }: { title?: string; hint?: string; optional?: boolean; err?: string; bad?: boolean; errText?: string; children: ReactNode }) {
  const msg = err ?? (bad ? errText : undefined);
  return (
    <div className="lw-q" data-bad={msg ? "" : undefined}>
      {title && (
        <h3>
          {title} {optional && <i>(optional)</i>}
        </h3>
      )}
      {hint && <p className="lw-hint">{hint}</p>}
      {children}
      {msg && <p className="lw-err">{msg}</p>}
    </div>
  );
}

function Chips<T extends string>({ value, options, onPick, name }: { value: T | ""; options: { k: T; t: string }[]; onPick: (v: T) => void; name: string }) {
  return (
    <div className="lw-chips" role="radiogroup">
      {options.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={value === o.k} onClick={() => onPick(o.k)} data-pick={`${name}:${o.k}`}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

function Cards<T extends string>({ value, options, onPick, name }: { value: T | ""; options: { k: T; t: string; d: string; f?: string }[]; onPick: (v: T) => void; name: string }) {
  return (
    <div className="lw-cards" role="radiogroup">
      {options.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={value === o.k} onClick={() => onPick(o.k)} data-pick={`${name}:${o.k}`}>
          <span className="lw-cards__dot" aria-hidden />
          <span>
            <b>{o.t}</b>
            <small>{o.d}</small>
            {o.f && <em>{o.f}</em>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Line({ k, v, edit }: { k: string; v: string; edit?: () => void }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
      {edit && (
        <button type="button" className="lw-link" onClick={edit}>
          Change
        </button>
      )}
    </div>
  );
}
