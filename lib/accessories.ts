/**
 * Make: accessories and logo plates (prototype data).
 *
 * PRICES are null until the REG KING team sets them: the site then shows "Price on request"
 * and the prelaunch check flags it. Fill these in from the workshop price list.
 *
 * MANUFACTURERS: brands with artwork in lib/carLogos.ts show their real logos; the rest are shown by
 * name until their artwork is added. Logos are trade marks: confirm the right to use them before launch.
 */

export type Price = number | null;

export const ACCESSORY_PRICES = {
  /** A standard black surround (no personalisation), each. */
  standardSurround: null as Price,
  /** A personalised surround, each. */
  customSurround: null as Price,
  /** A printed logo plate, each. */
  printedLogoPlate: null as Price,
  /** A 3D acrylic logo plate, each. */
  acrylicLogoPlate: null as Price,
};

/* ------------------------------------------------------------------ */
/* Colours and finishes                                                */
/* ------------------------------------------------------------------ */
/** metal: drawn with a brushed metallic sheen rather than flat paint. */
export type Swatch = { key: string; name: string; hex: string; carbon?: boolean; metal?: boolean };

/** Gloss acrylic and metallic finishes: strong, true-to-life colours (names as the workshop uses them). */
export const FRAME_COLOURS: Swatch[] = [
  { key: "black", name: "Gloss Black", hex: "#0a0a0b" },
  { key: "white", name: "Gloss White", hex: "#f8f8f6" },
  { key: "silver", name: "Silver", hex: "#c3c8ce", metal: true },
  { key: "gunmetal", name: "Gunmetal", hex: "#4b525a", metal: true },
  { key: "red", name: "Red", hex: "#e3000f" },
  { key: "orange", name: "Orange", hex: "#ff6200" },
  { key: "yellow", name: "Yellow", hex: "#ffcd00" },
  { key: "green", name: "Green", hex: "#00a650" },
  { key: "blue", name: "Blue", hex: "#0057ff" },
  { key: "carbon", name: "Carbon Fibre", hex: "#1b1b1b", carbon: true },
];

export const TEXT_COLOURS: Swatch[] = [
  { key: "white", name: "White", hex: "#ffffff" },
  { key: "black", name: "Black", hex: "#0a0a0b" },
  { key: "silver", name: "Silver", hex: "#c3c8ce", metal: true },
  { key: "yellow", name: "Yellow", hex: "#ffcd00" },
  { key: "red", name: "Red", hex: "#e3000f" },
  { key: "blue", name: "Blue", hex: "#0057ff" },
  { key: "carbon", name: "Carbon Fibre", hex: "#2a2a2a", carbon: true },
];

export const PLATE_BACKGROUNDS: Swatch[] = [
  { key: "yellow", name: "Yellow", hex: "#f5c800" },
  { key: "white", name: "White", hex: "#f7f7f4" },
  { key: "black", name: "Black", hex: "#111111" },
  { key: "carbon", name: "Carbon Fibre", hex: "#1b1b1b", carbon: true },
];

/**
 * A colour is a preset key ("black"), "carbon", or any custom colour from the colour wheel ("#rrggbb").
 */
export const swatch = (list: Swatch[], key: string): Swatch =>
  /^#[0-9a-f]{6}$/i.test(key) ? { key, name: `Custom ${key.toUpperCase()}`, hex: key } : list.find((s) => s.key === key) ?? list[0];

