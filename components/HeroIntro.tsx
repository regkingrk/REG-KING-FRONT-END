"use client";

import { useEffect, useRef, useState } from "react";
import { assets, searchModes, slogan } from "@/lib/brand";
import type { IntroHandle } from "@/lib/intro/createIntro";
import { useMode } from "./ModeProvider";
import { PlateSearch } from "./PlateSearch";
import { HeroVideo, MakeFilm, SellFilm } from "./HeroVideo";
import { HeroProof } from "./HeroProof";

const SEEN_KEY = "rk:intro-seen";

async function exists(url: string) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

export function HeroIntro() {
  const heroRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<IntroHandle | null>(null);
  const [skippable, setSkippable] = useState(false);
  const { focused, mode, info, acc, plate, account, vault, sellTask } = useMode();

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("rk-intro-pending")) return; // returning visitor / reduced motion
    let cancelled = false;
    setSkippable(true);

    const skipOn = (e: Event) => {
      if (e instanceof KeyboardEvent && !["Escape", "Enter", " "].includes(e.key)) return;
      handleRef.current?.skip();
    };
    window.addEventListener("keydown", skipOn);
    window.addEventListener("wheel", skipOn, { passive: true });
    window.addEventListener("touchmove", skipOn, { passive: true });
    overlayRef.current?.addEventListener("pointerdown", skipOn);

    (async () => {
      try {
        const [THREE, { gsap }, { createIntro }, hasCrown] = await Promise.all([
          import("three"),
          import("gsap"),
          import("@/lib/intro/createIntro"),
          exists(assets.crown),
        ]);
        if (cancelled) return;
        // No plate to animate (for example the visitor is already on Make): skip the intro cleanly.
        if (!heroRef.current || !overlayRef.current || !plateRef.current) {
          root.classList.remove("rk-intro-pending");
          setSkippable(false);
          return;
        }
        const hero = heroRef.current;
        const overlay = overlayRef.current;
        const plate = plateRef.current;
        const stamp = plate.querySelector<HTMLElement>(".rk-plate__stamp")!;
        handleRef.current = await createIntro({
          THREE,
          gsap: gsap as never,
          el: {
            overlay,
            backdrop: overlay.querySelector<HTMLElement>(".rk-intro__backdrop")!,
            canvas: overlay.querySelector<HTMLCanvasElement>("canvas")!,
            bars: Array.from(overlay.querySelectorAll<HTMLElement>(".rk-intro__bar")),
            flare: overlay.querySelector<HTMLElement>(".rk-intro__flare")!,
            introSlogan: overlay.querySelector<HTMLElement>(".rk-intro__slogan")!,
            introSloganChars: Array.from(overlay.querySelectorAll<HTMLElement>(".rk-intro__slogan .ch")),
            slot: document.getElementById("rk-header-logo")!,
            heroItems: Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-item]")),
            plate,
            stamp,
            stampLetters: Array.from(stamp.querySelectorAll<HTMLElement>("span")),
            afterItems: Array.from(hero.querySelectorAll<HTMLElement>("[data-after]")),
            chrome: Array.from(document.querySelectorAll<HTMLElement>("[data-intro-chrome]")),
            skipButton: overlay.querySelector<HTMLElement>(".rk-skip"),
          },
          assets: { wordmark: assets.wordmark, crown: hasCrown ? assets.crown : null, markCrop: assets.markCrop },
          onComplete: () => {
            try {
              sessionStorage.setItem(SEEN_KEY, "1");
            } catch {}
            setSkippable(false);
            if (matchMedia("(pointer: fine)").matches) document.getElementById("rk-reg")?.focus({ preventScroll: true });
          },
        });
      } catch (err) {
        console.warn("[REG KING] 3D intro unavailable, showing the page.", err);
        root.classList.remove("rk-intro-pending");
        overlayRef.current?.classList.remove("is-on");
        const slot = document.getElementById("rk-header-logo");
        if (slot) slot.style.visibility = "visible";
        setSkippable(false);
      }
    })();

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      window.removeEventListener("keydown", skipOn);
      window.removeEventListener("wheel", skipOn);
      window.removeEventListener("touchmove", skipOn);
    };
  }, []);

  return (
    <>
      <section
        ref={heroRef}
        className="rk-hero"
        id="rk-hero"
        data-mode="buy"
        data-focused={focused || undefined}
        // Searching or selling: the hero steps aside for the results / sell form. The builder keeps a slim hero.
        hidden={vault || !!info || !!acc || !!plate || !!account || (focused && mode !== "build")}
        aria-labelledby="rk-hero-title"
      >
        <HeroVideo />
        <div className="rk-hero__sell-bg" aria-hidden />
        <div className="rk-hero__build-bg" aria-hidden />
        {/* Make: plates being built at HQ */}
        <MakeFilm />
        {/* Sell: a customer's car at HQ */}
        <SellFilm />
        <div className="rk-hero__inner">
          <h1 id="rk-hero-title" className="rk-hero__title" data-hero-item>
            <span className="rk-nw">
              Helping <span className="rk-hl">crown</span>
            </span>{" "}
            <span className="rk-nw">your car.</span>
          </h1>
          {/* What to do on this tab, right above the plate */}
          <p className="rk-hero__sub" data-hero-item aria-live="polite">
            {mode === "sell" && sellTask === "value" ? "Enter your plate below for a free valuation from our team." : (searchModes.find((m) => m.key === mode)?.lead ?? searchModes[0].lead)}
          </p>

          <PlateSearch ref={plateRef} />
        </div>
        {/* Reviews and socials: one line along the bottom of the yellow, away from the search */}
        {!focused && mode !== "build" && <HeroProof />}
      </section>

      {/* Intro stage (first visit this session only) */}
      <div ref={overlayRef} className="rk-intro" id="rk-intro" aria-hidden={!skippable}>
        <div className="rk-intro__backdrop" />
        <div className="rk-intro__bar rk-intro__bar--top" />
        <div className="rk-intro__bar rk-intro__bar--bottom" />
        <div className="rk-intro__flare" />
        <canvas className="rk-intro__canvas" />
        <p className="rk-intro__slogan" aria-hidden>
          {Array.from(slogan).map((c, i) => (
            <span key={i} className="ch">
              {c}
            </span>
          ))}
        </p>
        <button type="button" className="rk-skip" hidden={!skippable} onClick={() => handleRef.current?.skip()}>
          Skip intro
        </button>
      </div>
    </>
  );
}
