"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Auto-advancing, swipeable carousel.
 * - Scroll-snap track, so it swipes natively on phones.
 * - Moves on by one card every `interval` ms; loops back to the start.
 * - Pauses while hovered, touched, focused, off-screen, or with reduced motion.
 * - Arrow buttons and dots (one per reachable position).
 */
export function Carousel({
  children,
  label,
  interval = 4000,
  className = "",
  tone = "light",
}: {
  children: ReactNode;
  label: string;
  interval?: number;
  className?: string;
  tone?: "light" | "dark";
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [positions, setPositions] = useState(1);
  const paused = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);
  const visible = useRef(true);
  const count = Children.count(children);

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 1;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const s = step();
    const max = Math.max(0, Math.round((el.scrollWidth - el.clientWidth) / s));
    setPositions(max + 1);
    setIndex(Math.min(max, Math.round(el.scrollLeft / s)));
  }, [step]);

  const goTo = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const max = Math.max(0, Math.round((el.scrollWidth - el.clientWidth) / step()));
      const next = i > max ? 0 : i < 0 ? max : i;
      el.scrollTo({ left: next * step(), behavior: "smooth" });
    },
    [step],
  );

  /** User touched it: pause now, resume a little after they stop. */
  const hold = useCallback((ms = 6000) => {
    paused.current = true;
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => (paused.current = false), ms);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const onScroll = () => setIndex(Math.round(el.scrollLeft / step()));
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver((e) => (visible.current = e[0]?.isIntersecting ?? true), { threshold: 0.3 });
    io.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      io.disconnect();
    };
  }, [measure, step, count]);

  useEffect(() => {
    // interval 0 = no auto-advance (moved only by the customer)
    if (interval <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (paused.current || !visible.current || document.hidden || positions < 2) return;
      goTo(index + 1);
    }, interval);
    return () => window.clearInterval(id);
  }, [index, positions, interval, goTo]);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  return (
    <div
      className={`rk-carousel rk-carousel--${tone} ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => {
        paused.current = true;
        window.clearTimeout(resumeTimer.current);
      }}
      onMouseLeave={() => hold(1500)}
      onPointerDown={() => hold()}
      onFocus={() => hold()}
      onWheel={() => hold()}
    >
      <div className="rk-carousel__track" ref={track}>
        {Children.map(children, (child, i) => (
          <div className="rk-carousel__slide" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
            {child}
          </div>
        ))}
      </div>

      {positions > 1 && (
        <div className="rk-carousel__nav">
          <div className="rk-carousel__dots" role="tablist" aria-label="Choose slide">
            {Array.from({ length: positions }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => {
                  hold();
                  goTo(i);
                }}
              />
            ))}
          </div>
          <div className="rk-carousel__arrows">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => {
                hold();
                goTo(index - 1);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => {
                hold();
                goTo(index + 1);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
