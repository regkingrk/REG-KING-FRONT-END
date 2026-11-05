import { Fragment } from "react";

/**
 * SVG filters the plate previews share, drawn once per page.
 *
 * Retro and Vintage (bevel): black acrylic letters, gloss on Retro and matt on Vintage, cut with a chamfer, so each stroke has a flat top and
 * angled faces down to the plate that meet in sharp mitres, as on REG KING's Retro plates. Built from
 * the letter shape itself: the shape is eroded in steps to make a height map (flat on top, sloping
 * at the edges), lit from the top left so faces turned to the light show grey and the rest stay
 * black, given a gloss highlight, then stood off the plate with a short side wall and a shadow.
 *
 * The chamfer has to be a fixed share of the stroke, so there is one filter per chamfer width in px;
 * previews pick the one nearest their letter size (bevelFilterFor).
 */
export const BEVEL_RADII = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22];

/** Retro is gloss, Vintage matt; the X versions are 4D, standing further off the plate. */
export type BevelLook = "bevel" | "bevel-matt" | "bevel-x" | "bevel-matt-x";
const BEVEL_LOOKS: BevelLook[] = ["bevel", "bevel-matt", "bevel-x", "bevel-matt-x"];
const idOf = (look: BevelLook, r: number) => `rk-${look}-${String(r).replace(".", "_")}`;

/** The chamfer is a little under half the stroke on each side: 0.05 of the font size. */
export function bevelFilterFor(fontPx: number, look: BevelLook = "bevel") {
  const want = fontPx * 0.05;
  const r = BEVEL_RADII.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
  return `url(#${idOf(look, r)})`;
}

