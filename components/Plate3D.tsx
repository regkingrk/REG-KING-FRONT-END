"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { BADGE_MM, EXTRAS, plateFontPct, plateGaps, rearOnly, regChars, sizeInfo, sizeOf, sizeScale, type BuildConfig, twoLineLayout } from "@/lib/builder";
import { PlateDecor, bikeLines, plateAttrs } from "./PlatePreview";
import { BS_MARK, LEGAL_MARK_MM, SUPPLIER_NAME, SUPPLIER_POSTCODE } from "@/lib/builder";
import { bevelFilterFor, thinFilterFor, type BevelLook } from "./PlateFilters";
import { PlateGL } from "./PlateGL";
import { canRender3D } from "@/lib/plate3d";

type Side = "front" | "rear";
const EDGE_LAYERS = 9; // the plate's thickness, built from thin layers behind the face

/** Which side a customer is most likely looking at for this order. */
function defaultSide(c: BuildConfig): Side {
  if (rearOnly(c.vehicle)) return "rear";
  if (c.qty === "Single") return c.side === "Front" ? "front" : "rear";
  return "front";
}

/**
 * Live 3D preview of the plate being built, drawn with the browser's own 3D (CSS perspective).
 * It reuses the site's plate styles, so the reg, style, badge, border, size and hex shape always
 * match the builder. Drag to turn it; on its own it sways slowly and a light moves across the face.
 */