/* ------------------------------------------------------------------ */
/* Manufacturers and badges (names only: artwork to be licensed)       */
/* ------------------------------------------------------------------ */
export const MANUFACTURERS: { make: string; badges: string[] }[] = [
  { make: "Abarth", badges: ["Logo only"] },
  { make: "Alfa Romeo", badges: ["Logo only"] },
  { make: "Aston Martin", badges: ["Logo only"] },
  { make: "Audi", badges: ["Logo only", "S Line", "RS", "Quattro"] },
  { make: "Bentley", badges: ["Logo only"] },
  { make: "BMW", badges: ["Logo only", "M Sport", "M Performance", "M"] },
  { make: "Brabus", badges: ["Logo only"] },
  { make: "Bugatti", badges: ["Logo only"] },
  { make: "BYD", badges: ["Logo only"] },
  { make: "Cadillac", badges: ["Logo only"] },
  { make: "Chery", badges: ["Logo only"] },
  { make: "Chevrolet", badges: ["Logo only"] },
  { make: "Citroën", badges: ["Logo only"] },
  { make: "Cupra", badges: ["Logo only"] },
  { make: "Dacia", badges: ["Logo only"] },
  { make: "Dodge", badges: ["Logo only"] },
  { make: "Ferrari", badges: ["Logo only"] },
  { make: "Fiat", badges: ["Logo only"] },
  { make: "Ford", badges: ["Logo only", "ST", "ST-Line", "RS"] },
  { make: "Honda", badges: ["Logo only", "Type R"] },
  { make: "Hyundai", badges: ["Logo only"] },
  { make: "Jaecoo", badges: ["Logo only"] },
  { make: "Jaguar", badges: ["Logo only", "R", "SVR"] },
  { make: "Jeep", badges: ["Logo only"] },
  { make: "Kia", badges: ["Logo only"] },
  { make: "Koenigsegg", badges: ["Logo only"] },
  { make: "Lamborghini", badges: ["Logo only"] },
  { make: "Land Rover", badges: ["Logo only", "Range Rover", "Defender"] },
  { make: "Lexus", badges: ["Logo only"] },
  { make: "Lotus", badges: ["Logo only"] },
  { make: "Maserati", badges: ["Logo only"] },
  { make: "Mazda", badges: ["Logo only"] },
  { make: "McLaren", badges: ["Logo only"] },
  { make: "Mercedes-Benz", badges: ["Logo only", "AMG", "AMG Line"] },
  { make: "MG", badges: ["Logo only"] },
  { make: "Mini", badges: ["Logo only", "Cooper S", "JCW"] },
  { make: "Mitsubishi", badges: ["Logo only"] },
  { make: "Nissan", badges: ["Logo only", "Nismo"] },
  { make: "Omoda", badges: ["Logo only"] },
  { make: "Peugeot", badges: ["Logo only", "GT"] },
  { make: "Polestar", badges: ["Logo only"] },
  { make: "Porsche", badges: ["Logo only", "GTS", "Turbo"] },
  { make: "Renault", badges: ["Logo only"] },
  { make: "Rolls-Royce", badges: ["Logo only"] },
  { make: "SEAT", badges: ["Logo only", "FR", "Cupra"] },
  { make: "Skoda", badges: ["Logo only", "vRS"] },
  { make: "smart", badges: ["Logo only"] },
  { make: "Subaru", badges: ["Logo only"] },
  { make: "Suzuki", badges: ["Logo only"] },
  { make: "Tesla", badges: ["Logo only"] },
  { make: "Toyota", badges: ["Logo only", "GR"] },
  { make: "Vauxhall", badges: ["Logo only", "VXR", "GSi"] },
  { make: "Volkswagen", badges: ["Logo only", "GTI", "R", "R-Line"] },
  { make: "Volvo", badges: ["Logo only"] },
];

/** Accepted upload types (shown to the customer and used by the file picker). */
export const UPLOAD_TYPES = ".png,.jpg,.jpeg,.webp,.svg";
export const UPLOAD_NOTE = "PNG, JPG, WEBP or SVG. Custom logos are checked and approved by REG KING before anything is made.";

/* ------------------------------------------------------------------ */
/* Designs                                                             */
/* ------------------------------------------------------------------ */
export type LogoKind = "none" | "make" | "upload";

/** What goes on a surround's lower strip, or on a logo plate. */
/** What goes on the strip: the five kinds the customer chooses between (or none). */
export type ArtCategory = "car" | "text" | "country" | "other" | "custom" | "plain";
export const ART_CATEGORIES: { key: ArtCategory; name: string; line: string }[] = [
  { key: "car", name: "Car Related", line: "Car brands and badges" },
  { key: "text", name: "Custom Text", line: "Your words, in the font you pick" },
  { key: "country", name: "Country & Caste", line: "Flags, faith and heritage" },
  { key: "other", name: "Other", line: "Crowns, stars, flames and more" },
  { key: "custom", name: "Custom", line: "Upload your own image or logo" },
  { key: "plain", name: "None", line: "No text or logo" },
];
/** The artwork's kind, for designs saved before the five kinds existed too. */
export const artCategoryOf = (a: Artwork): ArtCategory =>
  a.cat ?? (a.logo === "upload" && a.upload ? "custom" : a.logo === "make" && a.make ? "car" : a.text.trim() ? "text" : "plain");
/** Fonts for Custom Text (each drawn in 3D from its own outlines). */
export const ART_FONTS: { key: "plate" | "metro"; name: string; css: string }[] = [
  { key: "plate", name: "Number plate", css: '"RK Plate", "Barlow Condensed", sans-serif' },
  { key: "metro", name: "Metro", css: '"RK Metro", "RK Plate", sans-serif' },
];

