"use client";

import { useEffect, useRef, useState } from "react";
import { formatGBP, platesForSale } from "@/lib/brand";
import { STYLE_INFO, earliest, styleOf } from "@/lib/search";
import { useAccount } from "./AccountProvider";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";

type Plate = (typeof platesForSale)[number];

/**
 * PACK RULES (confirm with REG KING before launch):
 * - free to open, one pack per day per customer, no purchase needed (a free prize promotion, not gambling);
 * - five plates per pack, only plates priced at least MIN_PRICE;
 * - every plate in the pack gets PACK_OFF off for PACK_HOURS, claimed into the customer's account.
 * PROTOTYPE: the daily limit and rewards live in this browser. At launch each claim creates a
 * single-use Shopify discount code for those plates, tied to the customer.
 */
export const PACK_OFF = 100;
export const PACK_HOURS = 48;
const PACK_SIZE = 5;
const MIN_PRICE = 1000;
const STORE = "rk-pack";

const TIERS = [
  { key: "royal", label: "Royal", min: 3500 },
  { key: "gold", label: "Gold", min: 2500 },
  { key: "classic", label: "Classic", min: 0 },
] as const;
const tierOf = (price: number) => TIERS.find((t) => price >= t.min)!;
const money = (n: number) => formatGBP(n, Number.isInteger(n));
const today = () => new Date().toISOString().slice(0, 10);

type Saved = { date: string; regs: string[]; opened: string; claimed: boolean };
type Phase = "idle" | "scramble" | "walkout" | "cards" | "done";
const CHARS = "ABCDEFGHJKLMNOPRSTUVWXYZ0123456789";
const SCRAMBLE_START = 700; // ms of pure mixing before the first letter locks
const SETTLE_EVERY = 220; // ms between letters locking in
const rand = () => CHARS[Math.floor(Math.random() * CHARS.length)];

function loadPack(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "null") as Saved | null;
    return v && v.date === today() ? v : null;
  } catch {
    return null;
  }
}
function savePack(v: Saved | null) {
  try {
    if (v) localStorage.setItem(STORE, JSON.stringify(v));
    else localStorage.removeItem(STORE);
  } catch {}
}
function untilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const m = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * Featured plates as a daily reveal: a blank plate mixes through letters and settles, one
 * character at a time, on the best plate in the pack. The other four flip in after it.
 * Every plate in the pack is £100 off for 48 hours once claimed into an account.
 */
