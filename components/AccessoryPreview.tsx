"use client";
import { hexPoints } from "@/lib/builder";

import { useId } from "react";
import { panelColourHex, surroundGeometry, type Pt } from "@/lib/surroundShape";
import { surroundSize } from "@/lib/surroundSizes";
import { artItem, flagLipLayers } from "@/lib/artLibrary";
import { carLogo, carLogoSrc } from "@/lib/carLogos";
import {
  ART_FONTS,
  FRAME_COLOURS,
  PLATE_BACKGROUNDS,
  artCategoryOf,
  TEXT_COLOURS,
  swatch,
  type Artwork,
  type LogoDesign,
  type LogoPlateType,
  type SurroundDesign,
  type SurroundShape,
  type SurroundSize,
  type SurroundStyle,
} from "@/lib/accessories";

/*
 * Product renders for surrounds and logo plates. These are pictures of the product, so they use
 * light and shade (gloss, rim bevel, raised letters, a soft shadow) to look like the real thing.
 * Everything is drawn in SVG from the customer's choices, so it updates instantly.
 */

const PLATE_FONT = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const DISPLAY_FONT = '"Oswald", "Arial Narrow", Arial, sans-serif';

/* ---------- colour helpers ---------- */
const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
/** Mix a colour towards white (t > 0) or black (t < 0). */
const shade = (hex: string, t: number) => {
  const [r, g, b] = hexToRgb(hex);
  const to = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  return toHex(r + (to - r) * k, g + (to - g) * k, b + (to - b) * k);
};
const lum = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/* ---------- shared defs ---------- */
function Defs({ id }: { id: string }) {
  return (
    <>
      {/* woven carbon fibre: twill blocks with a lighter thread edge */}
      <pattern id={`${id}-carbon`} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#121212" />
        <rect width="5" height="5" fill="#262626" />
        <rect x="5" y="5" width="5" height="5" fill="#262626" />
        <rect width="5" height="1.2" fill="#3a3a3a" />
        <rect x="5" y="5" width="1.2" height="5" fill="#333" />
      </pattern>
      {/* gloss: bright at the top edge, fading, slightly darker towards the bottom */}
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
        <stop offset="0.08" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.28" />
      </linearGradient>
      {/* a soft diagonal reflection, like a window on acrylic */}
      <linearGradient id={`${id}-streak`} x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0.18" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.26" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="0.34" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.64" stopColor="#fff" stopOpacity="0.08" />
        <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      {/* the plate's reflective face */}
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="0.45" stopColor="#fff" stopOpacity="0.05" />
        <stop offset="1" stopColor="#000" stopOpacity="0.07" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-10%" y="-20%" width="120%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#000" floodOpacity="0.32" />
      </filter>
      <filter id={`${id}-lift`} x="-5%" y="-10%" width="110%" height="130%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#000" floodOpacity="0.45" />
      </filter>
      <filter id={`${id}-inner`} x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
    </>
  );
}

/** A rounded rectangle, or a hex plate with cut corners. */
export const shapePath = (x: number, y: number, w: number, h: number, r: number, hex: boolean, flip = false) => {
  if (hex) {
    // REG KING hex: the same outline as the plates (lib/builder.ts HEX).
    return hexPoints(x, y, w, h, flip).map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ") + " Z";
  }
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
};

/** Paint for a colour value: a solid colour, or carbon fibre. */
const paint = (value: string, list: typeof FRAME_COLOURS, id: string) => {
  const s = swatch(list, value);
  return { fill: s.carbon ? `url(#${id}-carbon)` : s.hex, base: s.carbon ? "#1c1c1c" : s.hex };
};

/**
 * The logo and/or text inside a box. With `raised`, letters are drawn as cut acrylic:
 * a darker side under each letter, a lit top edge, and a small shadow on the surface.
 * Manufacturer logos are shown by name only: the live site needs licensed artwork for each make.
 */
