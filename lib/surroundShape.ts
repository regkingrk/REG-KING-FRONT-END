/**
 * The shape of REG KING's surrounds (as their supplier makes them), in mm, y up, with the plate's centre at
 * the origin. Shared by the 2D drawing and the 3D view so they always agree.
 *
 * Framed: a rim and border round the plate; under the bottom border hangs the tab, a shallow trapezoid with
 *   angled ends. On the tab sits the panel (the "triangle" piece, in its own colour) carrying the logo or text.
 * Frameless: no border; under the plate a thin "wing" pokes out with angled ends, and over it the panel
 *   (a deeper trapezoid, set a little right of centre) carries the logo or text.
 */
import { FRAME_COLOURS, swatch } from "./accessories";

export type Pt = [number, number];
export type SurroundGeometry = {
  plateW: number;
  plateH: number;
  /** Framed: the frame (border) outline round the plate, as a rounded rectangle. */
  frame: { w: number; h: number; cy: number; r: number } | null;
  /** Framed: the tab under the frame (frame colour). */
  tab: Pt[] | null;
  /** Frameless: the wing under the plate (backing colour). */
  wing: Pt[] | null;
  /** The panel carrying the lettering (its own colour). */
  panel: Pt[];
  /** Where the lettering goes. */
  art: { cx: number; cy: number; w: number; h: number };
  /** Lowest point, for framing the view. */
  bottom: number;
};

const trap = (cx: number, top: number, bottom: number, topW: number, slant: number): Pt[] => [
  [cx - topW / 2, top],
  [cx + topW / 2, top],
  [cx + topW / 2 - slant, bottom],
  [cx - topW / 2 + slant, bottom],
];

export function surroundGeometry(framed: boolean, plateW: number, plateH = 111): SurroundGeometry {
  const pb = -plateH / 2; // plate's bottom edge
  if (framed) {
    const side = 7, top = 7, bottomBorder = 9;
    const frame = { w: plateW + side * 2, h: plateH + top + bottomBorder, cy: (top - bottomBorder) / 2, r: 10 };
    const fb = pb - bottomBorder; // frame's bottom edge
    const tabW = plateW * 0.5, depth = 20, slant = 34;
    const tab = trap(0, fb + 1, fb - depth, tabW, slant);
    // the panel: over the tab's face and the strip of border above it, its ends at the tab's angle, set in a little
    const k = slant / depth;
    const pTop = pb - 7.5, pBot = fb - depth + 3; // just below the 4D outline round the plate
    const panel = trap(0, pTop, pBot, tabW + 2 * k * (pTop - (fb + 1)) - 6, k * (pTop - pBot));
    return {
      plateW,
      plateH,
      frame,
      tab,
      wing: null,
      panel,
      art: { cx: 0, cy: (pb - 7.5 + fb - depth + 3) / 2, w: tabW - slant - 10, h: depth + bottomBorder - 15 },
      bottom: fb - depth,
    };
  }
  // centred under the plate: the panel carrying the lettering, with the wing poking out a little beyond each end
  const panelL = -plateW * 0.25, panelR = plateW * 0.25, panelDepth = 24, slant = 26;
  const panelW = panelR - panelL, cx = 0;
  const panel = trap(cx, pb + 2, pb - panelDepth, panelW, slant);
  const wingDepth = 9, wingW = panelW + plateW * 0.16;
  const wing = trap(0, pb + 2, pb - wingDepth, wingW, 9);
  return {
    plateW,
    plateH,
    frame: null,
    tab: null,
    wing,
    panel,
    art: { cx, cy: pb - panelDepth / 2 + 1, w: panelW - slant - 12, h: panelDepth - 6 },
    bottom: pb - panelDepth,
  };
}

/** The panel's colour: the customer's pick, or (unset) a shade of the part under it (the tab or the wing): charcoal on dark colours, slightly darker on light ones. */
export function panelColourHex(underKey: string, panelKey?: string | null, framed = false): string {
  // framed: the wing (tab and the piece on it) is one colour
  if (framed) return swatch(FRAME_COLOURS, underKey).hex;
  if (panelKey) return swatch(FRAME_COLOURS, panelKey).hex;
  const b = swatch(FRAME_COLOURS, underKey).hex;
  const [r, g, bl] = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const light = (0.299 * r + 0.587 * g + 0.114 * bl) / 255 > 0.5;
  const mix = (v: number) => Math.round(light ? v * 0.84 : v + (255 - v) * 0.13);
  return "#" + [r, g, bl].map((v) => mix(v).toString(16).padStart(2, "0")).join("");
}

