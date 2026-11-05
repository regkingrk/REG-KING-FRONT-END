"use client";

import { useEffect } from "react";
import { useMode } from "./ModeProvider";

/**
 * Scroll animation, kept calm:
 * 1. Sections below the hero rise in as they arrive, their parts one after another (once).
 * 2. On the home view the hero content drifts up and softens as you scroll away from it.
 * Content is only hidden once this script is running, so nothing stays invisible if it fails.
 * Off entirely with prefers-reduced-motion.
 */

/** What reveals inside each section: its heading block and main parts, plus list items. */
const PARTS = [
  ".rk-wrap > *",
  ".rk-steps > li",
  ".rk-finishes > *",
  ".rk-ways > *",
  ".rk-quicklinks a",
  ".rk-footer__grid > *",
].join(",");

/** Interactive areas that should never move under the user (forms, results, the builder). */
const SKIP = ".rk-sellflow, #rk-results, .rk-findit, .rk-refine";

const HERO_DRIFT = false;

export function ScrollMotion() {
  const { mode, focused } = useMode();

  // 1. Reveals
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("rk-reveal");
    const main = document.querySelector("main");
    if (!main) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    const prepare = () => {
      const blocks = [...document.querySelectorAll<HTMLElement>(".rk-tabview > section, .rk-tabview > nav, .rk-footer")].filter(
        (b) => !b.matches(SKIP) && !b.closest(SKIP) && !b.dataset.rvReady,
      );
      for (const block of blocks) {
        block.dataset.rvReady = "1";
        const all = [...block.querySelectorAll<HTMLElement>(PARTS)].filter((el) => !el.closest(SKIP) && !el.querySelector(SKIP));
        // Animate the innermost parts only (a list's items, not the list as well), in order; cap the stagger.
        const parts = all.filter((el) => !all.some((o) => o !== el && el.contains(o)));
        parts.forEach((el, i) => {
          el.setAttribute("data-rv", "");
          el.style.setProperty("--rv-i", String(Math.min(i, 6)));
        });
        const r = block.getBoundingClientRect();
        // Already on screen at load: show without waiting.
        if (r.top < innerHeight * 0.9 && r.bottom > 0) requestAnimationFrame(() => block.classList.add("is-in"));
        else io.observe(block);
      }
    };

    prepare();
    // The tab views re-render their sections: pick up new ones as they appear.
    const mo = new MutationObserver(() => prepare());
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("rk-reveal");
    };
  }, []);

  // 2. Hero drift. Off: it pushed the review badges under the next section and counts as a heavy
  //    scroll effect. Set HERO_DRIFT to true to bring it back.
  useEffect(() => {
    const hero = document.getElementById("rk-hero");
    const inner = hero?.querySelector<HTMLElement>(".rk-hero__inner");
    if (!hero || !inner) return;
    const reset = () => {
      inner.style.removeProperty("transform");
      inner.style.removeProperty("opacity");
    };
    if (!HERO_DRIFT || focused || mode === "build" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reset();
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = hero.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / h));
      if (p <= 0) return reset();
      inner.style.transform = `translate3d(0, ${(p * h * 0.22).toFixed(1)}px, 0) scale(${(1 - p * 0.05).toFixed(4)})`;
      // Only a light fade, late, so buttons never look disabled.
      inner.style.opacity = (1 - Math.max(0, p - 0.45) * 0.5).toFixed(3);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reset();
    };
  }, [mode, focused]);

  return null;
}
