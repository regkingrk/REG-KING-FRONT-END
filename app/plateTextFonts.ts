/**
 * Fonts for the Custom Text extra (see lib/bottomText.ts). Not preloaded: a font's file only downloads
 * when a customer picks it in the plate builder.
 */
import {
  Anton,
  Audiowide,
  Bangers,
  Bebas_Neue,
  Black_Ops_One,
  Cinzel,
  Great_Vibes,
  Lobster,
  Michroma,
  Montserrat,
  Orbitron,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Racing_Sans_One,
  Righteous,
  Russo_One,
} from "next/font/google";

// next/font needs each option written out in full (no shared object)
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--pt-bebas", display: "swap", preload: false });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--pt-anton", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], weight: "700", variable: "--pt-montserrat", display: "swap", preload: false });
const russo = Russo_One({ subsets: ["latin"], weight: "400", variable: "--pt-russo", display: "swap", preload: false });
const orbitron = Orbitron({ subsets: ["latin"], weight: "700", variable: "--pt-orbitron", display: "swap", preload: false });
const michroma = Michroma({ subsets: ["latin"], weight: "400", variable: "--pt-michroma", display: "swap", preload: false });
const audiowide = Audiowide({ subsets: ["latin"], weight: "400", variable: "--pt-audiowide", display: "swap", preload: false });
const racing = Racing_Sans_One({ subsets: ["latin"], weight: "400", variable: "--pt-racing", display: "swap", preload: false });
const blackops = Black_Ops_One({ subsets: ["latin"], weight: "400", variable: "--pt-blackops", display: "swap", preload: false });
const bangers = Bangers({ subsets: ["latin"], weight: "400", variable: "--pt-bangers", display: "swap", preload: false });
const righteous = Righteous({ subsets: ["latin"], weight: "400", variable: "--pt-righteous", display: "swap", preload: false });
const cinzel = Cinzel({ subsets: ["latin"], weight: "700", variable: "--pt-cinzel", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], weight: "700", variable: "--pt-playfair", display: "swap", preload: false });
const lobster = Lobster({ subsets: ["latin"], weight: "400", variable: "--pt-lobster", display: "swap", preload: false });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", variable: "--pt-pacifico", display: "swap", preload: false });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--pt-marker", display: "swap", preload: false });
const vibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--pt-vibes", display: "swap", preload: false });

/** Class names that put each font's CSS variable on <html>. */
export const plateTextFontVars = [bebas, anton, montserrat, russo, orbitron, michroma, audiowide, racing, blackops, bangers, righteous, cinzel, playfair, lobster, pacifico, marker, vibes]
  .map((f) => f.variable)
  .join(" ");
