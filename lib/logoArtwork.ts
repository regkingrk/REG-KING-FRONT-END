/**
 * Checks a customer's logo file for the finish they chose, in the browser, before it's ordered.
 *
 * Printed: is the picture sharp enough at the size it's printed? (pixels per inch at that size)
 * 4D acrylic: can it be laser cut? Vector files (SVG, PDF, AI, EPS) are what we cut from. A picture
 * (PNG, JPG, WEBP) has to be traced into cut lines by hand, so it's always flagged for the team. Where
 * the outline can be read (an SVG, or a picture with a see-through background), parts thinner than the
 * smallest piece we can cut, and gaps narrower than that, are found and reported.
 *
 * Nothing here says a logo is ready to make: every logo still gets a proof from the team. The result
 * only tells the customer early, and flags anything that needs preparing by hand.
 */
import type { LogoPlateType } from "./accessories";

/** Smallest part or gap we can cut in acrylic, mm. CONFIRM with REG KING (laser and acrylic thickness). */
export const ACRYLIC_MIN_MM = 1.5;
/** Print sharpness at the printed size, pixels per inch. */
const PPI_GOOD = 150;
const PPI_LOW = 100;

export type ArtworkCheck = {
  finish: LogoPlateType;
  /** good: fine as it is. review: our team prepares or checks it by hand. poor: likely to disappoint as it is. */
  level: "good" | "review" | "poor";
  /** Plain-English findings for the customer (and the order). */
  notes: string[];
  /** Needs preparing by hand before we can make it (flagged on the order). */
  review: boolean;
};

const ext = (name: string) => (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "");
const isVectorDesign = (e: string) => e === "pdf" || e === "ai" || e === "eps";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, bad) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => bad(new Error("unreadable"));
    i.src = src;
  });
}

/** The logo's outline as a mask (1 = logo), drawn at `pxPerMm` for its size on the plate. */
function maskOf(img: HTMLImageElement, wMm: number, hMm: number, pxPerMm: number) {
  const w = Math.max(1, Math.round(wMm * pxPerMm)), h = Math.max(1, Math.round(hMm * pxPerMm));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  let anyClear = false;
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3];
    if (a < 250) anyClear = true;
    m[i] = a >= 128 ? 1 : 0;
  }
  return { m, w, h, anyClear };
}

/**
 * Distance (in px) from each pixel where `on` is true to the nearest pixel where it isn't (3-4 chamfer).
 * `outsideOn`: whether the area beyond the picture counts as `on` too.
 */
function distanceInside(on: (i: number) => boolean, w: number, h: number, outsideOn = false): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = on(i) ? INF : 0;
  const edge = outsideOn ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? edge : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}

/**
 * Share of `on` pixels that belong to parts narrower than `minPx` (a morphological opening): a part
 * survives only if a disc of that width fits inside it somewhere.
 */
function thinShare(on: (i: number) => boolean, w: number, h: number, minPx: number, outsideOn: boolean): number {
  const r = minPx / 2;
  const inside = distanceInside(on, w, h, outsideOn);
  // pixels where a disc of radius r fits; then everything within r of those is kept
  const fits = (i: number) => inside[i] >= r;
  const reach = distanceInside((i) => !fits(i), w, h, !outsideOn);
  let total = 0, lost = 0;
  for (let i = 0; i < w * h; i++) {
    if (!on(i)) continue;
    total++;
    if (reach[i] > r + 0.5) lost++;
  }
  return total ? lost / total : 0;
}

/**
 * Check a logo for a finish. `wMm` × `hMm`: the size it's made at on the plate. `src`: the file's
 * picture (null for PDF, AI and EPS, which we can't draw here). `svgText`: an SVG's source, if it is one.
 */
