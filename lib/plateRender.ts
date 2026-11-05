/**
 * Draws a number plate exactly as built in the plate builder, as a high-resolution picture
 * the "See it on your car" tool fits onto the customer's photo.
 *
 * The registration is drawn character for character as typed (only upper-cased and spaced the
 * way the builder already shows it). Nothing is generated or guessed.
 * Measurements follow a standard UK plate (520 × 111mm, 79mm characters).
 */

import { EXTRAS, hexPoints, isHex, lookOf, sizeInfo, sizeOf, type BuildConfig, type ExtraLook, type PlateLook } from "./builder";

export type PlateSpec = {
  reg: string;
  side: "front" | "rear";
  look: PlateLook;
  extras: ExtraLook[];
  /** Plate size in mm. */
  w: number;
  h: number;
  hex: boolean;
  /** Upside-down hex. */
  hexFlip?: boolean;
  bike: boolean;
  /** Custom Text extra (show plates only). */
  bottomText?: string;
  /** The style's name (some styles share a look but are made differently). */
  styleName?: string;
};

export function specFrom(c: BuildConfig, reg: string, side: "front" | "rear", style?: string | null): PlateSpec {
  const bike = c.vehicle === "Bike";
  const size = bike ? "9x7" : sizeOf(c, side);
  const info = sizeInfo(size) ?? sizeInfo(bike ? "9x7" : "Normal")!;
  return {
    reg: reg.toUpperCase().replace(/\s+/g, " ").trim(),
    side: bike ? "rear" : side,
    look: lookOf(style === undefined ? c.style : style),
    styleName: (style === undefined ? c.style : style) ?? undefined,
    extras: c.extras.map((x) => EXTRAS.find((e) => e.name === x)?.look).filter(Boolean) as ExtraLook[],
    w: info.w,
    h: info.h,
    hex: isHex(size),
    hexFlip: isHex(size) && !!c.hexFlip,
    bike,
    bottomText: c.legal === "Show" && c.extras.some((x) => EXTRAS.find((e) => e.name === x)?.look === "text") ? (c.bottomText ?? "").trim().toUpperCase() : "",
  };
}

const FONT = '"RK Plate", "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
/** Metro (show plates): a wider, squarer font, made 60mm high. */
const METRO = '"RK Metro", "RK Plate", "Barlow Condensed", Arial, sans-serif';

/** Make sure the plate font is ready before drawing (it's embedded in the page). */
export async function plateFontReady(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(`400 100px ${FONT}`, "AB12 CDE"), document.fonts.load(`400 100px ${METRO}`, "AB12 CDE")]);
  } catch {}
}

/** The plate's outline (rounded rectangle, or REG KING's hex shape). */
function outline(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, hex: boolean, flip = false) {
  ctx.beginPath();
  if (hex) {
    hexPoints(0, 0, W, H, flip).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    return;
  }
  const r = 5 * k;
  ctx.roundRect(0, 0, W, H, r);
}

/**
 * Draws the plate. `pxPerMm` sets the resolution (8 gives a 4160px wide standard plate;
 * the compositor scales it down to suit the photo).
 */
