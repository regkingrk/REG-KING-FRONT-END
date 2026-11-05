"use client";

import { useEffect, useRef, useState } from "react";
import { useMode } from "./ModeProvider";

/**
 * Buy tab: REG KING's own footage behind the search (filmed for us, no sound).
 * Phones get the upright cut, wider screens a landscape crop of the same film.
 * It only plays on Buy, and people who ask for reduced motion see a still frame.
 */
const FILM = {
  wide: { src: "media/buy-wide.mp4", poster: "media/buy-wide.jpg" },
  tall: { src: "media/buy-tall.mp4", poster: "media/buy-tall.jpg" },
};

/**
 * Make tab: plates being built at HQ. One film fills the background and it moves on to the next
 * clip every few seconds, so the scene keeps changing. Each clip carries on from where it left off.
 * It only plays on Make; reduced motion shows a still frame.
 */
const MAKE_FILMS = ["a", "b", "c"].map((k) => ({ src: `media/make-${k}.mp4`, poster: `media/make-${k}.jpg` }));

/** Sell tab: a customer's car at REG KING HQ, three moments of the same film taking turns. */
const SELL_FILMS = ["a", "b", "c"].map((k) => ({ src: `media/sell-${k}.mp4`, poster: `media/sell-${k}.jpg` }));

/** How long each clip shows before the next one fades in. */
const CHANGE_MS = 6000;

/** One full-screen background film that cycles through its clips. Plays only on its own tab. */
function ColumnFilm({ films, on, className }: { films: { src: string; poster: string }[]; on: string; className: string }) {
  const { mode } = useMode();
  const box = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  const [at, setAt] = useState(0);
  const active = mode === on && !still;
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pick = () => setStill(calm.matches);
    pick();
    calm.addEventListener("change", pick);
    return () => calm.removeEventListener("change", pick);
  }, []);
  // Move to the next clip every few seconds while the tab is showing.
  useEffect(() => {
    if (!active || films.length < 2) return;
    const t = window.setInterval(() => setAt((i) => (i + 1) % films.length), CHANGE_MS);
    return () => window.clearInterval(t);
  }, [active, films.length]);
  // Only the clip on screen plays.
  useEffect(() => {
    box.current?.querySelectorAll("video").forEach((v, i) => {
      if (active && i === at) v.play().catch(() => {});
      else v.pause();
    });
  }, [active, at]);
  return (
    <div className={className} aria-hidden>
      <div className="rk-hero__make-in" ref={box}>
        {films.map((f, i) =>
          still ? (
            i === 0 && <img key={f.src} src={f.poster} alt="" data-on="" />
          ) : (
            <video key={f.src} src={f.src} poster={f.poster} muted loop playsInline preload={i === 0 ? "auto" : "metadata"} data-on={i === at ? "" : undefined} />
          ),
        )}
      </div>
    </div>
  );
}

export function MakeFilm() {
  return <ColumnFilm films={MAKE_FILMS} on="build" className="rk-hero__make" />;
}

export function SellFilm() {
  return <ColumnFilm films={SELL_FILMS} on="sell" className="rk-hero__make rk-hero__sellfilm" />;
}

export function HeroVideo() {
  const { mode } = useMode();
  const ref = useRef<HTMLVideoElement>(null);
  const [cut, setCut] = useState<"wide" | "tall" | null>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const tall = window.matchMedia("(max-aspect-ratio: 4/5)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pick = () => {
      setCut(tall.matches ? "tall" : "wide");
      setStill(calm.matches);
    };
    pick();
    tall.addEventListener("change", pick);
    calm.addEventListener("change", pick);
    return () => {
      tall.removeEventListener("change", pick);
      calm.removeEventListener("change", pick);
    };
  }, []);

  // Play on Buy only; pause behind Sell and Make.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (mode === "buy" && !still) v.play().catch(() => {});
    else v.pause();
  }, [mode, still, cut]);

  if (!cut) return null;
  const f = FILM[cut];
  return (
    <div className="rk-hero__film" aria-hidden>
      {still ? (
        <img src={f.poster} alt="" />
      ) : (
        <video key={cut} ref={ref} src={f.src} poster={f.poster} muted loop playsInline autoPlay preload="auto" />
      )}
    </div>
  );
}
