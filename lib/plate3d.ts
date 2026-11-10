/**
 * The real 3D plate (three.js): a solid acrylic plate with the characters built as solid shapes from
 * the plate font, lit by a studio so gloss, gel domes and chamfers catch the light as they turn.
 *
 * Everything is measured in millimetres. The plate face (colour, badge, border, supplier marks, custom
 * text, tint) is drawn by renderPlate, the same code as the 2D picture and "See it on your car", so
 * every view agrees. Printed characters are part of that face; every other style is a solid shape:
 *
 *   3D Gel      domed resin on flat letters          4D 3MM / 6MM   cut acrylic, 3 or 6mm thick
 *   4D Gel      cut acrylic with a domed resin top   Retro, Vintage chamfered letters (gloss / matt)
 *   Metal press white or silver letters pressed up from a black plate
 */
import * as THREE from "three";
import { GLYPHS, GLYPH_CAP, GLYPH_SPACE, METRO_BEARING, METRO_GLYPHS, METRO_SPACE } from "./plateGlyphs";
import { hexPoints, type PlateLook } from "./builder";
import { renderPlate, type PlateSpec } from "./plateRender";

const PLATE_T = 3; // plate thickness, mm
const BEARING = 49; // the font's side bearing, in font units

/** Is real 3D possible here? (the three.js library loaded and the browser has WebGL) */
export function canRender3D(): boolean {
  if (!(THREE as { WebGLRenderer?: unknown }).WebGLRenderer) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Glyph outlines → three.js shapes                                    */
/* ------------------------------------------------------------------ */
const shapeCache = new Map<string, THREE.Shape[]>();

/** Parse the font's SVG-style outline (M, L, H, V, Q, Z with repeated coordinates) into shapes. */
function glyphShapes(ch: string, font: "plate" | "metro" = "plate"): THREE.Shape[] {
  const ck = font === "metro" ? `m:${ch}` : ch;
  const hit = shapeCache.get(ck);
  if (hit) return hit;
  const g = (font === "metro" ? METRO_GLYPHS : GLYPHS)[ch];
  if (!g) return [];
  const path = new THREE.ShapePath();
  const tokens = g.d.match(/[MLHVQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLHVQZ]/i.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case "M":
        x = num(); y = num(); sx = x; sy = y;
        path.moveTo(x, y);
        cmd = "L"; // further pairs after M are lines
        break;
      case "L":
        x = num(); y = num();
        path.lineTo(x, y);
        break;
      case "H":
        x = num();
        path.lineTo(x, y);
        break;
      case "V":
        y = num();
        path.lineTo(x, y);
        break;
      case "Q": {
        const cx = num(), cy = num();
        x = num(); y = num();
        path.quadraticCurveTo(cx, cy, x, y);
        break;
      }
      case "Z":
        path.lineTo(sx, sy);
        x = sx; y = sy;
        cmd = "";
        break;
      default:
        i++;
    }
  }
  const shapes = path.toShapes(false);
  shapeCache.set(ck, shapes);
  return shapes;
}

/**
 * Smooth shading: each corner takes the average direction of the faces that meet there, unless two
 * faces meet at a sharp angle (more than `crease`), where the edge stays crisp. Without this every
 * small flat face of a gel dome shows as a line.
 */
function smoothNormals(geo: THREE.BufferGeometry, crease = 35) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const faceN: THREE.Vector3[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const fn = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    faceN.push(fn);
  }
  // corners at the same place, grouped (rounded so tiny float differences still match)
  const key = (i: number) => `${Math.round(pos.getX(i) * 100)},${Math.round(pos.getY(i) * 100)},${Math.round(pos.getZ(i) * 100)}`;
  const at = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const k = key(i);
    const l = at.get(k);
    if (l) l.push(i);
    else at.set(k, [i]);
  }
  const cos = Math.cos((crease * Math.PI) / 180);
  const normals = new Float32Array(n * 3);
  const sum = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const own = faceN[Math.floor(i / 3)];
    sum.set(0, 0, 0);
    for (const j of at.get(key(i))!) {
      const f = faceN[Math.floor(j / 3)];
      if (f.dot(own) >= cos) sum.add(f);
    }
    sum.normalize();
    normals[i * 3] = sum.x;
    normals[i * 3 + 1] = sum.y;
    normals[i * 3 + 2] = sum.z;
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
}

/**
 * 4D acrylic: gloss black face and gloss black cut sides, both mirroring the dark studio with its light
 * streaks (thin lines of light on the edges, not silver). `covered`: something sits on top (4D Gel,
 * Retro X), so the face needn't be see-through.
 */
function acrylicMaterials(s: PlateSpec, softEnv: THREE.Texture | undefined, covered: boolean): [THREE.MeshPhysicalMaterial, THREE.MeshPhysicalMaterial] {
  const face = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.015, envMapIntensity: 0.75, transparent: !covered, opacity: covered ? 1 : 0.95 });
  const side = new THREE.MeshPhysicalMaterial({ color: 0x040404, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.1 });
  if (softEnv) {
    face.envMap = softEnv;
    side.envMap = softEnv;
  }
  return [face, side];
}

