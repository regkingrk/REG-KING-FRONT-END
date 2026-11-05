"use client";

import { useId } from "react";
import type { AccArt } from "@/lib/accessoryShop";
import { defaultSurround, ownLogoDesign } from "@/lib/accessories";
import { LogoPlatePreview, SurroundPreview } from "./AccessoryPreview";

/**
 * Product pictures for the Accessories shop, drawn as studio packshots: the real thing in its own
 * colours and materials, lit from above with a soft shadow on a pale ground. Surrounds and logo
 * plates use the same renders as their builders. Swap any of these for a real photo when there is one.
 */
export function ProductShot({ art }: { art: AccArt }) {
  if (art === "surround")
    return (
      <div className="psh psh--render">
        <SurroundPreview style="framed" design={{ ...defaultSurround(), text: "REG KING" }} side="rear" reg="REG KING" label="A framed plate surround" />
      </div>
    );
  if (art === "logo")
    return (
      <div className="psh psh--render">
        <LogoPlatePreview type="acrylic" design={{ ...ownLogoDesign(), logo: "none", text: "YOUR BRAND", background: "white", textColour: "black" }} label="A 4D logo plate" />
      </div>
    );
  return (
    <div className="psh">
      <Shot art={art} />
    </div>
  );
}

function Shot({ art }: { art: AccArt }) {
  const id = useId().replace(/:/g, "");
  const defs = (
    <defs>
      <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="170%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dy="4" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.28" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8d9196" />
        <stop offset="0.35" stopColor="#e9ebee" />
        <stop offset="0.6" stopColor="#b5b9be" />
        <stop offset="1" stopColor="#6f7378" />
      </linearGradient>
      <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f5f7" />
        <stop offset="0.5" stopColor="#9da2a8" />
        <stop offset="1" stopColor="#dfe2e6" />
      </linearGradient>
      <linearGradient id={`${id}-foam`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a3a3c" />
        <stop offset="1" stopColor="#1d1d1f" />
      </linearGradient>
      <linearGradient id={`${id}-film`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d23a2f" />
        <stop offset="1" stopColor="#b0281f" />
      </linearGradient>
      <linearGradient id={`${id}-clip`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1a1a1b" />
        <stop offset="0.5" stopColor="#3b3b3d" />
        <stop offset="1" stopColor="#141415" />
      </linearGradient>
      <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d8c3a0" />
        <stop offset="1" stopColor="#c4ab84" />
      </linearGradient>
    </defs>
  );
  const sh = `url(#${id}-sh)`;

  // A sheet of foam pads on red release film.
  const padSheet = (x: number, y: number, thick: boolean, cols = 5, rows = 2) => {
    const pw = 26, ph = 16, gx = 6, gy = 7;
    const w = cols * pw + (cols + 1) * gx;
    const h = rows * ph + (rows + 1) * gy;
    return (
      <g transform={`translate(${x} ${y})`} filter={sh}>
        <rect width={w} height={h} rx="3" fill={`url(#${id}-film)`} />
        {Array.from({ length: cols * rows }, (_, i) => {
          const px = gx + (i % cols) * (pw + gx);
          const py = gy + Math.floor(i / cols) * (ph + gy);
          return (
            <g key={i}>
              {thick && <rect x={px + 1} y={py + 3} width={pw} height={ph} rx="2.5" fill="#0f0f10" />}
              <rect x={px} y={py} width={pw} height={ph} rx="2.5" fill={`url(#${id}-foam)`} />
              <rect x={px + 2} y={py + 1.5} width={pw - 4} height="2" rx="1" fill="#ffffff" opacity="0.08" />
            </g>
          );
        })}
      </g>
    );
  };

  // A self-tapping screw lying on its side.
  const screw = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`} filter={sh}>
      <path d="M0 -7 C 4 -7 6 -4 6 0 C 6 4 4 7 0 7 Z" fill={`url(#${id}-steel)`} />
      <rect x="5" y="-2.6" width="34" height="5.2" fill={`url(#${id}-steel)`} />
      <path d="M39 -2.6 L 46 0 L 39 2.6 Z" fill="#8d9196" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${9 + i * 4} -3.2 l2.2 6.4`} stroke="#6f7378" strokeWidth="1" />
      ))}
      <path d="M2 -4 v8" stroke="#555a60" strokeWidth="1.2" />
    </g>
  );
  // A snap-on screw cap.
  const cap = (x: number, y: number, fill: string, ring: string) => (
    <g transform={`translate(${x} ${y})`} filter={sh}>
      <circle r="9" fill={fill} />
      <circle r="9" fill="none" stroke={ring} strokeWidth="1" />
      <ellipse cx="-2.5" cy="-3" rx="4" ry="2.4" fill="#ffffff" opacity="0.35" />
    </g>
  );

  const body = (() => {
    switch (art) {
      case "pads":
        return padSheet(5, 42, false);
      case "pads6":
        return (
          <>
            {padSheet(5, 30, true)}
            {/* a single pad turned on its side to show the thickness */}
            <g transform="translate(71 100)" filter={sh}>
              <rect width="34" height="10" rx="2" fill="#1d1d1f" />
              <rect y="7" width="34" height="3" rx="1.5" fill="#b0281f" />
            </g>
          </>
        );
      case "screws":
        return (
          <>
            {screw(30, 44, -8)}
            {screw(34, 66, 4)}
            {screw(28, 88, -3)}
            {screw(36, 108, 7)}
            {cap(116, 50, "#111112", "#000")}
            {cap(136, 62, "#111112", "#000")}
            {cap(112, 76, "#f5f5f2", "#c9c9c4")}
            {cap(132, 88, "#f5f5f2", "#c9c9c4")}
            {cap(108, 102, "#f4c20d", "#c79c00")}
            {cap(128, 112, "#f4c20d", "#c79c00")}
          </>
        );
      case "kit":
        return (
          <>
            {/* backing card, with pads and screws laid on it */}
            <g filter={sh}>
              <rect x="20" y="22" width="136" height="98" rx="6" fill={`url(#${id}-card)`} />
              <rect x="20" y="22" width="136" height="18" rx="6" fill="#0d0d0d" />
              <rect x="20" y="34" width="136" height="6" fill="#0d0d0d" />
              <text x="88" y="35" textAnchor="middle" className="psh__brand">
                REG KING
              </text>
            </g>
            {padSheet(28, 48, false, 3, 2)}
            {screw(140, 50, 90)}
            {screw(150, 50, 90)}
            {cap(50, 106, "#111112", "#000")}
            {cap(72, 106, "#f5f5f2", "#c9c9c4")}
            {cap(94, 106, "#f4c20d", "#c79c00")}
          </>
        );
      case "clips":
        return (
          <>
            {[0, 1].map((i) => (
              <g key={i} transform={`translate(${46 + i * 62} 40)`} filter={sh}>
                {/* a sprung clip: back plate, lip and grip ridges */}
                <path d="M0 0 h28 v62 h-28 z" fill={`url(#${id}-clip)`} rx="3" />
                <path d="M-4 0 h36 v8 h-36 z" fill="#262628" />
                <path d="M-4 54 h36 v8 h-36 z" fill="#262628" />
                {Array.from({ length: 5 }, (_, j) => (
                  <rect key={j} x="6" y={16 + j * 7} width="16" height="2" rx="1" fill="#4a4a4d" />
                ))}
                <rect x="2" y="2" width="3" height="58" rx="1.5" fill="#ffffff" opacity="0.07" />
              </g>
            ))}
          </>
        );
      case "magnets":
        return (
          <>
            {[0, 1].map((i) => (
              <g key={i} transform={`translate(${54 + i * 68} ${66 - i * 8})`} filter={sh}>
                <ellipse cx="0" cy="8" rx="30" ry="10" fill="#55595e" />
                <rect x="-30" y="-2" width="60" height="10" fill="#8a8f95" />
                <ellipse cx="0" cy="-2" rx="30" ry="10" fill={`url(#${id}-chrome)`} />
                <ellipse cx="0" cy="-2" rx="11" ry="3.6" fill="#5b6066" />
                <ellipse cx="-10" cy="-6" rx="10" ry="2.4" fill="#ffffff" opacity="0.5" />
              </g>
            ))}
            {/* rubber pads that go with them */}
            {[0, 1].map((i) => (
              <ellipse key={i} cx={58 + i * 60} cy={108} rx="18" ry="6" fill="#1d1d1f" filter={sh} />
            ))}
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <svg viewBox="0 0 176 140" className="psh__svg" aria-hidden>
      {defs}
      {body}
    </svg>
  );
}
