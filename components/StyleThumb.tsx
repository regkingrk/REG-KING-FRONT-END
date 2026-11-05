"use client";

import { useState } from "react";
import type { BuildConfig } from "@/lib/builder";
import { STYLE_PLATE_TEXT, styleImage } from "@/lib/styleImages";
import { PlatePreview } from "./PlatePreview";
import "@/lib/styleThumbs"; // registers the picture-maker used by the script that makes public/styles

/** The style picker's picture: the style's name made up as a plate in that style (a saved 3D picture). */
export function StyleThumb({ c, side, style }: { c: BuildConfig; side: "front" | "rear"; style: string }) {
  const [missing, setMissing] = useState(false);
  const bike = c.vehicle === "Bike";
  const text = STYLE_PLATE_TEXT[style] ?? style.toUpperCase();
  if (missing) return <PlatePreview reg={text} c={{ ...c, style, rearStyle: style, extras: [], size: null, rearSize: null }} side={side} />;
  return <img className="rk-stile__img" src={styleImage(style, bike)} alt="" width={240} height={75} loading="lazy" draggable={false} onError={() => setMissing(true)} />;
}