export function renderPlate(s: PlateSpec, pxPerMm = 6, opts: { chars?: boolean; sheen?: boolean; edge?: boolean; flatChars?: boolean; castShadow?: number } = {}): HTMLCanvasElement {
  // The 3D view draws raised characters, reflections and the edge itself, so it can leave them out here.
  // flatChars: just the black print (the 3D view domes clear resin over it for 3D Gel).
  // castShadow: the depth (mm) of raised letters the 3D view stands on the face; their shadow is painted in.
  const { chars = true, sheen: withSheen = true, edge = true, flatChars = false, castShadow = 0 } = opts;
  const k = pxPerMm;
  const W = Math.round(s.w * k);
  const H = Math.round(s.h * k);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  // Silver Retro: silver chisel-cut letters on a black plate
  const silverRetro = s.styleName === "Silver Retro";
  const metal = s.look === "metal-white" || s.look === "metal-silver" || silverRetro;

  // 1. Plate body
  ctx.save();
  outline(ctx, W, H, k, s.hex, s.hexFlip);
  ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  if (metal) {
    bg.addColorStop(0, "#2b2b2b");
    bg.addColorStop(1, "#0e0e0e");
  } else if (s.side === "rear") {
    bg.addColorStop(0, "#eab300");
    bg.addColorStop(1, "#d69c00");
  } else {
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#ececea");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // a faint diagonal sheen, as on the acrylic face
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0.15, "rgba(255,255,255,0)");
  sheen.addColorStop(0.24, "rgba(255,255,255,0.18)");
  sheen.addColorStop(0.32, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  if (withSheen) ctx.fillRect(0, 0, W, H);

  // 2. Badge band on the left
  const badge = s.extras.find((e) => e === "uk" || e === "ev-uk" || e === "ev" || e === "flag" || e === "badge");
  let left = 0;
  if (badge && !s.bike) {
    const bw = 50 * k;
    left = bw;
    ctx.fillStyle = badge === "ev" || badge === "ev-uk" ? "#0b8a3d" : "#0a47c2";
    ctx.fillRect(0, 0, bw, H);
    if (badge === "uk" || badge === "ev-uk") drawUnionFlag(ctx, bw * 0.16, H * 0.12, bw * 0.68, bw * 0.34);
    if (badge === "badge") {
      ctx.fillStyle = "#ffc200";
      ctx.font = `700 ${18 * k}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RK", bw / 2, H * 0.32);
    }
    const word = badge === "ev" || badge === "ev-uk" ? "EV" : badge === "badge" ? "" : "UK";
    if (word) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${20 * k}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(word, bw / 2, H - 12 * k);
    }
  }

  // 3. Characters
  const lines = s.bike ? bikeSplit(s.reg) : [s.reg];
  // Bike Print and Bike Gel: the smaller 64mm motorbike characters, also on car plates
  const small = s.look === "printed-bike" || s.look === "gel-bike" || s.look === "raised-bike" || s.look === "gel-4d-bike";
  const metro = s.styleName === "Metro Print";
  const charH = metro ? Math.min(60 * k, H * 0.71) : s.bike || small ? 64 * k : Math.min(79 * k, H * 0.71);
  const ink = metal ? (s.look === "metal-silver" || silverRetro ? "#c9ccd1" : "#f4f4f4") : "#111111";
  const text = drawText(lines, {
    W,
    H,
    left: left + 11 * k,
    right: W - 11 * k,
    charH,
    k,
    font: metro ? METRO : FONT,
  });
  if (chars) composeCharacters(ctx, text, flatChars ? (s.look === "printed-bike" ? "printed-bike" : "printed") : s.look, ink, k, s.extras.includes("fade"));
  else if (castShadow > 0) {
    // the shadow under raised letters, falling down and to the right, away from the light
    softShadow(ctx, text, castShadow * 0.8 * k, castShadow * 1.6 * k, castShadow * 1.4 * k, "rgba(0,0,0,0.5)");
    softShadow(ctx, text, castShadow * 0.25 * k, castShadow * 0.5 * k, castShadow * 0.35 * k, "rgba(0,0,0,0.45)");
  }

  // 4. Border line
  if (s.extras.includes("border")) {
    ctx.save();
    ctx.strokeStyle = metal ? "#e8e8e8" : "#111";
    ctx.lineWidth = 3 * k;
    const inset = 10 * k;
    ctx.beginPath();
    ctx.roundRect(inset, inset, W - inset * 2, H - inset * 2, 8 * k);
    ctx.stroke();
    ctx.restore();
  }

  // 4b. Custom Text along the bottom (show plates)
  if (s.bottomText) {
    ctx.save();
    ctx.fillStyle = metal ? "#e8e8e8" : "#111";
    ctx.font = `700 ${Math.round(11 * k)}px "Barlow", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.bottomText, W / 2, H - 6 * k, W * 0.8);
    ctx.restore();
  }

  // 5. Tint (show plates)
  if (s.extras.includes("tint")) {
    ctx.fillStyle = "rgba(20,16,0,0.32)";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // 6. The acrylic edge: a thin darker rim
  if (!edge) return cv;
  ctx.save();
  outline(ctx, W, H, k, s.hex, s.hexFlip);
  ctx.lineWidth = 1.6 * k;
  ctx.strokeStyle = metal ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
  ctx.stroke();
  ctx.restore();
  return cv;
}

function bikeSplit(reg: string): string[] {
  const r = reg.trim();
  const i = r.indexOf(" ");
  if (i > 0) return [r.slice(0, i), r.slice(i + 1)];
  return r.length > 4 ? [r.slice(0, 4), r.slice(4)] : [r];
}

/** The characters on their own layer (black on transparent), sized and placed like a real plate. */
function drawText(lines: string[], o: { W: number; H: number; left: number; right: number; charH: number; k: number; font: string }): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = o.W;
  cv.height = o.H;
  const ctx = cv.getContext("2d")!;
  // Font size that gives the right character height
  ctx.font = `400 100px ${o.font}`;
  const m = ctx.measureText("H");
  const capAt100 = m.actualBoundingBoxAscent || 72;
  const size = (o.charH / capAt100) * 100;
  ctx.font = `400 ${size}px ${o.font}`;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const avail = o.right - o.left;
  const gap = o.k * 14;
  const total = lines.length * o.charH + (lines.length - 1) * gap;
  let y = (o.H - total) / 2 + o.charH;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    // Never cut or swap characters: if a long reg doesn't fit a short plate, it's narrowed to fit.
    const sx = w > avail ? avail / w : 1;
    ctx.save();
    ctx.translate((o.left + o.right) / 2, y);
    ctx.scale(sx, 1);
    ctx.fillText(line, 0, 0);
    ctx.restore();
    y += o.charH + gap;
  }
  return cv;
}

