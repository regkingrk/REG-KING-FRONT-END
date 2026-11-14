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

/** Surround finishes: gloss in every colour above; matt only in black and white (more matt colours to confirm). */
export type SurroundSurface = "gloss" | "matt";
export const SURROUND_SURFACES: { key: SurroundSurface; name: string; line: string }[] = [
  { key: "gloss", name: "Gloss", line: "A shiny, reflective finish" },
  { key: "matt", name: "Matt", line: "A smooth, non-reflective finish" },
];
export const MATT_COLOURS: Swatch[] = [
  { key: "black", name: "Matt Black", hex: "#141414" },
  { key: "white", name: "Matt White", hex: "#ececea" },
];
/** The colours on offer for a surround finish. */
export const surroundColours = (surface: SurroundSurface | undefined): Swatch[] => (surface === "matt" ? MATT_COLOURS : FRAME_COLOURS);
/** Whether a colour is on offer in a finish (matt: black or white only, no custom colours). */
export const colourOffered = (surface: SurroundSurface | undefined, key: string) =>
  surface === "matt" ? MATT_COLOURS.some((c) => c.key === key) : FRAME_COLOURS.some((c) => c.key === key) || /^#[0-9a-f]{6}$/i.test(key);
/** The strip's finish (frameless: the whole surround). */
export const stripSurfaceOf = (d: { surface?: SurroundSurface; stripSurface?: SurroundSurface }): SurroundSurface => d.stripSurface ?? d.surface ?? "gloss";
/** A surround colour's name in its finish ("Matt Black", "Gloss White", "Red"). */
export const surroundColourName = (surface: SurroundSurface | undefined, key: string) => {
  if (!key) return "Not chosen";
  if (surface === "matt") return swatch(MATT_COLOURS, key).name;
  const n = swatch(FRAME_COLOURS, key).name;
  return /^gloss /i.test(n) ? n : `Gloss ${n}`;
};

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
/** The kinds on offer. Car brands: names and logos as before, checked by the team on the proof. */
export const ART_CATEGORIES: { key: ArtCategory; name: string; line: string }[] = [
  { key: "car", name: "Car Related", line: "Car brands and badges" },
  { key: "custom", name: "Your design", line: "Upload an example of what you'd like" },
  { key: "text", name: "Custom Text", line: "Your words, in the font you pick" },
  { key: "country", name: "Country & Caste", line: "Flags, faith and heritage" },
  { key: "other", name: "Other", line: "Crowns, stars, flames and more" },
  { key: "plain", name: "None", line: "No text or logo" },
];
/** How an uploaded design is made: flat printed, or laser-cut 4D acrylic. Nothing else is offered. */
export type ArtFinish = "printed" | "acrylic";
export const ART_FINISHES: { key: ArtFinish; name: string; line: string }[] = [
  { key: "printed", name: "Flat printed", line: "Your chosen design printed flat onto the surround for a clean, smooth finish." },
  { key: "acrylic", name: "4D acrylic", line: "Your chosen design laser-cut from acrylic and applied to the surround for a premium raised finish." },
];
export const isArtFinish = (v: unknown): v is ArtFinish => v === "printed" || v === "acrylic";
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
  /** Your design: flat printed or 4D acrylic. */
  artFinish?: ArtFinish;
  /** Your design: the file's width ÷ height. */
  aspect?: number;
  /** Your design: the result of checking the file for its finish (lib/logoArtwork.ts). */
  artCheck?: import("./logoArtwork").ArtworkCheck;
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
  /** The frame's finish: gloss (every colour) or matt (black or white). Older saves: gloss. */
  surface?: SurroundSurface;
  /** The strip's finish (frameless: the whole surround), chosen separately. Older saves: as the frame. */
  stripSurface?: SurroundSurface;
  /** Framed: the border and rim round the plate. */
  frame: string;
  /** Framed: the tab hanging under the frame. Frameless: the wing under the plate. */
  backing: string;
  /** The panel carrying the text or logo (unset: a shade of the part under it). */
  panel?: string;
}

