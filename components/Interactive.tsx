"use client";

import { useEffect, useState, type FormEvent } from "react";
import { auctionLots, formatGBP, modeUrl, normaliseReg } from "@/lib/brand";
import { navigate } from "@/lib/nav";
import { Carousel } from "./Carousel";
import { ArrowRight, ClockIcon, GavelIcon } from "./Icons";

/** Compact "list my plate" form inside the Sell door. */
export function SellForm() {
  const [reg, setReg] = useState("");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (reg.trim()) navigate(modeUrl("sell", reg), "sell");
  };
  return (
    <form className="rk-sellform" id="rk-sellform" onSubmit={onSubmit}>
      <label htmlFor="rk-sell-reg" className="rk-visually-hidden">
        Your registration
      </label>
      <input
        id="rk-sell-reg"
        className="rk-sellform__plate"
        placeholder="YOUR REG"
        value={reg}
        onChange={(e) => setReg(normaliseReg(e.target.value))}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={8}
      />
      <button type="submit" className="rk-btn rk-btn--ink">
        List my plate <ArrowRight />
      </button>
    </form>
  );
}

export const formatLeft = (ms: number) => {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

/** Live auction lots with countdowns (from `auctionLots`). */
export function AuctionLots() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Carousel label="Live auctions" tone="dark" className="rk-carousel--lots" interval={5000}>
      {auctionLots.map((l) => {
        const ends = new Date(l.endsAt).getTime();
        const left = now === null ? null : ends - now;
        const soon = left !== null && left < 60 * 60_000;
        return (
          <article key={l.reg} className="rk-lot">
            <span className={`rk-lot__left${soon ? " is-soon" : ""}`} data-left>
              <ClockIcon /> <span>{left === null ? "" : formatLeft(left)}</span>
            </span>
            <span className="rk-lot__plate">{l.reg}</span>
            <div className="rk-lot__row">
              <div>
                <span className="rk-lot__label">Current bid</span>
                <b className="rk-lot__bid">{formatGBP(l.bid, true)}</b>
              </div>
              <span className="rk-lot__bids">
                {l.bids} {l.bids === 1 ? "bid" : "bids"}
              </span>
            </div>
            <a className="rk-btn rk-btn--gold" href="#auctions">
              <GavelIcon /> Place a bid
            </a>
          </article>
        );
      })}
    </Carousel>
  );
}