/**
 * A blurred shadow of a layer. Uses the canvas shadow (works in every browser, unlike canvas filters):
 * the layer itself is drawn off to one side, so only its shadow lands on the plate.
 */
function softShadow(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, dx: number, dy: number, blur: number, colour: string) {
  const away = layer.width + 100;
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = dx + away;
  ctx.shadowOffsetY = dy;
  ctx.drawImage(layer, -away, 0);
  ctx.restore();
}

/** Tints a black-on-transparent layer to a colour. */
function tinted(layer: HTMLCanvasElement, colour: string | CanvasGradient): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = layer.width;
  cv.height = layer.height;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(layer, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

/**
 * Printed: flat ink. 3D gel: a domed resin coat (highlight on top, soft shadow underneath).
 * 4D: laser-cut letters standing off the plate, drawn as a solid extrusion with a cast shadow.
 */
/** Thins every stroke by r px: the letters' overlap with copies of themselves nudged round a circle. */
function thinned(layer: HTMLCanvasElement, r: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = layer.width;
  out.height = layer.height;
  const c = out.getContext("2d")!;
  c.drawImage(layer, 0, 0);
  c.globalCompositeOperation = "destination-in";
  for (let a = 0; a < 16; a++) c.drawImage(layer, Math.cos((a / 16) * Math.PI * 2) * r, Math.sin((a / 16) * Math.PI * 2) * r);
  return out;
}

function composeCharacters(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, look: PlateLook, ink: string, k: number, fade: boolean) {
  // Bike Print: the same characters in a thinner print
  // Bike Gel: 3D Gel on the smaller characters (same stroke for its size)
  if (look === "gel-bike") look = "gel";
  // Bike Print: the plate font on the smaller characters, with slightly thinner strokes
  if (look === "printed-bike") {
    layer = thinned(layer, 0.75 * k);
    look = "printed";
  }
  const H = layer.height;
  const face = tinted(layer, ink);
  if (fade) {
    const f = face.getContext("2d")!;
    const g = f.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0.3, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    f.globalCompositeOperation = "destination-in";
    f.fillStyle = g;
    f.fillRect(0, 0, face.width, H);
  }
  const depthMm = look === "raised" || look === "raised-bike" || look === "bevel" || look === "bevel-matt" ? 3 : look === "raised-deep" || look === "gel-4d" || look === "gel-4d-bike" || look === "bevel-x" || look === "bevel-matt-x" ? 5 : 0;

  if (look === "metal-white" || look === "metal-silver") {
    // pressed metal: a dark lip above, a soft shadow below
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowOffsetY = 2 * k;
    ctx.shadowBlur = 2 * k;
    ctx.drawImage(face, 0, 0);
    ctx.restore();
    return;
  }

  if (depthMm > 0) {
    // cast shadow on the plate, then the sides of the letters (darker further back), then the face
    softShadow(ctx, layer, depthMm * 0.35 * k, depthMm * 1.5 * k, depthMm * 1.8 * k, "rgba(0,0,0,0.5)");
    const back = tinted(layer, "#151412");
    const near = tinted(layer, "#34332f");
    const reach = depthMm * k * 0.95;
    const steps = Math.max(3, Math.round(reach));
    for (let i = steps; i >= 1; i--) ctx.drawImage(i > steps / 2 ? back : near, 0, (reach * i) / steps);
  } else if (look === "gel") {
    softShadow(ctx, layer, 0, 2.4 * k, 3.5 * k, "rgba(0,0,0,0.35)");
  }

  ctx.drawImage(face, 0, 0);

  if (look === "gel" || look === "gel-4d" || look === "gel-4d-bike") {
    // the resin dome: light along the top of each character, falling away underneath
    const hl = document.createElement("canvas");
    hl.width = layer.width;
    hl.height = H;
    const h = hl.getContext("2d")!;
    h.drawImage(layer, 0, -1.2 * k);
    h.globalCompositeOperation = "source-in";
    const g = h.createLinearGradient(0, H * 0.12, 0, H * 0.6);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    h.fillStyle = g;
    h.fillRect(0, 0, hl.width, H);
    // keep the highlight inside the letters
    h.globalCompositeOperation = "destination-in";
    h.drawImage(layer, 0, 0);
    ctx.drawImage(hl, 0, 0);
  } else if (depthMm > 0) {
    // 4D acrylic: a crisp light edge along the top of the face
    const edge = document.createElement("canvas");
    edge.width = layer.width;
    edge.height = H;
    const e = edge.getContext("2d")!;
    e.drawImage(layer, 0, 0);
    e.globalCompositeOperation = "destination-out";
    e.drawImage(layer, 0, 1.1 * k);
    e.globalCompositeOperation = "source-in";
    e.fillStyle = "rgba(255,255,255,0.32)";
    e.fillRect(0, 0, edge.width, H);
    ctx.drawImage(edge, 0, 0);
  }
}

function drawUnionFlag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 60, h / 30);
  ctx.beginPath();
  ctx.rect(0, 0, 60, 30);
  ctx.clip();
  ctx.fillStyle = "#012169";
  ctx.fillRect(0, 0, 60, 30);
  ctx.lineCap = "butt";
  const line = (colour: string, width: number, path: () => void) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    path();
    ctx.stroke();
  };
  const diag = () => {
    ctx.moveTo(0, 0);
    ctx.lineTo(60, 30);
    ctx.moveTo(60, 0);
    ctx.lineTo(0, 30);
  };
  const cross = () => {
    ctx.moveTo(30, 0);
    ctx.lineTo(30, 30);
    ctx.moveTo(0, 15);
    ctx.lineTo(60, 15);
  };
  line("#fff", 6, diag);
  line("#C8102E", 2.5, diag);
  line("#fff", 10, cross);
  line("#C8102E", 6, cross);
  ctx.restore();
}