export const defaultSurround = (): SurroundDesign => ({ ...emptyArtwork(), surface: "gloss", stripSurface: "gloss", frame: "black", backing: "black" });

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
  /** The customer's car, for the order (never puts a logo on the surround). Older baskets; now part of `centre`. */
  vehicleMake?: string;
  vehicleModel?: string;
  /** The centre piece item the customer wants, for our team to prepare (see CENTRE_CATS). */
  centre?: CentrePiece;
  /** Your design: the customer confirmed they own or may use the artwork. */
  rightsOk?: boolean;
}

/** Surround centre piece item: what kind, and the details our team needs. Every kind has a note. */
export type CentreCat = "car" | "country" | "faith" | "social" | "text" | "other";
export const CENTRE_CATS: { key: CentreCat; name: string }[] = [
  { key: "car", name: "Car Related" },
  { key: "country", name: "Country / Caste Related" },
  { key: "faith", name: "Faith Related" },
  { key: "social", name: "Social Media" },
  { key: "text", name: "Custom Text" },
  { key: "other", name: "Other" },
];
export type CentrePiece = {
  cat: CentreCat;
  /** Car Related: the make (from the list) and the model (typed). */
  make?: string;
  model?: string;
  /** Custom Text: the words. */
  text?: string;
  /** Car Related: an example picture (its name goes on the order; the picture stays in the basket). */
  imageName?: string;
  image?: string | null;
  note?: string;
};
/** The centre piece in a few words, for the basket and the order. */
export function centreText(p: CentrePiece | undefined): string {
  if (!p) return "";
  const name = CENTRE_CATS.find((x) => x.key === p.cat)?.name ?? "";
  const bits = [
    p.cat === "car" ? [p.make, p.model].filter(Boolean).join(" ") : "",
    p.cat === "text" && p.text?.trim() ? `"${p.text.trim()}"` : "",
    p.imageName ? `example image ${p.imageName}` : "",
    p.note?.trim() ? `note: ${p.note.trim()}` : "",
  ].filter(Boolean);
  return bits.length ? `${name}: ${bits.join(", ")}` : name;
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
  /** Logo plates: how wide the logo is, as a share of the plate face (0.6, 0.8 or 1). */
  scale?: number;
  /** Logo plates: where a logo narrower than the face sits. */
  place?: "left" | "centre" | "right";
  /** Logo plates: the logo's width ÷ height, from the file. */
  aspect?: number;
  /** Logo plates: the result of checking the file for the chosen finish (lib/logoArtwork.ts). */
  check?: import("./logoArtwork").ArtworkCheck;
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
  if (a.cat === "custom") return `your design${a.artFinish ? `, ${a.artFinish === "acrylic" ? "4D acrylic" : "flat printed"}` : ""}${a.uploadName ? ` (${a.uploadName})` : ""}${note}`;
  if (a.cat === "text") return `"${a.text.trim()}" in ${a.font === "metro" ? "Metro" : "number plate"} font${note}`;
  const logo = a.logo === "make" && a.make ? `${a.make}${a.badge && a.badge !== "Logo only" ? ` ${a.badge}` : ""} logo` : a.logo === "upload" && a.upload ? "your logo" : null;
  const text = a.text.trim() ? `"${a.text.trim()}"` : null;
  return ([logo, text].filter(Boolean).join(" + ") || "plain") + note;
}

