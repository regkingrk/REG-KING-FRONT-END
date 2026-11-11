"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatGBP, normaliseReg, type SellOption } from "@/lib/brand";

const gbp = (n: number) => formatGBP(n, Number.isInteger(n));
import { MEANINGS, PACKAGES, cleanReg, emptyPlate, packageOf, plateErrors, type PlateDraft, type Submission } from "@/lib/portal";
import { emptyAddress, useAccount, type Address } from "./AccountProvider";
import { useMode } from "./ModeProvider";

/**
 * List a Plate: plate details first (one or more plates), then the customer's details once, then submit.
 * Each plate is saved as its own submission and goes to REG KING as Under Review. Nothing is published automatically.
 * Used in the account area and on the Sell page (with the reg the customer typed).
 */
export function ListPlate({ startReg = "", startPkg = "" }: { startReg?: string; startPkg?: SellOption | "" }) {
  const { customer, signIn, update, submitPlates } = useAccount();
  const { go } = useMode();
  const [plates, setPlates] = useState<PlateDraft[]>(() => [emptyPlate(normaliseReg(startReg), startPkg)]);
  const [open, setOpen] = useState<number | null>(0);
  const [tried, setTried] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<Submission[] | null>(null);
  const [failed, setFailed] = useState(false);
  const top = useRef<HTMLElement | null>(null);
  // The list is a form, and becomes a plain box once submitted: one ref serves both.
  const setTop = (el: HTMLElement | null) => {
    top.current = el;
  };

  // Details, collected once
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [addr, setAddr] = useState<Address>(customer?.address ?? emptyAddress);
  const [marketing, setMarketing] = useState(false);
  const [detailsTried, setDetailsTried] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  // Fill in saved details once the customer signs in (plates already entered stay as they are).
  useEffect(() => {
    if (!customer) return;
    setName((v) => v || customer.name);
    setEmail((v) => v || customer.email);
    setPhone((v) => v || customer.phone);
    setAddr((v) => (v.line1 ? v : customer.address ?? v));
  }, [customer]);

  const regsExcept = (i: number) => plates.filter((_, j) => j !== i).map((p) => cleanReg(p.reg));
  const errorsAt = (i: number) => plateErrors(plates[i], regsExcept(i));
  const okAt = (i: number) => Object.keys(errorsAt(i)).length === 0;
  const blank = (p: PlateDraft) => !p.reg.trim() && !p.meaning && !p.held && !p.pkg;
  const patch = (i: number, p: Partial<PlateDraft>) => setPlates((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const markTried = (i: number) => setTried((t) => new Set(t).add(i));
  const scrollToError = () => requestAnimationFrame(() => top.current?.querySelector<HTMLElement>("[data-err]")?.scrollIntoView({ behavior: "smooth", block: "center" }));

  /** Close the open plate if it's complete (or drop it if it was never started). False if it needs fixing. */
  const closeOpen = (): boolean => {
    if (open === null) return true;
    if (blank(plates[open]) && plates.length > 1) {
      setPlates((all) => all.filter((_, j) => j !== open));
      setOpen(null);
      return true;
    }
    if (!okAt(open)) {
      markTried(open);
      scrollToError();
      return false;
    }
    setOpen(null);
    return true;
  };
  const addAnother = () => {
    if (open !== null && !okAt(open)) {
      markTried(open);
      scrollToError();
      return;
    }
    const keep = open !== null && blank(plates[open]) && plates.length > 1 ? plates.filter((_, j) => j !== open) : plates;
    setPlates([...keep, emptyPlate()]);
    setOpen(keep.length);
  };
  const edit = (i: number) => {
    if (open === i) return;
    if (open !== null && !blank(plates[open]) && !okAt(open)) {
      markTried(open);
      scrollToError();
      return;
    }
    if (open !== null && blank(plates[open]) && plates.length > 1) {
      setPlates((all) => all.filter((_, j) => j !== open));
      setOpen(i > open ? i - 1 : i);
    } else setOpen(i);
  };
  const remove = (i: number) => {
    if (plates.length === 1) {
      setPlates([emptyPlate()]);
      setOpen(0);
      return;
    }
    setPlates((all) => all.filter((_, j) => j !== i));
    setOpen((o) => (o === null ? null : o === i ? null : o > i ? o - 1 : o));
  };

  const counted = plates.filter((p, i) => !(i === open && blank(p) && plates.length > 1));
  const n = counted.length;
  const okDetails = {
    name: name.trim().length > 1,
    email: /^\S+@\S+\.\S+$/.test(email.trim()),
    phone: phone.replace(/\D/g, "").length >= 10,
    address: addr.line1.trim().length > 1 && addr.town.trim().length > 1 && /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(addr.postcode.trim()),
  };
  const detailsOk = Object.values(okDetails).every(Boolean);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDetailsTried(true);
    setFailed(false);
    // Every plate must be complete, with its own terms accepted.
    const bad = plates.findIndex((p, i) => !(i === open && blank(p) && plates.length > 1) && !okAt(i));
    if (bad >= 0) {
      markTried(bad);
      setOpen(bad);
      scrollToError();
      return;
    }
    if (!detailsOk) {
      scrollToError();
      return;
    }
    // PROTOTYPE: a new customer's account is made in this browser. At launch this hands over to
    // Shopify's sign-in (a one-time code by email) and the plates are saved once they're back.
    if (!customer) signIn({ email: email.trim(), name: name.trim(), phone: phone.trim() });
    update({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: { ...addr, postcode: addr.postcode.toUpperCase().trim() }, marketing });
    const saved = submitPlates(counted);
    if (!saved) {
      setFailed(true);
      return;
    }
    setDone(saved);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (done) {
    return (
      <div className="pt-list" ref={setTop}>
        <div className="pt-done" role="status">
          <h2>Thank you, your plates have been submitted for review.</h2>
          <p>We&apos;ll check the details and be in touch. Nothing goes on the site until we&apos;ve reviewed it.</p>
          <ul className="pt-done__list">
            {done.map((s) => (
              <li key={s.id}>
                <span className="pt-plate pt-plate--lg">{s.reg}</span>
                <span className="pt-done__ref">
                  Reference <b>{s.ref}</b>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="rk-btn rk-btn--ink" onClick={() => go("account-listings")}>
            View My Listings
          </button>
        </div>
      </div>
    );
  }

  const label = customer ? `Submit ${n} plate${n === 1 ? "" : "s"}` : `Create account & submit ${n} plate${n === 1 ? "" : "s"}`;

  return (
    <form className="pt-list" ref={setTop} onSubmit={submit} noValidate>
      <section className="pt-block" aria-labelledby="pt-plates-h">
        <h2 id="pt-plates-h" className="pt-block__h">
          <small>Step 1 of 2</small>
          Your plate{plates.length > 1 ? "s" : ""}
        </h2>
        <ol className="pt-plates">
          {plates.map((p, i) =>
            open === i ? (
              <li key={i} className="pt-pform" data-plate-form={i}>
                <PlateForm p={p} set={(x) => patch(i, x)} errors={tried.has(i) ? errorsAt(i) : {}} n={i + 1} many={plates.length > 1} onRemove={plates.length > 1 ? () => remove(i) : undefined} />
              </li>
            ) : (
              <li key={i} className="pt-psum" data-plate-card={cleanReg(p.reg)}>
                <span className="pt-plate">{cleanReg(p.reg)}</span>
                <div className="pt-psum__txt">
                  <span>{p.pkg ? packageOf(p.pkg).title : ""}</span>
                  <span>{p.unsure ? "Amount: unsure" : p.desired ? `You receive ${gbp(p.desired)}` : ""}</span>
                </div>
                <div className="pt-psum__acts">
                  <button type="button" className="pt-link" onClick={() => edit(i)} data-edit-plate={i}>
                    Edit
                  </button>
                  <button type="button" className="pt-link" onClick={() => remove(i)} data-remove-plate={i}>
                    Remove
                  </button>
                </div>
              </li>
            ),
          )}
        </ol>
        <div className="pt-row">
          <button type="button" className="pt-add" onClick={addAnother} data-add-plate>
            + Add another plate
          </button>
          {open !== null && plates.length > 1 && !blank(plates[open]) && (
            <button type="button" className="pt-link" onClick={closeOpen}>
              Done with this plate
            </button>
          )}
        </div>
      </section>

      <section className="pt-block" aria-labelledby="pt-you-h">
        <h2 id="pt-you-h" className="pt-block__h">
          <small>Step 2 of 2</small>
          Your details
        </h2>
        {customer ? (
          <p className="pt-note">
            Signed in as <b>{customer.email}</b>. Check your details below. All of these plates will go into your account.
          </p>
        ) : signingIn ? (
          <SignInInline onCancel={() => setSigningIn(false)} onDone={() => setSigningIn(false)} />
        ) : (
          <p className="pt-note">
            We&apos;ll create your REG KING account with these details, so you can follow your plates in My Listings. You sign in with a one-time code we email you, so there&apos;s no password to remember.{" "}
            <button type="button" className="pt-link" onClick={() => setSigningIn(true)} data-signin-inline>
              Already have an account? Sign in
            </button>
          </p>
        )}

        {!signingIn && (
          <div className="pt-fields">
            <Field label="Full name" err={detailsTried && !okDetails.name ? "Enter your full name" : ""}>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" name="name" />
            </Field>
            <AddressField value={addr} set={setAddr} err={detailsTried && !okDetails.address ? "Enter your address and a valid postcode" : ""} />
            <Field label="Email" err={detailsTried && !okDetails.email ? "Enter a valid email address" : ""}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" name="email" />
            </Field>
            <Field label="Mobile number" err={detailsTried && !okDetails.phone ? "Enter a mobile number" : ""}>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" name="tel" />
            </Field>

            <p className="pt-privacy">
              We use these details to review your plates, manage your listings and contact you about them. We never sell your details. See our{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              .
            </p>
            <label className="pt-check">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} data-marketing />
              <span>Optional: email me about new plates and offers from REG KING. You can stop these at any time.</span>
            </label>
          </div>
        )}
      </section>

      {failed && (
        <p className="pt-err pt-err--block" role="alert">
          Sorry, we couldn&apos;t save your plates. Nothing has been submitted. Please try again, or contact us.
        </p>
      )}
      <button type="submit" className="rk-btn rk-btn--gold pt-submit" disabled={signingIn} data-submit-plates>
        {label}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Field({ label, err, children, hint }: { label: string; err?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="pt-field" data-err={err ? "" : undefined}>
      <label>
        <span className="pt-field__l">{label}</span>
        {children}
      </label>
      {hint && <span className="pt-field__hint">{hint}</span>}
      {err && <span className="pt-err">{err}</span>}
    </div>
  );
}

function Choice<T extends string>({ value, options, onPick, name }: { value: T | ""; options: readonly { k: T; t: string }[]; onPick: (v: T) => void; name: string }) {
  return (
    <div className="pt-choice" role="radiogroup">
      {options.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={value === o.k} onClick={() => onPick(o.k)} data-pick={`${name}:${o.k}`}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

function Group({ label, err, children }: { label: string; err?: string; children: ReactNode }) {
  return (
    <fieldset className="pt-field" data-err={err ? "" : undefined}>
      <legend className="pt-field__l">{label}</legend>
      {children}
      {err && <span className="pt-err">{err}</span>}
    </fieldset>
  );
}

const YESNO = [
  { k: "yes", t: "Yes" },
  { k: "no", t: "No" },
] as const;

/** The guide price from the valuation tool, when the customer came here from it for this reg. */
function useGuide(reg: string) {
  const [g, setG] = useState<{ reg: string; low: number; high: number } | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem("rk-valuation") ?? "null");
      if (v && typeof v.low === "number" && typeof v.high === "number") setG(v);
    } catch {}
  }, []);
  if (!g || normaliseReg(g.reg) !== normaliseReg(reg)) return "";
  return g.low === g.high ? gbp(g.low) : `${gbp(g.low)} to ${gbp(g.high)}`;
}

function PlateForm({
  p,
  set,
  errors,
  n,
  many,
  onRemove,
}: {
  p: PlateDraft;
  set: (p: Partial<PlateDraft>) => void;
  errors: Partial<Record<keyof PlateDraft, string>>;
  n: number;
  many: boolean;
  onRemove?: () => void;
}) {
  const pkg = p.pkg ? packageOf(p.pkg) : null;
  const guide = useGuide(p.reg);
  const money = (v: string) => {
    const x = Number(v.replace(/[^\d.]/g, ""));
    return v.trim() && x > 0 ? x : null;
  };
  return (
    <div className="pt-pform__in">
      {many && (
        <div className="pt-pform__top">
          <b>Plate {n}</b>
          {onRemove && (
            <button type="button" className="pt-link" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      )}

      <Field label="Registration number" err={errors.reg}>
        <input className="pt-reginput" value={p.reg} onChange={(e) => set({ reg: normaliseReg(e.target.value) })} maxLength={8} autoCapitalize="characters" spellCheck={false} placeholder="YOUR REG" data-f="reg" />
      </Field>

      <Group label="What does the plate mean?" err={errors.meaning}>
        <Choice name="meaning" value={p.meaning} options={MEANINGS.map((m) => ({ k: m, t: m }))} onPick={(v) => set({ meaning: v })} />
        {p.meaning && p.meaning !== "Unsure" && (
          <input className="pt-input" value={p.meaningText} onChange={(e) => set({ meaningText: e.target.value })} placeholder="What it says, e.g. the name or word (optional)" aria-label="What the plate says" />
        )}
      </Group>

      <Group label="Where is the plate now?" err={errors.held}>
        <Choice
          name="held"
          value={p.held}
          options={[
            { k: "vehicle", t: "On a vehicle" },
            { k: "retention", t: "On retention" },
          ]}
          onPick={(v) => set({ held: v })}
        />
      </Group>

      <Group label="How much would you like to receive?" err={errors.desired}>
        <div className="pt-money">
          <span aria-hidden>£</span>
          <input inputMode="numeric" value={p.desired ?? ""} disabled={p.unsure} onChange={(e) => set({ desired: money(e.target.value) })} aria-label="Amount you'd like to receive, in pounds" data-f="desired" />
        </div>
        <label className="pt-check pt-check--inline">
          <input type="checkbox" checked={p.unsure} onChange={(e) => set({ unsure: e.target.checked, desired: e.target.checked ? null : p.desired })} data-f="unsure" />
          <span>I&apos;m unsure</span>
        </label>
        {guide && (
          <span className="pt-field__guide" data-f="guide">
            Our valuation tool gave {guide}.
          </span>
        )}
        <span className="pt-field__hint">This is what you&apos;d receive. It isn&apos;t the price we advertise the plate at.</span>
      </Group>

      <Group label="Are you open to offers?" err={errors.offers}>
        <Choice name="offers" value={p.offers} options={YESNO} onPick={(v) => set({ offers: v })} />
      </Group>

      <Group label="Is it listed for sale anywhere else?" err={errors.elsewhere || errors.elsewhereWhere || errors.elsewherePrice}>
        <Choice name="elsewhere" value={p.elsewhere} options={YESNO} onPick={(v) => set({ elsewhere: v })} />
        {p.elsewhere === "yes" && (
          <div className="pt-pair">
            <input className="pt-input" value={p.elsewhereWhere} onChange={(e) => set({ elsewhereWhere: e.target.value })} placeholder="Where, e.g. a website or dealer" aria-label="Where it's listed" data-f="where" />
            <div className="pt-money">
              <span aria-hidden>£</span>
              <input inputMode="numeric" value={p.elsewherePrice ?? ""} onChange={(e) => set({ elsewherePrice: money(e.target.value) })} placeholder="Advertised price there" aria-label="Advertised price elsewhere, in pounds" data-f="whereprice" />
            </div>
          </div>
        )}
      </Group>

      <Group label="How would you like to sell?" err={errors.pkg}>
        <div className="pt-pkgs" role="radiogroup">
          {PACKAGES.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={p.pkg === o.key} className="pt-pkg" onClick={() => p.pkg !== o.key && set({ pkg: o.key, termsAccepted: false })} data-pick={`pkg:${o.key}`}>
              <b>{o.title}</b>
              <span>{o.line}</span>
              <em>{o.fee}</em>
            </button>
          ))}
        </div>
      </Group>

      {pkg && (
        <div className="pt-terms" data-err={errors.termsAccepted ? "" : undefined}>
          <p className="pt-field__l">Terms for {pkg.title}</p>
          <div className="pt-terms__body" tabIndex={0} aria-label={`Terms for ${pkg.title}`}>
            {pkg.terms ? (
              pkg.terms.map((t, i) => <p key={i}>{t}</p>)
            ) : (
              <p className="pt-terms__missing">REG KING&apos;s terms for this option will appear here before launch. (Version: {pkg.termsVersion})</p>
            )}
          </div>
          <label className="pt-check">
            <input type="checkbox" checked={p.termsAccepted} onChange={(e) => set({ termsAccepted: e.target.checked })} data-f="terms" />
            <span>I&apos;ve read and accept the terms for {pkg.title}.</span>
          </label>
          {errors.termsAccepted && <span className="pt-err">{errors.termsAccepted}</span>}
        </div>
      )}

      <div className="pt-field" data-err={errors.authorised ? "" : undefined}>
        <label className="pt-check">
          <input type="checkbox" checked={p.authorised} onChange={(e) => set({ authorised: e.target.checked })} data-f="authorised" />
          <span>I confirm I own this registration, or I&apos;m authorised by the owner to sell it.</span>
        </label>
        {errors.authorised && <span className="pt-err">{errors.authorised}</span>}
      </div>
    </div>
  );
}

/** Postcode lookup with manual entry. PROTOTYPE: the lookup service isn't connected, so it opens manual entry. */
function AddressField({ value, set, err }: { value: Address; set: (a: Address) => void; err: string }) {
  const [manual, setManual] = useState(!!value.line1);
  const [lookup, setLookup] = useState(value.postcode);
  const [note, setNote] = useState("");
  const find = () => {
    // CONFIRM: connect a UK postcode lookup service (server side, key kept off the page).
    set({ ...value, postcode: lookup.toUpperCase().trim() });
    setNote("Address lookup isn't connected in this preview. Please enter your address below.");
    setManual(true);
  };
  return (
    <div className="pt-field" data-err={err ? "" : undefined}>
      <span className="pt-field__l">Address</span>
      {!manual && (
        <div className="pt-lookup">
          <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Postcode" autoComplete="postal-code" aria-label="Postcode" data-f="lookup" />
          <button type="button" className="rk-btn rk-btn--ink" onClick={find} data-find-address>
            Find address
          </button>
        </div>
      )}
      {note && <span className="pt-field__hint">{note}</span>}
      {manual ? (
        <div className="pt-addr">
          <input value={value.line1} onChange={(e) => set({ ...value, line1: e.target.value })} placeholder="Address line 1" autoComplete="address-line1" aria-label="Address line 1" data-f="line1" />
          <input value={value.line2} onChange={(e) => set({ ...value, line2: e.target.value })} placeholder="Address line 2 (optional)" autoComplete="address-line2" aria-label="Address line 2" />
          <input value={value.town} onChange={(e) => set({ ...value, town: e.target.value })} placeholder="Town or city" autoComplete="address-level2" aria-label="Town or city" data-f="town" />
          <input value={value.postcode} onChange={(e) => set({ ...value, postcode: e.target.value })} placeholder="Postcode" autoComplete="postal-code" aria-label="Postcode" data-f="postcode" />
        </div>
      ) : (
        <button type="button" className="pt-link" onClick={() => setManual(true)} data-manual-address>
          Enter address manually
        </button>
      )}
      {err && <span className="pt-err">{err}</span>}
    </div>
  );
}

/**
 * Sign in without leaving the form, so plates already entered are kept.
 * PROTOTYPE: signs in on this browser. At launch: Shopify's hosted sign-in (one-time email code),
 * with the plates kept in this session and restored when the customer comes back.
 */
export function SignInInline({ onDone, onCancel }: { onDone?: () => void; onCancel?: () => void }) {
  const { signIn, loadDemo } = useAccount();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim());
  return (
    <div className="pt-signin">
      <p className="pt-demo">Preview: sign-in isn&apos;t connected to Shopify yet. Entering an email signs you in on this browser only.</p>
      <div className="pt-field" data-err={tried && !ok ? "" : undefined}>
        <label>
          <span className="pt-field__l">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-f="signin-email" />
        </label>
        {tried && !ok && <span className="pt-err">Enter a valid email address</span>}
      </div>
      <p className="pt-field__hint">We&apos;ll email you a one-time code to sign in. There&apos;s no password.</p>
      <div className="pt-row">
        <button
          type="button"
          className="rk-btn rk-btn--ink"
          data-signin-go
          onClick={() => {
            setTried(true);
            if (!ok) return;
            signIn({ email: email.trim() });
            onDone?.();
          }}
        >
          Continue
        </button>
        <button
          type="button"
          className="pt-link"
          onClick={() => {
            loadDemo();
            onDone?.();
          }}
          data-demo
        >
          Use the demo account
        </button>
        {onCancel && (
          <button type="button" className="pt-link" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
