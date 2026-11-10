"use client";

import { useState } from "react";
import { GAP_STEPS, plateGaps, regChars, typedGaps, type BuildConfig } from "@/lib/builder";

/**
 * Show plates: choose the gap between each pair of characters. Tap a gap, then pick how wide it is.
 * Road-legal plates keep the standard spacing, so this only appears on show plates (one-line plates, not bikes).
 */
export function SpacingEditor({ reg, c, onChange }: { reg: string; c: BuildConfig; onChange: (spacing: number[]) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const chars = [...regChars(reg)];
  if (c.legal !== "Show" || c.vehicle === "Bike" || chars.length < 2) return null;
  const typed = typedGaps(reg);
  const gaps = plateGaps(c, reg) ?? typed;
  const custom = gaps.some((g, i) => g !== typed[i]);
  const label = (v: number) => GAP_STEPS.find((x) => x.v === v)?.label ?? `${v}`;
  const pick = sel !== null && sel < gaps.length ? sel : null;
  const setGap = (i: number, v: number) => onChange(gaps.map((g, j) => (j === i ? v : g)));

  return (
    <div className="rk-gaps" data-gaps>
      <div className="rk-gaps__h">
        <span id="rk-gaps-t">Character spacing</span>
        {custom && (
          <button type="button" className="rk-gaps__reset" data-gaps-reset onClick={() => onChange(typed)}>
            Standard spacing
          </button>
        )}
      </div>
      <div className="rk-gaps__row" role="group" aria-labelledby="rk-gaps-t">
        {chars.map((ch, i) => (
          <span key={i} className="rk-gaps__cell">
            <b className="rk-gaps__ch">{ch}</b>
            {i < gaps.length && (
              <button
                type="button"
                className="rk-gaps__gap"
                aria-pressed={pick === i}
                data-gap={i}
                style={{ ["--g" as string]: String(gaps[i]) }}
                aria-label={`Gap between ${ch} and ${chars[i + 1]}: ${label(gaps[i])}. Change`}
                onClick={() => setSel(pick === i ? null : i)}
              >
                <i aria-hidden />
              </button>
            )}
          </span>
        ))}
      </div>
      {pick !== null && (
        <div className="rk-gaps__opts" role="radiogroup" aria-label={`Gap between ${chars[pick]} and ${chars[pick + 1]}`}>
          {GAP_STEPS.map((x) => (
            <button key={x.v} type="button" role="radio" aria-checked={gaps[pick] === x.v} data-gap-step={x.v} onClick={() => setGap(pick, x.v)}>
              {x.label}
            </button>
          ))}
        </div>
      )}
      <p className="rk-gaps__note">{pick === null ? "Tap a gap between two characters to change it. " : ""}Show plates only: road-legal plates must keep the standard spacing.</p>
    </div>
  );
}
