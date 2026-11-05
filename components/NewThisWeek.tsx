"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatGBP, routes } from "@/lib/brand";
import { newThisWeek } from "@/lib/newThisWeek";
import { STYLE_INFO, earliest, styleOf } from "@/lib/search";
import { ArrowRight } from "./Icons";
import { useMode } from "./ModeProvider";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Fri 23 Oct" */
export const day = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
/** "17 to 24 Oct" for a set of dates */
export const dateRange = (from: string, to: string) => `${day(from).split(" ")[1]} to ${day(to).split(" ").slice(1).join(" ")}`;
const money = (n: number) => formatGBP(n, Number.isInteger(n));
/** Seconds for one plate to pass: slow enough to read and tap. */
const SECONDS_PER_PLATE = 4.5;
/** A row needs at least this many plates to loop without a gap on a wide screen. */
const MIN_PER_ROW = 8;

export type ReelPlate = { reg: string; handle: string; price: number; added: string; ours?: boolean };

/** Deal the plates into rows, newest first along each row; short rows repeat to fill the loop. */
function rowsOf(plates: ReelPlate[], n: number) {
  const rows: ReelPlate[][] = Array.from({ length: n }, () => []);
  plates.forEach((p, i) => rows[i % n].push(p));
  return rows.map((r) => {
    const list = [...r];
    while (r.length && list.length < MIN_PER_ROW) list.push(...r);
    // an even count keeps front and rear alternating across the loop's seam
    if (list.length % 2 && r.length > 1) list.push(r[list.length % r.length]);
    return { list, unique: r.length };
  });
}

/**
 * Plates in rows that drift in opposite directions. Hovering (or a panel being open) pauses them;
 * tapping a plate opens its details. Used for New this week on Buy, and on Exclusive plates.
 */
export function PlateReel({
  plates,
  kicker,
  title,
  titleId,
  id,
  rows: maxRows = 3,
  browse,
  bare = false,
}: {
  plates: ReelPlate[];
  kicker: string;
  title: ReactNode;
  titleId: string;
  id?: string;
  rows?: number;
  browse?: { label: string; hash: string };
  /** Just the title: no kicker or hint line. */
  bare?: boolean;
}) {
  const { go } = useMode();
  const [picked, setPicked] = useState<ReelPlate | null>(null);
  const [rowCount, setRowCount] = useState(3);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const set = () => setRowCount(mq.matches ? 2 : 3);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    if (!picked) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (p: ReelPlate, el: HTMLElement) => {
    lastFocus.current = el;
    setPicked(p);
  };
  const close = () => {
    setPicked(null);
    requestAnimationFrame(() => lastFocus.current?.focus());
  };

  // Never more rows than there are plates to fill them.
  const n = Math.max(1, Math.min(rowCount, maxRows, Math.ceil(plates.length / 4)));
  const fits = picked ? earliest(picked.reg) : null;

  return (
    <section className="rk-new" id={id} data-bare={bare || undefined} aria-labelledby={titleId} data-paused={picked ? "" : undefined}>
      <div className="rk-wrap rk-new__head">
        <div>
          {!bare && kicker && <p className="rk-new__kicker">{kicker}</p>}
          <h2 id={titleId}>{title}</h2>
        </div>
        {!bare && <p className="rk-new__hint">Pick a plate to see the details.</p>}
      </div>

      <div className="rk-new__rows">
        {rowsOf(plates, n).map(({ list: row, unique }, r) => (
          <div key={`${n}-${r}`} className="rk-new__row" data-dir={r % 2 ? "right" : "left"}>
            <ul className="rk-new__track" style={{ animationDuration: `${row.length * SECONDS_PER_PLATE}s` }}>
              {/* The row twice over, so the loop has no seam. Repeats are hidden from screen readers. */}
              {[0, 1].map((copy) =>
                row.map((p, j) => {
                  const repeat = copy === 1 || j >= unique;
                  return (
                    <li key={`${copy}-${j}-${p.handle}`} aria-hidden={repeat || undefined}>
                      <button
                        type="button"
                        className="rk-new__chip"
                        tabIndex={repeat ? -1 : undefined}
                        aria-haspopup="dialog"
                        aria-pressed={picked?.handle === p.handle}
                        data-plate={p.handle}
                        data-side={(j + r) % 2 ? "rear" : "front"}
                        onClick={(e) => open(p, e.currentTarget)}
                      >
                        <span className="rk-new__plate">{p.reg}</span>
                        <span className="rk-new__price">{money(p.price)}</span>
                      </button>
                    </li>
                  );
                }),
              )}
            </ul>
          </div>
        ))}
      </div>

      {browse && (
        <div className="rk-wrap rk-new__acts">
          <a
            className="rk-new__all"
            href={`#${browse.hash}`}
            onClick={(e) => {
              e.preventDefault();
              go(browse.hash);
            }}
          >
            {browse.label} <ArrowRight />
          </a>
        </div>
      )}

      {picked &&
        createPortal(
          <div className="rk-new__scrim" onClick={close}>
            <div className="rk-new__card" role="dialog" aria-modal="true" aria-labelledby="new-card-reg" onClick={(e) => e.stopPropagation()}>
              <button ref={closeRef} type="button" className="rk-new__close" onClick={close} aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
              <p className="rk-new__added">Added {day(picked.added)}</p>
              <span className="rk-new__big" id="new-card-reg">
                {picked.reg}
              </span>
              <p className="rk-new__cprice">{money(picked.price)}</p>
              <dl className="rk-new__facts">
                <div>
                  <dt>Format</dt>
                  <dd>{STYLE_INFO[styleOf(picked.reg)].name}</dd>
                </div>
                <div>
                  <dt>Fits vehicles from</dt>
                  <dd>{fits ? fits.label : "Any age"}</dd>
                </div>
                <div>
                  <dt>Seller</dt>
                  <dd>{picked.ours === false ? "Its owner, through REG KING" : "REG KING"}</dd>
                </div>
              </dl>
              <div className="rk-new__cacts">
                <a className="rk-new__buy" href={`${routes.buy}/products/${picked.handle}`}>
                  Buy this plate <ArrowRight />
                </a>
                <button
                  type="button"
                  className="rk-new__view"
                  onClick={() => {
                    const h = picked.handle;
                    setPicked(null);
                    go(`plate-${h}`);
                  }}
                >
                  Full details
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

/** Buy home: the plates added to the store in the last seven days. */
export function NewThisWeek() {
  return (
    <PlateReel
      id="rk-exclusive"
      titleId="new-title"
      plates={newThisWeek}
      kicker=""
      title="New this week"
      rows={2}
      browse={{ label: "Browse every plate", hash: "buy-regking" }}
    />
  );
}
