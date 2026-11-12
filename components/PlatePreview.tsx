import { EXTRAS, fontOf, isHex, lookOf, sizeInfo, sizeOf, sizeScale, styleOf, type BuildConfig } from "@/lib/builder";

/** Data attributes that drive the plate's look (shared by the hero plate and previews). */
export function plateAttrs(c: BuildConfig, side: "front" | "rear", size: string | null = sizeOf(c, side)) {
  const looks = c.extras.map((x) => EXTRAS.find((e) => e.name === x)?.look).filter(Boolean) as string[];
  return {
    "data-side": side,
    "data-look": lookOf(styleOf(c, side)),
    "data-font": fontOf(styleOf(c, side)) ?? undefined,
    "data-hex": isHex(size) ? "true" : undefined,
    "data-hexflip": isHex(size) && c.hexFlip ? "true" : undefined,
    "data-extras": looks.join(" ") || undefined,
    style: {
      ["--rk-plate-scale" as string]: String(sizeScale(size)),
      // hex outline: height over width, so the cut corners keep the real proportions at any size
      ...(isHex(size) ? { ["--rk-hxr" as string]: String(((sizeInfo(size)?.h ?? 111) / (sizeInfo(size)?.w ?? 520)).toFixed(4)) } : {}),
    },
  };
}

/** The flag / badge panel on the left of the plate, when an extra asks for one. */
export function PlateBadge({ c }: { c: BuildConfig }) {
  const looks = c.extras.map((x) => EXTRAS.find((e) => e.name === x)?.look);
  const kind = looks.find((l) => l === "uk" || l === "ev-uk" || l === "ev" || l === "flag" || l === "badge");
  if (!kind) return null;
  return (
    <span className={`rk-badge rk-badge--${kind}`} aria-hidden>
      {(kind === "uk" || kind === "ev-uk") && (
        <svg viewBox="0 0 60 30" className="rk-badge__flag">
          <path d="M0 0v30h60V0z" fill="#012169" />
          <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="3" />
          <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
          <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      )}
      {kind === "flag" && <span className="rk-badge__blank" />}
      {kind === "badge" && <span className="rk-badge__crest">RK</span>}
      {/* EV: just the green panel. UK and UK EV: the flag with UK under it. */}
      {kind !== "ev" && kind !== "badge" && <b>UK</b>}
    </span>
  );
}

/** The Custom Text extra: words along the bottom of a show plate. */
export const bottomTextOf = (c: BuildConfig) =>
  c.legal === "Show" && c.extras.some((x) => EXTRAS.find((e) => e.name === x)?.look === "text") ? (c.bottomText ?? "").trim() : "";

/** Badge panel, optional inset border line and the custom bottom text. */
export function PlateDecor({ c }: { c: BuildConfig }) {
  const border = c.extras.some((x) => EXTRAS.find((e) => e.name === x)?.look === "border");
  const bottom = bottomTextOf(c);
  return (
    <>
      {/* the pressed rim round a metal press plate (only shown on those looks) */}
      <span className="rk-prim" aria-hidden />
      <PlateBadge c={c} />
      {border && <span className="rk-pborder" aria-hidden />}
      {bottom && <span className="rk-pbottom" aria-hidden>{bottom}</span>}
    </>
  );
}

/** Motorbike plates are two lines: split at the space (or after four characters). */
export const bikeLines = (reg: string) => {
  const r = reg.trim();
  const i = r.indexOf(" ");
  if (i > 0) return [r.slice(0, i), r.slice(i + 1)];
  return r.length > 4 ? [r.slice(0, 4), r.slice(4)] : [r];
};

/** A small, read-only plate (used in the style choices). */
export function PlatePreview({ reg, c, side, size }: { reg: string; c: BuildConfig; side: "front" | "rear"; size?: string | null }) {
  const text = reg || "YOUR REG";
  const bike = c.vehicle === "Bike";
  return (
    <div className={`rk-pp${bike ? " rk-pp--bike" : ""}`} {...plateAttrs(c, side, bike ? null : size)}>
      <PlateDecor c={c} />
      {bike ? (
        <span className="rk-ptext rk-ptext--2">
          {bikeLines(text).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </span>
      ) : (
        <span className="rk-ptext">{text}</span>
      )}
    </div>
  );
}
