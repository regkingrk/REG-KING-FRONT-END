/**
 * The slow part of the 3D plate: the shapes of Retro / Vintage (chiselled) and 3D Gel (domed) letters.
 * Plain maths with no page access, so a background worker (lib/plateGeo.worker.ts) can make them
 * without holding up the page. lib/plate3d.ts uses the same functions when there's no worker.
 */
import * as THREE from "three";
import { GLYPHS, METRO_GLYPHS } from "./plateGlyphs";

/** A letter's surface: corner positions and their normals, three per triangle. */
export type GeoArrays = { pos: Float32Array; nor: Float32Array };

const shapeCache = new Map<string, THREE.Shape[]>();

/** Parse the font's SVG-style outline (M, L, H, V, Q, Z with repeated coordinates) into shapes. */
export function glyphShapes(ch: string, font: "plate" | "metro" = "plate"): THREE.Shape[] {
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
export function smoothNormals(geo: THREE.BufferGeometry, crease = 35) {
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

export function chiselArrays(ch: string, riseU: number): GeoArrays {
  const shapes = glyphShapes(ch);
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
    // distance in from the outline, and the direction away from it (exact). Only an edge within R
    // matters (anything further sits on the flat top), so each point checks just the edges near it,
    // found through a grid, in their original order: the same answer as checking every edge, far faster.
    const G = 16, gx0 = Math.min(...segs.map((q) => Math.min(q[0], q[2]))) - R, gy0 = Math.min(...segs.map((q) => Math.min(q[1], q[3]))) - R;
    const gcw = Math.ceil((Math.max(...segs.map((q) => Math.max(q[0], q[2]))) + R - gx0) / G) + 1;
    const gch = Math.ceil((Math.max(...segs.map((q) => Math.max(q[1], q[3]))) + R - gy0) / G) + 1;
    const cells: number[][] = Array.from({ length: gcw * gch }, () => []);
    segs.forEach(([ax, ay, bx, by], n) => {
      const i0 = Math.floor((Math.min(ax, bx) - gx0) / G), i1 = Math.floor((Math.max(ax, bx) - gx0) / G);
      const j0 = Math.floor((Math.min(ay, by) - gy0) / G), j1 = Math.floor((Math.max(ay, by) - gy0) / G);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[j * gcw + i].push(n);
    });
    // Search outwards ring by ring and stop once no unvisited edge could be closer. Ties go to the
    // edge listed first, exactly as a check of every edge in order would.
    const near = (x: number, y: number) => {
      const ci = Math.floor((x - gx0) / G), cj = Math.floor((y - gy0) / G);
      let best = Infinity, bestN = -1, nx = 0, ny = 0;
      const test = (n: number) => {
        const sg = segs[n];
        const ax = sg[0], ay = sg[1], dx = sg[2] - ax, dy = sg[3] - ay;
        const l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const px = ax + t * dx, py = ay + t * dy;
        const d = Math.hypot(x - px, y - py);
        if (d < best || (d === best && n < bestN)) {
          best = d;
          bestN = n;
          nx = px;
          ny = py;
        }
      };
      const cell = (i: number, j: number) => {
        if (i < 0 || j < 0 || i >= gcw || j >= gch) return;
        for (const n of cells[j * gcw + i]) test(n);
      };
      for (let r = 0; ; r++) {
        if (r === 0) cell(ci, cj);
        else {
          for (let i = ci - r; i <= ci + r; i++) {
            cell(i, cj - r);
            cell(i, cj + r);
          }
          for (let j = cj - r + 1; j <= cj + r - 1; j++) {
            cell(ci - r, j);
            cell(ci + r, j);
          }
        }
        // every edge not yet visited is at least this far away
        const reach = Math.min(x - (gx0 + (ci - r) * G), gx0 + (ci + r + 1) * G - x, y - (gy0 + (cj - r) * G), gy0 + (cj + r + 1) * G - y);
        if (best < reach || reach >= R) break;
      }
      if (best >= R) return { d: R, gx: 0, gy: 0 };
      return { d: best, gx: best > 1e-6 ? (x - nx) / best : 0, gy: best > 1e-6 ? (y - ny) / best : 0 };
    };

    const vx: number[] = [], vy: number[] = [];
    for (const p of [contour, ...holes].flat()) {
      vx.push(p.x);
      vy.push(p.y);
    }
    let tris = THREE.ShapeUtils.triangulateShape(contour, holes).map((t) => [...t]);
    for (let round = 0; round < 14; round++) {
      const mids = new Map<number, number>();
      const key = (a: number, b: number) => (a < b ? a * 67108864 + b : b * 67108864 + a);
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
  return { pos: new Float32Array(pos), nor: new Float32Array(nor) };
}

export function domeArrays(ch: string, k: number, wallMm: number, riseMm: number): GeoArrays {
  const shapes = glyphShapes(ch);
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
      const mids = new Map<number, number>();
      const ek = (a: number, b: number) => (a < b ? a * 67108864 + b : b * 67108864 + a);
      const len = (a: number, b: number) => Math.hypot(vx[a] - vx[b], vy[a] - vy[b]);
      const mid = (a: number, b: number) => {
        const key = ek(a, b);
        let m = mids.get(key);
        if (m === undefined) {
          m = vx.length;
          vx.push((vx[a] + vx[b]) / 2);
          vy.push((vy[a] + vy[b]) / 2);
          mids.set(key, m);
        }
        return m;
      };
      const long = new Set<number>();
      for (const t of tris) for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3];
        if (len(a, b) > L) long.add(ek(a, b));
      }
      if (!long.size) break;
      const isLong = (a: number, b: number) => long.has(ek(a, b));
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
    // only the cells inside the character change, so visit just those (in the same order)
    const cellsIn: number[] = [];
    for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) if (inside[j * gw + i]) cellsIn.push(j * gw + i);
    const inList = Int32Array.from(cellsIn), CC = C * C;
    for (let it = 0; it < 320; it++) {
      for (let m = 0; m < inList.length; m++) {
        const q = inList[m];
        const v = (u[q - 1] + u[q + 1] + u[q - gw] + u[q + gw] + CC) / 4;
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
    // which points sit on the outline: only edges in the point's own grid cell can be that close
    const EG = 8, ex0 = x0 - EG, ey0 = y0 - EG, ecw = Math.ceil((x1 - ex0) / EG) + 2, ech = Math.ceil((y1 - ey0) / EG) + 2;
    const ecells: number[][] = Array.from({ length: ecw * ech }, () => []);
    segs.forEach(([p, q], n) => {
      const i0 = Math.floor((Math.min(p.x, q.x) - 0.01 - ex0) / EG), i1 = Math.floor((Math.max(p.x, q.x) + 0.01 - ex0) / EG);
      const j0 = Math.floor((Math.min(p.y, q.y) - 0.01 - ey0) / EG), j1 = Math.floor((Math.max(p.y, q.y) + 0.01 - ey0) / EG);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) ecells[j * ecw + i].push(n);
    });
    const onEdge = vx.map((x, i) => {
      const y = vy[i];
      for (const n of ecells[Math.floor((y - ey0) / EG) * ecw + Math.floor((x - ex0) / EG)]) {
        const [p, q] = segs[n];
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

  return { pos: new Float32Array(pos), nor: new Float32Array(nor) };
}
