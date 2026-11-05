"use client";

import { useRef } from "react";
import { searchModes } from "@/lib/brand";
import { useMode } from "./ModeProvider";
import { PlateSearch } from "./PlateSearch";
import { HeroVideo, MakeFilm, SellFilm } from "./HeroVideo";
import { HeroProof } from "./HeroProof";

/** The homepage hero. It shows straight away: no loading intro. */
export function HeroIntro() {
  const plateRef = useRef<HTMLDivElement>(null);
  const { focused, mode, info, acc, plate, account, vault } = useMode();

  return (
    <section
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
          {searchModes.find((m) => m.key === mode)?.lead ?? searchModes[0].lead}
        </p>

        <PlateSearch ref={plateRef} />
      </div>
      {/* Reviews and socials: one line along the bottom of the yellow, away from the search */}
      {!focused && mode !== "build" && <HeroProof />}
    </section>
  );
}
