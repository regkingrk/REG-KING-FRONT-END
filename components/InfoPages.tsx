"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatGBP, instagram, payl8rDisclaimer, reviewScores, routes, spaceReg, supportEmail } from "@/lib/brand";
import { CONTACT_TOPICS, FAQS, HQ, PROVIDERS, STORY, STORY_NEXT, TEAM, phone, whatsapp, type ContactTopic, type FaqTab, type ProviderKey } from "@/lib/infoContent";
import { GALLERY, type GalleryTab } from "@/lib/gallery";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";
import { useAccount } from "./AccountProvider";

const money = (n: number) => formatGBP(n, Number.isInteger(n));
/** Inside the HQ: the "Build your plate" wall. */
const HQ_PHOTO = "media/accessories-wall.jpg";
/** The preview can't show other sites (like Google Maps) inside the page; the live site can. */
const inPreview = () => typeof window !== "undefined" && "__RK_LOAD__" in window;

/** Split a price into n payments in pence, any odd pennies on the first. */
function splitPrice(total: number, n: number) {
  const pence = Math.round(total * 100);
  const each = Math.floor(pence / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? pence - each * (n - 1) : each) / 100);
}

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */
export function FinancePage() {
  const [pick, setPick] = useState<ProviderKey>("klarna");
  const [price, setPrice] = useState("900");
  const p = PROVIDERS.find((x) => x.key === pick)!;
  const n = Math.max(0, Number(price.replace(/[^\d.]/g, "")) || 0);
  const parts = p.split && n > 0 ? splitPrice(n, p.split.parts) : [];

  return (
    <div className="rk-fin">
      <p className="rk-info__lede">Four ways to spread the cost, all at checkout. Pick one to see how it works.</p>

      <div className="rk-fin__pick" role="tablist" aria-label="Finance providers">
        {PROVIDERS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={pick === x.key}
            onClick={() => setPick(x.key)}
            data-provider={x.key}
            style={{ ["--pc" as string]: x.colour, ["--pi" as string]: x.ink }}
          >
            <b>{x.name}</b>
            <small>{x.tag}</small>
          </button>
        ))}
      </div>

      <div className="rk-fin__card" role="tabpanel" style={{ ["--pc" as string]: p.colour, ["--pi" as string]: p.ink }} key={p.key}>
        <div className="rk-fin__head">
          <span className="rk-fin__brand">{p.name}</span>
          <span className="rk-fin__tag">{p.tag}</span>
        </div>

        {p.split ? (
          <div className="rk-fin__calc">
            <label htmlFor="rk-fin-price">Try a price</label>
            <div className="rk-dep__in rk-fin__in">
              <span aria-hidden>£</span>
              <input id="rk-fin-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} autoComplete="off" />
            </div>
            {parts.length > 0 && (
              <ol className="rk-fin__parts" aria-label={`${p.split.parts} payments`}>
                {parts.map((v, i) => (
                  <li key={i}>
                    <span>{i === 0 ? (p.split!.first === "at checkout" ? "Today" : "When it ships") : `Payment ${i + 1}`}</span>
                    <b>{money(v)}</b>
                  </li>
                ))}
              </ol>
            )}
            <p className="rk-fin__note">
              {p.split.parts} interest-free payments, {p.split.every}. {p.name} decides how much you can spend, so for bigger plates use Payl8r or reserve it with a deposit.
            </p>
          </div>
        ) : (
          <div className="rk-fin__example">
            <p className="rk-finance__label">Representative example</p>
            <p className="rk-finance__figure">
              £460.00 <span>over 12 months</span>
            </p>
            <p className="rk-finance__terms">2.50% fixed per month · Representative APR 65.5%</p>
            <a className="rk-btn rk-btn--gold" href={routes.financeApply}>
              Apply for Payl8r finance <ArrowRight />
            </a>
          </div>
        )}

        <ul className="rk-fin__points">
          {p.points.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="rk-fin__small">{p.key === "payl8r" ? payl8rDisclaimer : p.small}</p>
      </div>

      <div className="rk-fin__how">
        <h2 className="rk-dep__h">How to use it</h2>
        <ol className="rk-dep__steps">
          {[
            { t: "Pick your plate", d: "Add a plate, number plates or accessories to your basket." },
            { t: "Choose at checkout", d: "Select Klarna, Clearpay, PayPal or Payl8r as your payment method." },
            { t: "Get a quick decision", d: "The provider checks you can afford it and tells you straight away." },
            { t: "We get to work", d: "Once it's approved, your order goes through like any other." },
          ].map((s, i) => (
            <li key={s.t}>
              <span className="rk-dep__n" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <b>{s.t}</b>
                <span>{s.d}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="rk-info__small">
        Finance is provided by the companies above, not by REG KING. All finance is subject to status and only available to UK residents aged 18 or over. Think carefully about whether you can afford
        the repayments.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */
/** What REG KING does, for the About page. Matches the site's own Buy, Sell and Make sections. */
const ABOUT_DO = [
  { plate: "BUY", t: "Buy", d: "Plates we own, plates our customers are selling and new DVLA registrations, all in one search." },
  { plate: "SELL", t: "Sell", d: "We advertise your plate, deal with buyers and manage the sale and transfer for you." },
  { plate: "MAKE", t: "Make", d: "Road legal plates, 3D and 4D, made at our HQ in Bilston." },
  { plate: "DVLA", t: "Transfer", d: "We take care of the DVLA paperwork so your plate ends up on your car without the hassle." },
];

export function AboutPage() {
  const { go } = useMode();
  const [at, setAt] = useState(STORY.length - 1);
  const m = STORY[at];
  // on a phone the years scroll sideways: keep the chosen one in view
  const years = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = years.current, b = row?.querySelector<HTMLElement>(`[data-year="${m.year}"]`);
    if (row && b && row.scrollWidth > row.clientWidth) row.scrollTo({ left: b.offsetLeft - (row.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
  }, [m.year]);
  return (
    <div className="rk-about">
      <p className="rk-info__lede">Industry leaders in private plates. We buy, sell and make registrations, and we&apos;re fully DVLA registered. Here&apos;s how we got here.</p>

      <div className="rk-story">
        <div className="rk-story__years" role="tablist" aria-label="Our story by year" ref={years}>
          {STORY.map((s, i) => (
            <button key={s.year} type="button" role="tab" aria-selected={i === at} onClick={() => setAt(i)} data-year={s.year}>
              <span className="rk-story__plate">{s.year}</span>
            </button>
          ))}
          <span className="rk-story__track" aria-hidden style={{ ["--p" as string]: `${(at / (STORY.length - 1)) * 100}%` }} />
        </div>
        <div className="rk-story__card" role="tabpanel" key={m.year}>
          <span className="rk-story__big" aria-hidden>
            {m.year}
          </span>
          <h2>{m.title}</h2>
          <p className="rk-story__sub">{m.sub}</p>
          {m.body.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <div className="rk-story__nav">
            <button type="button" onClick={() => setAt((a) => Math.max(0, a - 1))} disabled={at === 0} aria-label="Earlier">
              <ArrowRight />
            </button>
            <span>
              {at + 1} / {STORY.length}
            </span>
            <button type="button" onClick={() => setAt((a) => Math.min(STORY.length - 1, a + 1))} disabled={at === STORY.length - 1} aria-label="Later">
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>

      <section className="ab-next" aria-labelledby="ab-next-t">
        <h2 id="ab-next-t">{STORY_NEXT.title}</h2>
        <p className="ab-next__sub">{STORY_NEXT.sub}</p>
        {STORY_NEXT.body.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p className="ab-next__close">{STORY_NEXT.close}</p>
        <p className="ab-next__sign">
          REG KING. <span>{STORY_NEXT.sign}</span>
        </p>
      </section>

      <section className="ab-reg" aria-labelledby="ab-reg-t">
        <div className="ab-reg__mark" aria-hidden>
          <span>DVLA</span>
          <b>Registered</b>
        </div>
        <div>
          <h2 id="ab-reg-t">Fully DVLA registered</h2>
          {/* CONFIRM with REG KING: the exact DVLA registration (e.g. Registered Number Plate Supplier) to name here. */}
          <p>
            REG KING is fully registered with the DVLA. Every transfer is handled properly, every document is checked, and every road legal plate we make is made to the legal standard. You&apos;re dealing with a business that does it by the book.
          </p>
        </div>
      </section>

      <section className="ab-do" aria-labelledby="ab-do-t">
        <h2 id="ab-do-t">What we do</h2>
        <p className="ab-do__lede">Buying, selling and making private plates, all under one roof. From finding the right reg to putting it on your car, we handle the whole thing.</p>
        <ul className="ab-do__list">
          {ABOUT_DO.map((d) => (
            <li key={d.t}>
              <span className="ab-do__plate" aria-hidden>
                {d.plate}
              </span>
              <div>
                <h3>{d.t}</h3>
                <p>{d.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ab-grow" aria-labelledby="ab-grow-t">
        <h2 id="ab-grow-t">Industry leaders, and growing fast</h2>
        <p>
          In under a decade we&apos;ve gone from dealing plates on the side to running our own HQ, making plates in-house and leading the way on social media. Every year we&apos;ve grown, and we&apos;re only getting started.
        </p>
        <div className="ab-grow__acts">
          <button type="button" className="rk-btn rk-btn--gold" onClick={() => go("buy")}>
            Find your plate
          </button>
          <button type="button" className="ab-grow__link" onClick={() => go("sell")}>
            Sell your plate with us
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */
export function TeamPage() {
  return (
    <div className="rk-team2">
      <p className="rk-info__lede">The faces behind the plates. Say hello when you visit the HQ.</p>
      <ul className="rk-team2__grid">
        {TEAM.map((t) => (
          <li key={t.name}>
            <TeamAvatar plate={t.plate} />
            <h2>{t.name}</h2>
            <span className="rk-team2__role">{t.role}</span>
            <p>{t.line}</p>
          </li>
        ))}
      </ul>
      <p className="rk-bfine">Prototype: each avatar becomes an illustration of that person holding their own plate.</p>
    </div>
  );
}

/**
 * Placeholder avatar: a plain figure holding their plate, all drawn the same way. Swap for each
 * person's own illustration (same size and pose) when the artwork is ready.
 */
function TeamAvatar({ plate }: { plate: string }) {
  return (
    <div className="rk-team2__av" aria-hidden>
      <svg viewBox="0 0 160 150" className="rk-team2__fig">
        <circle cx="80" cy="44" r="26" />
        <path d="M30 150c0-36 22-60 50-60s50 24 50 60z" />
      </svg>
      <span className="rk-team2__plate">{plate}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQs                                                                */
/* ------------------------------------------------------------------ */
export function FaqPage() {
  const { go } = useMode();
  const [tab, setTab] = useState<FaqTab>("buy");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();
  // Searching looks across every tab, so nothing is hidden behind the wrong one.
  const results = useMemo(() => {
    if (!needle) return null;
    return (Object.keys(FAQS) as FaqTab[]).flatMap((k) =>
      FAQS[k].items.filter((f) => (f.q + " " + f.a).toLowerCase().includes(needle)).map((f) => ({ ...f, tab: k })),
    );
  }, [needle]);
  const list = results ?? FAQS[tab].items.map((f) => ({ ...f, tab }));

  return (
    <div className="rk-faqs">
      {/* search and topics together on one black panel */}
      <div className="rk-faqs__top">
      <label className="rk-faqs__search">
        <span className="rk-visually-hidden">Search the FAQs</span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input type="search" placeholder="Search, like 'V5C' or 'deposit'" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {!results && (
        <div className="rk-faqs__tabs" role="tablist" aria-label="FAQ topics">
          {(Object.keys(FAQS) as FaqTab[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => {
                setTab(k);
                setOpen(null);
              }}
              data-faq-tab={k}
            >
              <b>{FAQS[k].label}</b>
              <small>{FAQS[k].items.length}</small>
            </button>
          ))}
        </div>
      )}
      </div>
      <p className="rk-faqs__line">{results ? `${results.length} answer${results.length === 1 ? "" : "s"} for "${q.trim()}"` : FAQS[tab].line}</p>

      <ul className="rk-faqs__list">
        {list.map((f) => {
          const id = `${f.tab}:${f.q}`;
          const isOpen = open === id;
          return (
            <li key={id} data-open={isOpen || undefined}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                <span>{f.q}</span>
                {results && <small className="rk-faqs__tag">{FAQS[f.tab].label}</small>}
                <i aria-hidden />
              </button>
              {isOpen && <p>{f.a}</p>}
            </li>
          );
        })}
      </ul>
      {results && results.length === 0 && <p className="rk-faqs__none">Nothing found. Try another word, or ask us directly.</p>}

      <div className="rk-faqs__help">
        <b>Still stuck?</b>
        <span>Ask the team and we&apos;ll get back to you.</span>
        <button type="button" className="rk-btn rk-btn--ink" onClick={() => go("info-contact")}>
          Contact us <ArrowRight />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */
export function ContactPage() {
  const { customer } = useAccount();
  const [topic, setTopic] = useState<ContactTopic | null>(null);
  const [sub, setSub] = useState("");
  const [reg, setReg] = useState("");
  const [order, setOrder] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [via, setVia] = useState<"email" | "phone">("email");
  const [msg, setMsg] = useState("");
  // The form asks one thing at a time: 0 topic, 1 which one, 2 message, 3 contact details.
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => setPreview(inPreview()), []);
  // Signed in: their details are already filled in.
  useEffect(() => {
    if (!customer) return;
    setName((v) => v || customer.name);
    setEmail((v) => v || customer.email);
    setTel((v) => v || customer.phone);
  }, [customer]);
  // Opened from an order, listing or plate: start on that topic, with the reg and reference filled in.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("rk-contact");
      if (!raw) return;
      sessionStorage.removeItem("rk-contact");
      const c = JSON.parse(raw) as { topic?: ContactTopic; sub?: string; reg?: string; order?: string; note?: string };
      if (c.topic && CONTACT_TOPICS.some((x) => x.key === c.topic)) setTopic(c.topic);
      if (c.sub) setSub(c.sub);
      if (c.reg) setReg(c.reg);
      if (c.order) setOrder(c.order);
      if (c.note) setMsg(c.note + " ");
      // Arriving with the topic already known: go straight to the message.
      if (c.topic) setStep(2);
    } catch {}
  }, []);

  const t = CONTACT_TOPICS.find((x) => x.key === topic) ?? null;
  const s = t?.subs.find((x) => x.key === sub) ?? null;
  // A reg or order number box shows when the topic usually involves one. Both are optional.
  const asksReg = !!t && (s ? !!s.asks?.includes("reg") : t.key === "buy" || t.key === "sell");
  const asksOrder = !!t && (s ? !!s.asks?.includes("order") : t.key === "make");
  const ok = {
    msg: msg.trim().length > 5,
    name: name.trim().length > 1,
    email: /^\S+@\S+\.\S+$/.test(email.trim()),
    tel: via === "email" ? tel.trim() === "" || tel.replace(/\D/g, "").length >= 10 : tel.replace(/\D/g, "").length >= 10,
  };
  const bad = (k: keyof typeof ok) => tried && !ok[k];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const first = (["msg", "name", "email", "tel"] as const).find((k) => !ok[k]);
    if (first) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-cf="${first}"]`)?.focus());
      return;
    }
    // PROTOTYPE: nothing is sent. At launch this posts to the Shopify contact form, which emails support.
    setSent(true);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="rk-c3 rk-c4">
      <p className="rk-info__lede">Call, WhatsApp or send a message. We&apos;re a small team, so you&apos;ll speak to someone who knows plates.</p>

      {/* Quickest ways first */}
      <div className="c4-quick" aria-label="Ways to reach us">
        <a className="c4-q c4-q--call" href={`tel:${phone.tel}`} data-c4="call">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
          </svg>
          <span>
            <small>Call us</small>
            <b>{phone.display}</b>
          </span>
        </a>
        <a className="c4-q" href={whatsapp.href} target="_blank" rel="noopener noreferrer" data-c4="whatsapp">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
            <path d="M9 9.2c.3 2 1.8 3.6 3.8 4.2l1-1 1.8.8c-.2 1-1 1.6-2 1.5A6 6 0 0 1 8 9.2c0-1 .6-1.8 1.5-2l.8 1.8z" fill="currentColor" stroke="none" />
          </svg>
          <span>
            <small>WhatsApp</small>
            <b>{whatsapp.display}</b>
          </span>
        </a>
        <div className="c4-q c4-q--mail">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3.5 6.5 12 13l8.5-6.5" />
          </svg>
          <span>
            <small>Email</small>
            <b>{supportEmail}</b>
          </span>
          <button type="button" onClick={copy} aria-live="polite" data-c4="copy">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="rk-c3__main">
        {sent ? (
          <div className="rk-c3__sent" aria-live="polite">
            <span className="rk-c3__tick" aria-hidden>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2>Thanks {name.trim().split(" ")[0]}, that&apos;s with the team</h2>
            <p>
              {t ? `${t.label}${s ? `, ${s.label.toLowerCase()}` : ""}${reg ? `, ${reg.toUpperCase()}` : ""}. ` : ""}We&apos;ll {via === "phone" ? `call you on ${tel.trim()}` : `email you at ${email.trim()}`}.
            </p>
            <p className="rk-bfine">Prototype: messages aren&apos;t sent yet. At launch this goes straight to {supportEmail}.</p>
            <button
              type="button"
              className="rk-c3__again"
              onClick={() => {
                setSent(false);
                setTopic(null);
                setSub("");
                setMsg("");
                setReg("");
                setOrder("");
                setTried(false);
                setStep(0);
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form className="rk-c3__form c4-form" onSubmit={submit} noValidate>
            <h2>Send us a message</h2>

            {/* One question at a time; answered ones fold to a line with Change. Contact details come last. */}
            {step > 0 && t && (
              <div className="c4-done" data-c4-done="topic">
                <span>About</span>
                <b>
                  {t.label}
                  {s ? `: ${s.label}` : ""}
                </b>
                <button type="button" onClick={() => setStep(0)}>
                  Change
                </button>
              </div>
            )}
            {step > 2 && (
              <div className="c4-done" data-c4-done="msg">
                <span>Message</span>
                <b className="c4-done__msg">{msg.trim()}</b>
                <button type="button" onClick={() => setStep(2)}>
                  Change
                </button>
              </div>
            )}

            {step === 0 && (
              <div className="c4-step" key="q0">
                <span className="c4-step__t" id="c4-topic">
                  What&apos;s it about?
                </span>
                <div className="rk-c3__topics" role="radiogroup" aria-labelledby="c4-topic">
                  {CONTACT_TOPICS.map((x) => (
                    <button
                      key={x.key}
                      type="button"
                      role="radio"
                      aria-checked={topic === x.key}
                      onClick={() => {
                        if (topic !== x.key) setSub("");
                        setTopic(x.key);
                        setStep(x.subs.length ? 1 : 2);
                      }}
                      data-topic={x.key}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && t && (
              <div className="c4-step" key="q1">
                <span className="c4-step__t" id="c4-sub">
                  Which of these is it?
                </span>
                <div className="rk-c3__chips c4-chips" role="radiogroup" aria-labelledby="c4-sub">
                  {t.subs.map((x) => (
                    <button
                      key={x.key}
                      type="button"
                      role="radio"
                      aria-checked={sub === x.key}
                      onClick={() => {
                        setSub(x.key);
                        setStep(2);
                      }}
                      data-sub={x.key}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="c4-skip"
                  onClick={() => {
                    setSub("");
                    setStep(2);
                  }}
                >
                  None of these
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="c4-step" key="q2">
                <label className="rk-c3__f">
                  <span className="c4-step__t">How can we help?</span>
                  <textarea rows={4} autoFocus value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tell us what you need and we'll take it from there." data-cf="msg" aria-invalid={bad("msg")} />
                  {bad("msg") && <small className="rk-c3__err">Write a short message so we know how to help.</small>}
                </label>
                {(asksReg || asksOrder) && (
                  <div className="rk-c3__row">
                    {asksReg && (
                      <label className="rk-c3__f">
                        <span>
                          Registration <i>(optional)</i>
                        </span>
                        <input className="rk-c3__reg" value={reg} onChange={(e) => setReg(spaceReg(e.target.value))} maxLength={8} placeholder="THE REG" autoCapitalize="characters" data-cf="reg" />
                      </label>
                    )}
                    {asksOrder && (
                      <label className="rk-c3__f">
                        <span>
                          Order number <i>(optional)</i>
                        </span>
                        <input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="#1001" data-cf="order" />
                      </label>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  className="rk-c3__go"
                  data-cf="next"
                  onClick={() => {
                    if (!ok.msg) {
                      setTried(true);
                      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-cf="msg"]')?.focus());
                      return;
                    }
                    setTried(false);
                    setStep(3);
                  }}
                >
                  Next
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="c4-step" key="q3">
                <span className="c4-step__t">Your details</span>
                <label className="rk-c3__f">
                  <span>Your name</span>
                  <input value={name} autoFocus={!name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-cf="name" aria-invalid={bad("name")} />
                  {bad("name") && <small className="rk-c3__err">Enter your name.</small>}
                </label>
                <div className="rk-c3__row">
                  <label className="rk-c3__f">
                    <span>Email</span>
                    <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-cf="email" aria-invalid={bad("email")} />
                    {bad("email") && <small className="rk-c3__err">Enter an email address like name@example.com.</small>}
                  </label>
                  <label className="rk-c3__f">
                    <span>
                      Phone {via === "email" && <i>(optional)</i>}
                    </span>
                    <input type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" data-cf="tel" aria-invalid={bad("tel")} />
                    {bad("tel") && <small className="rk-c3__err">{via === "phone" ? "Enter the number we should call." : "Enter a phone number with at least 10 digits."}</small>}
                  </label>
                </div>
                <div className="rk-c3__via" role="radiogroup" aria-label="How should we reply?">
                  <span>How should we reply?</span>
                  <div>
                    <button type="button" role="radio" aria-checked={via === "email"} onClick={() => setVia("email")}>
                      By email
                    </button>
                    <button type="button" role="radio" aria-checked={via === "phone"} onClick={() => setVia("phone")} data-via="phone">
                      Give me a call
                    </button>
                  </div>
                </div>
                <button type="submit" className="rk-c3__go" data-cf="send">
                  Send message
                </button>
                <p className="rk-c3__fine">Your message goes to {supportEmail}.</p>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Visit: map, address and hours */}
      <section className="rk-c3__visit" aria-labelledby="c3-visit">
        <div className="rk-c3__map">
          {preview ? (
            <div className="rk-ct__mapstub" role="img" aria-label="Map of 48A Willenhall Road, Bilston">
              <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden fill="currentColor">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              <b>REG KING HQ</b>
              <span>{HQ.address}</span>
              <small>The live site shows a Google map here.</small>
            </div>
          ) : (
            <iframe title="Map: REG KING, 48A Willenhall Road, Bilston" src={HQ.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          )}
        </div>
        <div className="rk-c3__where">
          <h2 id="c3-visit">Visit the HQ</h2>
          <dl>
            <div>
              <dt>Address</dt>
              <dd>
                {HQ.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Opening hours</dt>
              <dd>
                {HQ.hours ? (
                  HQ.hours.map((h) => (
                    <span key={h.days}>
                      {h.days} <b>{h.time}</b>
                    </span>
                  ))
                ) : (
                  <span>Coming soon. Call ahead before you visit.</span>
                )}
              </dd>
            </div>
          </dl>
          <a className="rk-c3__dir" href={HQ.directions} target="_blank" rel="noopener noreferrer">
            Get directions <ArrowRight />
          </a>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */
export function PoliciesPage() {
  const items = [
    { t: "Privacy policy", d: "What we collect, why, and how we keep it safe.", href: "/privacy-policy" },
    { t: "Terms of service", d: "The terms for buying, selling and ordering with us.", href: "/terms-of-service" },
    { t: "Refund policy", d: "Returns and refunds, including made-to-order plates.", href: "https://regking.co.uk/policies/refund-policy" },
    { t: "DVLA legal information", d: "The rules for registrations and road legal plates.", href: "https://regking.co.uk/pages/legal-notice" },
  ];
  return (
    <div className="rk-pol">
      <p className="rk-info__lede">The small print, kept in one place.</p>
      <ul className="rk-pol__list">
        {items.map((x) => (
          <li key={x.t}>
            <a href={x.href}>
              <div>
                <b>{x.t}</b>
                <span>{x.d}</span>
              </div>
              <ArrowRight />
            </a>
          </li>
        ))}
      </ul>
      <div className="rk-dep__note" role="note">
        <b>Deposits are non-refundable</b>
        <span>A 10% deposit holds a plate for an agreed period and comes off the price. If you don&apos;t go ahead, the deposit is kept.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */
export function GalleryPage() {
  const [tab, setTab] = useState<GalleryTab>("made");
  const [open, setOpen] = useState<number | null>(null);
  const g = GALLERY[tab];
  const real = g.photos.filter((p) => p.src);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % real.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + real.length) % real.length));
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("rk-noscroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("rk-noscroll");
    };
  }, [open, real.length]);
  const shown = open === null ? null : real[open];

  return (
    <div className="rk-gal2">
      <div className="rk-gal2__tabs" role="tablist" aria-label="Gallery">
        {(Object.keys(GALLERY) as GalleryTab[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
              setOpen(null);
            }}
            data-gal-tab={k}
          >
            {GALLERY[k].label}
          </button>
        ))}
      </div>
      <p className="rk-gal2__line">{g.line}</p>

      <ul className="rk-gal2__grid" role="tabpanel">
        {g.photos.map((p, i) =>
          p.src ? (
            <li key={p.src}>
              <button type="button" className="rk-gal2__ph" onClick={() => setOpen(real.indexOf(p))} aria-label={`View larger: ${p.alt}`} data-gal-photo>
                <img src={p.src} alt={p.alt} loading="lazy" />
              </button>
            </li>
          ) : (
            <li key={`ph-${i}`}>
              <div className="rk-gal2__ph rk-gal2__ph--empty" aria-hidden>
                <span>Photo coming soon</span>
              </div>
            </li>
          ),
        )}
      </ul>
      <a className="rk-gal2__more" href={instagram.href} target="_blank" rel="noopener noreferrer">
        More of our work on Instagram {instagram.handle} <ArrowRight />
      </a>

      {shown && open !== null && (
        <div className="rk-lb" role="dialog" aria-modal="true" aria-label={shown.alt} onClick={() => setOpen(null)}>
          <figure className="rk-lb__fig" onClick={(e) => e.stopPropagation()}>
            <img src={shown.src!} alt={shown.alt} />
            <figcaption>
              <span>{shown.alt}</span>
              <span className="rk-lb__n">
                {open + 1} / {real.length}
              </span>
            </figcaption>
          </figure>
          <button type="button" className="rk-lb__x" onClick={() => setOpen(null)} aria-label="Close" data-lb-close>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          {real.length > 1 && (
            <>
              <button type="button" className="rk-lb__nav rk-lb__nav--prev" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + real.length) % real.length); }} aria-label="Previous photo">
                <ArrowRight />
              </button>
              <button type="button" className="rk-lb__nav rk-lb__nav--next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % real.length); }} aria-label="Next photo" data-lb-next>
                <ArrowRight />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