export interface Artwork {
  /** Which kind of artwork (older saves don't have it: worked out from logo/text). */
  cat?: ArtCategory;
  /** Custom Text: the font. */
  font?: "plate" | "metro";
  /** Country & Caste or Other: the library item. */
  item?: string;
  /** Car Related: the brand logo picture (lib/carLogos.ts), for brands that have one. */
  carLogo?: string;
  /** A note to the team about this artwork. */
  note?: string;
  text: string;
  textColour: string;
  logo: LogoKind;
  make: string;
  badge: string;
  /** Data URL of the customer's uploaded logo (kept in the browser for the prototype). */
  upload: string | null;
  uploadName: string;
}

export const emptyArtwork = (): Artwork => ({
  text: "",
  textColour: "white",
  logo: "none",
  make: "",
  badge: "",
  upload: null,
  uploadName: "",
});

export type SurroundStyle = "framed" | "frameless";
export type SurroundShape = "standard" | "hex";
/** A plate size key from the plate builder ("Normal", '18"', "Hex Medium", "Square", "9x7"...); older saves use "standard", "18", "16", "14". */
export type SurroundSize = string;

/** Framed surrounds come to fit the plate: standard or hex-cut corners, and shorter show-plate lengths. */
export const SURROUND_SHAPES: { key: SurroundShape; name: string; line: string }[] = [
  { key: "standard", name: "Standard", line: "Rounded corners" },
  { key: "hex", name: "Hex", line: "Cut corners" },
];
export const SURROUND_SIZES: { key: SurroundSize; name: string; mm: number }[] = [
  { key: "standard", name: "Standard (520mm)", mm: 520 },
  { key: "18", name: "18 inch", mm: 457 },
  { key: "16", name: "16 inch", mm: 406 },
  { key: "14", name: "14 inch", mm: 356 },
];

