"use client";

import { useId, useState, type ReactNode } from "react";
import { formatGBP } from "@/lib/brand";
import { CHAR_LIMITS, FORMAT_GUIDE, PRICE_STEPS, activeCount, emptyFilters, type Filters } from "@/lib/filters";
import { STYLE_ORDER, type PlateStyle } from "@/lib/search";

const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: THIS_YEAR - 1962 }, (_, i) => THIS_YEAR - i);
export const money = (n: number) => formatGBP(n, true);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

/** "What do the formats mean?": every format in plain English, with an example plate. */
export function FormatGuide({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="rk-fguide" data-tone={tone}>
      <button type="button" className="rk-fguide__btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        What do the formats mean?
        <ChevronIcon />
      </button>
      {open && (
        <div className="rk-fguide__list" id={id}>
          <p className="rk-fguide__intro">
            Every UK plate follows one of these patterns. The pattern tells you how old a vehicle has to be to carry it, because a plate can&apos;t make a vehicle look newer than it
            is.
          </p>
          {STYLE_ORDER.map((st) => {
            const g = FORMAT_GUIDE[st];
            return (
              <div key={st} className="rk-fguide__item">
                <span className="rk-fguide__plate" aria-hidden>
                  {g.example}
                </span>
                <div>
                  <b>
                    {g.name} <span>{g.years}</span>
                  </b>
                  <p>{g.how}</p>
                  <p className="rk-fguide__fits">{g.fits}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="rk-ffield">
      <span>{label}</span>
      <span className="rk-ffield__sel">
        {children}
        <ChevronIcon />
      </span>
    </label>
  );
}

/** Price from / to. */
export function PriceFields({ f, set }: { f: Filters; set: (p: Partial<Filters>) => void }) {
  return (
    <div className="rk-fprice">
      <Field label="Min price">
        <select value={f.min} data-f="min" onChange={(e) => set({ min: Number(e.target.value) })}>
          <option value={0}>No min</option>
          {PRICE_STEPS.filter((p) => !f.max || p < f.max).map((p) => (
            <option key={p} value={p}>
              {money(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Max price">
        <select value={f.max} data-f="max" onChange={(e) => set({ max: Number(e.target.value) })}>
          <option value={0}>No max</option>
          {PRICE_STEPS.filter((p) => p > f.min).map((p) => (
            <option key={p} value={p}>
              {money(p)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

export function YearField({ f, set, label = "My vehicle was first registered in" }: { f: Filters; set: (p: Partial<Filters>) => void; label?: string }) {
  return (
    <Field label={label}>
      <select value={f.year} data-f="year" onChange={(e) => set({ year: Number(e.target.value) })}>
        <option value={0}>Any year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * The dropdown under the hero search (Buy). Simple one-of-each choices; the results sidebar
 * allows several at once. "Show plates" works with or without a search.
 */
export function FilterDropdown({ f, set, count, onShow }: { f: Filters; set: (p: Partial<Filters>) => void; count: number; onShow: () => void }) {
  const [open, setOpen] = useState(false);
  const n = activeCount(f);
  const style = f.styles.length === 1 ? f.styles[0] : f.styles.length ? "several" : "all";
  return (
    <div className="rk-fdrop" data-open={open || undefined} data-after>
      <button type="button" className="rk-fdrop__btn" aria-expanded={open} aria-controls="rk-fdrop" onClick={() => setOpen((o) => !o)}>
        <SlidersIcon />
        Filter plates
        {n > 0 && <i>{n}</i>}
        <ChevronIcon />
      </button>
      {open && (
        <div className="rk-fdrop__panel" id="rk-fdrop">
          {/* Plate style: one row of choices across the top */}
          <div className="rk-fdrop__styles" role="radiogroup" aria-label="Plate style">
            <span className="rk-fdrop__lbl">Plate style</span>
            <div className="rk-fdrop__chips">
              {(["all", ...STYLE_ORDER] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={style === st}
                  data-f="style"
                  data-style={st}
                  onClick={() => set({ styles: st === "all" ? [] : [st as PlateStyle] })}
                >
                  {st === "all" ? "All formats" : FORMAT_GUIDE[st].name}
                </button>
              ))}
            </div>
          </div>
          <div className="rk-fdrop__grid">
            <PriceFields f={f} set={set} />
            <YearField f={f} set={set} label="My vehicle's year" />
            <Field label="Characters">
              <select value={f.chars} data-f="chars" onChange={(e) => set({ chars: Number(e.target.value) })}>
                <option value={0}>Any length</option>
                {CHAR_LIMITS.map((c) => (
                  <option key={c} value={c}>
                    Up to {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <FormatGuide />
          <div className="rk-fdrop__foot">
            {n > 0 && (
              <button type="button" className="rk-fdrop__reset" onClick={() => set(emptyFilters())}>
                Clear filters
              </button>
            )}
            <button type="button" className="rk-btn rk-btn--gold rk-fdrop__show" onClick={onShow} disabled={count === 0}>
              {count === 0 ? "No plates match" : `Show ${count} plate${count === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