/** Keep the flat front and back faces exactly flat (smoothing their edge corners into the bevel shades them in streaks). */
function flattenCaps(geo: THREE.BufferGeometry) {
  const cap = geo.groups.find((g) => g.materialIndex === 0);
  if (!cap) return;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = cap.start; i < cap.start + cap.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const n = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    for (let j = 0; j < 3; j++) nor.setXYZ(i + j, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/* How each style is built                                              */
/* ------------------------------------------------------------------ */
type Build = { depth: number; bevel: number; size: number; segs: number; colour: number; rough: number; coat: number; metal: number; /** draw the letters in by this much (font units) */ inset?: number; /** Onyx: only a band following the letter's edge, from inset [0] to inset [1] (font units) */ ring?: [number, number] };
function buildFor(look: PlateLook): Build | null {
  const black = { colour: 0x050506, rough: 0.12, coat: 1, metal: 0 };
  switch (look) {
    case "printed":
    case "printed-bike":
      return null; // printed under the acrylic: part of the plate face
    case "gel":
    case "gel-bike":
      // the black letters are printed on the plate (in the face picture); RESIN below domes over them
      return null;
    case "raised":
    case "raised-bike":
      return { depth: 3, bevel: 0.3, size: 0.3, segs: 2, ...black };
    case "raised-deep":
      return { depth: 6, bevel: 0.3, size: 0.3, segs: 2, ...black };
    case "gel-4d":
    case "gel-4d-bike":
      // a 4D acrylic letter, with the RESIN dome poured on top
      return { depth: 2.5, bevel: 0.25, size: 0.25, segs: 2, ...black };
    case "bevel":
      return { depth: 2, bevel: 2.4, size: 3, segs: 1, ...black };
    case "bevel-x":
      return { depth: 4, bevel: 2.4, size: 3, segs: 1, ...black };
    case "bevel-matt":
      return { depth: 2, bevel: 2.4, size: 3, segs: 1, colour: 0x111112, rough: 0.62, coat: 0, metal: 0 };
    case "bevel-matt-x":
      return { depth: 4, bevel: 2.4, size: 3, segs: 1, colour: 0x111112, rough: 0.62, coat: 0, metal: 0 };
    case "metal-white":
      return { depth: 0.6, bevel: 0.6, size: 0.5, segs: 3, colour: 0xf2f2ef, rough: 0.35, coat: 0.3, metal: 0.1 };
    case "metal-silver":
      return { depth: 0.6, bevel: 0.6, size: 0.5, segs: 3, colour: 0xc9ccd1, rough: 0.28, coat: 0.3, metal: 0.9 };
  }
}

/**
 * 3D Gel, as made: clear polyurethane resin poured over each black letter. It sits in a smooth dome
 * (rounded right to the edge of the stroke, glossy on top), and because it's clear the black shows
 * through while the dome bends the light and shows reflections across it.
 */
// for the dome: depth = the straight side (mm), bevel = how far it then rises to the middle (mm)
const RESIN: Build = { depth: 0.9, bevel: 3, size: 0, segs: 0, colour: 0x020203, rough: 0.02, coat: 1, metal: 0 };
/** The 4D styles: laser-cut acrylic letters (Metal Press, Onyx and Shadow share the raised look but aren't acrylic). */
/** How much deeper 4D is drawn than made, so it reads on screen: 3mm shows at 4.8mm, 6mm at 7mm. */
const acrylicLift = (depth: number) => (depth > 4 ? 7 / 6 : 1.6);
/** Metal Press (not the black-plate Metal Press Black & White / Silver, which have their own look). */
const isPressed = (s: PlateSpec) => s.styleName === "Metal Press" || s.look === "metal-white" || s.look === "metal-silver";
/** Black pressed plates: a black plate with the letters and rim pressed up in white or bare silver. */
const blackPress = (s: PlateSpec) => s.look === "metal-white" || s.look === "metal-silver";
/** Height of the plate face (the acrylic plate's extrusion runs to PLATE_T / 2 plus its 0.4mm bevel). */
const FACE_Z = PLATE_T / 2 + 0.4;
/** Metal Press: depth = how high it's pressed (mm), size = how wide the curve up from the plate is (mm). */
const PRESS: Build = { depth: 0.75, bevel: 0, size: 1.3, segs: 0, colour: 0, rough: 0, coat: 0, metal: 0 };
const pressPaint = (s: PlateSpec) => (s.look === "metal-white" ? 0xf2f2ef : s.look === "metal-silver" ? 0xe4e6ea : s.side === "rear" ? 0xd69c00 : 0xf1f1ee);
/** Colour of the pressed tops: black on Metal Press; on the black plates the whole pressed shape is white or silver. */
const pressTop = (s: PlateSpec) => (blackPress(s) ? pressPaint(s) : 0x0b0b0b);
const isGel4d = (look: PlateLook) => look === "gel-4d" || look === "gel-4d-bike";
/** Shadow: a 4D 3MM letter with a second, slightly smaller acrylic letter stacked on top, so a thin step shows all round. */
const isShadow = (s: PlateSpec) => s.styleName === "Shadow";
/** Onyx: a gloss 4D 3MM letter with a thin matte outline laid on top, following its edge, so the inside stays shiny. */
const isOnyx = (s: PlateSpec) => s.styleName === "Onyx";
const isAcrylic = (s: PlateSpec) => /^4D (3|6)MM/.test(s.styleName ?? "") || isGel4d(s.look) || isShadow(s) || isOnyx(s);
/** 4D Gel: the 4D acrylic letter (3mm, or 6mm for 4D Gel 6MM) with the 3D Gel dome poured on top. */
const acrylicDepth = (s: PlateSpec, b: Build) => (isGel4d(s.look) ? (/6MM/.test(s.styleName ?? "") ? 6 : 3) : b.depth);
/** How high the drawn 4D letter's top sits above its base. */
const acrylicShown = (s: PlateSpec, b: Build) => acrylicDepth(s, b) * acrylicLift(acrylicDepth(s, b));
/** Retro X / Vintage X: how much taller the 4D base is drawn than a plain 4D 3MM letter. */
const X_LIFT = 1.3;
const isChisel = (look: PlateLook) => look === "bevel" || look === "bevel-matt" || look === "bevel-x" || look === "bevel-matt-x";
const hasResin = (look: PlateLook) => look === "gel" || isGel4d(look) || look === "gel-bike";
/** Bike Gel: the bike print's thinner strokes, so the shapes are drawn in by this much (font units, about 1.7mm). */
const BIKE_INSET = 15;

/* ------------------------------------------------------------------ */
/* One plate                                                           */
/* ------------------------------------------------------------------ */
function outlineShape(s: PlateSpec, inset = 0, shape: THREE.Shape | THREE.Path = new THREE.Shape()): THREE.Shape {
  const w = s.w - inset * 2, h = s.h - inset * 2;
  if (s.hex) {
    // hexPoints is y-down from the top left; flip to y-up about the centre
    hexPoints(-w / 2, -h / 2, w, h, s.hexFlip).forEach(([px, py], i) => (i ? shape.lineTo(px, -py) : shape.moveTo(px, -py)));
    shape.closePath();
    return shape as THREE.Shape;
  }
  const r = Math.max(1, 5 - inset), x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape as THREE.Shape;
}

/** Characters laid out as on the plate: 79mm high (64mm on a bike), centred, narrowed only if they can't fit. */
function characters(s: PlateSpec, b: Build, mat: THREE.Material | THREE.Material[], base = PLATE_T / 2 - 0.05): THREE.Group {
  const group = new THREE.Group();
  const badge = !s.bike && s.extras.some((e) => e === "uk" || e === "ev-uk" || e === "ev" || e === "flag" || e === "badge");
  const left = -s.w / 2 + (badge ? 50 : 0) + 11;
  const right = s.w / 2 - 11;
  const lines = s.bike ? bikeLines(s.reg) : [s.reg];
  const charH = s.bike || s.look === "printed-bike" || s.look === "gel-bike" || s.look === "raised-bike" || s.look === "gel-4d-bike" ? 64 : Math.min(79, s.h * 0.71);
  const k = charH / GLYPH_CAP; // mm per font unit
  const gap = 14;
  const total = lines.length * charH + (lines.length - 1) * gap;
  let top = total / 2;
  const geoOpts = {
    depth: b.depth,
    bevelEnabled: true,
    bevelThickness: b.bevel / k,
    // a negative size is in font units (so it follows the stroke width on car and bike plates alike)
    bevelSize: b.size < 0 ? -b.size : b.size / k,
    bevelOffset: b.size < 0 ? b.size : -b.size / k,
    bevelSegments: b.segs,
    curveSegments: 18,
  };
  // Show plates with custom spacing: the characters without their spaces, each gap as chosen
  const gaps = !s.bike && s.gaps ? s.gaps : null;
  for (const raw of lines) {
    const line = gaps ? raw.replace(/\s/g, "") : raw;
    const extra = (i: number) => (gaps ? (gaps[i] ?? 0) * GLYPH_SPACE : 0);
    const width = ([...line].reduce((a, ch, i) => a + (ch === " " ? GLYPH_SPACE : GLYPHS[ch]?.adv ?? 0) + (i < line.length - 1 ? extra(i) : 0), 0) - 2 * BEARING) * k;
    const sx = width > right - left ? (right - left) / width : 1;
    let x = (left + right) / 2 - (width * sx) / 2 - BEARING * k * sx;
    const baseline = top - charH;
    let idx = -1;
    for (const ch of line) {
      idx++;
      if (ch === " ") {
        x += GLYPH_SPACE * k * sx;
        continue;
      }
      const shapes = b.ring ? ringShapes(glyphShapes(ch), b.ring[0], b.ring[1]) : b.inset ? insetShapes(glyphShapes(ch), b.inset) : glyphShapes(ch);
      if (shapes.length) {
        // built in font units, then scaled to millimetres (depth stays in mm)
        const geo =
          b === RESIN
            ? s.look === "gel-bike"
              ? domeGeometry(`${ch}|bike`, shapes, k, RESIN.depth * 0.85, RESIN.bevel * 0.85)
              : domeGeometry(ch, shapes, k, RESIN.depth, RESIN.bevel)
            : b.segs === -1
              ? chiselGeometry(ch, shapes, b.bevel / k)
              : b === PRESS
              ? pressGeometry(`${ch}|${k}|${s.side}|${s.look}`, shapes, k, PRESS.depth, PRESS.size, pressTop(s), pressPaint(s))
              : glyphGeometry(b.ring ? `${ch}|ring${b.ring}` : b.inset ? `${ch}|in${b.inset}` : ch, shapes, geoOpts, b.depth / k);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.set(k * sx, k, k);
        // the back bevel sinks into the plate, so each letter stands on a flat foot
        mesh.position.set(x, baseline, base);
        mesh.castShadow = true;
        group.add(mesh);
      }
      x += ((GLYPHS[ch]?.adv ?? 0) + extra(idx)) * k * sx;
    }
    top -= charH + gap;
  }
  return group;
}

/**
 * Raised lettering in the plate font as solid cut acrylic (surround strips): `text` centred on the origin,
 * characters `heightMm` tall and `depthMm` deep, standing up from z = 0. Characters the font hasn't got are left out.
 */
export function raisedText(text: string, heightMm: number, depthMm: number, mat: THREE.Material | THREE.Material[], font: "plate" | "metro" = "plate"): THREE.Group {
  const group = new THREE.Group();
  const set = font === "metro" ? METRO_GLYPHS : GLYPHS, space = font === "metro" ? METRO_SPACE : GLYPH_SPACE, bearing = font === "metro" ? METRO_BEARING : BEARING;
  const k = heightMm / GLYPH_CAP;
  const line = text.toUpperCase();
  const width = ([...line].reduce((a, ch) => a + (ch === " " ? space : set[ch]?.adv ?? 0), 0) - 2 * bearing) * k;
  let x = -width / 2 - bearing * k;
  for (const ch of line) {
    if (ch === " ") {
      x += space * k;
      continue;
    }
    const shapes = glyphShapes(ch, font);
    if (shapes.length) {
      const geo = glyphGeometry(`${font}:${ch}|raised`, shapes, { bevelEnabled: true, bevelThickness: 0.08 / k, bevelSize: 0.08 / k, bevelOffset: -0.08 / k, bevelSegments: 1, curveSegments: 12 }, depthMm / k);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(k, k, k);
      mesh.position.set(x, -heightMm / 2, 0);
      mesh.castShadow = true;
      group.add(mesh);
    }
    x += (set[ch]?.adv ?? 0) * k;
  }
  return group;
}

/** Width of `text` in the plate font (or Metro) at this character height (mm). */
export const textWidthMm = (text: string, heightMm: number, font: "plate" | "metro" = "plate") => {
  const set = font === "metro" ? METRO_GLYPHS : GLYPHS, space = font === "metro" ? METRO_SPACE : GLYPH_SPACE, bearing = font === "metro" ? METRO_BEARING : BEARING;
  return ([...text.toUpperCase()].reduce((a, ch) => a + (ch === " " ? space : set[ch]?.adv ?? 0), 0) - 2 * bearing) * (heightMm / GLYPH_CAP);
};

export const PLATE_THICKNESS = PLATE_T;

/**
 * A 3D Gel dome over one character, in font units (mm / k). As poured: a short straight side, then the
 * resin rises from the edge and keeps rising towards the middle of each stroke, so it's highest along
 * the centre line and the surface is curved right across (no flat top).
 */
/**
 * Pressed metal: a shape pushed up a little out of the plate. The metal rises from the plate in a soft
 * S-curve (it leaves the plate flat, so the outline blends into the backing) up to a flat top. Only
 * the flat top is painted black; the curve keeps the plate colour. Built in shape units (mm / k):
 * an extrusion's rounded edge, reshaped into that curve.
 */
const pressCache = new Map<string, THREE.BufferGeometry>();
function pressGeometry(id: string, shapes: THREE.Shape[], k: number, riseMm: number, slopeMm: number, top: number, base: number): THREE.BufferGeometry {
  const hit = pressCache.get(id);
  if (hit) return hit.clone();
  const H = riseMm / k, W = slopeMm / k, D = 0.01 / k, SEGS = 10;
  // a 1-unit-tall bevel just to get the rings of points; heights are set below
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: D, bevelEnabled: true, bevelThickness: 1, bevelSize: W, bevelOffset: -W, bevelSegments: SEGS, curveSegments: 18 });
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const topC = new THREE.Color(top), baseC = new THREE.Color(base), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < D * 0.5) {
      // the underside, hidden below the plate face
      pos.setZ(i, z * 0.05 - 0.05 / k);
      c.copy(baseC);
    } else {
      // ring position: 0 where it leaves the plate, 1 at the flat top
      const cz = Math.min(1, Math.max(0, z - D));
      const g = 1 - Math.sqrt(Math.max(0, 1 - cz * cz));
      pos.setZ(i, H * g * g * (3 - 2 * g));
      // the paint covers the flat top and stops where the metal starts to curve down
      c.copy(baseC).lerp(topC, g > 0.8 ? 1 : 0);
    }
    col.set([c.r, c.g, c.b], i * 3);
  }
  pos.needsUpdate = true;
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  smoothNormals(geo, 70);
  flattenCaps(geo);
  pressCache.set(id, geo);
  return geo.clone();
}

