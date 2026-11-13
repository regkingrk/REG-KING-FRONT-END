/**
 * Custom Text extra (show plates): the fonts and sizes a customer can pick for the words along the
 * bottom of the plate.
 *
 * The fonts are Google Fonts (all free for commercial use under the SIL Open Font Licence), loaded by
 * next/font in app/plateTextFonts.ts. Each sets a CSS variable on <html>; the canvas reads the real
 * family name from it. Files only download when a font is used.
 *
 * Sizes are the height of a capital letter, in mm, as printed. A size is only offered if the words
 * fit in the strip under the reg (clear of the characters, any border and the plate edge) and across
 * the plate (clear of any badge), so the text never overlaps the reg or runs off the plate.
 * CONFIRM: REG KING can print each font at these sizes.
 */
export type BottomFont = { id: string; label: string; cssVar: string; family: string; weight: number };

export const BOTTOM_FONTS: BottomFont[] = [
  { id: "classic", label: "Classic", cssVar: "--font-plate", family: "Barlow Condensed", weight: 700 },
  { id: "bebas", label: "Bebas Neue", cssVar: "--pt-bebas", family: "Bebas Neue", weight: 400 },
  { id: "anton", label: "Anton", cssVar: "--pt-anton", family: "Anton", weight: 400 },
  { id: "oswald", label: "Oswald", cssVar: "--font-oswald", family: "Oswald", weight: 600 },
  { id: "montserrat", label: "Montserrat", cssVar: "--pt-montserrat", family: "Montserrat", weight: 700 },
  { id: "russo", label: "Russo One", cssVar: "--pt-russo", family: "Russo One", weight: 400 },
  { id: "orbitron", label: "Orbitron", cssVar: "--pt-orbitron", family: "Orbitron", weight: 700 },
  { id: "michroma", label: "Michroma", cssVar: "--pt-michroma", family: "Michroma", weight: 400 },
  { id: "audiowide", label: "Audiowide", cssVar: "--pt-audiowide", family: "Audiowide", weight: 400 },
  { id: "racing", label: "Racing Sans", cssVar: "--pt-racing", family: "Racing Sans One", weight: 400 },
  { id: "blackops", label: "Black Ops", cssVar: "--pt-blackops", family: "Black Ops One", weight: 400 },
  { id: "bangers", label: "Bangers", cssVar: "--pt-bangers", family: "Bangers", weight: 400 },
  { id: "righteous", label: "Righteous", cssVar: "--pt-righteous", family: "Righteous", weight: 400 },
  { id: "cinzel", label: "Cinzel", cssVar: "--pt-cinzel", family: "Cinzel", weight: 700 },
  { id: "playfair", label: "Playfair", cssVar: "--pt-playfair", family: "Playfair Display", weight: 700 },
  { id: "lobster", label: "Lobster", cssVar: "--pt-lobster", family: "Lobster", weight: 400 },
  { id: "pacifico", label: "Pacifico", cssVar: "--pt-pacifico", family: "Pacifico", weight: 400 },
  { id: "marker", label: "Marker", cssVar: "--pt-marker", family: "Permanent Marker", weight: 400 },
  { id: "vibes", label: "Great Vibes", cssVar: "--pt-vibes", family: "Great Vibes", weight: 400 },
];
export const DEFAULT_BOTTOM_FONT = "classic";

/** Capital-letter heights a customer can choose, in mm. */
export const BOTTOM_SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const DEFAULT_BOTTOM_SIZE = 8;

export const bottomFont = (id: string | null | undefined): BottomFont => BOTTOM_FONTS.find((f) => f.id === id) ?? BOTTOM_FONTS[0];
export const isBottomFont = (id: unknown) => typeof id === "string" && BOTTOM_FONTS.some((f) => f.id === id);
export const isBottomSize = (n: unknown) => typeof n === "number" && (BOTTOM_SIZES as readonly number[]).includes(n);

/** The CSS font-family list for a font: the name next/font gave it (read from its variable), then its own name. */
export function bottomFamily(id: string | null | undefined): string {
  const f = bottomFont(id);
  let loaded = "";
  try {
    if (typeof document !== "undefined") loaded = getComputedStyle(document.documentElement).getPropertyValue(f.cssVar).trim();
  } catch {}
  return [loaded, `"${f.family}"`, "Arial", "sans-serif"].filter(Boolean).join(", ");
}

/** Load a font before drawing with it (canvas text won't wait for it on its own). */
export async function bottomFontReady(id: string | null | undefined): Promise<void> {
  if (typeof document === "undefined") return;
  const f = bottomFont(id);
  try {
    await document.fonts.load(`${f.weight} 40px ${bottomFamily(id)}`, "AaBbGg REG KING 0123");
  } catch {}
}
