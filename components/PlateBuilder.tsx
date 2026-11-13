"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FITTING,
  KITS,
  KIT_WAS,
  docsReady,
  withDelivery,
  LEGAL_DOCS,
  LEGAL_DOCS_LIST,
  LEGAL_NOTE,
  LEGAL_RULES,
  SHOW_WARNING,
  VEHICLES,
  rearOnly,
  vehicleLabel,
  answerText,
  isAnswered,
  extrasFor,
  toggleExtra,
  buildFits,
  BOTTOM_TEXT_MAX,
  priceLines,
  priceOf,
  STYLES,
  stylePrice,
  extraPrice,
  sizeChargePrice,
  RETAIL,
  type Pricing,
  sizesFor,
  stepsFor,
  stylesFor,
  total,
  withLegal,
  withMatch,
  withQty,
  withVehicle,
  allSizesFor,
  isSplit,
  twoSizes,
  regLength,
  legalLength,
  offersShortest,
  legalFor,
  shortestLegalOf,
  stepTitle,
  type BuildConfig,
  type SizeOption,
  type StepKey,
  plateGaps,
  regChars,
  fromSetPrice,
  customRange,
  customSize,
  customSizeKey,
  offersCustom,
} from "@/lib/builder";
import { formatGBP } from "@/lib/brand";
import { useAccount } from "./AccountProvider";

/** Drawn tick (a text tick character can turn into an emoji on some phones). */
const TickMark = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-0.12em" }}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
import { StyleThumb } from "./StyleThumb";
import { shapePath } from "./AccessoryPreview";
import { RealPhotos } from "./RealPhotos";

/**
 * Show plates, Custom size: the plate drawn to scale in millimetres, with a standard 520mm plate
 * outlined behind it and the length marked underneath. The characters stay their real size, so
 * moving the length only changes the room around them.
 */