/**
 * Retro / Vintage: a chisel-cut letter. The height of every point is simply how far it is in from the
 * outline (up to half a stroke), so every letter has exactly the same 45-ish° facets, they meet in a
 * clean ridge down the middle of each stroke, and corners and joins mitre themselves. Font units.
 */
const chiselCache = new Map<string, THREE.BufferGeometry>();
function chiselGeometry(ch: string, shapes: THREE.Shape[], riseU: number): THREE.BufferGeometry {
  const id = `${ch}|${riseU.toFixed(3)}`;
  const hit = chiselCache.get(id);
  if (hit) return hit.clone();
  const R = 62; // half a stroke (strokes are 124 font units)
  const L = 4; // finest edge length
  const pos: number[] = [], nor: number[] = [];
  for (const shape of shapes) {
    const pts = shape.extractPoints(24);
    const clean = (a: THREE.Vector2[]) => (a.length > 1 && a[0].equals(a[a.length - 1]) ? a.slice(0, -1) : a);
    let contour = clean(pts.shape);
    const holes = pts.holes.map(clean).map((h) => (THREE.ShapeUtils.isClockWise(h) ? h : h.slice().reverse()));
    if (THREE.ShapeUtils.isClockWise(contour)) contour = contour.slice().reverse();
    const segs: [number, number, number, number][] = [];
    for (const ring of [contour, ...holes]) ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length];
      segs.push([p.x, p.y, q.x, q.y]);
    });
    // distance in from the outline, and the direction away from it (exact, from every edge)
    const near = (x: number, y: number) => {
      let best = Infinity, nx = 0, ny = 0;
      for (const [ax, ay, bx, by] of segs) {
        const dx = bx - ax, dy = by - ay;
        const l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const px = ax + t * dx, py = ay + t * dy;
        const d = Math.hypot(x - px, y - py);
        if (d < best) {
          best = d;
          nx = px;
          ny = py;
        }
      }
      return { d: best, gx: best > 1e-6 ? (x - nx) / best : 0, gy: best > 1e-6 ? (y - ny) / best : 0 };
    };

    const vx: number[] = [], vy: number[] = [];
    for (const p of [contour, ...holes].flat()) {
      vx.push(p.x);
      vy.push(p.y);
    }
    let tris = THREE.ShapeUtils.triangulateShape(contour, holes).map((t) => [...t]);
    for (let round = 0; round < 14; round++) {
      const mids = new Map<string, number>();
      const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
      const isLong = (a: number, b: number) => Math.hypot(vx[a] - vx[b], vy[a] - vy[b]) > L;
      const mid = (a: number, b: number) => {
        const kk = key(a, b);
        let m = mids.get(kk);
        if (m === undefined) {
          m = vx.length;
          vx.push((vx[a] + vx[b]) / 2);
          vy.push((vy[a] + vy[b]) / 2);
          mids.set(kk, m);
        }
        return m;
      };
      let any = false;
      const next: number[][] = [];
      for (const t of tris) {
        const marks = [0, 1, 2].map((e) => isLong(t[e], t[(e + 1) % 3]));
        const n = marks.filter(Boolean).length;
        if (n) any = true;
        if (n === 0) next.push(t);
        else if (n === 3) {
          const [a, b, c] = t, ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
          next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
        } else {
          const r = marks.indexOf(true);
          const a = t[r], b = t[(r + 1) % 3], c = t[(r + 2) % 3];
          const ab = mid(a, b);
          if (n === 1) next.push([a, ab, c], [ab, b, c]);
          else if (marks[(r + 1) % 3]) {
            const bc = mid(b, c);
            next.push([ab, b, bc], [a, ab, bc], [a, bc, c]);
          } else {
            const ca = mid(c, a);
            next.push([a, ab, ca], [ab, b, c], [ab, c, ca]);
          }
        }
      }
      tris = next;
      if (!any) break;
    }

    // height and slope at each point
    const k = riseU / R;
    const vz: number[] = [], vn: THREE.Vector3[] = [];
    for (let i = 0; i < vx.length; i++) {
      const { d, gx, gy } = near(vx[i], vy[i]);
      if (d >= R) {
        vz.push(riseU);
        vn.push(new THREE.Vector3(0, 0, 1));
      } else {
        vz.push(d * k);
        vn.push(new THREE.Vector3(-gx * k, -gy * k, 1).normalize());
      }
    }
    const a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), c3 = new THREE.Vector3(), fn = new THREE.Vector3();
    for (const t of tris) {
      let [a, b, c] = t;
      const area = (vx[b] - vx[a]) * (vy[c] - vy[a]) - (vx[c] - vx[a]) * (vy[b] - vy[a]);
      if (area < 0) [b, c] = [c, b];
      a3.set(vx[a], vy[a], vz[a]);
      b3.set(vx[b], vy[b], vz[b]);
      c3.set(vx[c], vy[c], vz[c]);
      fn.subVectors(b3, a3).cross(c3.clone().sub(a3)).normalize();
      // where a triangle spans the ridge its corners slope different ways: use its own flat normal
      const split = vn[a].dot(vn[b]) < 0.95 || vn[b].dot(vn[c]) < 0.95 || vn[a].dot(vn[c]) < 0.95;
      for (const i of [a, b, c]) {
        pos.push(vx[i], vy[i], vz[i]);
        // across the ridge, each corner keeps its own facet's slope, so the ridge is one clean crease
        const n = split && vn[i].z > 0.999 ? fn : vn[i];
        nor.push(n.x, n.y, n.z);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  chiselCache.set(id, geo);
  return geo.clone();
}

/** The same shapes drawn in evenly by d (thinner strokes, bigger holes), for the bike print. */
const insetCache = new Map<string, THREE.Shape[]>();
function insetShapes(shapes: THREE.Shape[], d: number): THREE.Shape[] {
  const key = shapes.map((s) => s.uuid).join() + d;
  const hit = insetCache.get(key);
  if (hit) return hit;
  const clean = (a: THREE.Vector2[]) => (a.length > 1 && a[0].equals(a[a.length - 1]) ? a.slice(0, -1) : a);
  // moves each point of a ring to its left by d (into the material: outer rings anticlockwise, holes clockwise)
  const offset = (ring: THREE.Vector2[]) =>
    ring.map((p, i) => {
      const a = ring[(i - 1 + ring.length) % ring.length], b = ring[(i + 1) % ring.length];
      const e1 = new THREE.Vector2().subVectors(p, a).normalize(), e2 = new THREE.Vector2().subVectors(b, p).normalize();
      const n1 = new THREE.Vector2(-e1.y, e1.x), n2 = new THREE.Vector2(-e2.y, e2.x);
      const n = n1.clone().add(n2);
      const len = n.length();
      if (len < 1e-6) return p.clone().addScaledVector(n1, d);
      n.divideScalar(len);
      const m = Math.min(2.2, 1 / Math.max(0.3, n.dot(n1)));
      return p.clone().addScaledVector(n, d * m);
    });
  const out = shapes.map((sh) => {
    const pts = sh.extractPoints(18);
    let outer = clean(pts.shape);
    if (THREE.ShapeUtils.isClockWise(outer)) outer = outer.slice().reverse();
    const ns = new THREE.Shape(offset(outer));
    pts.holes.map(clean).forEach((h) => {
      const cw = THREE.ShapeUtils.isClockWise(h) ? h : h.slice().reverse();
      ns.holes.push(new THREE.Path(offset(cw)));
    });
    return ns;
  });
  insetCache.set(key, out);
  return out;
}

/** A band following each edge of the letter (outside edge and the edges of its holes), between two insets. */
function ringShapes(shapes: THREE.Shape[], a: number, c: number): THREE.Shape[] {
  const outer = insetShapes(shapes, a), inner = insetShapes(shapes, c);
  const out: THREE.Shape[] = [];
  outer.forEach((o, i) => {
    const n = inner[i];
    const band = new THREE.Shape(o.getPoints());
    band.holes.push(new THREE.Path(n.getPoints().slice().reverse()));
    out.push(band);
    // round each hole: from the hole drawn in further (bigger) to the hole drawn in less
    o.holes.forEach((h, j) => {
      const big = n.holes[j];
      if (!big) return;
      const hb = new THREE.Shape(big.getPoints().slice().reverse());
      hb.holes.push(new THREE.Path(h.getPoints().slice().reverse()));
      out.push(hb);
    });
  });
  return out;
}

const domeCache = new Map<string, THREE.BufferGeometry>();
function domeGeometry(ch: string, shapes: THREE.Shape[], k: number, wallMm: number, riseMm: number): THREE.BufferGeometry {
  const id = `${ch}|${k}|${wallMm}|${riseMm}`;
  const hit = domeCache.get(id);
  if (hit) return hit.clone();
  const wall = wallMm / k, rise = riseMm / k;
  const R = 62; // half a normal stroke, in font units
  const L = 7; // finest edge length for the top surface
  const pos: number[] = [];
  const nor: number[] = [];

  // the straight side: an unbevelled extrusion, keeping only its walls
  const side = new THREE.ExtrudeGeometry(shapes, { depth: wall, bevelEnabled: false, curveSegments: 18 });
  smoothNormals(side, 35);
  const sp = side.attributes.position as THREE.BufferAttribute, sn = side.attributes.normal as THREE.BufferAttribute;
  for (const g of side.groups) {
    if (g.materialIndex !== 1) continue;
    for (let i = g.start; i < g.start + g.count; i++) {
      pos.push(sp.getX(i), sp.getY(i), sp.getZ(i));
      nor.push(sn.getX(i), sn.getY(i), sn.getZ(i));
    }
  }
  side.dispose();

  for (const shape of shapes) {
    const pts = shape.extractPoints(18);
    const clean = (a: THREE.Vector2[]) => (a.length > 1 && a[0].equals(a[a.length - 1]) ? a.slice(0, -1) : a);
    let contour = clean(pts.shape);
    const holes = pts.holes.map(clean).map((h) => (THREE.ShapeUtils.isClockWise(h) ? h : h.slice().reverse()));
    if (THREE.ShapeUtils.isClockWise(contour)) contour = contour.slice().reverse();
    const segs: [THREE.Vector2, THREE.Vector2][] = [];
    for (const ring of [contour, ...holes]) ring.forEach((p, i) => segs.push([p, ring[(i + 1) % ring.length]]));

    const vx: number[] = [], vy: number[] = [];
    for (const p of [contour, ...holes].flat()) {
      vx.push(p.x);
      vy.push(p.y);
    }
    let tris = THREE.ShapeUtils.triangulateShape(contour, holes).map((t) => [...t]);

    // refine until every edge is short, sharing midpoints so the surface has no cracks
    for (let round = 0; round < 12; round++) {
      const mids = new Map<string, number>();
      const len = (a: number, b: number) => Math.hypot(vx[a] - vx[b], vy[a] - vy[b]);
      const mid = (a: number, b: number) => {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        let m = mids.get(key);
        if (m === undefined) {
          m = vx.length;
          vx.push((vx[a] + vx[b]) / 2);
          vy.push((vy[a] + vy[b]) / 2);
          mids.set(key, m);
        }
        return m;
      };
      const long = new Set<string>();
      for (const t of tris) for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3];
        if (len(a, b) > L) long.add(a < b ? `${a}_${b}` : `${b}_${a}`);
      }
      if (!long.size) break;
      const isLong = (a: number, b: number) => long.has(a < b ? `${a}_${b}` : `${b}_${a}`);
      const next: number[][] = [];
      for (const t of tris) {
        const marks = [0, 1, 2].map((e) => isLong(t[e], t[(e + 1) % 3]));
        const n = marks.filter(Boolean).length;
        if (n === 0) next.push(t);
        else if (n === 3) {
          const [a, b, c] = t, ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
          next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
        } else {
          // rotate so the first marked edge is a-b
          const r = marks.indexOf(true);
          const a = t[r], b = t[(r + 1) % 3], c = t[(r + 2) % 3];
          const bcLong = marks[(r + 1) % 3], caLong = marks[(r + 2) % 3];
          const ab = mid(a, b);
          if (n === 1) next.push([a, ab, c], [ab, b, c]);
          else if (bcLong) {
            const bc = mid(b, c);
            next.push([ab, b, bc], [a, ab, bc], [a, bc, c]);
          } else if (caLong) {
            const ca = mid(c, a);
            next.push([a, ab, ca], [ab, b, c], [ab, c, ca]);
          }
        }
      }
      tris = next;
    }

    // The dome's height comes from a smooth "inflated" field over the character (a membrane pushed up
    // from underneath, fixed at the edges): it rises steeply from the edge and rolls smoothly over the
    // middle of every stroke, with no ridge along the centre line.
    const C = 3; // grid cell, font units
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < vx.length; i++) {
      x0 = Math.min(x0, vx[i]); x1 = Math.max(x1, vx[i]);
      y0 = Math.min(y0, vy[i]); y1 = Math.max(y1, vy[i]);
    }
    x0 -= 2 * C; y0 -= 2 * C;
    const gw = Math.ceil((x1 - x0) / C) + 3, gh = Math.ceil((y1 - y0) / C) + 3;
    const inside = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) {
      const y = y0 + (j + 0.5) * C;
      const xs: number[] = [];
      for (const [p, q] of segs) {
        if ((p.y > y) !== (q.y > y)) xs.push(p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y));
      }
      xs.sort((m, n) => m - n);
      for (let n = 0; n + 1 < xs.length; n += 2) {
        const from = Math.max(0, Math.ceil((xs[n] - x0) / C - 0.5)), to = Math.min(gw - 1, Math.floor((xs[n + 1] - x0) / C - 0.5));
        for (let i = from; i <= to; i++) inside[j * gw + i] = 1;
      }
    }
    const u = new Float32Array(gw * gh);
    for (let it = 0; it < 320; it++) {
      for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
        const q = j * gw + i;
        if (!inside[q]) continue;
        const v = (u[q - 1] + u[q + 1] + u[q - gw] + u[q + gw] + C * C) / 4;
        u[q] += 1.85 * (v - u[q]);
      }
    }
    const u0 = (R * R) / 2; // the value in the middle of a normal-width stroke
    const T = Math.tanh(1.1);
    const field = (x: number, y: number) => {
      const fx = (x - x0) / C - 0.5, fy = (y - y0) / C - 0.5;
      const i = Math.max(0, Math.min(gw - 2, Math.floor(fx))), j = Math.max(0, Math.min(gh - 2, Math.floor(fy)));
      const tx = Math.max(0, Math.min(1, fx - i)), ty = Math.max(0, Math.min(1, fy - j));
      const q = j * gw + i;
      const v = (u[q] * (1 - tx) + u[q + 1] * tx) * (1 - ty) + (u[q + gw] * (1 - tx) + u[q + gw + 1] * tx) * ty;
      const g = Math.pow(Math.max(0, v) / u0, 0.55);
      return rise * (Math.tanh(g * 1.1) / T);
    };
    const onEdge = vx.map((x, i) => {
      const y = vy[i];
      for (const [p, q] of segs) {
        const dx = q.x - p.x, dy = q.y - p.y;
        const l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2));
        if (Math.hypot(x - p.x - t * dx, y - p.y - t * dy) < 0.01) return true;
      }
      return false;
    });
    const z = vx.map((x, i) => (onEdge[i] ? wall : wall + field(x, vy[i])));
    // normals straight from the field's slope, so the shine runs smoothly whatever the triangles
    const nrm = vx.map((x, i) => {
      const y = vy[i], e = C;
      const gx = (field(x + e, y) - field(x - e, y)) / (2 * e), gy = (field(x, y + e) - field(x, y - e)) / (2 * e);
      return new THREE.Vector3(-gx, -gy, 1).normalize();
    });

    const top = new THREE.BufferGeometry();
    const tp = new Float32Array(vx.length * 3), tn = new Float32Array(vx.length * 3);
    vx.forEach((x, i) => {
      tp.set([x, vy[i], z[i]], i * 3);
      tn.set([nrm[i].x, nrm[i].y, nrm[i].z], i * 3);
    });
    top.setAttribute("position", new THREE.BufferAttribute(tp, 3));
    top.setAttribute("normal", new THREE.BufferAttribute(tn, 3));
    const idx: number[] = [];
    for (const [a, b, c] of tris) {
      const area = (vx[b] - vx[a]) * (vy[c] - vy[a]) - (vx[c] - vx[a]) * (vy[b] - vy[a]);
      if (area > 0) idx.push(a, b, c);
      else idx.push(a, c, b);
    }
    top.setIndex(idx);
    const flat = top.toNonIndexed();
    const fp = flat.attributes.position as THREE.BufferAttribute, fn = flat.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) {
      pos.push(fp.getX(i), fp.getY(i), fp.getZ(i));
      nor.push(fn.getX(i), fn.getY(i), fn.getZ(i));
    }
    top.dispose();
    flat.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  domeCache.set(id, geo);
  return geo.clone();
}

