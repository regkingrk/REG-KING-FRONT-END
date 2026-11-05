"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exclusivePlates, formatGBP, platesForSale } from "@/lib/brand";
import { STYLE_INFO, earliest, styleOf } from "@/lib/search";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";

type Plate = (typeof platesForSale)[number];

const DRIFT = 26; // px per second while idle
const SPIN_MS = 1700;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * One row of the machine. Plates drift sideways (`dir` 1 = left, -1 = right) until the lever is
 * pulled; then the row spins and stops with plate `target` under the marker in the middle.
 */
function Row({
  plates,
  dir,
  paused,
  spin,
  pick,
  onPick,
  onLanded,
}: {
  plates: Plate[];
  dir: 1 | -1;
  paused: boolean;
  spin: { id: number; target: number } | null;
  pick: number | null;
  onPick: (i: number) => void;
  onLanded: (i: number) => void;
}) {
  const win = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const [hover, setHover] = useState(false);
  const anim = useRef<{ from: number; to: number; start: number; target: number } | null>(null);
  const reduce = useRef(false);
  const ready = useRef(false);

  const metrics = () => {
    const first = track.current?.children[0] as HTMLElement | undefined;
    const second = track.current?.children[1] as HTMLElement | undefined;
    const w = first?.offsetWidth ?? 200;
    const step = second && first ? second.offsetLeft - first.offsetLeft : w + 16;
    return { w, step, L: step * plates.length, cw: win.current?.clientWidth ?? 0 };
  };
  const paint = () => {
    const { L } = metrics();
    if (track.current && L) track.current.style.transform = `translate3d(${-(mod(offset.current, L) + L)}px,0,0)`;
  };
  /** Offset at which plate `k` sits centred under the marker. */
  const aligned = (k: number) => {
    const { w, step, L, cw } = metrics();
    return mod(k * step + w / 2 - cw / 2, L);
  };

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ready.current) {
      ready.current = true;
      offset.current = aligned(0);
    }
    paint();
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      const a = anim.current;
      if (a) {
        const t = Math.min(1, (now - a.start) / SPIN_MS);
        offset.current = a.from + (a.to - a.from) * easeOut(t);
        if (t >= 1) {
          anim.current = null;
          onLanded(a.target);
        }
        paint();
      } else if (!paused && !hover && !reduce.current) {
        offset.current += dir * DRIFT * dt;
        paint();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => paint();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [paused, hover]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lever pulled: spin a few full turns and land on the target plate.
  useEffect(() => {
    if (!spin) return;
    const { L } = metrics();
    const from = offset.current;
    const m = aligned(spin.target);
    const base = from - mod(from, L) + m;
    let to = dir === 1 ? base + 3 * L : base - 3 * L;
    if (dir === 1 && to < from + 2 * L) to += L;
    if (dir === -1 && to > from - 2 * L) to -= L;
    if (reduce.current) {
      offset.current = to;
      paint();
      onLanded(spin.target);
      return;
    }
    anim.current = { from, to, start: performance.now(), target: spin.target };
  }, [spin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clicking a plate brings it to the marker.
  const choose = (i: number) => {
    const { L } = metrics();
    const from = offset.current;
    let to = from - mod(from, L) + aligned(i);
    if (to - from > L / 2) to -= L;
    if (from - to > L / 2) to += L;
    anim.current = { from, to, start: performance.now() - SPIN_MS * 0.55, target: i };
    onPick(i);
  };

  const loop = [...plates, ...plates, ...plates];
  return (
    <div className="rk-slot__row" ref={win} onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)} onPointerLeave={() => setHover(false)}>
      <div className="rk-slot__track" ref={track}>
        {loop.map((p, n) => {
          const i = n % plates.length;
          const copy = n < plates.length || n >= plates.length * 2;
          return (
            <button
              key={n}
              type="button"
              className="rk-slot__plate"
              data-on={pick === i || undefined}
              tabIndex={copy ? -1 : 0}
              aria-hidden={copy || undefined}
              aria-label={copy ? undefined : `${p.reg}, ${formatGBP(p.price, Number.isInteger(p.price))}`}
              onClick={() => choose(i)}
            >
              {p.reg}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pick({ p }: { p: Plate }) {
  const { go } = useMode();
  const fits = earliest(p.reg);
  return (
    <a
      key={p.reg}
      className="rk-slot__pick"
      href={`#plate-${p.handle}`}
      onClick={(e) => {
        e.preventDefault();
        go(`plate-${p.handle}`);
      }}
    >
      <span className="rk-slot__pickreg">{p.reg}</span>
      <span className="rk-slot__pickprice">{formatGBP(p.price, Number.isInteger(p.price))}</span>
      <span className="rk-slot__pickfacts">
        {STYLE_INFO[styleOf(p.reg)].name} · {fits ? `vehicles from ${fits.label}` : "fits any age"}
      </span>
      <span className="rk-slot__pickgo">
        View <ArrowRight />
      </span>
    </a>
  );
}

/**
 * Featured plates as a slot machine: two rows drifting opposite ways, and a lever. Pull it and
 * both rows spin and land on a plate each; those two show underneath with their details.
 */
export function FeaturedReel() {
  const { go } = useMode();
  const top = exclusivePlates.map((r) => platesForSale.find((p) => p.reg === r)).filter(Boolean) as Plate[];
  const bottom = [...platesForSale].reverse();
  const [spin, setSpin] = useState<{ id: number; a: number; b: number } | null>(null);
  const [spinning, setSpinning] = useState(0);
  const [picks, setPicks] = useState<[number | null, number | null]>([null, null]);
  const [pulled, setPulled] = useState(false);
  const [visible, setVisible] = useState(true);
  const sec = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sec.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pull = useCallback(() => {
    if (spinning) return;
    const rnd = (n: number, not: number | null) => {
      let k = Math.floor(Math.random() * n);
      if (n > 1 && k === not) k = (k + 1) % n;
      return k;
    };
    const a = rnd(top.length, picks[0]);
    const b = rnd(bottom.length, picks[1]);
    setPulled(true);
    setTimeout(() => setPulled(false), 380);
    setSpinning(2);
    setPicks([null, null]);
    setSpin({ id: Date.now(), a, b });
  }, [spinning, picks, top.length, bottom.length]);

  if (!top.length) return null;
  const stopped = picks[0] !== null || picks[1] !== null;

  return (
    <section className="rk-slot" id="rk-exclusive" aria-labelledby="featured-title" ref={sec}>
      <div className="rk-wrap rk-slot__in">
        <div className="rk-slot__head">
          <h2 id="featured-title">Featured plates</h2>
          <a
            href="#buy-regking"
            onClick={(e) => {
              e.preventDefault();
              go("buy-regking");
            }}
          >
            View all plates
          </a>
        </div>

        <div className="rk-slot__machine">
          <div className="rk-slot__window">
            <span className="rk-slot__marker" aria-hidden />
            <Row
              plates={top}
              dir={1}
              paused={!visible || stopped}
              spin={spin ? { id: spin.id, target: spin.a } : null}
              pick={picks[0]}
              onPick={(i) => setPicks(([, b]) => [i, b])}
              onLanded={(i) => {
                setPicks(([, b]) => [i, b]);
                setSpinning((n) => Math.max(0, n - 1));
              }}
            />
            <Row
              plates={bottom}
              dir={-1}
              paused={!visible || stopped}
              spin={spin ? { id: spin.id, target: spin.b } : null}
              pick={picks[1]}
              onPick={(i) => setPicks(([a]) => [a, i])}
              onLanded={(i) => {
                setPicks(([a]) => [a, i]);
                setSpinning((n) => Math.max(0, n - 1));
              }}
            />
          </div>

          <button type="button" className="rk-slot__lever" data-pulled={pulled || undefined} onClick={pull} disabled={!!spinning} aria-label="Pull the lever to spin for new plates" data-lever>
            <span className="rk-slot__rod" aria-hidden>
              <span className="rk-slot__knob" />
            </span>
            <span className="rk-slot__base" aria-hidden />
            <span className="rk-slot__pull">{spinning ? "Spinning" : "Pull"}</span>
          </button>
        </div>

        <div className="rk-slot__picks" aria-live="polite">
          {picks[0] !== null && <Pick p={top[picks[0]]} />}
          {picks[1] !== null && <Pick p={bottom[picks[1]]} />}
          {!stopped && !spinning && <p className="rk-slot__hint">Pull the lever, or tap a plate, to see the details.</p>}
          {stopped && !spinning && (
            <button type="button" className="rk-slot__reset" onClick={() => setPicks([null, null])}>
              Keep them moving
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
