/**
 * The style picker's pictures: each style's own name made up as a plate in that style, drawn once in 3D
 * and saved in public/styles (so the picker shows them straight away instead of drawing them on the page).
 * Made with scripts/style-thumbs (see lib/styleThumbs.ts); remake them when a style's look changes.
 */
/** What each picture says: the style's name, cut to fit a plate (at most 7 characters, as on a real reg). */
export const STYLE_PLATE_TEXT: Record<string, string> = {
  Printed: "PRINTED",
  "Bike Print": "BK PRINT",
  "Metro Print": "METRO",
  "3D Gel": "3D GEL",
  "4D 3MM": "4D 3MM",
  "Bike Gel": "BIKE GEL",
  "4D 3MM Bike": "4D BIKE",
  "Metal Press": "PRESSED",
  "4D 6MM": "4D 6MM",
  "4D Gel 3MM": "4D GEL",
  Onyx: "ONYX",
  Shadow: "SHADOW",
  "Metal Press Black & White": "BLK WHT",
  "Metal Press Black & Silver": "BLK SLV",
  "4D Bike Gel": "4D BK GEL",
  Retro: "RETRO",
  Vintage: "VINTAGE",
  "Retro X": "RETRO X",
  "Vintage X": "VINTG X",
  RK: "RK",
};

export const styleSlug = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Picture of a style: car plates, or the two-line motorbike plate. */
export const styleImage = (name: string, bike: boolean) => {
  const path = `/styles/${styleSlug(name)}${bike ? "-bike" : ""}.webp`;
  // the single-file preview carries the pictures inline
  const inline = typeof window !== "undefined" ? (window as unknown as { __RK_STYLE_IMAGES?: Record<string, string> }).__RK_STYLE_IMAGES : undefined;
  return inline?.[path] ?? path;
};