/** One character's solid shape, smooth-shaded, made once per character and style. */
const geoCache = new Map<string, THREE.BufferGeometry>();
function glyphGeometry(ch: string, shapes: THREE.Shape[], opts: THREE.ExtrudeGeometryOptions, depth: number): THREE.BufferGeometry {
  const id = `${ch}|${depth}|${opts.bevelThickness}|${opts.bevelSize}|${opts.bevelSegments}`;
  const hit = geoCache.get(id);
  if (hit) return hit.clone();
  const geo = new THREE.ExtrudeGeometry(shapes, { ...opts, depth });
  // gel domes are smoothed right over; cut letters keep their crisp edges
  // single flat facets (Retro, 4D) keep a crisp edge where they meet the top, even at a shallow angle
  smoothNormals(geo, (opts.bevelSegments ?? 1) > 4 ? 70 : opts.bevelSegments === 1 ? 18 : 35);
  // pressed metal: rounded slopes up to a flat painted top
  if (opts.bevelSegments === 4) flattenCaps(geo);
  geoCache.set(id, geo);
  return geo.clone();
}

function bikeLines(reg: string) {
  const r = reg.trim();
  const i = r.indexOf(" ");
  if (i > 0) return [r.slice(0, i), r.slice(i + 1)];
  return r.length > 4 ? [r.slice(0, 4), r.slice(4)] : [r];
}

