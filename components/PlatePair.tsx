/**
 * A plate as REG KING shows it in product photos: white front over yellow rear, on black.
 *
 * The characters are drawn in SVG on a 1027 x 216 canvas measured from REG KING's listing artwork
 * (the PSD template): 164px-tall characters, natural font spacing and a wider gap between the two
 * groups. SVG scales the same in every browser, so the reg can never spill off the plate (CSS
 * container units made it too big in Safari on iPhone). A reg too long for the plate is squeezed
 * to fit rather than cut off.
 */
const W = 1027;
const H = 216;
const FONT_PX = 234; // 164px characters: the plate font's capitals are 0.7em tall
const MAX_W = 935; // the widest the characters run in the artwork (48px each side)
const GROUP_GAP = 24; // extra space between the two groups, on top of the font's own space

/** The reg's width in px at FONT_PX, from the plate font's measurements. */
function textWidth(reg: string) {
  const t = reg.trim();
  const adv = [...t].reduce((a, ch) => a + (ch === " " ? 0.195 : ch === "1" || ch === "I" ? 0.222 : 0.541), 0) - 0.098;
  return adv * FONT_PX + (t.includes(" ") ? GROUP_GAP : 0);
}

function PlateText({ reg }: { reg: string }) {
  const t = reg.trim().toUpperCase();
  const i = t.indexOf(" ");
  const tooWide = textWidth(t) > MAX_W;
  return (
    <svg className="rk-pair__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden focusable="false">
      <text
        x={W / 2}
        y={H / 2 + 82}
        textAnchor="middle"
        fontSize={FONT_PX}
        fill="#000"
        style={{ fontFamily: "var(--rk-plate-font)" }}
        {...(tooWide ? { textLength: MAX_W, lengthAdjust: "spacingAndGlyphs" } : {})}
      >
        {i > 0 ? (
          <>
            <tspan>{t.slice(0, i + 1)}</tspan>
            <tspan dx={GROUP_GAP}>{t.slice(i + 1)}</tspan>
          </>
        ) : (
          t
        )}
      </text>
    </svg>
  );
}

export function PlatePair({ reg, size = "md", show = "both" }: { reg: string; size?: "md" | "lg"; show?: "both" | "front" | "rear" }) {
  return (
    <span className={`rk-pair rk-pair--${size}`} data-show={show} role="img" aria-label={`${reg} ${show === "both" ? "front and rear plates" : `${show} plate`}`}>
      {show !== "rear" && (
        <span className="rk-pair__plate" data-side="front" aria-hidden>
          <PlateText reg={reg} />
        </span>
      )}
      {show !== "front" && (
        <span className="rk-pair__plate" data-side="rear" aria-hidden>
          <PlateText reg={reg} />
        </span>
      )}
    </span>
  );
}