export function surroundSummary(c: SurroundConfig) {
  const one = (d: SurroundDesign) => {
    const colours = c.style === "framed" ? `${surroundColourName(d.surface, d.frame).toLowerCase()} frame, ${surroundColourName(stripSurfaceOf(d), d.backing).toLowerCase()} strip` : surroundColourName(stripSurfaceOf(d), d.backing).toLowerCase();
    return `${colours}, ${artworkText(d)}`;
  };
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
  const style = (c.style === "frameless" ? "Frameless" : "Framed") + fit + (c.centre ? ` with centre piece (${centreText(c.centre)})` : c.vehicleMake ? ` for a ${[c.vehicleMake, c.vehicleModel].filter(Boolean).join(" ")}` : "");
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

/** Logo plates come in exactly two finishes. Anything else in a saved basket isn't sold. */
export const isLogoFinish = (t: unknown): t is LogoPlateType => t === "printed" || t === "acrylic";
export const logoLines = (c: LogoPlateConfig): PriceLine[] => {
  const price = c.type === "acrylic" ? ACCESSORY_PRICES.acrylicLogoPlate : ACCESSORY_PRICES.printedLogoPlate;
  return [{ label: `${c.type === "acrylic" ? "4D acrylic" : "Printed"} logo plate${c.count > 1 ? `s × ${c.count}` : ""}`, amount: each(price, c.count) }];
};

/**
 * What's wrong with a surround design for ordering (null: fine). Shared by the maker and the checkout
 * server, so a saved basket or a hand-made request can't order something we don't offer.
 */
export function surroundProblem(c: SurroundConfig): string | null {
  if (!c || (c.style !== "framed" && c.style !== "frameless")) return "Choose framed or frameless.";
  const d = c.front;
  if (!d) return "Finish your surround design.";
  const surface = d.surface ?? "gloss", strip = stripSurfaceOf(d);
  if ((surface !== "gloss" && surface !== "matt") || (strip !== "gloss" && strip !== "matt")) return "Choose gloss or matt.";
  if (c.style === "framed" && !colourOffered(surface, d.frame)) return `Choose a frame colour available in ${surface}.`;
  if (!colourOffered(strip, d.backing)) return `Choose a ${c.style === "framed" ? "strip" : "surround"} colour available in ${strip}.`;
  const cat = artCategoryOf(d);
  if (cat === "car" && !d.make) return "Choose a car brand.";
  if (cat === "custom") {
    if (!d.uploadName) return "Upload an example of your design.";
    if (!isArtFinish(d.artFinish)) return "Choose flat printed or 4D acrylic for your design.";
    if (d.artCheck && d.artCheck.finish === d.artFinish && d.artCheck.level === "poor") return "Your design's file can't be made in that finish as it is.";
    if (!c.rightsOk) return "Confirm you own or have permission to use your artwork.";
  }
  return null;
}

/** What the workshop needs for a surround (never the file's data). */
export function surroundOrderDetails(c: SurroundConfig, reg = ""): { key: string; value: string }[] {
  const d = c.front;
  const cat = artCategoryOf(d);
  const out: { key: string; value: string }[] = [];
  if (reg) out.push({ key: "Registration", value: reg });
  out.push({ key: "Surround", value: `${c.style === "framed" ? "Framed" : "Frameless"}, ${c.qty === "set" ? "front and rear" : "single"}, size ${c.size}${c.qty === "set" && c.rearSize && c.rearSize !== c.size ? ` (rear ${c.rearSize})` : ""}` });
  out.push({ key: "Colours", value: c.style === "framed" ? `Frame ${surroundColourName(d.surface, d.frame)}; strip ${surroundColourName(stripSurfaceOf(d), d.backing)}` : surroundColourName(stripSurfaceOf(d), d.backing) });
  if (c.centre) out.push({ key: "Centre piece", value: centreText(c.centre).slice(0, 480) });
  else if (c.vehicleMake) out.push({ key: "Vehicle", value: [c.vehicleMake, c.vehicleModel].filter(Boolean).join(" ").slice(0, 80) });
  out.push({ key: "Design", value: artworkText(d).slice(0, 300) });
  if (cat === "custom") {
    out.push({ key: "Design finish", value: d.artFinish === "acrylic" ? "4D ACRYLIC (laser cut, raised)" : "FLAT PRINTED" });
    out.push({ key: "Design file", value: d.uploadName.slice(0, 120) });
    const ck = d.artCheck && d.artCheck.finish === d.artFinish ? d.artCheck : undefined;
    out.push({ key: "Artwork check", value: (ck ? `${ck.level === "good" ? "Suitable" : ck.level === "review" ? "Review required" : "Unsuitable"}${ck.review ? ", needs preparing by hand" : ""}: ${ck.notes.join(" ")}` : "Not checked").slice(0, 480) });
    if (d.note?.trim()) out.push({ key: "Design instructions", value: d.note.trim().slice(0, 400) });
    out.push({ key: "Artwork rights", value: c.rightsOk ? "Customer confirmed they own or may use it (team to review)" : "Not confirmed" });
    out.push({ key: "Production", value: "Hold: make only after the customer approves the final mockup" });
  } else if (d.note?.trim()) out.push({ key: "Note", value: d.note.trim().slice(0, 400) });
  return out;
}