/** A whole plate, centred on the origin, face towards +z. */
export function buildPlate(s: PlateSpec, softEnv?: THREE.Texture, acrylicEnv?: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const b = buildFor(s.look);
  const metal = s.look === "metal-white" || s.look === "metal-silver" || s.styleName === "Silver Retro";

  // the face: the same drawing as the 2D picture, with the characters printed on it for Printed and 3D Gel
  const face = renderPlate(s, 5, { chars: !b, sheen: false, edge: false, flatChars: s.look === "gel" || s.look === "gel-bike", castShadow: b && isAcrylic(s) ? acrylicShown(s, b) : isChisel(s.look) ? (s.look.endsWith("-x") ? 4.8 * X_LIFT : 4.8 * 0.6) : isPressed(s) ? 0.5 : 0 });
  const tex = new THREE.CanvasTexture(face);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const pressed = isPressed(s);
  // Metal Press is a thin aluminium plate (its face sits at the same height as the acrylic plates' face)
  const geo = pressed
    ? new THREE.ExtrudeGeometry(outlineShape(s), { depth: 0.8, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelOffset: -0.2, bevelSegments: 2, curveSegments: 8 })
    : new THREE.ExtrudeGeometry(outlineShape(s), { depth: PLATE_T, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelOffset: -0.4, bevelSegments: 2, curveSegments: 8 });
  geo.translate(0, 0, pressed ? FACE_Z - 1 : -PLATE_T / 2);
  // map the face picture across the front and back caps
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + s.w / 2) / s.w, (pos.getY(i) + s.h / 2) / s.h);
  uv.needsUpdate = true;
  const edgeColour = metal ? 0x1a1a1a : s.side === "rear" ? 0xe9b400 : 0xe6e6e2;
  const faceMat = pressed
    ? new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.22, envMapIntensity: 0.6 })
    : new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.55 });
  const edgeMat = pressed
    ? new THREE.MeshPhysicalMaterial({ color: 0xb8bbbf, metalness: 0.85, roughness: 0.35 })
    : new THREE.MeshPhysicalMaterial({ color: edgeColour, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const plate = new THREE.Mesh(geo, [faceMat, edgeMat]);
  plate.receiveShadow = true;
  group.add(plate);

  if (b && pressed) {
    // Metal Press: the characters and a rim round the edge are pressed up a little out of the metal.
    // The metal curves up out of the plate, so each outline blends into the backing, and only the flat
    // tops are painted black (satin); the curve keeps the plate colour.
    const press =
      s.look === "metal-silver"
        ? new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 2.6 })
        : s.look === "metal-white"
          ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.8 })
          : new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.24, envMapIntensity: 0.65 });
    if (s.look === "metal-silver" && acrylicEnv) press.envMap = acrylicEnv;
    group.add(characters(s, PRESS, press, FACE_Z - 0.02));
    const rim = outlineShape(s, 1.2);
    rim.holes.push(outlineShape(s, 5.2, new THREE.Path()) as unknown as THREE.Path);
    const rimGeo = pressGeometry(`rim|${s.w}|${s.h}|${s.hex}|${s.hexFlip}|${s.side}|${s.look}`, [rim], 1, PRESS.depth, PRESS.size, pressTop(s), pressPaint(s));
    const rimMesh = new THREE.Mesh(rimGeo, press.clone());
    rimMesh.position.z = FACE_Z - 0.02;
    rimMesh.castShadow = true;
    group.add(rimMesh);
  } else if (b && isChisel(s.look) && s.styleName !== "RK") {
    // Retro / Vintage: chisel-cut letters. Wide flat facets rise from the plate at the full outline to a
    // flat top, meeting in sharp mitres at every corner (the little triangles at the ends of strokes).
    // Gloss (Retro) mirrors a bright studio, so facets facing up read silver and those facing down
    // black; matt (Vintage) softens it. The X versions sit on a 4D 3MM letter.
    const tall = s.look === "bevel-x" || s.look === "bevel-matt-x";
    const gloss = s.look === "bevel" || s.look === "bevel-x";
    const mat =
      s.styleName === "Silver Retro"
        ? // satin silver paint on the chisel-cut letter, on a gloss black plate
          new THREE.MeshPhysicalMaterial({ color: 0xd3d6da, roughness: 0.42, metalness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 1.5 })
        : gloss
      ? new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 })
      : // Vintage: satin, the same chisel cut with a soft sheen on the facets instead of a mirror shine
        new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, roughness: 0.55, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6, envMapIntensity: 1.35 });
    if (acrylicEnv) mat.envMap = acrylicEnv;
    // the facets run in almost to the middle of each stroke (124 font units wide), so they meet in a
    // sharp ridge along the top, not a flat face
    // as high as 4D 3MM
    const rise = acrylicShown(s, { ...b, depth: 3 });
    const chisel: Build = { ...b, depth: 0, bevel: rise, size: 0, segs: -1 };
    if (tall) {
      // Retro X / Vintage X: a 4D 3MM acrylic letter underneath, with the chisel-cut letter on top of it
      // (both a little taller than on their own, so the stack stands well out from the plate)
      // Vintage X: the 4D base is matt to match the matt Vintage letter on top
      const [face, side] = gloss
        ? acrylicMaterials(s, softEnv, true)
        : [0, 1].map(() => {
            const m = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, roughness: 0.6, metalness: 0, clearcoat: 0.05, clearcoatRoughness: 0.6, envMapIntensity: 1.2 });
            if (acrylicEnv) m.envMap = acrylicEnv;
            return m;
          });
      const base = PLATE_T / 2 - 0.05;
      const block = rise * X_LIFT;
      group.add(characters(s, { ...b, depth: block, bevel: 0.06, size: 0.06, segs: 1 }, [face, side], base));
      group.add(characters(s, { ...chisel, bevel: rise * 1.15 }, mat, base + block + 0.04));
    } else group.add(characters(s, chisel, mat, FACE_Z - 0.02));
    group.traverse((o) => {
      if ((o as THREE.Mesh).material === mat) o.castShadow = false;
    });
  } else if (b) {
    if (isAcrylic(s)) {
      // 4D: laser-cut black acrylic. Cut straight down with crisp edges; the cut sides come off the laser
      // polished, so they shine, and the face is smooth smoked acrylic that shows a little of the plate
      // colour through it (charcoal on the white plate, a dark olive on the yellow).
      const [faceMat, sideMat] = acrylicMaterials(s, softEnv, isGel4d(s.look) || isShadow(s) || isOnyx(s));
      // drawn 1.6 times deeper than made: at true depth a straight-on screen view makes 3mm look flat
      group.add(characters(s, { ...b, depth: acrylicShown(s, b), bevel: 0.06, size: 0.06, segs: 1 }, [faceMat, sideMat]));
      if (isShadow(s)) {
        // the top piece: the same letter drawn in by about 2.6mm, on top of the 4D letter, in satin black
        const [topFace, topSide] = [0, 1].map(() => {
          const m = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, roughness: 0.55, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6, envMapIntensity: 1.35 });
          if (softEnv) m.envMap = softEnv;
          return m;
        });
        const charH = Math.min(79, s.h * 0.71);
        group.add(characters(s, { ...b, depth: acrylicShown(s, b) * 0.8, bevel: 0.06, size: 0.06, segs: 1, inset: Math.round((2.6 / charH) * GLYPH_CAP) }, [topFace, topSide], PLATE_T / 2 - 0.05 + acrylicShown(s, b) + 0.02));
      }
      if (isOnyx(s)) {
        // a matte outline about 2.1mm wide, set 0.6mm in from the letter's edge; the gloss 4D face shows inside it
        const matte = [0, 1].map(() => {
          const m = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0, clearcoat: 0, envMapIntensity: 1.1 });
          if (softEnv) m.envMap = softEnv;
          return m;
        });
        const charH = Math.min(79, s.h * 0.71);
        const u = (mm: number) => Math.round((mm / charH) * GLYPH_CAP);
        group.add(characters(s, { ...b, depth: acrylicShown(s, b) * 0.45, bevel: 0.04, size: 0.04, segs: 1, ring: [u(0.6), u(2.7)] }, matte, PLATE_T / 2 - 0.05 + acrylicShown(s, b) + 0.02));
      }
    } else {
      const mat = new THREE.MeshPhysicalMaterial({ color: b.colour, roughness: b.rough, metalness: b.metal, clearcoat: b.coat, clearcoatRoughness: 0.03, envMapIntensity: 0.75 });
      group.add(characters(s, b, mat));
    }
  }
  if (hasResin(s.look)) {
    // on screen the resin over black reads as deep gloss black: the rounded edge catches a fine bright
    // line of light and the same streak as the plate runs across the tops
    const resin = new THREE.MeshPhysicalMaterial({ color: RESIN.colour, roughness: RESIN.rough, clearcoat: 1, clearcoatRoughness: 0.015, envMapIntensity: 1.7 });
    if (softEnv) resin.envMap = softEnv;
    // 4D Gel: the dome sits on top of the 4D letter
    const top = isGel4d(s.look) && b ? PLATE_T / 2 - 0.05 + acrylicShown(s, b) + 0.04 : PLATE_T / 2 - 0.05;
    group.add(characters(s, RESIN, resin, top));
  }
  return group;
}

