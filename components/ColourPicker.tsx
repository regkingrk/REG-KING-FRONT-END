"use client";

import { useEffect, useRef, useState } from "react";
import { swatch, type Swatch } from "@/lib/accessories";

/* HSV <-> hex */
const hsvToHex = (h: number, s: number, v: number) => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
};
const hexToHsv = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
};

const SIZE = 200;

/**
 * Colour choice: quick swatches, Carbon Fibre, and a colour wheel for any other colour.
 * The wheel picks hue (around) and strength (out from the middle); the slider sets brightness.
 * Value is a preset key, "carbon", or "#rrggbb".
 */
export function ColourPicker({ label, list, value, onPick, name, noWheel }: { label: string; list: Swatch[]; value: string; onPick: (v: string) => void; name: string; /** Only the swatches (matt surrounds: black or white). */ noWheel?: boolean }) {
  const current = swatch(list, value);
  const chosen = !!value && (/^#/.test(value) || list.some((s) => s.key === value));
  const custom = /^#/.test(value);
  const [open, setOpen] = useState(false);
  const start = hexToHsv(current.carbon ? "#1c1c1c" : current.hex);
  const [hsv, setHsv] = useState(start);
  const [hexText, setHexText] = useState(current.hex.toUpperCase());
  const canvas = useRef<HTMLCanvasElement>(null);

  // Keep the wheel in step when a swatch is picked.
  useEffect(() => {
    if (!current.carbon) {
      setHsv(hexToHsv(current.hex));
      setHexText(current.hex.toUpperCase());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the wheel once it opens (and when brightness changes).
  useEffect(() => {
    const c = canvas.current;
    if (!open || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(SIZE, SIZE);
    const r0 = SIZE / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - r0, dy = y - r0, d = Math.hypot(dx, dy);
        const i = (y * SIZE + x) * 4;
        if (d > r0) {
          img.data[i + 3] = 0;
          continue;
        }
        const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const hex = hsvToHex(h, d / r0, hsv.v < 0.2 ? 1 : hsv.v);
        const n = parseInt(hex.slice(1), 16);
        img.data[i] = (n >> 16) & 255;
        img.data[i + 1] = (n >> 8) & 255;
        img.data[i + 2] = n & 255;
        img.data[i + 3] = d > r0 - 1 ? Math.round((r0 - d) * 255) : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [open, hsv.v]);

  const pickAt = (clientX: number, clientY: number) => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dx = ((clientX - r.left) / r.width) * SIZE - SIZE / 2;
    const dy = ((clientY - r.top) / r.height) * SIZE - SIZE / 2;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, Math.hypot(dx, dy) / (SIZE / 2));
    // Starting from black or a very dark colour, the wheel picks at full brightness.
    const next = { h, s, v: hsv.v < 0.2 ? 1 : hsv.v };
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexText(hex.toUpperCase());
    onPick(hex);
  };

  const markerX = 50 + Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50;
  const markerY = 50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50;

  return (
    <div className="rk-cp">
      <div className="rk-cp__row" role="radiogroup" aria-label={label}>
        {list.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={value === s.key}
            aria-label={s.name}
            title={s.name}
            data-b={`${name}:${s.key}`}
            className={`rk-sw${s.carbon ? " rk-sw--carbon" : ""}${s.metal ? " rk-sw--metal" : ""}`}
            style={s.carbon ? undefined : { backgroundColor: s.hex }}
            onClick={() => onPick(s.key)}
          />
        ))}
        {!noWheel && (
        <button
          type="button"
          className={`rk-sw rk-sw--wheel${custom ? " is-on" : ""}`}
          aria-expanded={open}
          aria-label="Choose any colour"
          title="Choose any colour"
          data-b={`${name}:wheel`}
          onClick={() => setOpen((o) => !o)}
          style={custom ? { boxShadow: `inset 0 0 0 7px ${value}` } : undefined}
        />
        )}
      </div>
      <span className="rk-swatches__name">{chosen ? current.name : "Choose a colour"}</span>

      {open && !noWheel && (
        <div className="rk-cp__panel">
          <div className="rk-cp__wheel">
            <canvas
              ref={canvas}
              width={SIZE}
              height={SIZE}
              aria-label={`${label} colour wheel`}
              role="img"
              onPointerDown={(e) => {
                (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                pickAt(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (e.buttons) pickAt(e.clientX, e.clientY);
              }}
            />
            <span className="rk-cp__marker" style={{ left: `${markerX}%`, top: `${markerY}%`, background: hsvToHex(hsv.h, hsv.s, hsv.v) }} aria-hidden />
          </div>
          <div className="rk-cp__side">
            <label className="rk-cp__field">
              <span>Brightness</span>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(hsv.v * 100)}
                onChange={(e) => {
                  const next = { ...hsv, v: Number(e.target.value) / 100 };
                  setHsv(next);
                  const hex = hsvToHex(next.h, next.s, next.v);
                  setHexText(hex.toUpperCase());
                  onPick(hex);
                }}
                data-b={`${name}:brightness`}
              />
            </label>
            <label className="rk-cp__field">
              <span>Colour code</span>
              <input
                value={hexText}
                maxLength={7}
                spellCheck={false}
                onChange={(e) => {
                  const t = e.target.value.toUpperCase();
                  setHexText(t);
                  if (/^#[0-9A-F]{6}$/.test(t)) onPick(t.toLowerCase());
                }}
                data-b={`${name}:hex`}
              />
            </label>
            <button type="button" className="rk-blink rk-blink--sm" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
