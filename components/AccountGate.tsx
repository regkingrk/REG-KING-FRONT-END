"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAccount } from "./AccountProvider";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";

/** A customer's Revuelto at REG KING HQ, from REG KING's own film. */
const PHOTO = "media/sell-b.jpg";

/** What an account is for. Only things the account area really does. */
const PERKS = [
  {
    t: "Save plates to your wishlist",
    d: "Keep the registrations you like in one place and see if they're still for sale.",
    icon: "M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z",
  },
  {
    t: "Track your orders",
    d: "Follow each plate from payment through the DVLA transfer to your new V5C.",
    icon: "M4 7h11v9H4zM15 10h3.5L21 13v3h-6M7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01",
  },
  {
    t: "Sell your plate",
    d: "List a registration and see its offers and progress whenever you like.",
    icon: "M3.5 12.5 11 5h7.5v7.5L11 20zM15 8.5h.01",
  },
  {
    t: "Get updates",
    d: "We email you as your orders and listings move on. News on new plates is optional.",
    icon: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4",
  },
];

type Step = "email" | "code" | "welcome";

/**
 * Signed-out account page: sign in and sign up are the same thing. Email, then a one-time code,
 * then (first time) a name. Shopify's customer accounts work this way, with no password.
 * PROTOTYPE: no email is sent and any 6 digits are accepted; it signs in on this browser only.
 */
export function AccountGate() {
  const { signIn, update, loadDemo } = useAccount();
  const { go } = useMode();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [news, setNews] = useState(false);
  const [tried, setTried] = useState(false);
  const [resent, setResent] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!emailOk) return;
    setTried(false);
    setCode("");
    setResent(false);
    setStep("code");
  };
  const checkCode = (value: string) => {
    if (value.length === 6) setStep("welcome");
  };
  const finish = (e?: FormEvent) => {
    e?.preventDefault();
    signIn({ email: email.trim(), name: name.trim() || undefined });
    if (news) update({ marketing: true });
  };

  return (
    <div className="ag">
      <aside className="ag__side">
        <img className="ag__photo" src={PHOTO} alt="" />
        <div className="ag__sidein">
          <p className="ag__brand">REG KING account</p>
          <h2 className="ag__h">Buy, sell and save plates with one account.</h2>
          <ul className="ag__perks">
            {PERKS.map((p) => (
              <li key={p.t}>
                <span className="ag__icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={p.icon} />
                  </svg>
                </span>
                <span>
                  <b>{p.t}</b>
                  <small>{p.d}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="ag__main">
        <ol className="ag__dots" aria-label="Steps">
          {(["email", "code", "welcome"] as Step[]).map((s, i) => (
            <li key={s} data-on={step === s || undefined} data-done={["email", "code", "welcome"].indexOf(step) > i || undefined}>
              <span className="rk-visually-hidden">
                Step {i + 1}
                {step === s ? " (current)" : ""}
              </span>
            </li>
          ))}
        </ol>

        {step === "email" && (
          <form className="ag__card" onSubmit={sendCode} noValidate key="email">
            <h1 id="pt-title">Sign in or create an account</h1>
            <p className="ag__lede">One account for buying, selling and saving plates. New to REG KING? Enter your email and we&apos;ll set you up.</p>
            <label className="ag__f">
              <span>Email address</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={tried && !emailOk}
                data-f="signin-email"
              />
              {tried && !emailOk && <small className="ag__err">Enter an email address like name@example.com.</small>}
            </label>
            <button type="submit" className="ag__go" data-signin-go>
              Continue <ArrowRight />
            </button>
            <p className="ag__fine">No password to remember. We email you a 6-digit code each time you sign in.</p>
            <div className="ag__or">
              <span>or</span>
            </div>
            <div className="ag__alt">
              <button type="button" className="ag__ghost" onClick={() => go("account-list")}>
                List a plate first
              </button>
              <button type="button" className="ag__ghost" onClick={loadDemo} data-demo>
                Look round the demo account
              </button>
            </div>
          </form>
        )}

        {step === "code" && (
          <form
            className="ag__card"
            key="code"
            onSubmit={(e) => {
              e.preventDefault();
              setTried(true);
              checkCode(code);
            }}
            noValidate
          >
            <h1 id="pt-title">Check your email</h1>
            <p className="ag__lede">
              We&apos;ve sent a 6-digit code to <b>{email.trim()}</b>.{" "}
              <button type="button" className="ag__link" onClick={() => setStep("email")}>
                Change email
              </button>
            </p>
            <label className="ag__code">
              <span className="rk-visually-hidden">6-digit code</span>
              <input
                ref={codeRef}
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  checkCode(v);
                }}
                data-f="signin-code"
              />
              <span className="ag__boxes" aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} data-on={i === Math.min(code.length, 5) || undefined}>
                    {code[i] ?? ""}
                  </span>
                ))}
              </span>
            </label>
            {tried && code.length < 6 && <small className="ag__err">Enter all 6 digits from the email.</small>}
            <button type="submit" className="ag__go">
              Sign in <ArrowRight />
            </button>
            <p className="ag__fine">
              Not arrived? Check your junk folder or{" "}
              <button type="button" className="ag__link" onClick={() => setResent(true)} aria-live="polite">
                {resent ? "code sent again" : "send a new code"}
              </button>
              .
            </p>
            <p className="ag__demo">Preview: no email is sent yet. Any 6 digits will sign you in on this browser.</p>
          </form>
        )}

        {step === "welcome" && (
          <form className="ag__card" onSubmit={finish} noValidate key="welcome">
            <span className="ag__tick" aria-hidden>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h1 id="pt-title">You&apos;re in</h1>
            <p className="ag__lede">One last thing, and you can skip it.</p>
            <label className="ag__f">
              <span>
                What should we call you? <i>(optional)</i>
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" data-f="signin-name" autoFocus />
            </label>
            <label className="ag__check">
              <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} data-f="signin-news" />
              <span>Email me about new plates and offers</span>
            </label>
            <button type="submit" className="ag__go" data-signin-done>
              Go to my account <ArrowRight />
            </button>
            <p className="ag__fine">You can change these any time in Account Settings.</p>
          </form>
        )}
      </div>
    </div>
  );
}