function CustomDrawing({ w, hex, flip, reg, gaps, side }: { w: number; hex: boolean; flip: boolean; reg: string; gaps: number[] | null; side: "front" | "rear" }) {
  const VW = 560, H = 111, top = 14;
  const x = (VW - w) / 2, sx = (VW - 520) / 2;
  const fs = 80; // about 79mm characters, as made
  const text = (reg.trim() || "AB12 CDE").toUpperCase();
  const chars = [...regChars(text)];
  const dimY = top + H + 22;
  return (
    <svg className="rk-custom__svg" viewBox={`0 0 ${VW} ${dimY + 24}`} role="img" aria-label={`${w}mm plate, drawn to scale next to a standard 520mm plate`}>
      <path d={shapePath(sx, top, 520, H, 6, false, false)} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="6 5" />
      <path d={shapePath(x, top, w, H, 6, hex, flip)} fill={side === "front" ? "#f6f6f2" : "#f6c900"} stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />
      <text x={VW / 2} y={top + H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontFamily='"RK Plate", "Barlow Condensed", "Arial Narrow", Arial, sans-serif' fontWeight={700} fontSize={fs} fill="#111">
        {gaps
          ? chars.map((ch, i) => (
              <tspan key={i} dx={i > 0 ? (gaps[i - 1] ?? 0) * 0.195 * fs : undefined}>
                {ch}
              </tspan>
            ))
          : text}
      </text>
      <g stroke="currentColor" strokeWidth="1.5">
        <line x1={x} y1={dimY - 8} x2={x} y2={dimY + 8} />
        <line x1={x + w} y1={dimY - 8} x2={x + w} y2={dimY + 8} />
        <line x1={x} y1={dimY} x2={x + w} y2={dimY} />
      </g>
      <text x={VW / 2} y={dimY + 21} textAnchor="middle" fontSize="17" fontWeight={700} fill="currentColor">
        {w}mm
      </text>
      {w !== 520 && (
        <text x={w > 520 ? x + w + 4 : sx + 520 + 4} y={top - 3} textAnchor="end" fontSize="12" fill="currentColor" fillOpacity="0.6">
          Standard 520mm
        </text>
      )}
    </svg>
  );
}

/**
 * Show plates: a length of the customer's choosing (plain or hex). The slider starts at the shortest
 * length the reg fits at full size, so a plate can never be made with the characters running off it.
 * Moving it updates the plate preview as it goes; "Use" confirms the size.
 */
function CustomSize({ c, reg, forRear, chosen, side, priceText, onPreview, onPick }: { c: BuildConfig; reg: string; forRear: boolean; chosen: string | null; side: "front" | "rear"; priceText: (key: string) => ReactNode; onPreview: (key: string) => void; onPick: (key: string) => void }) {
  const cur = customSize(chosen);
  const [hex, setHex] = useState(cur?.hex ?? false);
  const gaps = plateGaps(c, reg);
  const styleKey = forRear ? `${c.rearStyle ?? c.style}` : `${c.style}|${c.rearStyle}`;
  const extrasKey = c.extras.join("|");
  const range = useMemo(
    () => customRange(c.vehicle, c.legal, reg, hex, forRear ? [c.rearStyle ?? c.style] : [c.style, c.rearStyle], gaps, c.extras),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c.vehicle, c.legal, reg, hex, styleKey, extrasKey, JSON.stringify(gaps)],
  );
  const [len, setLen] = useState<number>(cur?.w ?? 520);
  const [typed, setTyped] = useState<string | null>(null);
  const w = range ? Math.min(range.max, Math.max(range.min, Math.round(len))) : null;
  const key = w ? customSizeKey(w, hex) : null;
  const size = customSize(key);
  // the big plate preview follows the slider (a moment after it stops, so dragging stays smooth)
  const timer = useRef(0);
  const previewSoon = (k: string | null) => {
    window.clearTimeout(timer.current);
    if (k) timer.current = window.setTimeout(() => onPreview(k), 90);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const keyFor = (n: number, h = hex) => {
    const r = h === hex ? range : customRange(c.vehicle, c.legal, reg, h, forRear ? [c.rearStyle ?? c.style] : [c.style, c.rearStyle], gaps, c.extras);
    return r ? customSizeKey(Math.min(r.max, Math.max(r.min, Math.round(n))), h) : null;
  };
  return (
    <div className="rk-custom" data-custom>
      <div className="rk-hexway">
        <span id={`rk-cshape-${forRear ? "r" : "f"}`}>Shape</span>
        <div className="rk-seg" role="radiogroup" aria-labelledby={`rk-cshape-${forRear ? "r" : "f"}`}>
          {[false, true].map((h) => (
            <button
              key={String(h)}
              type="button"
              role="radio"
              aria-checked={hex === h}
              data-custom-shape={h ? "hex" : "plain"}
              onClick={() => {
                setHex(h);
                previewSoon(keyFor(len, h));
              }}
            >
              <svg viewBox="0 0 76 22" width="52" height="15" aria-hidden>
                <path d={shapePath(1, 1, 74, 20, h ? 1 : 3, h, false)} fill="currentColor" />
              </svg>
              {h ? "Hex" : "Rectangle"}
            </button>
          ))}
        </div>
      </div>
      {!range || !w || !size ? (
        <p className="rk-bfine">Your reg is too long for a {hex ? "hex " : ""}plate up to {CUSTOM_MAX}mm at full size. Try fewer spaces{hex ? " or the rectangle" : ""}.</p>
      ) : (
        <>
          <CustomDrawing w={w} hex={hex} flip={hex && !!c.hexFlip} reg={reg} gaps={gaps} side={side} />
          <div className="rk-custom__len">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={w}
              onChange={(e) => {
                const n = Number(e.target.value);
                setLen(n);
                setTyped(null);
                previewSoon(keyFor(n));
              }}
              aria-label="Plate length in millimetres"
              data-custom-range
            />
            <label className="rk-custom__mm">
              <input
                type="number"
                inputMode="numeric"
                min={range.min}
                max={range.max}
                value={typed ?? String(w)}
                onChange={(e) => {
                  setTyped(e.target.value);
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) {
                    setLen(n);
                    previewSoon(keyFor(n));
                  }
                }}
                onBlur={() => setTyped(null)}
                aria-label="Plate length in millimetres"
                data-custom-mm
              />
              mm
            </label>
          </div>
          <div className="rk-custom__scale" aria-hidden>
            <span>{range.min}mm shortest</span>
            <span>{range.max}mm longest</span>
          </div>
          <p className="rk-bfine">
            {range.min}mm is the shortest your reg fits at full size, with 11mm to each end{hex ? " and room for the cut corners" : ""}. Plates are 111mm tall. {priceText(size.key)}
          </p>
          <button type="button" className="rk-bnext rk-custom__use" data-b="custom:use" onClick={() => onPick(size.key)}>
            Use {size.w}mm{hex ? " hex" : ""}
          </button>
        </>
      )}
    </div>
  );
}
const CUSTOM_MAX = 533;