/** A plate builder size ("Hex Medium", '16"') as the surround that fits it. */
export function surroundFitFor(plateSize: string | null): { shape: SurroundShape; size: SurroundSize } {
  const s = plateSize ?? "";
  const shape: SurroundShape = /hex/i.test(s) ? "hex" : "standard";
  const inch = s.match(/(\d+)"/)?.[1];
  const size: SurroundSize = inch === "18" || inch === "16" || inch === "14" ? inch : "standard";
  return { shape, size };
}

export interface SurroundDesign extends Artwork {
  /** Framed: the border and rim round the plate. */
  frame: string;
  /** Framed: the tab hanging under the frame. Frameless: the wing under the plate. */
  backing: string;
  /** The panel carrying the text or logo (unset: a shade of the part under it). */
  panel?: string;
}

export const defaultSurround = (): SurroundDesign => ({ ...emptyArtwork(), frame: "black", backing: "black" });

export interface SurroundConfig {
  /** Nothing is chosen until the customer picks framed or frameless; the design steps follow. */
  style: SurroundStyle | null;
  /** Framed only. */
  shape: SurroundShape;
  size: SurroundSize;
  qty: "single" | "set";
  /** Always true now: a set shares one design. Kept for saved baskets. */
  same: boolean;
  front: SurroundDesign;
  rear: SurroundDesign;
  /** A set can have a different shape and size at the rear (framed only). */
  rearShape?: SurroundShape;
  rearSize?: SurroundSize;
}

export const defaultSurroundConfig = (qty: "single" | "set" = "set"): SurroundConfig => ({
  style: null,
  shape: "standard",
  size: "standard",
  qty,
  same: true,
  front: defaultSurround(),
  rear: defaultSurround(),
});

export const SURROUND_STYLES: { key: SurroundStyle; name: string; line: string }[] = [
  { key: "framed", name: "Framed", line: "A 4D acrylic outline round the plate, with a tab under it for your text or logo" },
  { key: "frameless", name: "Frameless", line: "No rim, just a wing and a panel under the plate" },
];

export type LogoPlateType = "printed" | "acrylic";
export const LOGO_PLATE_TYPES: { key: LogoPlateType; name: string; line: string }[] = [
  { key: "printed", name: "Printed", line: "Your full colour artwork under a gloss acrylic face" },
  { key: "acrylic", name: "4D Acrylic", line: "Your logo cut in raised acrylic, layered on the plate" },
];

export interface LogoDesign extends Artwork {
  background: string;
}
export const defaultLogoDesign = (): LogoDesign => ({ ...emptyArtwork(), logo: "make", make: "BMW", badge: "M Sport", textColour: "black", background: "yellow" });

/** Logo plates carry a customer's or brand's own logo: type → how many → their logo file → delivery. */
export type LogoDelivery = "Deliver" | "Collect";
export interface LogoPlateConfig {
  type: LogoPlateType;
  count: number;
  /** Kept for basket items saved before the simpler flow: every plate now carries the same logo. */
  same: boolean;
  designs: LogoDesign[];
  delivery: LogoDelivery | null;
}
/** The customer's own logo on a white plate. The preview shows "YOUR LOGO" until a file is chosen. */
export const ownLogoDesign = (): LogoDesign => ({ ...emptyArtwork(), logo: "upload", textColour: "black", background: "white" });
export const defaultLogoPlateConfig = (): LogoPlateConfig => ({ type: "acrylic", count: 1, same: true, designs: [ownLogoDesign()], delivery: null });
/** Logo files we take. Images preview on the plate; design files (PDF, AI, EPS) are proofed by the team. */
export const LOGO_FILE_TYPES = ".png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps";
export const LOGO_FILE_MAX_MB = 20;

/** Short description of artwork, for basket lines. */
export function artworkText(a: Artwork) {
  const note = a.note?.trim() ? ` (note: ${a.note.trim()})` : "";
  if (a.cat === "country" || a.cat === "other") return `${a.item ? a.item.replace(/-/g, " ") : "artwork"}${note}`;
  if (a.carLogo && a.make) return `${a.make} ${a.badge && a.badge !== a.make ? `${a.badge} ` : ""}logo${note}`;
  if (a.cat === "custom") return `your own artwork${a.uploadName ? ` (${a.uploadName})` : ""}${note}`;
  if (a.cat === "text") return `"${a.text.trim()}" in ${a.font === "metro" ? "Metro" : "number plate"} font${note}`;
  const logo = a.logo === "make" && a.make ? `${a.make}${a.badge && a.badge !== "Logo only" ? ` ${a.badge}` : ""} logo` : a.logo === "upload" && a.upload ? "your logo" : null;
  const text = a.text.trim() ? `"${a.text.trim()}"` : null;
  return ([logo, text].filter(Boolean).join(" + ") || "plain") + note;
}

export function surroundSummary(c: SurroundConfig) {
  const one = (d: SurroundDesign) =>
    `${c.style === "framed" ? `${swatch(FRAME_COLOURS, d.frame).name.toLowerCase()} frame, ${swatch(FRAME_COLOURS, d.backing).name.toLowerCase()} wing` : `${swatch(FRAME_COLOURS, d.backing).name.toLowerCase()} side pieces, ${d.panel ? swatch(FRAME_COLOURS, d.panel).name.toLowerCase() : "matching"} main part`}, ${artworkText(d)}`;
  const legacy: Record<string, string> = { standard: "standard size", "18": '18"', "16": '16"', "14": '14"', Normal: "standard size" };
  const fitOf = (_shape: SurroundShape, size: SurroundSize) => legacy[size] ?? size;
  const rearShape = c.rearShape ?? c.shape;
  const rearSize = c.rearSize ?? c.size;
  const differs = c.qty === "set" && (rearShape !== c.shape || rearSize !== c.size);
  const fit =
    c.style !== "framed"
      ? ""
      : differs
        ? ` (front ${fitOf(c.shape, c.size)}; rear ${fitOf(rearShape, rearSize)})`
        : c.size !== "standard" && c.size !== "Normal"
          ? ` (${fitOf(c.shape, c.size)})`
          : "";
  const style = (c.style === "frameless" ? "Frameless" : "Framed") + fit;
  if (c.qty === "single") return `${style} surround: ${one(c.front)}`;
  return c.same ? `${style} surrounds (pair): ${one(c.front)}` : `${style} surrounds: front ${one(c.front)}; rear ${one(c.rear)}`;
}

/** Things a customer can add to a plate order. Surrounds are live; the rest are ready for later. */
export const ADD_ONS = [
  { key: "surrounds", name: "Plate surrounds", live: true },
  { key: "fitting-kit", name: "Fitting kits", live: false },
  { key: "holders", name: "Plate holders", live: false },
] as const;

/* ------------------------------------------------------------------ */
/* Prices for the basket (shared by the site and the checkout server) */
/* ------------------------------------------------------------------ */
/** A price line: null amount = on request (no price set yet). */
export type PriceLine = { label: string; amount: number | null };
const each = (n: number | null, qty: number): number | null => (n === null ? null : n * qty);

export const surroundLines = (c: SurroundConfig): PriceLine[] => {
  const qty = c.qty === "set" ? 2 : 1;
  return [{ label: `Personalised ${c.style ?? ""} surround${qty > 1 ? "s × 2" : ""}`.replace("  ", " "), amount: each(ACCESSORY_PRICES.customSurround, qty) }];
};

export const logoLines = (c: LogoPlateConfig): PriceLine[] => {
  const price = c.type === "acrylic" ? ACCESSORY_PRICES.acrylicLogoPlate : ACCESSORY_PRICES.printedLogoPlate;
  return [{ label: `${c.type === "acrylic" ? "4D acrylic" : "Printed"} logo plate${c.count > 1 ? `s × ${c.count}` : ""}`, amount: each(price, c.count) }];
};