export function PlateOpener() {
  const { go } = useMode();
  const { customer, claimRewards, rewards } = useAccount();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pack, setPack] = useState<Plate[]>([]);
  const [claimed, setClaimed] = useState(false);
  const timers = useRef<number[]>([]);

  const [shown, setShown] = useState("");
  const clear = () => {
    timers.current.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timers.current = [];
  };
  useEffect(() => clear, []);

  // Already opened today: show that pack (so a customer can sign in and come back to claim it).
  useEffect(() => {
    const s = loadPack();
    if (!s) return;
    const plates = s.regs.map((r) => platesForSale.find((p) => p.reg === r)).filter(Boolean) as Plate[];
    if (plates.length) {
      setPack(plates);
      setClaimed(s.claimed);
      setPhase("done");
    }
  }, []);

  const open = () => {
    clear();
    const pool = platesForSale.filter((p) => p.price >= MIN_PRICE);
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, PACK_SIZE);
    picked.sort((a, b) => b.price - a.price); // the best one walks out first
    setPack(picked);
    setClaimed(false);
    savePack({ date: today(), regs: picked.map((p) => p.reg), opened: new Date().toISOString(), claimed: false });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    // Mix the letters, then lock them in one by one, left to right.
    const target = picked[0].reg;
    const slots = [...target].map((c, i) => ({ c, i })).filter((x) => x.c !== " ");
    const locked = new Set<number>();
    setPhase("scramble");
    const mix = () => setShown([...target].map((c, i) => (c === " " || locked.has(i) ? c : rand())).join(""));
    mix();
    const iv = window.setInterval(mix, 55);
    timers.current.push(iv);
    slots.forEach((x, n) =>
      timers.current.push(
        window.setTimeout(() => {
          locked.add(x.i);
          mix();
        }, SCRAMBLE_START + n * SETTLE_EVERY),
      ),
    );
    const settled = SCRAMBLE_START + slots.length * SETTLE_EVERY;
    timers.current.push(
      window.setTimeout(() => {
        clearInterval(iv);
        setShown(target);
        setPhase("walkout");
      }, settled),
    );
    timers.current.push(window.setTimeout(() => setPhase("cards"), settled + 1500));
    timers.current.push(window.setTimeout(() => setPhase("done"), settled + 1500 + 1300));
  };
  const skip = () => {
    clear();
    setPhase("done");
  };
  const claim = () => {
    const expires = new Date(Date.now() + PACK_HOURS * 3600e3).toISOString();
    claimRewards(pack.map((p) => ({ reg: p.reg, handle: p.handle, off: PACK_OFF, expires })));
    setClaimed(true);
    const s = loadPack();
    if (s) savePack({ ...s, claimed: true });
  };

  const star = pack[0];
  const tier = star ? tierOf(star.price) : null;
  const fits = star ? earliest(star.reg) : null;
  const order: Phase[] = ["idle", "scramble", "walkout", "cards", "done"];
  const step = order.indexOf(phase);
  const busy = step > 0 && step < order.length - 1;
  const showCards = phase === "cards" || phase === "done";
  const alreadyClaimed = claimed || (pack.length > 0 && pack.every((p) => rewards.some((r) => r.reg === p.reg)));

  return (
    <section className="rk-pack" id="rk-exclusive" aria-labelledby="pack-title" data-phase={phase} data-tier={tier?.key}>
      <div className="rk-wrap rk-pack__in">
        <div className="rk-pack__head">
          <h2 id="pack-title">Daily plate pack</h2>
          <p>
            One free pack a day. Every plate inside is <b>£{PACK_OFF} off</b> for {PACK_HOURS} hours.
          </p>
          <ol className="rk-pack__how" aria-label="How the plate pack works">
            <li>
              <span>1</span>
              <b>Reveal</b>
              <small>Press reveal and the plate mixes up, then lands on your top plate.</small>
            </li>
            <li>
              <span>2</span>
              <b>Get {PACK_SIZE} plates</b>
              <small>Your pack has {PACK_SIZE} of our plates, each £{PACK_OFF} off.</small>
            </li>
            <li>
              <span>3</span>
              <b>Claim</b>
              <small>Sign in to claim. Buy any of them within {PACK_HOURS} hours to keep the saving.</small>
            </li>
          </ol>
        </div>

        <div className="rk-pack__stage">
          <span className="rk-pack__beam" aria-hidden />

          {(phase === "idle" || phase === "scramble" || phase === "walkout") && (
            <div className="rk-pack__hero">
              {star && phase === "walkout" && <span className="rk-pack__tier">{tier?.label} plate</span>}
              <span className="rk-pack__bigplate" data-state={phase} aria-live="polite" aria-label={phase === "walkout" && star ? star.reg : "Mystery plate"}>
                {phase === "idle" ? "??? ????" : shown}
              </span>
              {phase === "idle" && (
                <button type="button" className="rk-pack__go" onClick={open} data-open>
                  Reveal today&apos;s plates <ArrowRight />
                </button>
              )}
              {phase === "scramble" && <span className="rk-pack__mixing">Picking your plates…</span>}
              {star && phase === "walkout" && (
                <>
                  <p className="rk-pack__price">
                    <s>{money(star.price)}</s> {money(star.price - PACK_OFF)}
                  </p>
                  <p className="rk-pack__facts">
                    {STYLE_INFO[styleOf(star.reg)].name} · {fits ? `vehicles from ${fits.label}` : "fits any age"}
                  </p>
                </>
              )}
            </div>
          )}

          {showCards && (
            <div className="rk-pack__result">
              <ul className="rk-pack__cards" aria-label="Plates in your pack">
                {pack.map((p, i) => {
                  const t = tierOf(p.price);
                  return (
                    <li key={p.reg} style={{ animationDelay: phase === "cards" ? `${i * 220}ms` : "0ms" }} data-tier={t.key}>
                      <a
                        href={`#plate-${p.handle}`}
                        onClick={(e) => {
                          e.preventDefault();
                          go(`plate-${p.handle}`);
                        }}
                      >
                        <span className="rk-pack__ctier">{t.label}</span>
                        <span className="rk-pack__cplate">{p.reg}</span>
                        <span className="rk-pack__cprice">
                          <s>{money(p.price)}</s>
                          <b>{money(p.price - PACK_OFF)}</b>
                        </span>
                        <span className="rk-pack__cfacts">{STYLE_INFO[styleOf(p.reg)].name}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>

              {phase === "done" && (
                <div className="rk-pack__claim" aria-live="polite">
                  {alreadyClaimed ? (
                    <>
                      <p>
                        <b>Claimed.</b> £{PACK_OFF} off each of these plates for {PACK_HOURS} hours. They&apos;re in your account.
                      </p>
                      <button type="button" className="rk-pack__go" onClick={() => go("account")}>
                        My account <ArrowRight />
                      </button>
                    </>
                  ) : customer ? (
                    <>
                      <p>
                        Claim <b>£{PACK_OFF} off</b> all {pack.length} plates. Use it within {PACK_HOURS} hours.
                      </p>
                      <button type="button" className="rk-pack__go" onClick={claim} data-claim>
                        Claim my £{PACK_OFF} off <ArrowRight />
                      </button>
                    </>
                  ) : (
                    <>
                      <p>
                        Sign in or create a free account to claim <b>£{PACK_OFF} off</b> these plates. Your pack is saved until midnight.
                      </p>
                      <button type="button" className="rk-pack__go" onClick={() => go("account")} data-signin-claim>
                        Sign in to claim <ArrowRight />
                      </button>
                    </>
                  )}
                  <span className="rk-pack__next">Next pack in {untilMidnight()}</span>
                  <button
                    type="button"
                    className="rk-pack__proto"
                    onClick={() => {
                      savePack(null);
                      setPack([]);
                      setPhase("idle");
                    }}
                  >
                    Prototype: open another now
                  </button>
                </div>
              )}
            </div>
          )}

          {busy && (
            <button type="button" className="rk-pack__skip" onClick={skip}>
              Skip
            </button>
          )}
        </div>
        <a
          className="rk-pack__all"
          href="#buy-regking"
          onClick={(e) => {
            e.preventDefault();
            go("buy-regking");
          }}
        >
          View all plates <ArrowRight />
        </a>
        <p className="rk-pack__terms">
          Free to open, no purchase needed. One pack per person per day. £{PACK_OFF} off each plate in your pack, for {PACK_HOURS} hours from claiming. One discount per plate. Plates
          priced £{MIN_PRICE.toLocaleString("en-GB")} and over.
        </p>
      </div>
    </section>
  );
}