function Bevel({ r, look }: { r: number; look: BevelLook }) {
  const matt = look.includes("matt");
  const deep = look.endsWith("-x");
  const f = (n: number) => +n.toFixed(2);
  const steps = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map((x) => f(r * x));
  // The side wall: copies of the letter stepping down and to the right, darker further back.
  const depth = r * (deep ? 1.6 : 1);
  const layers = deep ? 12 : 7;
  const wall = Array.from({ length: layers }, (_, i) => {
    const t = (i + 1) / layers;
    const g = Math.round((matt ? 0x3a : 0x30) - t * (matt ? 0x1c : 0x22));
    return { dx: f(depth * 0.6 * t), dy: f(depth * 0.8 * t), c: `#${g.toString(16).padStart(2, "0").repeat(3)}` };
  });
  return (
    <filter id={idOf(look, r)} x="-8%" y="-15%" width="125%" height="170%" colorInterpolationFilters="sRGB">
      {/* height map: the letter, then smaller and smaller copies of it stacked on top */}
      {steps.map((s, i) => (
        <feMorphology key={i} in="SourceAlpha" operator="erode" radius={s} result={`e${i}`} />
      ))}
      <feComposite in="SourceAlpha" in2="e0" operator="arithmetic" k2="0.143" k3="0.143" result="h1" />
      <feComposite in="h1" in2="e1" operator="arithmetic" k2="1" k3="0.143" result="h2" />
      <feComposite in="h2" in2="e2" operator="arithmetic" k2="1" k3="0.143" result="h3" />
      <feComposite in="h3" in2="e3" operator="arithmetic" k2="1" k3="0.143" result="h4" />
      <feComposite in="h4" in2="e4" operator="arithmetic" k2="1" k3="0.143" result="h5" />
      <feComposite in="h5" in2="e5" operator="arithmetic" k2="1" k3="0.143" result="h6" />
      <feGaussianBlur in="h6" stdDeviation={f(r * 0.12)} result="h" />
      {/* light from the top left: faces turned to it go grey, the flat top stays near black */}
      <feDiffuseLighting in="h" surfaceScale={r * 1.1} diffuseConstant="1" lightingColor="#fff" result="lit">
        <feDistantLight azimuth="235" elevation="38" />
      </feDiffuseLighting>
      {matt ? (
        // Matt: softer contrast, a satin black top and no gloss
        <feComponentTransfer in="lit" result="shade">
          <feFuncR type="linear" slope="0.62" intercept="-0.3" />
          <feFuncG type="linear" slope="0.62" intercept="-0.3" />
          <feFuncB type="linear" slope="0.62" intercept="-0.295" />
        </feComponentTransfer>
      ) : (
        <>
          <feComponentTransfer in="lit" result="ink">
            <feFuncR type="linear" slope="1.1" intercept="-0.6" />
            <feFuncG type="linear" slope="1.1" intercept="-0.6" />
            <feFuncB type="linear" slope="1.1" intercept="-0.59" />
          </feComponentTransfer>
          <feSpecularLighting in="h" surfaceScale={r * 1.1} specularConstant="0.75" specularExponent="28" lightingColor="#fff" result="spec">
            <feDistantLight azimuth="235" elevation="38" />
          </feSpecularLighting>
          <feComposite in="ink" in2="spec" operator="arithmetic" k2="1" k3="0.55" result="shade" />
        </>
      )}
      {matt && (
        // a satin black floor under the facets, so the matt top reads as dark grey rather than ink
        <feComponentTransfer in="shade" result="shadeM">
          <feFuncR type="linear" slope="1" intercept="0.07" />
          <feFuncG type="linear" slope="1" intercept="0.07" />
          <feFuncB type="linear" slope="1" intercept="0.075" />
        </feComponentTransfer>
      )}
      <feComposite in={matt ? "shadeM" : "shade"} in2="SourceAlpha" operator="in" result="face" />
      {/* the side wall, then a soft shadow on the plate */}
      {wall.map((w, i) => (
        <Fragment key={i}>
          <feOffset in="SourceAlpha" dx={w.dx} dy={w.dy} result={`wA${i}`} />
          <feFlood floodColor={w.c} result={`wC${i}`} />
          <feComposite in={`wC${i}`} in2={`wA${i}`} operator="in" result={`w${i}`} />
        </Fragment>
      ))}
      <feGaussianBlur in="SourceAlpha" stdDeviation={f(r * (deep ? 1 : 0.75))} result="blur" />
      <feOffset in="blur" dx={f(depth * 0.7)} dy={f(depth * 1.1)} result="shA" />
      <feFlood floodColor="#000" floodOpacity={deep ? "0.45" : "0.4"} result="shC" />
      <feComposite in="shC" in2="shA" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        {wall
          .map((_, i) => <feMergeNode key={i} in={`w${wall.length - 1 - i}`} />)}
        <feMergeNode in="face" />
      </feMerge>
    </filter>
  );
}

/**
 * Bike Print: the same characters drawn in a lighter, thinner print (as on motorbike plates), made by
 * shrinking each stroke evenly. One filter per thinning in px; previews pick the nearest (thinFilterFor).
 */
export const THIN_RADII = [0.3, 0.5, 0.7, 1, 1.3, 1.6, 2, 2.5, 3];
export function thinFilterFor(fontPx: number) {
  const want = fontPx * 0.0105;
  const r = THIN_RADII.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
  return `url(#rk-thin-${String(r).replace(".", "_")})`;
}
function Thin({ r }: { r: number }) {
  return (
    <filter id={`rk-thin-${String(r).replace(".", "_")}`} x="-2%" y="-2%" width="104%" height="104%">
      <feMorphology in="SourceGraphic" operator="erode" radius={r} />
    </filter>
  );
}

export function PlateFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden focusable="false">
      <defs>
        {BEVEL_LOOKS.flatMap((look) => BEVEL_RADII.map((r) => <Bevel key={`${look}-${r}`} r={r} look={look} />))}
        {THIN_RADII.map((r) => (
          <Thin key={r} r={r} />
        ))}
      </defs>
    </svg>
  );
}
