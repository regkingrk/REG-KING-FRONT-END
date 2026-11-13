/**
 * Accessories shop: everything on the Accessories page, by category.
 *
 * Prices come from the REG KING Shopify store (checked 27 Oct 2026). Photos are REG KING's own
 * (public/products/, sent 30 Oct 2026).
 * Products that aren't in Shopify yet have `price: null` and no photo: they show
 * "Price coming soon" and an "Ask about this" button, never a made-up price.
 * The pre-launch check fails while any are missing.
 */

export type AccCategory = "customisation" | "fixings" | "mounting";
export const ACC_CATEGORIES: { key: "all" | AccCategory; label: string }[] = [
  { key: "all", label: "All accessories" },
  { key: "customisation", label: "Customisation" },
  { key: "fixings", label: "Fitting & fixings" },
  { key: "mounting", label: "Mounting kits" },
];

/** The drawing used when there's no product photo (and while one loads). */
export type AccArt = "surround" | "logo" | "kit" | "pads" | "pads6" | "screws" | "clips" | "magnets";

export type AccProduct = {
  key: string;
  name: string;
  cat: AccCategory;
  /** Short line under the name. */
  line: string;
  /** null = not priced yet. "from" = the builders, whose price depends on the design. */
  price: number | null;
  from?: boolean;
  /** Opens a builder instead of adding to the basket. */
  builder?: "accessories-surrounds" | "accessories-logo";
  /** Shopify product handle, when the product exists there. */
  handle?: string;
  /** Shopify product photo. */
  photo?: string;
  art: AccArt;
  /** More about it, for its own page. Only what's known for sure (from the product and its photo). */
  about?: string[];
  /** Not on sale yet: "Coming soon" in place of the price (and in place of the photo if there isn't one). */
  soon?: boolean;
};


export const ACC_PRODUCTS: AccProduct[] = [
  { key: "surrounds", name: "Plate Surrounds", cat: "customisation", line: "Framed or frameless, in your colours", price: null, builder: "accessories-surrounds", art: "surround" },
  { key: "logo", name: "Logo Plates", cat: "customisation", line: "Your logo, printed or 4D", price: null, builder: "accessories-logo", art: "logo" },
  // CONFIRM: what's in a fitting kit, and its price (the builder gives one free with plates, usually £2.99).
  { key: "fitting-kit", name: "Fitting Kit", cat: "fixings", line: "Everything to fit a pair of plates", price: null, photo: "products/fitting-kit.jpg", about: ["Sticky pad sheets and a screw kit with yellow, black and white caps, as pictured."], art: "kit" },
  // CONFIRM: the Shopify listing doesn't say how many pads are in a pack. Check it's 10.
  { key: "pads", name: "Sticky Pads ×10", cat: "fixings", line: "Strong double-sided pads", price: 1.99, handle: "number-plate-sticky-pads", photo: "products/sticky-pads.jpg", about: ["Double-sided pads that hold a plate to the car without drilling."], art: "pads" },
  { key: "pads-6mm", name: "6mm Sticky Pads ×10", cat: "fixings", line: "Thicker pads for curved bumpers", price: null, photo: "products/sticky-pads.jpg", about: ["Thicker 6mm double-sided pads that fill the gap on a curved bumper."], art: "pads6" },
  { key: "screws", name: "Screw Kit", cat: "fixings", line: "Screws with black, white and yellow caps", price: 1.99, handle: "number-plate-screw-kit", photo: "products/screw-kit.jpg", about: ["Pick the cap colour that matches each plate: yellow for the rear, white for the front, or black."], art: "screws" },
  // CONFIRM: price, and whether it fits standard 520mm plates only.
  { key: "plate-holder", name: "Plate Holder", cat: "mounting", line: "A frame the plate clips into, for a clean fit", price: null, photo: "products/plate-holder.jpg", about: ["A frame that fixes to the car. The plate clips into it, so the plate itself needs no screw holes."], art: "clips" },
  // Not on sale yet: REG KING's own photo, with "Coming soon" in place of a price.
  { key: "clips", name: "Plate Clips", cat: "mounting", line: "Hold a plate without drilling", price: null, photo: "products/plate-clips.jpg", art: "clips", soon: true },
  { key: "magnets", name: "Magnet Kits", cat: "mounting", line: "Swap plates on and off in seconds", price: null, photo: "products/magnet-kit.jpg", art: "magnets", soon: true },
];