export async function checkArtwork(o: { finish: LogoPlateType; name: string; src: string | null; svgText?: string | null; wMm: number; hMm: number }): Promise<ArtworkCheck> {
  const e = ext(o.name);
  const notes: string[] = [];
  let review = false;
  let level: ArtworkCheck["level"] = "good";
  const worse = (l: ArtworkCheck["level"]) => {
    if (l === "poor" || (l === "review" && level === "good")) level = l;
  };

  if (isVectorDesign(e)) {
    review = true;
    worse("review");
    notes.push(
      o.finish === "acrylic"
        ? "A design file is the best start for 4D acrylic. We can't open it here, so our team checks its cut lines by hand and sends you a proof."
        : "A design file prints sharply at any size. We can't open it here, so our team checks it and sends you a proof.",
    );
    return { finish: o.finish, level, notes, review };
  }
  if (!o.src) return { finish: o.finish, level: "review", notes: ["We couldn't read this file here. Our team will check it and be in touch."], review: true };

  let img: HTMLImageElement;
  try {
    img = await loadImage(o.src);
  } catch {
    return { finish: o.finish, level: "review", notes: ["We couldn't read this file here. Our team will check it and be in touch."], review: true };
  }

  const svg = e === "svg";
  const svgVector = svg && !!o.svgText && /<(path|polygon|polyline|rect|circle|ellipse|line)\b/i.test(o.svgText);
  const svgBitmapOnly = svg && !!o.svgText && !svgVector && /<image\b/i.test(o.svgText);
  const svgHasText = svg && !!o.svgText && /<text\b/i.test(o.svgText);

  if (o.finish === "printed") {
    if (svg && !svgBitmapOnly) notes.push("Vector artwork: it prints sharply at any size.");
    else {
      const ppi = Math.min(img.naturalWidth / (o.wMm / 25.4), img.naturalHeight / (o.hMm / 25.4));
      if (ppi >= PPI_GOOD) notes.push("Sharp enough to print at this size.");
      else if (ppi >= PPI_LOW) {
        worse("review");
        review = true;
        notes.push(`It's ${img.naturalWidth} × ${img.naturalHeight} pixels, so it may print a little soft at this size. A larger file or an SVG or PDF would be sharper. Our team will check it.`);
      } else {
        worse("poor");
        review = true;
        notes.push(`It's only ${img.naturalWidth} × ${img.naturalHeight} pixels, which is too small to print sharply at this size. Please upload a larger file, or an SVG or PDF if you have one.`);
      }
    }
    if (svgHasText) notes.push("It has live text: our team will check the font comes out right.");
    return { finish: o.finish, level, notes, review };
  }

  // 4D acrylic
  if (!svgVector) {
    review = true;
    worse("review");
    notes.push(
      svgBitmapOnly
        ? "This SVG holds a picture rather than cut lines. Our team will trace it into cut lines by hand before making it."
        : "A picture file has to be traced into cut lines by hand before we can laser cut it. Our team will do that and send you a proof. An SVG or PDF is best for 4D.",
    );
  } else notes.push("Vector artwork: the best start for 4D acrylic.");
  if (svgHasText) {
    review = true;
    worse("review");
    notes.push("It has live text, which needs turning into outlines before cutting. Our team will do that.");
  }

  const pxPerMm = 6;
  const { m, w, h, anyClear } = maskOf(img, o.wMm, o.hMm, pxPerMm);
  if (!svg && !anyClear) {
    worse("review");
    review = true;
    notes.push("The file has a solid background, so we can't see the logo's outline here. Our team will work out the shape to cut.");
    return { finish: o.finish, level, notes, review };
  }
  const minPx = ACRYLIC_MIN_MM * pxPerMm;
  const thin = thinShare((i) => m[i] === 1, w, h, minPx, false);
  const tight = thinShare((i) => m[i] === 0, w, h, minPx, true);
  if (thin > 0.005) {
    worse(thin > 0.08 ? "poor" : "review");
    review = true;
    notes.push(`Some parts are thinner than ${ACRYLIC_MIN_MM}mm at this size, which is too fine to cut in acrylic. Making the logo bigger, or simplifying those parts, would help. Our team will advise.`);
  }
  if (tight > 0.003) {
    worse("review");
    review = true;
    notes.push(`Some gaps are narrower than ${ACRYLIC_MIN_MM}mm at this size, so those parts may join when cut. Our team will check them.`);
  }
  if (!review) notes.push(`Every part and gap is at least ${ACRYLIC_MIN_MM}mm at this size, so it looks cuttable. Our team still checks it and sends you a proof.`);
  return { finish: o.finish, level, notes, review };
}

/** One line for the order, so the workshop sees the result of the check. */
export const artworkOrderNote = (c: ArtworkCheck | undefined) =>
  !c ? "Not checked" : `${c.review ? "NEEDS PREPARING BY HAND" : "Checked"} (${c.level}): ${c.notes.join(" ")}`;

/**
 * The logo's size on the plate in mm: fitted inside the face (11mm in from every edge), at the chosen
 * share of that width, keeping its proportions.
 */
export const LOGO_FACE = { w: 520 - 22, h: 111 - 22 };
export function logoMm(aspect: number, scale: number): { w: number; h: number } {
  const boxW = LOGO_FACE.w * scale, boxH = LOGO_FACE.h;
  const w = Math.min(boxW, boxH * aspect);
  return { w, h: w / aspect };
}