function ArtworkInBox({ a, x, y, w, h, colour, base, raised }: { a: Artwork; x: number; y: number; w: number; h: number; colour: string; base: string; raised?: boolean }) {
  const cat = artCategoryOf(a);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  // a brand logo picture: one-colour logos drawn in the chosen colour (as raised acrylic), badges as they are
  const logo = cat === "car" ? carLogo(a.carLogo) : null;
  if (logo) {
    const k = Math.min(w / logo.w, h / logo.h) * 0.94;
    const lw = logo.w * k, lh = logo.h * k, lx = x + (w - lw) / 2, ly = y + (h - lh) / 2;
    const src = carLogoSrc(logo.key);
    const depth = Math.min(3.5, Math.max(1.2, h * 0.07));
    const shape = (dx: number, dy: number, fill: string, key: string) => <rect key={key} x={lx + dx} y={ly + dy} width={lw} height={lh} fill={fill} mask={`url(#lm${uid})`} />;
    const side = shade(base, lum(base) > 0.5 ? -0.45 : -0.6);
    return (
      <>
        <defs>
          <mask id={`lm${uid}`} maskUnits="userSpaceOnUse" x={lx - 10} y={ly - 10} width={lw + 20} height={lh + 20} style={{ maskType: "alpha" }}>
            <image href={src} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="none" />
          </mask>
        </defs>
        {raised && shape(depth * 0.6, depth * 1.4, "rgba(0,0,0,0.35)", "s")}
        {raised && Array.from({ length: 4 }, (_, i) => shape((depth * (4 - i)) / 8, (depth * (4 - i)) / 4, logo.fullColour ? "#1c1c1c" : side, `e${i}`))}
        {logo.fullColour ? <image href={src} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="none" /> : shape(0, 0, colour, "f")}
      </>
    );
  }
  // flags, faith symbols and library shapes: drawn from the library, fitted to the box
  if ((cat === "country" || cat === "other") && a.item) {
    const it = artItem(a.item);
    if (it && it.layers.length) {
      const k = Math.min(w / it.w, h / it.h) * 0.95;
      const ox = x + (w - it.w * k) / 2, oy = y + (h - it.h * k) / 2;
      return (
        <g transform={`translate(${ox} ${oy}) scale(${k})`} style={{ color: colour }}>
          {it.layers.map((l, i) =>
            l.stroke ? (
              <path key={i} d={l.d} fill="none" stroke={l.stroke === "currentColor" ? colour : l.stroke} strokeWidth={l.width ?? 2} strokeLinejoin="round" />
            ) : (
              <path key={i} d={l.d} fill={l.fill ?? colour} fillRule={l.evenodd ? "evenodd" : "nonzero"} />
            ),
          )}
        </g>
      );
    }
    if (it) a = { ...a, logo: "none", text: it.name };
  }
  const fontCss = cat === "text" && a.font === "metro" ? ART_FONTS[1].css : PLATE_FONT;
  const hasLogo = (a.logo === "make" && !!a.make) || (a.logo === "upload" && !!a.upload);
  const text = a.text.trim().toUpperCase();
  const both = hasLogo && !!text;
  const logoCx = both ? x + w * 0.16 : x + w / 2;
  const textCx = both ? x + w * 0.64 : x + w / 2;
  const cy = y + h / 2;
  const textSize = Math.min(h * 0.66, (both ? w * 0.56 : w * 0.9) / Math.max(4, text.length * 0.8));
  const depth = Math.min(3.5, Math.max(1.2, h * 0.07));
  const draw = (dx: number, dy: number, fill: string, image = true) => (
    <g transform={`translate(${dx} ${dy})`}>
      {a.logo === "make" && a.make && (
        <g>
          <text x={logoCx} y={a.badge && a.badge !== "Logo only" ? cy - h * 0.08 : cy} textAnchor="middle" dominantBaseline="central" fontFamily={DISPLAY_FONT} fontWeight={700} fontSize={Math.min(h * 0.48, (both ? w * 0.22 : w * 0.7) / Math.max(3, a.make.length * 0.66))} fill={fill} letterSpacing="1">
            {a.make.toUpperCase()}
          </text>
          {a.badge && a.badge !== "Logo only" && (
            <text x={logoCx} y={cy + h * 0.3} textAnchor="middle" dominantBaseline="central" fontFamily={DISPLAY_FONT} fontWeight={600} fontSize={h * 0.22} fill={fill} letterSpacing="2">
              {a.badge.toUpperCase()}
            </text>
          )}
        </g>
      )}
      {a.logo === "upload" && a.upload && image && (
        <image href={a.upload} x={logoCx - (both ? w * 0.2 : w * 0.35)} y={y + h * 0.08} width={both ? w * 0.4 : w * 0.7} height={h * 0.84} preserveAspectRatio="xMidYMid meet" />
      )}
      {text && (
        <text x={textCx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily={fontCss} fontWeight={700} fontSize={textSize} fill={fill}>
          {text}
        </text>
      )}
    </g>
  );
  if (!raised) return draw(0, 0, colour);
  const side = shade(base, lum(base) > 0.5 ? -0.45 : -0.6);
  return (
    <>
      {draw(depth * 0.6, depth * 1.4, "rgba(0,0,0,0.35)", false)}
      {Array.from({ length: 4 }, (_, i) => draw((depth * (4 - i)) / 8, (depth * (4 - i)) / 4, side, false))}
      {draw(-0.4, -0.5, lum(base) > 0.5 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)", false)}
      {draw(0, 0, colour)}
    </>
  );
}



/**
 * A plate surround with the customer's plate in it, drawn to scale (mm).
 * Frameless: just the acrylic backing, cut to the plate, so nothing shows round it but the strip below.
 * Framed: a narrow border of gloss backing and a thin rim round the plate; standard or hex corners.
 * Text or a logo sits in raised 3D acrylic on the strip under the plate.
 */
export function SurroundPreview({
  style,
  design,
  side,
  reg,
  label,
  shape = "standard",
  size = "standard",
}: {
  style: SurroundStyle;
  design: SurroundDesign;
  side: "front" | "rear";
  reg: string;
  label?: string;
  shape?: SurroundShape;
  size?: SurroundSize;
}) {
  /*
   * As REG KING's supplier makes them (lib/surroundShape.ts, shared with the 3D view). Framed: a border and
   * rim round the plate, a tab hanging under it, and the panel on the tab carrying the lettering.
   * Frameless: just the plate, a thin wing under it and the panel, a little right of centre.
   */
  const id = useId().replace(/:/g, "");
  const framed = style === "framed";
  const sz = surroundSize(size);
  const hex = !!sz.hex || shape === "hex";
  const plateW = sz.w;
  const plateH = sz.h;
  const hasArt = !!a(design);
  const G = surroundGeometry(framed, plateW, plateH);
  const pad = 16; // room for the shadow
  const halfW = (G.frame ? G.frame.w : plateW) / 2;
  const topY = G.frame ? G.frame.cy + G.frame.h / 2 : plateH / 2;
  const W = halfW * 2 + pad * 2, H = topY - G.bottom + pad * 2 + 8;
  // mm (y up, plate centre at 0) to the drawing's coordinates
  const X = (x: number) => pad + halfW + x, Y = (y: number) => pad + topY - y;
  const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ") + " Z";
  const px = X(-plateW / 2), py = Y(plateH / 2);

  const frame = paint(design.frame, FRAME_COLOURS, id);
  const backing = paint(design.backing, FRAME_COLOURS, id);
  const textSw = swatch(TEXT_COLOURS, design.textColour);
  const textFill = textSw.carbon ? `url(#${id}-carbon)` : textSw.hex;
  const plateText = (reg || "YOUR REG").toUpperCase();
  const plateFace = side === "front" ? "#f6f6f2" : "#f6c900";
  const fontSize = Math.min(80, (plateW * 0.86) / Math.max(5, plateText.length * 0.56));

  const holder = G.frame ? frame : backing;
  // framed: the tab under the frame has its own colour; frameless: the wing is the backing colour
  const underPaint = backing;
  const body = G.frame ? shapePath(X(-G.frame.w / 2), Y(G.frame.cy + G.frame.h / 2), G.frame.w, G.frame.h, G.frame.r, hex) : shapePath(px, py, plateW, plateH, 6, hex);
  const under = G.tab ? pathOf(G.tab) : G.wing ? pathOf(G.wing) : "";
  const panelPath = pathOf(G.panel);
  const panelFill = panelColourHex(design.backing, design.panel, framed);
  const plate = shapePath(px, py, plateW, plateH, 6, hex);
  const rim = shapePath(px - 2.5, py - 2.5, plateW + 5, plateH + 5, 7.5, hex);
  const art = { x: X(G.art.cx - G.art.w / 2), y: Y(G.art.cy + G.art.h / 2), w: G.art.w, h: G.art.h };
  // a country's flag is printed across the whole lip (the panel), stripes running along it
  const lipFlag = artCategoryOf(design) === "country" ? artItem(design.item)?.flag : undefined;
  const lipLayers = lipFlag ? flagLipLayers(lipFlag, G.panel.map(([x, y]) => [X(x), Y(y)] as [number, number])) : null;

  return (
    <svg className="rk-acc-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? `${framed ? "Framed" : "Frameless"} plate holder preview`}>
      <defs>
        <Defs id={id} />
      </defs>

      {/* the holder (frame and tab, or backing and wing), with a soft shadow on the surface behind it */}
      <g filter={`url(#${id}-shadow)`}>
        <path d={body} fill={holder.fill} />
        {under && <path d={under} fill={underPaint.fill} />}
      </g>
      {!framed && <path d={body} fill={`url(#${id}-gloss)`} />}
      {under && <path d={under} fill={`url(#${id}-gloss)`} />}
      <path d={body} fill="none" stroke={shade(holder.base, lum(holder.base) > 0.5 ? -0.3 : 0.4)} strokeOpacity="0.55" strokeWidth="1.3" />
      {under && <path d={under} fill="none" stroke={shade(underPaint.base, lum(underPaint.base) > 0.5 ? -0.3 : 0.4)} strokeOpacity="0.5" strokeWidth="1" />}

      {/* framed: the 4D outline round the plate */}
      {framed && (
        <>
          {/* the frame round the plate is plain cut 4D acrylic: a flat, solid outline */}
          <path d={rim} fill="none" stroke={frame.fill} strokeWidth="9" />
        </>
      )}

      {/* the number plate, lifted slightly off the backing */}
      <g filter={`url(#${id}-lift)`}>
        <path d={plate} fill={plateFace} />
      </g>
      <path d={plate} fill={`url(#${id}-face)`} />
      <path d={plate} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
      <text x={px + plateW / 2} y={py + plateH / 2 + 2} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "var(--rk-plate-font)" }} fontSize={fontSize} fill="#111">
        {plateText}
      </text>

      {/* the panel (in its own colour) carrying the lettering */}
      <g filter={`url(#${id}-lift)`}>
        <path d={panelPath} fill={panelFill} />
      </g>
      {lipLayers && (
        <>
          <clipPath id={`${id}-lip`}>
            <path d={panelPath} />
          </clipPath>
          <g clipPath={`url(#${id}-lip)`}>
            {lipLayers.map((l, i) => (
              <path key={i} d={l.d} fill={l.fill} fillRule={l.evenodd ? "evenodd" : "nonzero"} />
            ))}
          </g>
        </>
      )}
      <path d={panelPath} fill={`url(#${id}-gloss)`} />
      <path d={panelPath} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />

      {/* reflections across the gloss acrylic */}
      {!framed && <path d={body} fill={`url(#${id}-streak)`} />}

      {/* raised lettering / logo on the panel */}
      {hasArt && !lipLayers && <ArtworkInBox a={design} x={art.x} y={art.y} w={art.w} h={art.h} colour={textFill} base={textSw.carbon ? "#2a2a2a" : textSw.hex} raised />}
    </svg>
  );
}