// onStyle is still accepted so callers don't change; the preview no longer uses it.
export function Plate3D({ reg, c }: { reg: string; c: BuildConfig; onStyle?: (style: string) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  // The 3D plate (three.js), opening straight on. Only if the browser can't draw 3D does it show the
  // flat straight-on picture instead.
  const [gl, setGl] = useState(false);
  useEffect(() => setGl(canRender3D()), []);
  const view: "3d" | "2d" = gl ? "3d" : "2d";
  const flat = useRef(false);
  flat.current = view === "2d";
  const real3d = gl;
  // Which plates: follows the order (a set shows both) until the customer picks.
  type Pick = "both" | "front" | "rear";
  const [pick, setPick] = useState<Pick | null>(null);
  // Night (the usual dark preview) or Day (a light backdrop and brighter light), remembered on this device
  const [day, setDay] = useState(false);
  useEffect(() => {
    try {
      setDay(localStorage.getItem("rk-preview-light") === "day");
    } catch {}
  }, []);
  const setLight = (d: boolean) => {
    setDay(d);
    try {
      localStorage.setItem("rk-preview-light", d ? "day" : "night");
    } catch {}
  };
  const bikeOnly = rearOnly(c.vehicle);
  const auto: Pick = bikeOnly ? "rear" : c.qty === "Single" ? defaultSide(c) : "both";
  const show: Pick = bikeOnly ? "rear" : pick ?? auto;
  // Picking set or single in the builder resets the preview to match.
  useEffect(() => setPick(null), [c.qty, c.side, c.vehicle]);
  const both = show === "both";
  const sides: Side[] = show === "both" ? ["front", "rear"] : [show];

  // drag to turn, then ease back into a slow sway (no sway for reduced motion)
  useEffect(() => {
    const el = stage.current;
    const r = stage.current;
    if (!el || !r) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rotY = -18, rotX = 6, dragging = false, px = 0, py = 0, held = 0, raf = 0, visible = true;
    const t0 = performance.now();
    const apply = () => {
      r.style.setProperty("--ry", `${rotY.toFixed(2)}deg`);
      r.style.setProperty("--rx", `${rotX.toFixed(2)}deg`);
      // the light sits up and to the left: the shine moves the opposite way to the turn
      r.style.setProperty("--shine", `${(50 - rotY * 2.2).toFixed(1)}%`);
    };
    const down = (e: PointerEvent) => {
      // the real 3D view handles its own dragging and buttons
      if ((e.target as Element | null)?.closest?.(".rk-gl")) return;
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging || flat.current) return;
      rotY = Math.max(-42, Math.min(42, rotY + (e.clientX - px) * 0.45));
      rotX = Math.max(-24, Math.min(24, rotX - (e.clientY - py) * 0.3));
      px = e.clientX;
      py = e.clientY;
      held = performance.now();
      if (reduce) apply();
    };
    const up = () => {
      dragging = false;
      held = performance.now();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (flat.current) {
        // 2D: straight on and still
        rotY = 0;
        rotX = 0;
        apply();
        return;
      }
      if (reduce) return;
      if (!dragging && now - held > 1400) {
        const t = (now - t0) / 1000;
        rotY += (Math.sin(t * 0.55) * 20 - rotY) * 0.035;
        rotX += (5 + Math.sin(t * 0.4) * 4 - rotX) * 0.035;
      }
      apply();
    };
    apply();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  const bike = c.vehicle === "Bike";
  const text = reg || "YOUR REG";
  // Show plates: the customer's own gaps between the characters
  const gaps = reg ? plateGaps(c, reg) : null;
  // Retro's chamfer is drawn by an SVG filter sized in px, so keep the face's width to hand.
  const [faceW, setFaceW] = useState(0);
  useEffect(() => {
    const el = stage.current?.querySelector<HTMLElement>(".rk-p3d__face");
    if (!el) return;
    const ro = new ResizeObserver(() => setFaceW(el.offsetWidth));
    ro.observe(el);
    setFaceW(el.offsetWidth);
    return () => ro.disconnect();
  });

  /** The plate face itself: the site's own plate styles, so every option matches the builder. */
  const face = (side: Side) => {
    const size = sizeOf(c, side);
    const info = sizeInfo(size) ?? sizeInfo(bike ? "9x7" : "Normal");
    const attrs = plateAttrs(c, side, bike ? "9x7" : size);
    const ratio = `${info?.w ?? 520} / ${info?.h ?? 111}`;
    const badge = c.extras.some((x) => ["uk", "ev", "ev-uk"].includes(EXTRAS.find((e) => e.name === x)?.look ?? ""));
    // Square, 4x4 and import sizes: two lines, four characters on top and three underneath
    const two = !bike && info ? twoLineLayout(info.w, info.h, false) : null;
    const twoRows = !!two && bikeLines(text).length > 1;
    return (
      <div
        className={`rk-p3d__face${bike ? " is-bike" : ""}${reg ? "" : " is-empty"}`}
        {...attrs}
        style={{
          ...attrs.style,
          aspectRatio: ratio,
          width: "100%",
          // Letters are sized from the plate's height, as on a real plate, so shorter plates (hex,
          // 16", 13") keep full-size characters; a long reg shrinks only as much as it must to fit.
          ["--rk-hxr" as string]: String((info?.h ?? 111) / (info?.w ?? 520)),
          ["--rk-chars" as string]: String(Math.max(3, text.length)),
          // Letters drawn at their real size (79mm on the plate), the badge at its real 50mm.
          ["--rk-fs" as string]: `${plateFontPct(text, info?.w ?? 520, { hex: !!attrs["data-hex"], badge, gaps }).toFixed(3)}cqi`,
          ...(attrs["data-look"] === "printed-bike" && faceW ? { ["--rk-bevel" as string]: thinFilterFor((plateFontPct(text, info?.w ?? 520, { hex: !!attrs["data-hex"], badge, gaps }) / 100) * faceW * 0.81) } : {}),
          ...(attrs["data-look"].startsWith("bevel") && faceW ? { ["--rk-bevel" as string]: bevelFilterFor((plateFontPct(text, info?.w ?? 520, { hex: !!attrs["data-hex"], badge, gaps }) / 100) * faceW, attrs["data-look"] as BevelLook) } : {}),
          ["--rk-bw" as string]: `${((BADGE_MM / (info?.w ?? 520)) * 100).toFixed(3)}cqi`,
        }}
        aria-hidden
      >
        <PlateDecor c={c} />
        {/* Road legal plates carry the supplier's name and postcode, and the British Standard. */}
        {c.legal === "Legal" && (
          <>
            <span className="rk-pmark" style={{ fontSize: `${((LEGAL_MARK_MM / 0.716 / (info?.w ?? 520)) * 100).toFixed(3)}cqi` }}>
              <b>{SUPPLIER_NAME}</b> {SUPPLIER_POSTCODE}
            </span>
            <span className="rk-pbs" style={{ fontSize: `${((LEGAL_MARK_MM / 0.716 / (info?.w ?? 520)) * 100).toFixed(3)}cqi` }}>
              {BS_MARK}
            </span>
          </>
        )}
        {bike || twoRows ? (
          <span
            className="rk-ptext rk-ptext--2"
            style={twoRows && two && info ? { display: "grid", justifyItems: "center", fontSize: `${((two.charH / info.w) * 100) / 0.93}cqi`, lineHeight: 1 + two.gap / two.charH } : undefined}
          >
            {bikeLines(text).map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </span>
        ) : (
          <span className="rk-ptext">
            {gaps
              ? [...regChars(text)].map((ch, i) => (
                  // a space in the plate font is 0.195em wide
                  <span key={i} style={{ marginInlineEnd: i < gaps.length ? `${(gaps[i] * 0.195).toFixed(3)}em` : undefined }}>
                    {ch}
                  </span>
                ))
              : text}
          </span>
        )}
        <span className="rk-p3d__shine" aria-hidden />
      </div>
    );
  };

  const plate = (side: Side) => {
    const size = sizeOf(c, side);
    const info = sizeInfo(size) ?? sizeInfo(bike ? "9x7" : "Normal");
    const attrs = plateAttrs(c, side, bike ? "9x7" : size);
    const ratio = `${info?.w ?? 520} / ${info?.h ?? 111}`;
    const width = bike ? "46%" : `${100 * Math.max(0.5, sizeScale(size))}%`;
    return (
      <div key={side} className="rk-p3d__rig" style={{ width }} data-rig={side}>
        {/* thickness: thin copies of the plate stepping back behind the face */}
        {Array.from({ length: EDGE_LAYERS }, (_, i) => (
          <div
            key={i}
            className="rk-p3d__edge"
            data-side={side}
            data-hex={attrs["data-hex"]}
            data-hexflip={attrs["data-hexflip"]}
            data-look={attrs["data-look"]}
            style={{ aspectRatio: ratio, transform: `translateZ(${-(i + 1) * 1.4}px)` /* halved by the 2x supersample scale */, ...(attrs["data-hex"] ? { ["--rk-hxr" as string]: String((info?.h ?? 111) / (info?.w ?? 520)) } : {}) }}
            aria-hidden
          />
        ))}
        {face(side)}
      </div>
    );
  };

  return (
    <div className="rk-p3d" data-p3d data-count={sides.length} data-view={view} data-gl={real3d || undefined} data-light={day ? "day" : undefined}>
      <div className="rk-p3d__bar">
        <span className="rk-p3d__t">Live preview</span>
        <div className="rk-p3d__light" role="radiogroup" aria-label="Preview lighting">
          <button type="button" role="radio" aria-checked={!day} onClick={() => setLight(false)} data-p3d-light="night">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            </svg>
            Night
          </button>
          <button type="button" role="radio" aria-checked={day} onClick={() => setLight(true)} data-p3d-light="day">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
            </svg>
            Day
          </button>
        </div>
      </div>
      <div className="rk-p3d__seg rk-p3d__sides" role="radiogroup" aria-label="Which plates">
        {(
          [
            ["both", "Front & rear"],
            ["front", "Front only"],
            ["rear", "Rear only"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={show === k}
            disabled={bikeOnly && k !== "rear"}
            onClick={() => setPick(k)}
            data-p3d-show={k}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={stage}
        className="rk-p3d__stage"
        role="img"
        aria-label={`${view === "2d" ? "2D" : "3D"} preview of your ${both ? "front and rear plates" : `${sides[0]} plate`}${reg ? `, ${reg.toUpperCase()}` : ""}`}
      >
        {real3d ? (
          <PlateGL reg={reg} c={c} sides={sides} onFail={() => setGl(false)} day={day} />
        ) : (
          <>
            {sides.map(plate)}
            <span className="rk-p3d__floor" aria-hidden />
          </>
        )}
      </div>
      <p className="rk-p3d__hint">{view === "2d"
          ? "A straight-on picture of your plate" + (both ? "s" : "") + ". The finished plate" + (both ? "s" : "") + " may differ slightly."
          : `Drag to turn ${both ? "them" : "it"}${real3d ? ". Scroll, pinch or use + and − to zoom in close, and Shift + drag to move around" : ""}. A preview: the finished plate${both ? "s" : ""} may differ slightly.`}</p>
    </div>
  );
}
