"use client";

import { AS_SEEN_WITH } from "@/lib/asSeenWith";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";

/** Seconds per logo, so the strip moves at the same pace however many logos there are. */
const SECONDS_PER_LOGO = 3.2;

/**
 * Buy page: businesses we've worked with, as one slow strip of their logos (white, no backgrounds).
 * Each logo is drawn at the same area, so wide and square logos carry the same weight.
 * Hovering pauses it; people who ask for reduced motion get a still row they can scroll.
 */
export function AsSeenWith() {
  const { go } = useMode();
  const logos = (copy: boolean) =>
    AS_SEEN_WITH.map((b) => (
      <li key={`${copy ? "c" : "a"}-${b.src}`} className="rk-seen__item">
        <span
          className="rk-seen__logo2"
          data-mono={b.mono || undefined}
          style={{ width: `calc(var(--seen-size) * ${Math.sqrt(b.ratio).toFixed(3)})`, height: `calc(var(--seen-size) / ${Math.sqrt(b.ratio).toFixed(3)})` }}
        >
          <img src={b.src} alt={copy ? "" : b.name} decoding="async" />
        </span>
      </li>
    ));
  return (
    <section className="rk-seen" aria-labelledby="seen-title">
      <div className="rk-wrap rk-seen__head">
        <h2 id="seen-title">As seen with</h2>
        <p>Some of the businesses we&apos;ve worked with.</p>
      </div>
      <div className="rk-seen__marquee">
        <div className="rk-seen__belt" style={{ animationDuration: `${AS_SEEN_WITH.length * SECONDS_PER_LOGO}s` }}>
          <ul className="rk-seen__row">{logos(false)}</ul>
          {/* second copy so the strip loops without a gap; hidden from screen readers */}
          <ul className="rk-seen__row" aria-hidden>
            {logos(true)}
          </ul>
        </div>
      </div>
      <div className="rk-wrap rk-seen__cta">
        <span>Want to be next?</span>
        <button type="button" className="rk-btn rk-btn--gold" onClick={() => go("buy-regking")}>
          Find your plate <ArrowRight />
        </button>
      </div>
    </section>
  );
}
