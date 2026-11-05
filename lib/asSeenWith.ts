/**
 * As seen with: businesses REG KING has worked with (Buy page, bottom section).
 * Logos as sent by REG KING (28 Oct 2026, four more added the same day), in public/brands/. Shown as white cut-outs on the black
 * section (the *-white.png files, backgrounds removed); the originals are kept beside them.
 * `mono` = the file is in colour, so the page turns it white (the S&A Motorcade SVG).
 *
 * CONFIRM with REG KING: the X logo is listed as Explicit Details. Check that's right.
 */
/** `ratio` = the artwork's width / height, so every logo can be drawn at the same visual size. */
export type Brand = { name: string; src: string; ratio: number; mono?: boolean };

export const AS_SEEN_WITH: Brand[] = [
  { name: "H&S Motors", src: "brands/hs-motors-white.png", ratio: 2.61 },
  { name: "Certified Repair Centre", src: "brands/certified-repair-centre-white.png", ratio: 2.92 },
  { name: "Envy Self Drive", src: "brands/envy-self-drive-white.png", ratio: 1.35 },
  { name: "Eminence", src: "brands/eminence-white.png", ratio: 2.75 },
  { name: "Explicit Details", src: "brands/x-logo-white.png", ratio: 1.01 },
  { name: "World's Gym", src: "brands/worlds-gym-white.png", ratio: 1.0 },
  { name: "KH Food", src: "brands/kh-food-white.png", ratio: 1.19 },
  { name: "Sytner Select", src: "brands/sytner-select-white.png", ratio: 5.84 },
  { name: "S&A Motorcade", src: "brands/sa-motorcade.svg", ratio: 3.5, mono: true },
  { name: "HP Detailers", src: "brands/hp-detailers-white.png", ratio: 1.03 },
  { name: "Imperial Detailing", src: "brands/imperial-detailing-white.png", ratio: 1.19 },
  { name: "Prestige PPF", src: "brands/prestige-ppf-white.png", ratio: 5.78 },
  { name: "VIP Chauffeurs", src: "brands/vip-chauffeurs-white.png", ratio: 3.17 },
];
