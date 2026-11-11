/**
 * Plate surrounds in 3D, for the surround maker's live preview: the same studio and controls as the plate
 * builder's 3D view. Drawn in mm, matching the 2D drawing (AccessoryPreview) and REG KING's photos:
 * a gloss acrylic backing cut as a rounded rectangle (or hex) with a strip under the plate; framed adds a
 * narrow border and a thin raised rim round the plate. Raised acrylic lettering sits on the strip,
 * centred on framed, towards the right on frameless.
 */
import { THREE, buildPlate, raisedText, textWidthMm, PLATE_THICKNESS } from "./plate3d";
import { hexPoints } from "./builder";
import { FRAME_COLOURS, MATT_COLOURS, TEXT_COLOURS, artCategoryOf, stripSurfaceOf, swatch, type SurroundDesign, type SurroundShape, type SurroundSize, type SurroundStyle, type SurroundSurface } from "./accessories";
import type { PlateSpec } from "./plateRender";
import { surroundGeometry, type Pt } from "./surroundShape";
import { isBikeSize, surroundSize } from "./surroundSizes";
import { artCanvas, artItem, flagLipLayers, type FlagDef } from "./artLibrary";
import { askRedraw, carLogo, carLogoCanvas } from "./carLogos";

/** The part of the surround the customer is choosing for, lit up in the preview. */
export type SurroundFocus = "frame" | "strip" | "art";
export type SurroundView = { style: SurroundStyle; shape: SurroundShape; size: SurroundSize; design: SurroundDesign; side: "front" | "rear"; reg: string; focus?: SurroundFocus | null };

const BACK_T = 4; // backing thickness, mm
/** 4D acrylic thickness in the preview, mm. CONFIRM with REG KING's workshop. */
export const ACRYLIC_T = 3;

function roundRect(w: number, h: number, r: number, cx = 0, cy = 0, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  const x = cx - w / 2, y = cy - h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}
function hexPath(w: number, h: number, cx = 0, cy = 0, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  hexPoints(cx - w / 2, -cy - h / 2, w, h, false).forEach(([px, py], i) => (i ? path.lineTo(px, -py) : path.moveTo(px, -py)));
  path.closePath();
  return path;
}
const outline = (hex: boolean, w: number, h: number, r: number, cx = 0, cy = 0, path?: THREE.Shape | THREE.Path) => (hex ? hexPath(w, h, cx, cy, path) : roundRect(w, h, r, cx, cy, path));

/** Gloss acrylic (or metallic, or carbon fibre) in a surround colour; or matt, which barely reflects. */
function finish(key: string, env?: THREE.Texture, surface: SurroundSurface = "gloss"): THREE.MeshPhysicalMaterial {
  if (surface === "matt") {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(swatch(MATT_COLOURS, key).hex), roughness: 0.78, metalness: 0, clearcoat: 0, envMapIntensity: 0.35 });
    if (env) m.envMap = env;
    return m;
  }
  const sw = swatch(FRAME_COLOURS, key);
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(sw.hex),
    roughness: sw.metal ? 0.32 : 0.08,
    metalness: sw.metal ? 0.8 : 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: sw.metal ? 1.6 : 1,
  });
  if (sw.carbon) m.map = carbonTexture();
  if (env) m.envMap = env;
  return m;
}
let carbon: THREE.CanvasTexture | null = null;
function carbonTexture() {
  if (carbon) return carbon;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#121212";
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8)
    for (let x = 0; x < 64; x += 8) {
      g.fillStyle = (x + y) % 16 ? "#272727" : "#1a1a1a";
      g.fillRect(x, y, 8, 8);
    }
  carbon = new THREE.CanvasTexture(c);
  carbon.wrapS = carbon.wrapT = THREE.RepeatWrapping;
  carbon.repeat.set(0.25, 0.25);
  carbon.colorSpace = THREE.SRGBColorSpace;
  return carbon;
}

const poly = (pts: Pt[]) => {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  return sh;
};
/**
 * Gloss printed acrylic carrying a flag across the panel: drawn on a canvas over the panel's bounds and laid on
 * its face (the face's texture coordinates are its x and y in mm).
 */
function lipFlagMaterial(f: FlagDef, panel: Pt[], env?: THREE.Texture) {
  const xs = panel.map((p) => p[0]), ys = panel.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bw = x1 - x0, bh = y1 - y0, k = 2048 / bw;
  const cv = document.createElement("canvas");
  cv.width = 2048;
  cv.height = Math.max(8, Math.round(bh * k));
  const g = cv.getContext("2d")!;
  // panel corners on the canvas (y down): top left, top right, bottom right, bottom left
  const quad = panel.map(([x, y]) => [(x - x0) * k, (y1 - y) * k] as [number, number]);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, cv.width, cv.height);
  for (const l of flagLipLayers(f, quad)) {
    g.fillStyle = l.fill ?? "#000";
    g.fill(new Path2D(l.d), l.evenodd ? "evenodd" : "nonzero");
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(1 / bw, 1 / bh);
  tex.offset.set(-x0 / bw, -y0 / bh);
  const m = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9 });
  if (env) m.envMap = env;
  return m;
}