/** Does this design have text or a logo to show? */
function a(d: Artwork) {
  return !!d.text.trim() || (d.logo === "make" && !!d.make) || (d.logo === "upload" && !!d.upload) || (!!d.item && (d.cat === "country" || d.cat === "other"));
}

/**
 * A logo plate as it's made: a standard 520 x 111mm plate in 3mm gloss acrylic, the artwork printed
 * on the back so it sits under the glossy face. What sells it as real (from REG KING's own photos):
 * the true plate shape, crisp window reflections across the gloss, the thin acrylic edge catching the
 * light, and the customer's whole design filling the plate rather than a word in the plate font.
 */
export function LogoPlatePreview({ type, design, label, flat = false }: { type: LogoPlateType; design: LogoDesign; label?: string; flat?: boolean }) {
  const id = useId().replace(/:/g, "");
  const W = 520, H = 111, R = 7, P = 16;
  const bg = paint(design.background, PLATE_BACKGROUNDS, id);
  const light = lum(bg.base) > 0.55;
  const ink = swatch(TEXT_COLOURS, design.textColour);
  const inkFill = ink.carbon ? `url(#${id}-carbon)` : ink.hex;
  const raised = type === "acrylic" && !flat;
  const plate = shapePath(P, P, W, H, R, false);
  const img = design.logo === "upload" && design.upload ? design.upload : null;
  const text = design.text.trim();

  // The artwork: an uploaded design, or a placeholder laid out like a real logo plate
  // (a wordmark with a small spaced line under it).
  const art = (fill: string) =>
    img ? (
      (() => {
        // the logo inside the face (11mm in from every edge), at the chosen width and position
        const faceW = W - 22, boxW = faceW * (design.scale ?? 1);
        const place = design.place ?? "centre";
        const x = place === "left" ? P + 11 : place === "right" ? P + W - 11 - boxW : P + 11 + (faceW - boxW) / 2;
        const align = place === "left" ? "xMinYMid" : place === "right" ? "xMaxYMid" : "xMidYMid";
        return <image href={img} x={x} y={P + 11} width={boxW} height={H - 22} preserveAspectRatio={`${align} meet`} />;
      })()
    ) : (
      <g fill={fill} style={{ fontFamily: "var(--rk-body)" }} textAnchor="middle">
        <text x={P + W / 2} y={P + H * 0.5} fontSize={text.length > 14 ? 30 : 38} fontWeight={700} letterSpacing="3" dominantBaseline="alphabetic">
          {(text || "YOUR LOGO").toUpperCase()}
        </text>
        <rect x={P + W / 2 - 70} y={P + H * 0.61} width={140} height={1.2} opacity="0.55" />
        <text x={P + W / 2} y={P + H * 0.77} fontSize={10.5} fontWeight={500} letterSpacing="3.2" opacity="0.8" dominantBaseline="alphabetic">
          YOUR BUSINESS  |  YOUR TAGLINE
        </text>
      </g>
    );

  return (
    <svg className="rk-acc-svg rk-logoplate" viewBox={`0 0 ${W + P * 2} ${H + P * 2 + 8}`} role="img" aria-label={label ?? `${raised ? "4D acrylic" : "Printed"} logo plate preview`}>
      <defs>
        <Defs id={id} />
        <clipPath id={`${id}-clip`}>
          <path d={plate} />
        </clipPath>
        {/* window reflections on gloss acrylic: hard-edged bands at an angle, as in the photos */}
        <linearGradient id={`${id}-win`} x1="0" y1="0" x2="1" y2="0.42" gradientUnits="objectBoundingBox">
          <stop offset="0.14" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.145" stopColor="#fff" stopOpacity={light ? 0.35 : 0.16} />
          <stop offset="0.21" stopColor="#fff" stopOpacity={light ? 0.2 : 0.1} />
          <stop offset="0.215" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.235" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.24" stopColor="#fff" stopOpacity={light ? 0.55 : 0.32} />
          <stop offset="0.252" stopColor="#fff" stopOpacity={light ? 0.4 : 0.22} />
          <stop offset="0.257" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.66" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.665" stopColor="#fff" stopOpacity={light ? 0.28 : 0.12} />
          <stop offset="0.72" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* a faint fall-off across the face, lighter top left */}
        <linearGradient id={`${id}-fall`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={light ? 0.06 : 0.07} />
          <stop offset="1" stopColor="#000" stopOpacity={light ? 0.06 : 0.18} />
        </linearGradient>
        {/* the polished acrylic edge: bright where it catches the light */}
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={light ? "#c9c9c6" : "#8a8a8a"} />
          <stop offset="0.35" stopColor={light ? "#e9e9e6" : "#cfcfcf"} />
          <stop offset="0.7" stopColor={light ? "#bdbdb9" : "#5e5e5e"} />
          <stop offset="1" stopColor={light ? "#d6d6d2" : "#9a9a9a"} />
        </linearGradient>
        {/* artwork preview: see-through parts of the customer's file shown as a check pattern, as design tools do */}
        <pattern id={`${id}-check`} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#f4f4f2" />
          <rect width="8" height="8" fill="#dcdcd8" />
          <rect x="8" y="8" width="8" height="8" fill="#dcdcd8" />
        </pattern>
        <filter id={`${id}-cast`} x="-10%" y="-30%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {/* 3D: cut acrylic standing off the plate. The letters' own colours stepped down and right and
            darkened make the side walls; a thin lit rim on the top-left edges; a soft shadow on the plate. */}
        <filter id={`${id}-raise`} x="-4%" y="-15%" width="110%" height="150%" colorInterpolationFilters="sRGB">
          {[0.35, 0.7, 1.05, 1.4, 1.75, 2.1].map((k, i) => (
            <feOffset key={i} in="SourceGraphic" dx={k * 0.5} dy={k} result={`s${i}`} />
          ))}
          <feMerge result="sides">
            {[5, 4, 3, 2, 1, 0].map((i) => (
              <feMergeNode key={i} in={`s${i}`} />
            ))}
          </feMerge>
          <feColorMatrix in="sides" type="matrix" values="0.55 0 0 0 0  0 0.55 0 0 0  0 0 0.55 0 0  0 0 0 1 0" result="wall" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="blur" />
          <feOffset in="blur" dx="3.2" dy="5" result="castAt" />
          <feFlood floodColor="#000" floodOpacity={light ? 0.28 : 0.6} />
          <feComposite in2="castAt" operator="in" result="cast" />
          <feOffset in="SourceAlpha" dx="-0.6" dy="-0.7" result="up" />
          <feComposite in="up" in2="SourceAlpha" operator="out" result="rimShape" />
          <feFlood floodColor="#fff" floodOpacity="0.55" />
          <feComposite in2="rimShape" operator="in" result="rim" />
          <feMerge>
            <feMergeNode in="cast" />
            <feMergeNode in="wall" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="rim" />
          </feMerge>
        </filter>
      </defs>

      {/* soft shadow on the surface under the plate */}
      <ellipse cx={P + W / 2} cy={P + H + 4} rx={W * 0.46} ry={7} fill="#000" opacity="0.32" filter={`url(#${id}-cast)`} />
      {/* 3mm acrylic edge, seen just below the face */}
      {!flat && <path d={shapePath(P, P + 2.6, W, H, R, false)} fill={`url(#${id}-edge)`} />}
      {/* the plate face and the printed artwork, under the gloss */}
      <path d={plate} fill={flat && img ? `url(#${id}-check)` : bg.fill} />
      <g clipPath={`url(#${id}-clip)`}>
        {raised ? <g filter={`url(#${id}-raise)`}>{art(inkFill)}</g> : art(inkFill)}
        {!flat && <rect x={P} y={P} width={W} height={H} fill={`url(#${id}-fall)`} />}
        {/* gloss reflections run over the plate and the raised pieces alike; a black 4D base is satin, so only a faint sheen */}
        {!flat && <rect x={P} y={P} width={W} height={H} fill={`url(#${id}-win)`} opacity={raised ? (light ? 1 : 0.12) : 1} />}
      </g>
      {/* hairline round the face, and the lit top edge */}
      <path d={plate} fill="none" stroke={light ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.14)"} strokeWidth="0.8" />
      {!flat && <path d={`M${P + R},${P + 0.6} H${P + W - R}`} stroke="#fff" strokeOpacity={light ? 0.9 : 0.35} strokeWidth="0.9" />}
    </svg>
  );
}