/** A plate drawn at its real size, so customers can compare sizes at a glance. */
function SizeExample({ size, reg, side, flip = false, gaps = null }: { size: SizeOption; reg: string; side: "front" | "rear"; flip?: boolean; gaps?: number[] | null }) {
  const k = 0.4; // mm to drawing units: all sizes share one scale
  const W = 540 * k, H = 205 * k;
  const w = size.w * k, h = size.h * k;
  const x = (W - w) / 2, y = (H - h) / 2;
  const text = (reg || "AB12 CDE").toUpperCase();
  const two = size.w / size.h < 2.3 && size.key !== "12x6";
  const lines = two ? (text.includes(" ") ? text.split(" ") : [text.slice(0, Math.ceil(text.length / 2)), text.slice(Math.ceil(text.length / 2))]) : [text];
  const longest = Math.max(...lines.map((l) => l.length), 3);
  const fs = Math.min((h / lines.length) * 0.72, (w * 0.84) / (longest * 0.6));
  // Show plates with custom spacing, on one-line sizes: each character placed with its gap (a space is 0.195em)
  const spaced = gaps && !two && reg ? [...regChars(reg)] : null;
  return (
    <svg className="rk-sizecard__svg" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path d={shapePath(x, y, w, h, 3, !!size.hex, flip)} fill={side === "front" ? "#f6f6f2" : "#f6c900"} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      {spaced ? (
        <text x={W / 2} y={y + h / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fontFamily='"RK Plate", "Barlow Condensed", "Arial Narrow", Arial, sans-serif' fontWeight={700} fontSize={fs} fill="#111">
          {spaced.map((ch, i) => (
            <tspan key={i} dx={i > 0 ? (gaps![i - 1] ?? 0) * 0.195 * fs : undefined}>
              {ch}
            </tspan>
          ))}
        </text>
      ) : (
        lines.map((l, i) => (
          <text key={i} x={W / 2} y={y + (h / lines.length) * (i + 0.5) + 0.5} textAnchor="middle" dominantBaseline="central" fontFamily='"RK Plate", "Barlow Condensed", "Arial Narrow", Arial, sans-serif' fontWeight={700} fontSize={fs} fill="#111">
            {l}
          </text>
        ))
      )}
    </svg>
  );
}

const money = (n: number | null) => (n === null ? "On request" : n === 0 ? "Free" : formatGBP(n, Number.isInteger(n)));
const MAX_MB = 10;

/** One document to upload. PROTOTYPE: only the file name is kept; at launch the file goes to secure storage with the order. */
function DocUpload({ k, title, hint, file, onFile, onClear }: { k: string; title: string; hint: string; file: string | null; onFile: (f: File) => void; onClear: () => void }) {
  const [err, setErr] = useState("");
  return (
    <div className={`rk-bdoc${file ? " is-done" : ""}`} data-doc={k}>
      <div className="rk-bdoc__t">
        <b>{title}</b>
        <small>{hint}</small>
        {err && <small className="rk-bdoc__err" role="alert">{err}</small>}
      </div>
      {file ? (
        <div className="rk-bdoc__file">
          <TickMark /> <span>{file}</span>
          <button type="button" className="rk-blink rk-blink--sm" onClick={onClear}>
            Remove
          </button>
        </div>
      ) : (
        <label className="rk-bdoc__pick">
          Upload
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > MAX_MB * 1024 * 1024) return setErr(`That file is over ${MAX_MB}MB. Try a photo or a smaller PDF.`);
              setErr("");
              onFile(f);
            }}
          />
        </label>
      )}
    </div>
  );
}

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="rk-ticon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
    <path d="m8.5 12 2.4 2.4 4.6-4.8" />
  </svg>
);