const slab = (shape: THREE.Shape, depth: number, z: number, mat: THREE.Material | THREE.Material[], bevel = 0.5) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, z);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export function buildSurround(v: SurroundView, softEnv?: THREE.Texture, acrylicEnv?: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const framed = v.style === "framed";
  const sz = surroundSize(v.size);
  const hex = !!sz.hex;
  const plateW = sz.w;
  const PLATE_H = sz.h;
  const d = v.design;
  const G = surroundGeometry(framed, plateW, PLATE_H);
  const back = PLATE_THICKNESS / 2; // the plate's back face
  const env = acrylicEnv ?? softEnv;

  const surface = d.surface ?? "gloss"; // the frame
  const stripSurface = stripSurfaceOf(d); // the strip (frameless: the whole surround)
  // a country's flag is printed across the whole strip under the plate, stripes running along it
  const lipFlag = artCategoryOf(d) === "country" ? artItem(d.item)?.flag : undefined;
  // the strip under the plate: one flat piece (no raised or recessed panel set into it)
  const strip = G.tab ?? G.panel;
  const stripMat = finish(d.backing, env, stripSurface);
  const flagMat = lipFlag ? lipFlagMaterial(lipFlag, strip, env) : null;
  const STRIP_BEVEL = framed ? 0.06 : 0.5;

  if (G.frame) {
    // framed: the frame (border round the plate, and the tab under it) in the frame colour
    const frameMat = finish(d.frame, env, surface);
    // the frame is plain laser-cut acrylic, like a 4D letter: flat faces and crisp, straight-cut edges
    group.add(slab(outline(hex, G.frame.w, G.frame.h, G.frame.r, 0, G.frame.cy) as THREE.Shape, BACK_T, -back - BACK_T, frameMat, 0.06));
    // the tab under the frame, flat, in its own colour
    if (G.tab) group.add(slab(poly(G.tab), BACK_T, -back - BACK_T, flagMat ? [flagMat, stripMat] : stripMat, STRIP_BEVEL));
    // the outline round the plate: a 4D acrylic ring standing 3mm proud of the plate's face
    const rimShape = outline(hex, G.frame.w, PLATE_H + 14, G.frame.r, 0, 0) as THREE.Shape;
    rimShape.holes.push(outline(hex, plateW + 0.6, PLATE_H + 0.6, 6, 0, 0, new THREE.Path()) as THREE.Path);
    group.add(slab(rimShape, PLATE_THICKNESS + 3, -back, frameMat, 0.06));
  } else {
    // frameless: the backing behind the plate, and the flat strip under it (wing and centre as one surface)
    group.add(slab(outline(hex, plateW, PLATE_H, 6) as THREE.Shape, BACK_T, -back - BACK_T, stripMat, 0.4));
    if (G.wing) group.add(slab(poly(G.wing), BACK_T, -back - BACK_T, stripMat, STRIP_BEVEL));
    group.add(slab(poly(G.panel), BACK_T, -back - BACK_T, flagMat ? [flagMat, stripMat] : stripMat, STRIP_BEVEL));
  }

  // the number plate itself (printed, as on the plate builder)
  const spec: PlateSpec = { reg: (v.reg || "YOUR REG").toUpperCase(), side: isBikeSize(sz) ? "rear" : v.side, look: "printed", styleName: "Printed", extras: [], w: plateW, h: PLATE_H, hex, bike: isBikeSize(sz) };
  group.add(buildPlate(spec, softEnv, acrylicEnv));

  // the artwork sits straight on the strip's flat face
  const faceZ = -back + STRIP_BEVEL;
  const a = G.art;
  const cat = artCategoryOf(d);
  const ts = swatch(TEXT_COLOURS, d.textColour);
  const textMat = () => {
    const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(ts.hex), metalness: ts.metal ? 0.8 : 0, roughness: ts.metal ? 0.3 : 0.1, clearcoat: 1, clearcoatRoughness: 0.03 });
    if (ts.carbon) mat.map = carbonTexture();
    if (env) mat.envMap = env;
    return mat;
  };
  const words = (txt: string, font: "plate" | "metro" = "plate") => {
    const h = Math.min(a.h, (a.w / Math.max(1, textWidthMm(txt, 1, font))) * 0.97);
    const t = raisedText(txt, h, 2.2, textMat(), font);
    t.position.set(a.cx, a.cy, faceZ);
    group.add(t);
  };
  // fitted inside the artwork area, keeping its proportions (never stretched or clipped)
  const fit = (aspect: number) => {
    const h = Math.min(a.h, a.w / aspect);
    return { w: h * aspect, h };
  };
  const picture = (tex: THREE.Texture, aspect: number) => {
    const { w, h } = fit(aspect);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.35, clearcoat: stripSurface === "matt" ? 0 : 1, clearcoatRoughness: 0.05, envMapIntensity: 0.6 }));
    plane.position.set(a.cx, a.cy, faceZ + 0.05);
    group.add(plane);
  };
  /**
   * 4D acrylic from the customer's own file: the artwork's shape stacked through the acrylic's thickness,
   * so turning the view shows real sides and depth, with the artwork on the top face. Illustrative: the
   * workshop cuts from the outline our team prepares.
   */
  const raisedPicture = (tex: THREE.Texture, aspect: number) => {
    const { w, h } = fit(aspect);
    const geo = new THREE.PlaneGeometry(w, h);
    const sideMat = new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color(0x4a4a4a), alphaTest: 0.5, roughness: 0.4 });
    const topMat = new THREE.MeshPhysicalMaterial({ map: tex, alphaTest: 0.5, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.9 });
    if (env) topMat.envMap = env;
    const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    const layers = 14;
    for (let i = 0; i <= layers; i++) {
      const m = new THREE.Mesh(geo, i === layers ? topMat : sideMat);
      m.position.set(a.cx, a.cy, faceZ + 0.05 + (ACRYLIC_T * i) / layers);
      m.castShadow = i === 0;
      m.customDepthMaterial = depthMat;
      group.add(m);
    }
  };
  // car brands: the brand's own logo (one-colour logos in the chosen colour, badges in their own), else its name
  const brand = d.make ? `${d.make}${d.badge && d.badge !== "Logo only" ? ` ${d.badge}` : ""}` : "";
  // the part being chosen: a yellow wash over it and a yellow edge round it
  if (v.focus) {
    const glow = new THREE.MeshBasicMaterial({ color: 0xffc200, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false });
    const edge = new THREE.LineBasicMaterial({ color: 0xffd34d, toneMapped: false });
    const mark = (shape: THREE.Shape, z: number) => {
      const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), glow);
      fill.position.z = z;
      fill.renderOrder = 5;
      group.add(fill);
      const pts = shape.getPoints(24);
      // a few loops side by side, so the edge reads as a line rather than a hairline
      for (const [dx, dy] of [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) {
        const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(q.x + dx, q.y + dy, 0))), edge);
        loop.position.z = z + 0.05;
        loop.renderOrder = 6;
        group.add(loop);
      }
      shape.holes.forEach((h) => {
        const hl = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(h.getPoints(24).map((q) => new THREE.Vector3(q.x, q.y, 0))), edge);
        hl.position.z = z + 0.05;
        group.add(hl);
      });
    };
    if (v.focus === "frame" && G.frame) {
      const ring = outline(hex, G.frame.w, G.frame.h, G.frame.r, 0, G.frame.cy) as THREE.Shape;
      ring.holes.push(outline(hex, plateW + 0.6, PLATE_H + 0.6, 6, 0, 0, new THREE.Path()) as THREE.Path);
      mark(ring, -back + PLATE_THICKNESS + 3.3);
    } else if (v.focus === "strip") {
      mark(poly(strip), faceZ + 0.2);
      if (G.wing) mark(poly(G.wing), faceZ + 0.2);
    } else if (v.focus === "art") {
      const r = new THREE.Shape();
      r.moveTo(a.cx - a.w / 2, a.cy - a.h / 2);
      r.lineTo(a.cx + a.w / 2, a.cy - a.h / 2);
      r.lineTo(a.cx + a.w / 2, a.cy + a.h / 2);
      r.lineTo(a.cx - a.w / 2, a.cy + a.h / 2);
      r.closePath();
      mark(r, faceZ + 3.6);
    }
  }
  if (cat === "text" && d.text.trim()) words(d.text.trim(), d.font ?? "plate");
  else if (cat === "car" && carLogo(d.carLogo)) {
    const logo = carLogo(d.carLogo)!;
    let tex: THREE.CanvasTexture | null = null;
    const cv = carLogoCanvas(logo, ts.hex, () => {
      if (tex) tex.needsUpdate = true;
      askRedraw();
    });
    if (cv) {
      tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      picture(tex, logo.w / logo.h);
    }
  } else if (cat === "car" && brand) words(brand);
  else if ((cat === "country" || cat === "other") && d.item && !lipFlag) {
    const item = artItem(d.item);
    const cv = item ? artCanvas(item, ts.hex) : null;
    if (item && cv) {
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      picture(tex, item.w / item.h);
    } else if (item) words(item.name);
  } else if (cat === "custom" && d.upload) {
    const tex = new THREE.TextureLoader().load(d.upload, askRedraw);
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = d.aspect && d.aspect > 0 ? d.aspect : 2.5;
    if (d.artFinish === "acrylic") raisedPicture(tex, aspect);
    else picture(tex, aspect);
  }
  return group;
}