/* ------------------------------------------------------------------ */
/* The studio: soft room light with bright panels, so gloss shows reflections */
/* ------------------------------------------------------------------ */
export function studioEnvironment(renderer: THREE.WebGLRenderer, strips = true): THREE.Texture {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({ color: 0x1c1c1e, side: THREE.BackSide }));
  scene.add(room);
  const panel = (w: number, h: number, x: number, y: number, z: number, rz: number, intensity: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    m.rotateZ(rz);
    scene.add(m);
  };
  // In front of the plate (behind the viewer) is what a gloss face reflects:
  if (strips) panel(4.6, 1.8, -1.6, 1.9, 4.6, 0, 4.5); // a big softbox up and to the left
  // long diagonal strips right across the wall: the streaks that run across a gloss plate at any angle
  // (left out for gel, where the curve would squeeze each one into a thin line)
  if (strips) panel(0.5, 16, -2.6, 0, 4.9, -0.62, 8);
  if (strips) panel(0.32, 16, 0.6, 0, 4.9, -0.62, 7);
  if (strips) panel(0.22, 16, 3.2, 0, 4.9, -0.62, 6);
  // and round the front corners, which a turned plate reflects
  for (const sx of strips ? [-1, 1] : []) {
    panel(0.55, 16, sx * 4.3, 0, 4.9, -0.62 * sx, 9);
    panel(0.3, 16, sx * 3.5, 0, 4.9, -0.62 * sx, 6);
    panel(0.55, 16, sx * 4.9, 0, 4.3, -0.62 * sx, 9);
    panel(0.3, 16, sx * 4.9, 0, 3.4, -0.62 * sx, 6);
    panel(0.4, 16, sx * 4.9, 0, 1.8, -0.62 * sx, 5);
  }
  panel(6, 1.2, 0, 2.9, 0.5, 0, 3); // overhead
  panel(1.2, 4, -4.8, 0.4, 1.5, 0, 2.5); // a window to the left
  panel(1, 3, 4.8, 0.2, 0, 0, 1.5); // softer, to the right
  panel(5, 0.8, 0, -2.9, 2.5, 0, 0.6); // a little bounce from below
  const pmrem = new THREE.PMREMGenerator(renderer);
  if (!strips) {
    // gel: one wide streak (in front, and round each front corner for when the plate is turned) and
    // a softbox, so each rounded edge shows a single clean line of light and the tops one streak
    panel(1.3, 16, -1.2, 0, 4.9, -0.62, 9);
    panel(1.3, 16, -4.9, 0, 3.6, 0.62, 8);
    panel(1.3, 16, 4.9, 0, 3.6, -0.62, 8);
    panel(4.6, 1.8, -1.6, 2.1, 4.4, 0, 4);
    panel(6, 1.4, 0, 2.8, 2.6, 0, 3.5); // a long light above, for a bright line along the top edges
  }
  const env = pmrem.fromScene(scene, strips ? 0.005 : 0.025).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/**
 * For the chisel-cut Retro / Vintage letters: a product-shot studio that's dark straight ahead (so the
 * flat tops, facing the viewer, stay black) with big bright softboxes above and to each side (so the
 * facets facing up and sideways light up silver), and a dark floor (so those facing down stay black).
 */
