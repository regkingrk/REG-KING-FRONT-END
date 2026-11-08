"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { stylesFor, type BuildConfig } from "@/lib/builder";
import { composite, defaultQuad, findPlate, growQuad, photoGrain, plateForQuad, plateLight, quadOk, subQuad, type Light, type Quad } from "@/lib/carPhoto";
import { plateFontReady, renderPlate, specFrom } from "@/lib/plateRender";

type Side = "front" | "rear";
const MAX_SIDE = 2000; // working size of the photo (long edge)
const MAX_MB = 25;

/**
 * See it on your car.
 * The customer adds a photo; we find the plate in it, fit their plate from the builder onto it in
 * the same perspective and light, and show before and after. Everything happens on their device:
 * the photo is never uploaded or kept.
 */
export function PlateOnCar({ reg, c, side, onStyle, studio = false }: { reg: string; c: BuildConfig; side: Side; onStyle?: (style: string) => void; /** In-store studio: no Add to basket or Download, and no RK style. */ studio?: boolean }) {
  const [stage, setStage] = useState<"empty" | "working" | "ready">("empty");
  const [err, setErr] = useState("");
  const [quad, setQuad] = useState<Quad | null>(null);
  const [found, setFound] = useState<boolean | null>(null);
  const [adjust, setAdjust] = useState(false);
  const [split, setSplit] = useState(15);
  const [dragging, setDragging] = useState<number | null>(null);
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);

  const baseCv = useRef<HTMLCanvasElement | null>(null); // the untouched photo
  const baseData = useRef<ImageData | null>(null);
  const light = useRef<Light>(null);
  const outCv = useRef<HTMLCanvasElement>(null); // photo with the new plate
  const beforeCv = useRef<HTMLCanvasElement>(null);
  const loupeCv = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const lastBox = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const raf = useRef(0);

  const regOk = reg.replace(/\s/g, "").length >= 2;
  const styleName = c.style ?? "Printed";
  const spec = useMemo(() => specFrom(c, reg, side, styleName), [c, reg, side, styleName]);
  const plateImg = useRef<HTMLCanvasElement | null>(null);
  const [plateVer, setPlateVer] = useState(0);

  // The plate picture, redrawn whenever the design changes.
  useEffect(() => {
    let live = true;
    plateFontReady().then(() => {
      if (!live) return;
      plateImg.current = renderPlate(spec, 6);
      setPlateVer((v) => v + 1);
    });
    return () => {
      live = false;
    };
  }, [spec]);

  /** Redraws only the area around the plate. */
  const draw = useCallback(() => {
    const out = outCv.current;
    const base = baseData.current;
    const plate = plateImg.current;
    if (!out || !base || !plate || !quad) return;
    const ctx = out.getContext("2d")!;
    const prev = lastBox.current;
    if (prev) ctx.putImageData(base, 0, 0, prev.x, prev.y, prev.w, prev.h);
    if (!quadOk(quad)) {
      lastBox.current = null;
      return;
    }
    // The corners mark the old plate (a standard size). A different size of new plate sits in its middle.
    const std = spec.bike ? { w: 229, h: 178 } : { w: 520, h: 111 };
    const cover = growQuad(quad, 0.03);
    const place = subQuad(growQuad(quad, 0.012), spec.w / std.w, spec.h / std.h);
    lastBox.current = composite(ctx, base, plateForQuad(plate, place), cover, place, found ? light.current : null, photoGrain(base, quad));
  }, [quad, found, spec]);

  useEffect(() => {
    if (stage !== "ready") return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
  }, [draw, plateVer, stage]);

  /* ---------------- loading a photo ---------------- */

  const decode = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
    const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      try {
        return await viaImg(file);
      } catch {
        if (!heic) throw new Error("decode");
        // iPhone HEIC photos in browsers that can't open them: convert on the device first.
        const jpeg = await heicToJpeg(file);
        return await viaImg(jpeg);
      }
    }
  };

  const onFile = async (file?: File | null) => {
    setErr("");
    if (!file) return;
    const okType = file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
    if (!okType) return setErr("Please choose a photo (JPG, PNG or HEIC).");
    if (file.size > MAX_MB * 1024 * 1024) return setErr(`That photo is over ${MAX_MB}MB. Please choose a smaller one.`);
    setStage("working");
    try {
      const img = await decode(file);
      const w0 = "naturalWidth" in img ? img.naturalWidth : img.width;
      const h0 = "naturalHeight" in img ? img.naturalHeight : img.height;
      if (Math.min(w0, h0) < 320) throw new Error("small");
      const s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
      const W = Math.round(w0 * s);
      const H = Math.round(h0 * s);
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      if ("close" in img) img.close();
      baseCv.current = cv;
      baseData.current = ctx.getImageData(0, 0, W, H);
      detect(side);
      setStage("ready");
      setSplit(15);
    } catch (e) {
      setStage(baseData.current ? "ready" : "empty");
      setErr(
        (e as Error).message === "small"
          ? "That photo is too small. Please use a larger one."
          : "We couldn't open that photo. Please try a JPG or PNG. On an iPhone, choosing a photo from your library works best.",
      );
    }
  };

  /** Finds the plate (on a smaller copy, for speed) and sets the corners. */
  const detect = (forSide: Side) => {
    const base = baseCv.current;
    if (!base) return;
    const W = base.width;
    const H = base.height;
    const s = Math.min(1, 800 / Math.max(W, H));
    const sm = document.createElement("canvas");
    sm.width = Math.round(W * s);
    sm.height = Math.round(H * s);
    const sc = sm.getContext("2d")!;
    sc.drawImage(base, 0, 0, sm.width, sm.height);
    const hit = findPlate(sc.getImageData(0, 0, sm.width, sm.height), forSide === "rear" ? "yellow" : "white");
    lastBox.current = null;
    // start from a clean copy of the photo
    const out = outCv.current;
    const before = beforeCv.current;
    for (const cv of [out, before]) {
      if (!cv) continue;
      cv.width = W;
      cv.height = H;
      cv.getContext("2d")!.drawImage(base, 0, 0);
    }
    if (hit) {
      const q = hit.quad.map((p) => ({ x: (p.x + 0.5) / s, y: (p.y + 0.5) / s })) as Quad;
      light.current = plateLight(baseData.current!, q, hit.colour);
      setQuad(q);
      setFound(true);
      setAdjust(false);
    } else {
      light.current = null;
      setQuad(defaultQuad(W, H, spec.w / spec.h));
      setFound(false);
      setAdjust(true);
    }
  };

  // canvases mount after the first photo is chosen: paint them then
  useEffect(() => {
    if (stage !== "ready" || !baseCv.current) return;
    const base = baseCv.current;
    for (const cv of [outCv.current, beforeCv.current]) {
      if (!cv || cv.width === base.width) continue;
      cv.width = base.width;
      cv.height = base.height;
      cv.getContext("2d")!.drawImage(base, 0, 0);
      lastBox.current = null;
    }
    raf.current = requestAnimationFrame(draw);
  }, [stage, draw]);

  // Front ↔ rear: look again for the right colour of plate, unless the corners were placed by hand.
  const prevSide = useRef(side);
  useEffect(() => {
    if (prevSide.current === side) return;
    prevSide.current = side;
    if (stage === "ready" && found !== false) detect(side);
  }, [side]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- dragging corners ---------------- */

  const toPhoto = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    const base = baseCv.current!;
    return {
      x: Math.max(0, Math.min(base.width, ((e.clientX - r.left) / r.width) * base.width)),
      y: Math.max(0, Math.min(base.height, ((e.clientY - r.top) / r.height) * base.height)),
    };
  };
  const moveCorner = (i: number, e: React.PointerEvent) => {
    if (!quad) return;
    const p = toPhoto(e);
    const q = quad.map((c, j) => (j === i ? p : c)) as Quad;
    setQuad(q);
    setLoupe(p);
  };
  // the magnifier: a close-up of the photo under the finger
  useEffect(() => {
    const cv = loupeCv.current;
    const base = baseCv.current;
    if (!cv || !base || !loupe) return;
    const ctx = cv.getContext("2d")!;
    const z = 3;
    const r = cv.width / 2;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(base, loupe.x - r / z, loupe.y - r / z, (r * 2) / z, (r * 2) / z, 0, 0, r * 2, r * 2);
    ctx.strokeStyle = "#ffc200";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r, r - 12);
    ctx.lineTo(r, r + 12);
    ctx.moveTo(r - 12, r);
    ctx.lineTo(r + 12, r);
    ctx.stroke();
    ctx.restore();
  }, [loupe]);

  /* ---------------- actions ---------------- */

  const download = () => {
    const out = outCv.current;
    if (!out) return;
    const cv = document.createElement("canvas");
    cv.width = out.width;
    cv.height = out.height;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(out, 0, 0);
    // a small, honest label in the corner
    const fs = Math.max(14, Math.round(out.width / 70));
    ctx.font = `600 ${fs}px Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const label = "Preview by REG KING";
    const tw = ctx.measureText(label).width;
    ctx.fillRect(out.width - tw - fs * 1.6, out.height - fs * 2.2, tw + fs * 1.2, fs * 1.7);
    ctx.fillStyle = "#ffc200";
    ctx.fillText(label, out.width - fs, out.height - fs * 0.9);
    cv.toBlob(
      (b) => {
        if (!b) return;
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = `regking-${reg.replace(/\s+/g, "").toLowerCase() || "plate"}-preview.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      },
      "image/jpeg",
      0.92,
    );
  };
  const addToBasket = () => {
    const form = document.getElementById("plate-search") as HTMLFormElement | null;
    form?.requestSubmit();
  };
  const clear = () => {
    baseCv.current = null;
    baseData.current = null;
    light.current = null;
    lastBox.current = null;
    setQuad(null);
    setFound(null);
    setStage("empty");
  };

  const styles = stylesFor(c.vehicle, c.legal ?? "Legal").filter((st) => !studio || st.name !== "RK");
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const W = baseCv.current?.width ?? 1;
  const H = baseCv.current?.height ?? 1;

  /* ---------------- views ---------------- */

  if (stage !== "ready") {
    return (
      <div className="poc poc--empty" data-poc>
        <label className={`poc__pick${regOk ? "" : " is-off"}`}>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            disabled={!regOk || stage === "working"}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
            data-poc-file
          />
          <span className="poc__btn">{stage === "working" ? "Finding your plate…" : "See it on your car"}</span>
          <span className="poc__line">
            {regOk
              ? `Add a photo of the ${side === "front" ? "front" : "back"} of your car. We'll put ${reg.toUpperCase()} on it.`
              : "Type your registration first, then add a photo of your car."}
          </span>
        </label>
        {err && (
          <p className="poc__err" role="alert">
            {err}
          </p>
        )}
        <p className="poc__fine">Your photo stays on this device. It isn&apos;t uploaded or saved. JPG, PNG or HEIC, up to {MAX_MB}MB.</p>
      </div>
    );
  }

  return (
    <div className="poc" data-poc data-adjust={adjust || undefined}>
      <div className="poc__status" role="status">
        {found ? (
          <>
            <b>Plate found.</b> {adjust ? "Drag the corners to fine-tune." : "Not quite right?"}
          </>
        ) : (
          <>
            <b>We couldn&apos;t find the plate automatically.</b> Drag the four yellow corners onto your plate.
          </>
        )}
        <button type="button" className="poc__link" onClick={() => setAdjust((a) => !a)} data-poc-adjust>
          {adjust ? "Done" : "Adjust corners"}
        </button>
      </div>

      <div className="poc__stage" ref={box} style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={outCv} className="poc__img" aria-label={`Your car with ${reg.toUpperCase()} on a ${styleName} plate`} role="img" />
        {/* before: the original photo, shown to the left of the slider */}
        <canvas ref={beforeCv} className="poc__img poc__before" hidden={adjust} style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-hidden />
        {!adjust && (
          <>
            <span className="poc__tag poc__tag--l" aria-hidden>
              Before
            </span>
            <span className="poc__tag poc__tag--r" aria-hidden>
              After
            </span>
            <div className="poc__split" style={{ left: `${split}%` }} aria-hidden>
              <span />
            </div>
            <input
              className="poc__range"
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Compare before and after"
              data-poc-split
            />
          </>
        )}
        {adjust && quad && (
          <>
            <svg className="poc__outline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
              <polygon points={quad.map((p) => `${p.x},${p.y}`).join(" ")} data-bad={!quadOk(quad) || undefined} />
            </svg>
            {quad.map((p, i) => (
              <button
                key={i}
                type="button"
                className="poc__corner"
                style={{ left: pct(p.x, W), top: pct(p.y, H) }}
                aria-label={["Top left corner", "Top right corner", "Bottom right corner", "Bottom left corner"][i]}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setDragging(i);
                  setLoupe(toPhoto(e));
                }}
                onPointerMove={(e) => dragging === i && moveCorner(i, e)}
                onPointerUp={() => {
                  setDragging(null);
                  setLoupe(null);
                }}
                onPointerCancel={() => {
                  setDragging(null);
                  setLoupe(null);
                }}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 10 : 2;
                  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
                  if (!d) return;
                  e.preventDefault();
                  setQuad(quad.map((c, j) => (j === i ? { x: c.x + d[0], y: c.y + d[1] } : c)) as Quad);
                }}
                data-poc-corner={i}
              />
            ))}
            {loupe && (
              <canvas
                ref={loupeCv}
                width={120}
                height={120}
                className="poc__loupe"
                style={{ left: pct(loupe.x, W), top: pct(loupe.y, H) }}
                aria-hidden
              />
            )}
          </>
        )}
      </div>

      <p className="poc__reg">
        Showing <b>{reg.toUpperCase()}</b> on a {side} plate, exactly as typed.
      </p>

      <div className="poc__styles" role="radiogroup" aria-label="Plate style">
        {styles.map((st) => (
          <button key={st.name} type="button" role="radio" aria-checked={c.style === st.name} onClick={() => onStyle?.(st.name)} data-poc-style={st.name}>
            {st.name}
          </button>
        ))}
      </div>
      {!c.style && <p className="poc__fine">Showing Printed. Pick a style to see it on your car.</p>}

      <div className="poc__acts">
        {!studio && (
          <>
            <button type="button" className="poc__go" onClick={addToBasket} data-poc-basket>
              Add to basket
            </button>
            <button type="button" className="poc__ghost" onClick={download} data-poc-download>
              Download image
            </button>
          </>
        )}
        <label className="poc__ghost">
          Change photo
          <input
            type="file"
            accept="image/*,.heic,.heif"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" className="poc__link" onClick={clear}>
          Remove photo
        </button>
      </div>
      {err && (
        <p className="poc__err" role="alert">
          {err}
        </p>
      )}
      <p className="poc__fine">
        A visual preview: your finished plates may differ slightly in colour, size and finish. Your photo stays on this device. It isn&apos;t uploaded or saved.
      </p>
    </div>
  );
}

function viaImg(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

/** Converts an iPhone HEIC photo to JPEG in the browser, loading the converter only when it's needed. */
async function heicToJpeg(file: File): Promise<Blob> {
  type Conv = (o: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>;
  const w = window as unknown as { heic2any?: Conv };
  if (!w.heic2any) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("decode"));
      document.head.appendChild(s);
    });
  }
  const out = await w.heic2any!({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}
