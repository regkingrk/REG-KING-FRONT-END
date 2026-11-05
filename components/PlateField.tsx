"use client";

import { useEffect, useRef } from "react";
import { STOCK } from "@/lib/search";
import { useMode } from "./ModeProvider";

/**
 * Hero background: registrations drifting slowly in three layers of depth.
 * Every few seconds one plate shuffles its characters and settles on a real
 * REG KING plate, like a search landing. Calm by design: no mouse tracking,
 * pauses off screen and in hidden tabs, one still frame with reduced motion.
 */

const REAL = STOCK.filter((s) => !s.sample).map((s) => s.reg);
const LETTERS = "ABCDEFGHJKLMNOPRSTUVWXYZ";
const DIGITS = "0123456789";
const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
const AGES = ["12", "15", "18", "21", "24", "25", "62", "66", "70", "73", "74"];

/** A random reg in one of the real UK formats. */
function randomReg() {
  const r = Math.random();
  if (r < 0.45) return `${pick(LETTERS)}${pick(LETTERS)}${AGES[Math.floor(Math.random() * AGES.length)]} ${pick(LETTERS)}${pick(LETTERS)}${pick(LETTERS)}`;
  if (r < 0.65) return `${pick(LETTERS)}${1 + Math.floor(Math.random() * 99)} ${pick(LETTERS)}${pick(LETTERS)}${pick(LETTERS)}`;
  if (r < 0.8) return `${pick(LETTERS)}${pick(LETTERS)}${pick(LETTERS)} ${1 + Math.floor(Math.random() * 99)}${pick(LETTERS)}`;
  return Math.random() < 0.5 ? `${pick(LETTERS)}${pick(LETTERS)} ${1 + Math.floor(Math.random() * 999)}` : `${1 + Math.floor(Math.random() * 99)} ${pick(LETTERS)}${pick(LETTERS)}`;
}

type Plate = {
  x: number; // 0..1 across the hero
  y: number; // px from the top of the field
  depth: 0 | 1 | 2; // 0 far, 2 near
  text: string;
  target: string | null; // when set, characters shuffle and settle on this
  settle: number; // 0..1 progress of the shuffle
};

const LAYERS = [
  { size: 18, speed: 5, alpha: 0.35, parallax: 0.1 },
  { size: 30, speed: 9, alpha: 0.6, parallax: 0.22 },
  { size: 48, speed: 15, alpha: 1, parallax: 0.38 },
];

const TONES: Record<string, { ink: string; base: number }> = {
  buy: { ink: "22, 21, 20", base: 0.085 },
  sell: { ink: "22, 21, 20", base: 0.06 },
  build: { ink: "255, 194, 0", base: 0.13 },
};

export function PlateField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useMode();
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.parentElement;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font =
      getComputedStyle(document.documentElement).getPropertyValue("--rk-plate-font").trim() || '"Barlow Condensed", "Arial Narrow", sans-serif';
    let w = 0;
    let h = 0;
    let dpr = 1;
    let plates: Plate[] = [];
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let nextSettle = last + 2500;

    /** An x position (0..1) clear of other plates near this height, so plates don't pile up. */
    const clearX = (y: number) => {
      let best = Math.random();
      let bestGap = -1;
      for (let t = 0; t < 10; t++) {
        const x = Math.random();
        let gap = Infinity;
        for (const o of plates) {
          if (Math.abs(o.y - y) > 70) continue;
          gap = Math.min(gap, Math.abs(o.x - x) * w);
        }
        if (gap > bestGap) {
          best = x;
          bestGap = gap;
        }
        if (gap > 240) break;
      }
      return best;
    };

    const seed = () => {
      // Density follows the area, so phones get fewer plates than desktops.
      const count = Math.round(Math.min(30, Math.max(10, (w * h) / 42000)));
      plates = [];
      for (let i = 0; i < count; i++) {
        // Spread down the height evenly (with a little jitter) rather than at random.
        const y = ((i + Math.random() * 0.8) / count) * (h + 200) - 100;
        plates.push({ x: clearX(y), y, depth: (i % 3) as 0 | 1 | 2, text: randomReg(), target: null, settle: 1 });
      }
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (!plates.length) seed();
    };

    /** Keep the middle column calmer so the search stays easy to read. */
    const centreFade = (px: number) => {
      const d = Math.abs(px - w / 2) / (w / 2);
      return 0.12 + 0.88 * Math.min(1, Math.max(0, (d - 0.15) * 1.6));
    };

    const draw = (dt: number) => {
      const tone = TONES[modeRef.current] ?? TONES.buy;
      const scroll = window.scrollY;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const layer of [0, 1, 2] as const) {
        const L = LAYERS[layer];
        ctx.font = `600 ${L.size}px ${font}`;
        for (const p of plates) {
          if (p.depth !== layer) continue;
          p.y -= (L.speed * dt) / 1000;
          if (p.y < -60) {
            p.y = h + 60;
            p.x = clearX(p.y);
            p.text = randomReg();
            p.target = null;
            p.settle = 1;
          }
          let text = p.text;
          let boost = 0;
          if (p.target) {
            p.settle = Math.min(1, p.settle + dt / 1400);
            const fixed = Math.floor(p.settle * p.target.length);
            text = p.target
              .split("")
              .map((c, i) => (i < fixed || c === " " ? c : /\d/.test(c) ? pick(DIGITS) : pick(LETTERS)))
              .join("");
            boost = 1;
            if (p.settle >= 1) {
              p.text = p.target;
              p.target = null;
            }
          }
          const px = p.x * w;
          const py = p.y + scroll * L.parallax;
          if (py < -60 || py > h + 60) continue;
          const a = tone.base * L.alpha * centreFade(px) * (1 + boost * 1.6);
          // The plate outline, then its characters.
          const tw = ctx.measureText(text).width;
          const pad = L.size * 0.32;
          ctx.globalAlpha = a * 0.55;
          ctx.strokeStyle = `rgb(${tone.ink})`;
          ctx.lineWidth = Math.max(1, L.size / 26);
          const bw = tw + pad * 2;
          const bh = L.size * 1.18;
          const rr = L.size * 0.16;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(px - bw / 2, py - bh / 2, bw, bh, rr);
          else ctx.rect(px - bw / 2, py - bh / 2, bw, bh);
          ctx.stroke();
          ctx.globalAlpha = a;
          ctx.fillStyle = `rgb(${tone.ink})`;
          ctx.fillText(text, px, py + L.size * 0.04);
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (now > nextSettle) {
        // A near plate in view finds a real REG KING registration.
        const candidates = plates.filter((p) => p.depth > 0 && !p.target && p.y > h * 0.15 && p.y < h * 0.85);
        const p = candidates[Math.floor(Math.random() * candidates.length)];
        if (p && REAL.length) {
          p.target = REAL[Math.floor(Math.random() * REAL.length)];
          p.settle = 0;
        }
        nextSettle = now + 3200 + Math.random() * 1800;
      }
      draw(dt);
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced || !raf) draw(0);
    });
    ro.observe(hero);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    io.observe(hero);
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);
    const repaint = () => draw(0);
    canvas.addEventListener("rk-repaint", repaint);

    const begin = () => {
      draw(0);
      start();
    };
    if (document.fonts?.ready) document.fonts.ready.then(begin);
    else begin();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("rk-repaint", repaint);
    };
  }, []);

  // Repaint once on tab change when motion is reduced (no running loop to pick up the new tone).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvasRef.current?.dispatchEvent(new Event("rk-repaint"));
    }
  }, [mode]);

  return <canvas ref={canvasRef} className="rk-field" aria-hidden />;
}