export function acrylicEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide })));
  const panel = (w: number, h: number, x: number, y: number, z: number, intensity: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // a ring of light all round the view, off to the side of the viewer: each facet (tilted about 33°)
  // mirrors part of it, so every facet lights up, brightest on top, while the flat tops (facing
  // straight back at the viewer) mirror the dark middle and stay black
  const ring = new THREE.CylinderGeometry(6, 6, 7, 96, 1, true);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0, 6); // seen between about 32° and 67° off straight ahead
  const rc: number[] = [];
  const rp = ring.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) {
    const up = rp.getY(i) / 6; // 1 at the top of the ring, -1 at the bottom
    const v = 1.8 + 1.4 * up + 0.4 * Math.cos(Math.atan2(rp.getY(i), rp.getX(i)) * 6); // a little variation round it
    rc.push(v, v, v);
  }
  ring.setAttribute("color", new THREE.Float32BufferAttribute(rc, 3));
  scene.add(new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  panel(9, 3, 0, 6.5, -1, 1.6); // and light from above and behind, for when the plate is tilted
  panel(4, 1.4, -1.5, 1.2, 6.5, 0.5); // a faint softbox in front, a soft sheen across the tops
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.015).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/** Free a plate's geometry, materials and textures. */
export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mt) => {
      (mt as THREE.MeshPhysicalMaterial).map?.dispose();
      mt.dispose();
    });
  });
}

export { THREE };