export const WarningIcon = ({ className = "rk-ticon" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path d="M12 2.8 1.6 20.6h20.8L12 2.8Z" fill="#ffc200" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 9v5.6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="17.6" r="1.25" fill="#111" />
  </svg>
);

function Choice<T extends string>({ k, value, options, onPick }: { k: string; value: T | null; options: [T, ReactNode][]; onPick: (v: T) => void }) {
  return (
    <div className="rk-choice" role="radiogroup" aria-label={k}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} data-b={`${k}:${v}`} onClick={() => onPick(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Shown once Show is picked: what a show plate is for, what it can have, and the law. */
function ShowInfo({ studio = false }: { studio?: boolean }) {
  return (
    <div className="rk-showinfo" data-showinfo>
      <h4>
        <WarningIcon className="rk-ticon rk-ticon--sm" /> Show plates are for display, not the road
      </h4>
      <dl>
        <div>
          <dt>Where they can go</dt>
          <dd>Car shows and meets, track days, private land, or on display at home or in a garage.</dd>
        </div>
        <div>
          <dt>What you can have</dt>
          <dd>Every style we make, plus tints, faded tints and your own text along the bottom, none of which are allowed on a road legal plate.</dd>
        </div>
        {!studio && (
          <div>
            <dt>What we need from you</dt>
            <dd>Nothing. Show plates don&apos;t need ID or proof you own the reg.</dd>
          </div>
        )}
      </dl>
      {/* The studio shows no prices or order details, and the warning quotes a fine in pounds. */}
      {studio ? <p className="rk-showinfo__law">Show plates are not for use on the road. For a plate you can drive with, choose Road legal plate.</p> : <p className="rk-showinfo__law">{SHOW_WARNING} For a plate you can drive with, choose Road legal plate.</p>}
    </div>
  );
}

/** "What makes a plate legal?" panel under the plate-type choice. */
function LegalInfo() {
  return (
    <details className="rk-binfo">
      <summary>
        <span className="rk-binfo__i" aria-hidden>
          i
        </span>
        What makes a plate road legal, and what we need from you
      </summary>
      <div className="rk-binfo__b">
        <h4>A road legal plate must be</h4>
        <ul>
          {LEGAL_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <h4>What we need from you</h4>
        <ul>
          <li>{LEGAL_DOCS_LIST.identity}</li>
          <li>{LEGAL_DOCS_LIST.entitlement}</li>
        </ul>
        <p className="rk-binfo__warn">
          <WarningIcon className="rk-ticon rk-ticon--sm" /> {SHOW_WARNING}
        </p>
      </div>
    </details>
  );
}

type Props = {
  reg: string;
  c: BuildConfig;
  set: (patch: Partial<BuildConfig>) => void;
  replace: (next: BuildConfig) => void;
  onRegStep: () => void;
  /** Make section: retail prices. Plate pages: trade prices (and included styles on REG KING stock). */
  pricing?: Pricing;
  /** Panel heading, e.g. "Your plates" on a plate page. */
  title?: ReactNode;
  /**
   * In-store studio: design only. Hides every price and the running total, and leaves out the
   * fitting kit, documents and delivery steps (and the notes about documents).
   */
  studio?: boolean;
};

/** Steps the in-store studio leaves out: they are about the order, not the design. */
const STUDIO_SKIP: StepKey[] = ["kit", "docs", "delivery"];
/** A style the studio leaves out. */
export const STUDIO_HIDE_STYLE = "RK";

/**
 * Step-by-step plate builder, following the REG KING workshop tool, one step
 * open at a time: vehicle (starts on Car) → road legal or show → set or single → (front or rear, or
 * whether a set matches) → style → size → (rear style and size) → extras → delivery.
 * Vehicle and road legal / show decide the styles; vehicle, plate type and reg length decide the sizes.
 */
export function PlateBuilder({ reg, c, set, replace, onRegStep, pricing = RETAIL, title, studio = false }: Props) {
  const trade = pricing.mode === "trade";
  const unpriced = trade ? "Trade price" : "Price on request";
  const money = (n: number | null) => (n === null ? (trade ? "Trade price" : "On request") : n === 0 ? (trade ? "Included" : "Free") : formatGBP(n, Number.isInteger(n)));
  const [editing, setEditing] = useState<StepKey | null>(null);
  const [sizeTab, setSizeTab] = useState<string | null>(null);
  // A set: one size for both plates, or a different size on the rear
  const [sameSize, setSameSize] = useState(() => !(c.size && c.rearSize && c.size !== c.rearSize));
  const { customer, uploadDoc } = useAccount();
  const steps = stepsFor(c).filter((k) => !studio || !STUDIO_SKIP.includes(k));
  const current = steps.find((k) => !isAnswered(k, c)) ?? null;
  const open = editing ?? current;
  // every step in order, the vehicle first: done ones fold to a row you tap to change, later ones wait
  const all: StepKey[] = ["vehicle", ...steps];
  const curIdx = current === null ? all.length : all.indexOf(current);
  const vOpen = !c.legal || editing === "vehicle";
  const lines = priceLines(c, pricing);
  const t = total(lines);
  const done = (patch: Partial<BuildConfig>) => {
    set(patch);
    setEditing(null);
  };
  const hasReg = reg.replace(/\s/g, "").length >= 2;
  const live = !!c.vehicle;

  const body = (k: StepKey): ReactNode => {
    switch (k) {
      case "vehicle":
        return null; // chosen from the menu above the steps
      case "legal":
        return (
          <>
            <Choice
              k="legal"
              value={c.legal}
              options={[
                ["Legal", <><ShieldIcon /><b>Road legal plate</b><small>For use on the road</small></>],
                ["Show", <><WarningIcon /><b>Show sign</b><small>Not for road use</small></>],
              ]}
              onPick={(v) => {
                replace(withLegal(c, v));
                setEditing(null);
              }}
            />
            {c.legal === "Show" ? <ShowInfo studio={studio} /> : studio ? null : <LegalInfo />}
          </>
        );
      case "qty":
        return (
          <Choice
            k="qty"
            value={c.qty}
            options={[
              ["Set", <><b>Set</b><small>Front &amp; rear</small></>],
              ["Single", <><b>Single</b><small>One plate</small></>],
            ]}
            onPick={(v) => {
              replace(withQty(c, v));
              setEditing(null);
            }}
          />
        );
      case "match":
        return (
          <Choice
            k="match"
            value={c.match}
            options={[
              ["Same", <><b>Both the same</b><small>One style and size for front and rear</small></>],
              ["Different", <><b>Different</b><small>Choose the front and rear plates separately</small></>],
            ]}
            onPick={(v) => {
              replace(withMatch(c, v));
              setEditing(null);
            }}
          />
        );
      case "side":
        return (
          <Choice
            k="side"
            value={c.side}
            options={[
              ["Front", <><span className="rk-swatch rk-swatch--front" /><b>Front</b><small>White</small></>],
              ["Rear", <><span className="rk-swatch rk-swatch--rear" /><b>Rear</b><small>Yellow</small></>],
            ]}
            onPick={(v) => done({ side: v })}
          />
        );
      case "style":
      case "rearStyle": {
        const forRear = k === "rearStyle";
        const chosen = forRear ? c.rearStyle : c.style;
        const side: "front" | "rear" = forRear ? "rear" : !rearOnly(c.vehicle) && c.qty === "Single" && c.side === "Front" ? "front" : "rear";
        return (
          <div className="rk-styles-grid">
            {stylesFor(c.vehicle, c.legal)
              // the in-store studio doesn't offer the RK style
              .filter((s) => !studio || s.name !== STUDIO_HIDE_STYLE)
              .map((s) => {
                const sp = stylePrice(s.name, pricing);
                return { s, p: isSplit(c) ? sp.single : priceOf(sp, c) };
              })
              // cheapest first; anything priced on request goes last
              .sort((a, b) => (studio ? 0 : (a.p ?? Infinity) - (b.p ?? Infinity)))
              .map(({ s, p }) => {
              return (
                <div key={s.name} className="rk-stilewrap">
                <button
                  type="button"
                  className="rk-stile"
                  aria-pressed={chosen === s.name}
                  data-b={`${k}:${s.name}`}
                  onClick={() => done(forRear ? { rearStyle: s.name } : { style: s.name })}
                >
                  <StyleThumb c={c} side={side} style={s.name} />
                  <span className="rk-stile__name">{s.name}</span>
                  {!studio && <span className="rk-stile__price">
                    {(() => {
                      if (p === null) return unpriced;
                      if (p === 0 && trade) return "Included";
                      // REG KING's own plates: show the normal price crossed out next to the discounted one.
                      const full = pricing.mode === "trade" && pricing.offRetail ? (isSplit(c) ? STYLES[s.name]?.single : priceOf(STYLES[s.name], c)) : null;
                      return (
                        <>
                          {full != null && full > p && <s className="rk-stile__was">{formatGBP(full, Number.isInteger(full))}</s>} {formatGBP(p, Number.isInteger(p))}
                        </>
                      );
                    })()}
                  </span>}
                </button>
                <RealPhotos k={s.name} label={`See real ${s.name} plates`} compact />
                </div>
              );
            })}
          </div>
        );
      }
      case "size":
      case "rearSize": {
        const forRear = k === "rearSize";
        const chosen = forRear ? c.rearSize : c.size;
        const chars = regLength(reg);
        // only sizes the reg goes on at full size (never squeezed), for the style(s) this size is for
        const list = sizesFor(c.vehicle, c.legal, reg, forRear ? [c.rearStyle ?? c.style] : [c.style, c.rearStyle], plateGaps(c, reg), c.extras);
        const shortest = offersShortest(c.vehicle, c.legal, reg);
        const hidden = allSizesFor(c.vehicle, c.legal).filter((x) => !list.some((y) => y.key === x.key)).length;
        const groups = [...new Set(list.map((x) => x.group))];
        // Show plates (cars): a length of their own choosing, as well as the sizes we list
        if (offersCustom(c.vehicle, c.legal)) groups.push("Custom");
        // Size groups are tabs: Standard, Hex, Van & SUV, Imports. Opens on the chosen size's group.
        const tab = sizeTab && groups.includes(sizeTab) ? sizeTab : (list.find((x) => x.key === chosen)?.group ?? (customSize(chosen) ? "Custom" : groups[0]));
        const pairStep = !forRear && twoSizes(c);
        const sizePatch = (key: string): Partial<BuildConfig> => (forRear ? { rearSize: key } : pairStep && sameSize ? { size: key, rearSize: key } : pairStep ? { size: key, rearSize: c.rearSize === c.size ? null : c.rearSize } : { size: key });
        const pickSize = (key: string) => done(sizePatch(key));
        const plateSide = forRear ? "rear" : twoSizes(c) || (c.qty === "Single" && c.side === "Front") ? "front" : "rear";
        const best = shortest ? shortestLegalOf(list.filter((x) => x.group === tab), reg) : null;
        return (
          <>
            {pairStep && (
              <div className="rk-seg rk-samesize" role="radiogroup" aria-label="Front and rear sizes">
                <button type="button" role="radio" aria-checked={sameSize} onClick={() => setSameSize(true)} data-samesize="same">
                  Same size front &amp; rear
                </button>
                <button type="button" role="radio" aria-checked={!sameSize} onClick={() => setSameSize(false)} data-samesize="different">
                  Different sizes
                </button>
              </div>
            )}
            {pairStep && !sameSize && <p className="rk-bfine">Pick the front plate&apos;s size here. You&apos;ll choose the rear plate&apos;s size next.</p>}
            {groups.length > 1 && (
              <div className="rk-seg rk-sizetabs" role="tablist" aria-label="Size type">
                {groups.map((g) => (
                  <button key={g} type="button" role="tab" aria-selected={tab === g} aria-checked={tab === g} data-sizetab={g} onClick={() => setSizeTab(g)}>
                    {g}
                  </button>
                ))}
              </div>
            )}
            {tab === "Hex" && <RealPhotos k="size:Hex" label="See real hex plates" className="rk-real--block" />}
            {tab === "Hex" && (
              <div className="rk-hexway" data-hexway>
                <span id={`rk-hexway-${k}`}>Hex shape</span>
                <div className="rk-seg" role="radiogroup" aria-labelledby={`rk-hexway-${k}`}>
                  {[
                    { flip: false, t: "Standard" },
                    { flip: true, t: "Upside down" },
                  ].map((o) => (
                    <button key={o.t} type="button" role="radio" aria-checked={!!c.hexFlip === o.flip} onClick={() => set({ hexFlip: o.flip })} data-hexflip={o.flip ? "on" : "off"}>
                      <svg viewBox="0 0 76 22" width="52" height="15" aria-hidden>
                        <path d={shapePath(1, 1, 74, 20, 1, true, o.flip)} fill="currentColor" />
                      </svg>
                      {o.t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {shortest && (tab === "Standard" || tab === "Hex") && (
              <p className="rk-legalmin" data-legalmin>
                <span className="rk-legalmin__line">
                  Shortest road-legal {tab === "Hex" ? "hex " : ""}plate for <b>{reg.trim().toUpperCase()}</b>: <b>{legalLength(reg, tab === "Hex")}mm</b>
                </span>
                <span className="rk-legalmin__why">
                  {best ? `The shortest ${tab === "Hex" ? "hex " : ""}size we make that's road legal for this reg is ${best.label}.` : `None of our ${tab === "Hex" ? "hex " : ""}sizes is long enough for this reg.`}{" "}
                  {tab === "Hex" ? "The cut corners need extra room at each end, so a hex plate has to be longer than a standard one." : "Worked out from the legal character sizes and spacing, with 11mm to each edge."}
                </span>
              </p>
            )}
            {tab === "Custom" && (
              <CustomSize
                c={c}
                reg={reg}
                forRear={forRear}
                chosen={chosen}
                side={plateSide}
                onPick={pickSize}
                onPreview={(key) => {
                  // keep this step open while they try lengths (choosing a size would otherwise move on)
                  setEditing(k);
                  set(sizePatch(key));
                }}
                priceText={(key) => {
                  const sc = studio ? null : sizeChargePrice(key, pricing);
                  return sc?.single != null ? <span data-size-price>Custom lengths are +{formatGBP(sc.single, Number.isInteger(sc.single))} per plate.</span> : null;
                }}
              />
            )}
            {tab !== "Custom" && <div className="rk-sizecards" role="radiogroup" aria-label={tab}>
              {list
                .filter((x) => x.group === tab)
                .map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    role="radio"
                    className="rk-sizecard"
                    aria-checked={chosen === x.key}
                    data-b={`${k}:${x.key}`}
                    onClick={() => pickSize(x.key)}
                  >
                    <SizeExample size={x} reg={hasReg ? reg : ""} side={plateSide} flip={!!x.hex && !!c.hexFlip} gaps={plateGaps(c, reg)} />
                    <b>{x.label.replace(/ \(.*\)$/, "")}</b>
                    <small>
                      {Math.round(x.w)} × {Math.round(x.h)}mm
                    </small>
                    {!studio && (() => {
                      const sc = sizeChargePrice(x.key, pricing);
                      return sc?.single != null ? <small className="rk-sizecard__price" data-size-price>+{formatGBP(sc.single, Number.isInteger(sc.single))} per plate</small> : null;
                    })()}
                    {shortest && best?.key === x.key && <em className="rk-sizecard__tag" data-tag="legal">Shortest legal</em>}
                    {shortest && !legalFor(x, reg) && <em className="rk-sizecard__tag" data-tag="short">Too short to be road legal</em>}
                  </button>
                ))}
            </div>}
            {tab !== "Custom" && <p className="rk-bfine">
              {chars === 0
                ? c.legal === "Legal"
                  ? "Type your reg to see the shortest road-legal length and the sizes that fit it."
                  : "Smaller sizes only fit shorter regs. Type your reg to see the sizes that fit."
                : hidden > 0
                    ? `Showing the sizes your reg fits at full size. Shorter plates need a shorter reg.`
                    : `Every size fits ${chars} characters.`}
            </p>}
          </>
        );
      }
      case "extras":
        return (
          <>
            {(() => {
              const list = extrasFor(c.vehicle, c.legal);
              const row = (x: (typeof list)[number]) => {
                const on = c.extras.includes(x.name);
                // a badge takes 50mm: not offered if the reg would no longer fit the chosen size(s)
                const noRoom = !on && !!c.size && regLength(reg) > 0 && buildFits(c, reg) && !buildFits({ ...c, extras: toggleExtra(c.extras, x.name) }, reg);
                return (
                  <button key={x.name} type="button" aria-pressed={on} disabled={noRoom} data-b={`extra:${x.name}`} onClick={() => set({ extras: toggleExtra(c.extras, x.name) })}>
                    {on ? <><TickMark />{" "}</> : "+ "}
                    {x.look === "text" ? "Custom text at the bottom" : x.name}
                    {noRoom && <small>Not enough room on this plate size</small>}
                    {!studio && (() => {
                      const ep = extraPrice(x, pricing).single;
                      return ep !== null ? <small>{formatGBP(ep, Number.isInteger(ep))} per plate</small> : trade ? <small>Trade price</small> : null;
                    })()}
                  </button>
                );
              };
              const showOnly = list.filter((x) => x.look === "tint" || x.look === "fade" || x.look === "text");
              return (
                <>
                  <div className="rk-pills" aria-label="Extras">
                    {list.filter((x) => !showOnly.includes(x)).map(row)}
                  </div>
                  {showOnly.length > 0 && (
                    <>
                      <p className="rk-bfine rk-extras__h">Show plates only</p>
                      <div className="rk-pills" aria-label="Show plate extras">
                        {showOnly.map(row)}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
            <p className="rk-bfine">One badge and one tint per plate. Choosing another swaps it.</p>
            {c.extras.includes("Faded Tint") && c.legal === "Show" && (
              <div className="rk-fadedir" role="radiogroup" aria-label="Which way the tint fades" data-fadedir>
                <span>Which way should it fade?</span>
                <div>
                  {(
                    [
                      ["top", "Darker at the top", "180deg"],
                      ["bottom", "Darker at the bottom", "0deg"],
                    ] as const
                  ).map(([k, t, deg]) => (
                    <button key={k} type="button" role="radio" aria-checked={(c.fadeFrom ?? "top") === k} onClick={() => set({ fadeFrom: k })} data-b={`fade:${k}`}>
                      <i aria-hidden style={{ background: `linear-gradient(${deg}, rgba(40,36,24,0.55), rgba(40,36,24,0) 90%), #ffd400` }} />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {c.extras.includes("Custom Text") && c.legal === "Show" && (
              <label className="rk-btext" data-btext>
                <span>Text along the bottom of the plate</span>
                <input
                  value={c.bottomText ?? ""}
                  onChange={(e) => set({ bottomText: e.target.value.slice(0, BOTTOM_TEXT_MAX) })}
                  maxLength={BOTTOM_TEXT_MAX}
                  placeholder="For example: REG KING"
                  autoComplete="off"
                  data-b="extra:text"
                />
                <small>
                  {(c.bottomText ?? "").length}/{BOTTOM_TEXT_MAX} characters
                </small>
              </label>
            )}

            <button
              type="button"
              className="rk-bnext"
              data-b="extras:done"
              disabled={c.extras.includes("Custom Text") && c.legal === "Show" && !(c.bottomText ?? "").trim()}
              onClick={() => done({ extrasDone: true })}
            >
              {c.extras.includes("Custom Text") && c.legal === "Show" && !(c.bottomText ?? "").trim()
                ? "Type your custom text to continue"
                : c.extras.length
                  ? `Continue with ${c.extras.length} extra${c.extras.length > 1 ? "s" : ""}`
                  : "No extras, continue"}
            </button>
          </>
        );
      case "delivery": {
        const fp = priceOf(FITTING, c);
        return (
          <>
            <Choice
              k="delivery"
              value={c.delivery}
              options={[
                ["Deliver", <><b>Deliver to me</b><small>Posted to your door</small></>],
                ["Collect", <><b>Collect</b><small>From our Bilston shop</small></>],
                ["CollectFit", <><b>Collect &amp; fit</b><small>{fp === null ? "Fitting on request" : `Fitted for ${formatGBP(fp, true)}`}</small></>],
              ]}
              onPick={(v) => {
                replace(withDelivery(c, v));
                setEditing(null);
              }}
            />
            <p className="rk-bfine">Delivery cost is shown at checkout.</p>
          </>
        );
      }
      case "kit":
        return (
          <>
            <div className="rk-choice rk-kits" role="radiogroup" aria-label="Fitting kit">
              {KITS.map((x) => (
                <button key={x.key} type="button" role="radio" aria-checked={c.kit === x.key} data-b={`kit:${x.key}`} onClick={() => done({ kit: x.key })}>
                  {x.recommended && <span className="rk-kits__rec">Recommended</span>}
                  <b>{x.name}</b>
                  <small>{x.line}</small>
                  {x.key !== "None" && (
                    <span className="rk-kits__price">
                      <s>{formatGBP(KIT_WAS)}</s> <em>Free</em>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        );
      case "docs": {
        const put = (which: "identity" | "entitlement", f: File | null) => {
          set({ docs: { ...c.docs, [which]: f ? f.name : null, later: false } });
          if (f && customer) uploadDoc(null, { kind: which === "identity" ? "ID" : "Other", reg: which === "identity" ? "" : reg.toUpperCase(), file: f.name, size: f.size });
        };
        return (
          <>
            <p className="rk-bdocs__intro">By law we have to see these before we make road legal plates. A clear phone photo is fine.</p>
            <div className="rk-bdocs">
              <DocUpload k="identity" title="Photo ID" hint={LEGAL_DOCS_LIST.identity} file={c.docs.identity} onFile={(f) => put("identity", f)} onClear={() => put("identity", null)} />
              <DocUpload k="entitlement" title="Proof the reg is yours" hint={LEGAL_DOCS_LIST.entitlement} file={c.docs.entitlement} onFile={(f) => put("entitlement", f)} onClear={() => put("entitlement", null)} />
            </div>
            <div className="rk-bdocs__acts">
              <button type="button" className="rk-bnext" data-b="docs:done" disabled={!docsReady(c)} onClick={() => done({ docsDone: true })}>
                Continue
              </button>
              <button type="button" className="rk-blink" data-b="docs:later" onClick={() => done({ docs: { ...c.docs, later: true }, docsDone: true })}>
                I&apos;ll upload them after checkout
              </button>
            </div>
            <p className="rk-bfine">Only used to check you can have these plates. We make your plates once they&apos;re checked.</p>
          </>
        );
      }
    }
  };

  return (
    <div className="rk-bpanel" id="rk-builder">
      <div className="rk-bpanel__h">
        <h2>
          {title ?? (
            <>
              Make your <span>plate</span>
            </>
          )}
        </h2>
        <span className="rk-bprog" aria-label={`${curIdx} of ${all.length} steps done`}>
          <span className="rk-bprog__t">
            Step {Math.min(curIdx + 1, all.length)} of {all.length}
          </span>
          <span className="rk-bprog__bar" aria-hidden>
            <i style={{ width: `${(curIdx / all.length) * 100}%` }} />
          </span>
        </span>
      </div>

      {live && (
        <div className="rk-blive" aria-live="polite">
          <div className="rk-blive__meta">
            {c.legal === "Show" ? (
              <span className="rk-blive__tag is-show">
                <WarningIcon className="rk-ticon rk-ticon--sm" /> Show sign
              </span>
            ) : c.legal === "Legal" ? (
              <span className="rk-blive__tag">Road legal</span>
            ) : (
              <span className="rk-blive__tag is-muted">{vehicleLabel(c.vehicle)}</span>
            )}
            {studio ? null : lines.length > 0 ? (
              <b>
                {trade && t.onRequest && t.known === 0 ? "Trade price" : formatGBP(t.known, Number.isInteger(t.known))}
                {t.onRequest && !(trade && t.known === 0) ? (trade ? " + trade price" : "+") : ""}
              </b>
            ) : (
              <span className="rk-blive__hint">{fromSetPrice() !== null ? `Sets from ${formatGBP(fromSetPrice()!, false)}` : "Price shows when you pick a style"}</span>
            )}
          </div>
        </div>
      )}

      {!hasReg && (
        <button type="button" className="rk-bregnote" onClick={onRegStep}>
          Type your registration above to see it on your plates
        </button>
      )}

      <ol className="rk-bsteps">
        {all.map((k, i) => {
          const isOpen = k === "vehicle" ? vOpen : k === open && editing !== "vehicle";
          const answered = k === "vehicle" ? !!c.vehicle : current === null || i < curIdx;
          const state = isOpen ? "open" : answered ? "done" : "todo";
          const title = k === "vehicle" ? "Vehicle type" : k === "size" && twoSizes(c) && sameSize && (!c.rearSize || c.rearSize === c.size) ? "Plate size (front & rear)" : stepTitle(k, c);
          const answer = k === "vehicle" ? VEHICLES.find((v) => v.key === c.vehicle)?.label ?? "" : answerText(k, c);
          const prev = i > 0 ? all[i - 1] : null;
          return (
            <li key={k} className={`rk-bstep is-${state}${k === "vehicle" ? " rk-bstep--vehicle" : ""}`} data-step={k}>
              {state === "done" ? (
                <button type="button" className="rk-bstep__h rk-bstep__row" data-edit={k} onClick={() => setEditing(k)} aria-label={`${title}: ${answer}. Change`}>
                  <b className="rk-bstep__n">
                    <TickMark />
                  </b>
                  <span className="rk-bstep__t">{title}</span>
                  <span className="rk-bstep__a">{answer}</span>
                  <span className="rk-bstep__edit" aria-hidden>
                    Change
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </span>
                </button>
              ) : (
                <div className="rk-bstep__h">
                  <b className="rk-bstep__n">{i + 1}</b>
                  <span className="rk-bstep__t" id={`rk-${k}-t`}>
                    {title}
                  </span>
                  {state === "open" && editing === k && (
                    <button type="button" className="rk-bstep__keep" data-keep={k} onClick={() => setEditing(null)}>
                      Keep as it was
                    </button>
                  )}
                </div>
              )}
              {state === "open" && (
                <div className="rk-bstep__b">
                  {k === "vehicle" ? (
                    <div className="rk-choice" role="radiogroup" aria-labelledby="rk-vehicle-t">
                      {VEHICLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          role="radio"
                          aria-checked={c.vehicle === v.key}
                          data-b={`vehicle:${v.key}`}
                          onClick={() => {
                            setEditing(null);
                            if (c.vehicle === v.key) return;
                            replace(withVehicle(c, v.key));
                            setSizeTab(null);
                          }}
                        >
                          <b>{v.label}</b>
                          <small>{v.line}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    body(k)
                  )}
                  {prev && (
                    <button type="button" className="rk-bback" data-back={k} onClick={() => setEditing(prev)}>
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M10 4L6 8l4 4" />
                      </svg>
                      Back to {(prev === "vehicle" ? "vehicle type" : stepTitle(prev, c)).toLowerCase()}
                    </button>
                  )}
                </div>
              )}
              {state === "done" && k === "legal" && c.legal === "Show" && <ShowInfo studio={studio} />}
            </li>
          );
        })}
      </ol>

      {!studio && !open && c.legal && !c.withPlate && (
        <div className="rk-bend">
          {c.legal === "Legal" ? (
            <div className="rk-bnote">
              <b>{docsReady(c) ? "Documents uploaded" : LEGAL_NOTE.Legal}</b>
              <span>{docsReady(c) ? "We'll check them before we make your plates." : c.docs.later ? "We'll email you after checkout to collect your ID and proof the reg is yours." : LEGAL_DOCS}</span>
            </div>
          ) : (
            <div className="rk-bnote is-show rk-bnote--warn">
              <WarningIcon />
              <div>
                <b>{LEGAL_NOTE.Show}</b>
                <span>{SHOW_WARNING}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!studio && lines.length > 0 && (
        <div className="rk-btotal">
          {!open && (
            <ul>
              {lines.map((l) => (
                <li key={l.label}>
                  <span>{l.label}</span>
                  <b>
                    {l.was !== undefined && <s className="rk-btotal__was">{formatGBP(l.was)}</s>}
                    {money(l.amount)}
                  </b>
                </li>
              ))}
            </ul>
          )}
          <div className="rk-btotal__sum">
            <span>{open ? "So far" : "Total"}</span>
            <b>
              {trade && t.onRequest && t.known === 0 ? "Trade price" : formatGBP(t.known, Number.isInteger(t.known))}
              {t.onRequest && <small>{trade ? (t.known === 0 ? "Confirmed on your order call" : "+ trade prices, confirmed on your order call") : "+ items priced on request"}</small>}
              {c.delivery === "Deliver" && <small>+ delivery at checkout</small>}
            </b>
          </div>
        </div>
      )}
    </div>
  );
}
