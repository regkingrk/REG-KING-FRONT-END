/**
 * "See it on your car": finding the plate in a photo and fitting the new one onto it.
 * Everything runs in the customer's browser. The photo is never uploaded, so there is
 * nothing to store, no API cost and nothing to delete.
 *
 * 1. findPlate: looks for a UK plate (a yellow or white rectangle with dark characters,
 *    roughly 4.7 times wider than tall) and returns its four corners.
 * 2. composite: maps the plate picture onto those four corners with a true perspective
 *    (homography) transform, matched to the light on the original plate.
 */

export type Pt = { x: number; y: number };
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Solves for the 3×3 homography mapping src[i] → dst[i] (h33 = 1). */
export function homography(src: Quad, dst: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return [...h, 1];
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let j = c; j <= n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (f) for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((r) => r[n]);
}

export function apply(H: number[], x: number, y: number): Pt {
  const w = H[6] * x + H[7] * y + H[8];
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w };
}

export function quadArea(q: Quad): number {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const p = q[i];
    const n = q[(i + 1) % 4];
    a += p.x * n.y - n.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** True when the four corners make a sensible, convex plate shape. */
export function quadOk(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    const s = Math.sign(cross);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return quadArea(q) > 50;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** A starting box when no plate was found: centred, a little below the middle. */
export function defaultQuad(W: number, H: number, ratio: number): Quad {
  const w = W * 0.36;
  const h = w / ratio;
  const cx = W / 2;
  const cy = H * 0.64;
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
}

/* ------------------------------------------------------------------ */
/* Finding the plate                                                   */
/* ------------------------------------------------------------------ */

export type Found = { quad: Quad; colour: "yellow" | "white"; score: number };

/**
 * Finds the most plate-like region. `prefer` decides which colour is tried first
 * (rear plates are yellow, front plates white). Coordinates are in the image passed in.
 */
export function findPlate(img: ImageData, prefer: "yellow" | "white"): Found | null {
  const order: ("yellow" | "white")[] = prefer === "yellow" ? ["yellow", "white"] : ["white", "yellow"];
  let best: Found | null = null;
  for (const colour of order) {
    // White plates: try a few brightness levels, so a white plate on a silver or white car still stands out.
    let f: Found | null = null;
    for (const level of colour === "white" ? [150, 185, 215] : [0]) {
      const g = findColour(img, colour, level);
      if (g && (!f || g.score > f.score)) f = g;
    }
    // The preferred colour wins unless the other is clearly better.
    if (f && (!best || f.score > best.score * 1.25)) best = f;
    if (best && best.score > 1.6 && colour === order[0]) break;
  }
  return best;
}

function findColour(img: ImageData, colour: "yellow" | "white", level: number): Found | null {
  const { width: W, height: H, data } = img;
  const N = W * H;
  const mask = new Uint8Array(N);
  const dark = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    if (max < 75) dark[i] = 1;
    if (colour === "yellow") {
      // UK rear plate yellow: strong red and green, little blue
      if (r > 110 && g > 90 && b < g * 0.72 && r - b > 55 && g > r * 0.62 && sat > 0.32) mask[i] = 1;
    } else if (max > level && sat < 0.2) {
      mask[i] = 1;
    }
  }
  // Join the plate background across the gaps around thin parts of characters.
  const closed = close(mask, W, H, Math.max(1, Math.round(Math.min(W, H) / 400)));
  const { labels, count } = components(closed, W, H);
  const minPx = N * 0.0012;
  const stats = new Array(count + 1).fill(null).map(() => ({ n: 0, x0: W, x1: 0, y0: H, y1: 0 }));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const l = labels[y * W + x];
      if (!l) continue;
      const s = stats[l];
      s.n++;
      if (x < s.x0) s.x0 = x;
      if (x > s.x1) s.x1 = x;
      if (y < s.y0) s.y0 = y;
      if (y > s.y1) s.y1 = y;
    }
  let best: Found | null = null;
  for (let l = 1; l <= count; l++) {
    const s = stats[l];
    if (s.n < minPx || s.n > N * 0.3) continue;
    const bw = s.x1 - s.x0 + 1;
    const bh = s.y1 - s.y0 + 1;
    if (bw < 24 || bh < 6) continue;
    const boxRatio = bw / bh;
    if (boxRatio < 1.1 || boxRatio > 9) continue;
    const fitted = fitQuad(labels, W, l, s);
    if (!fitted || !quadOk(fitted)) continue;
    const quad = withBadge(fitted, data, W, H);
    const score = scoreQuad(quad, closed, mask, dark, labels, l, W, H, s.n);
    if (score > 0 && (!best || score > best.score)) best = { quad, colour, score };
  }
  // Real plates score about 2.6 to 2.9 in testing; anything well below is more likely paint or a sign.
  return best && best.score > 2.3 ? best : null;
}

/**
 * Plates with a flag or EV band: the band (blue or green) sits on the left of the plate,
 * outside the yellow or white area. If it's there, move the left edge out to include it.
 */
function withBadge(q: Quad, data: Uint8ClampedArray, W: number, H: number): Quad {
  const len = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const ux = (q[0].x - q[1].x + q[3].x - q[2].x) / 2 / len; // pointing left along the plate
  const uy = (q[0].y - q[1].y + q[3].y - q[2].y) / 2 / len;
  const rgb = (x: number, y: number): [number, number, number] | null => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null;
    const k = (yi * W + xi) * 4;
    return [data[k], data[k + 1], data[k + 2]];
  };
  const kind = (c: [number, number, number] | null) => {
    if (!c) return "";
    const [r, g, b] = c;
    if (b > 90 && b > r + 40 && b > g + 10) return "blue";
    if (g > 70 && g > r + 30 && g > b + 10) return "green";
    return "";
  };
  // Left edge point at fraction t down the plate, moved d pixels further left.
  const at = (t: number, d: number) => ({ x: q[0].x + (q[3].x - q[0].x) * t + ux * d, y: q[0].y + (q[3].y - q[0].y) * t + uy * d });
  const widths: number[] = [];
  let bandKind = "";
  for (const t of [0.3, 0.4, 0.5, 0.6, 0.7]) {
    const first = kind(rgb(at(t, 2).x, at(t, 2).y));
    if (!first) {
      widths.push(0);
      continue;
    }
    bandKind ||= first;
    let w = 0;
    for (let d = 1; d < len * 0.16; d++) {
      const p = at(t, d);
      if (kind(rgb(p.x, p.y)) === first) w = d;
      else if (d - w > 3) break;
    }
    widths.push(w);
  }
  widths.sort((a, b) => a - b);
  // A UK band is 50mm on a 520mm plate: about 0.107 of the yellow or white part's length.
  const expect = len * 0.107;
  // Use the measured width when it's believable; if the colour ran on, fall back to the standard width.
  const w = widths[2] <= len * 0.14 ? widths[2] : expect;
  if (!bandKind || w < len * 0.05) return q;
  // If the same colour carries on above and below, it's the car's paint, not a band.
  const mean = (pts: { x: number; y: number }[]) => {
    const cs = pts.map((p) => rgb(p.x, p.y)).filter(Boolean) as [number, number, number][];
    if (!cs.length) return null;
    return cs.reduce((a, c) => [a[0] + c[0] / cs.length, a[1] + c[1] / cs.length, a[2] + c[2] / cs.length], [0, 0, 0]);
  };
  const band = mean([0.35, 0.5, 0.65].map((t) => at(t, w / 2)));
  const outside = [mean([at(-0.3, w / 2), at(-0.45, w / 2)]), mean([at(1.3, w / 2), at(1.45, w / 2)])];
  if (band && outside.some((o) => o && Math.hypot(o[0] - band[0], o[1] - band[1], o[2] - band[2]) < 45)) return q;
  return [at(0, w), q[1], q[2], at(1, w)];
}

/** Morphological close (dilate then erode) with a square of radius r. */
function close(m: Uint8Array, W: number, H: number, r: number): Uint8Array {
  return erode(dilate(m, W, H, r), W, H, r);
}
function dilate(m: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const tmp = new Uint8Array(m.length);
  const out = new Uint8Array(m.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < W && m[y * W + xx]) v = 1;
      }
      tmp[y * W + x] = v;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < H && tmp[yy * W + x]) v = 1;
      }
      out[y * W + x] = v;
    }
  return out;
}
function erode(m: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const inv = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1;
  const d = dilate(inv, W, H, r);
  for (let i = 0; i < m.length; i++) d[i] = d[i] ? 0 : 1;
  return d;
}

/** 4-connected component labels (union-find). */
function components(m: Uint8Array, W: number, H: number): { labels: Int32Array; count: number } {
  const labels = new Int32Array(m.length);
  const parent: number[] = [0];
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  let next = 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!m[i]) continue;
      const up = y > 0 ? labels[i - W] : 0;
      const lf = x > 0 ? labels[i - 1] : 0;
      if (!up && !lf) {
        labels[i] = next;
        parent.push(next);
        next++;
      } else if (up && lf) {
        const a = find(up);
        const b = find(lf);
        labels[i] = Math.min(a, b);
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      } else labels[i] = up || lf;
    }
  const remap = new Int32Array(next);
  let count = 0;
  for (let l = 1; l < next; l++) {
    const r = find(l);
    if (!remap[r]) remap[r] = ++count;
    remap[l] = remap[r];
  }
  for (let i = 0; i < labels.length; i++) if (labels[i]) labels[i] = remap[labels[i]];
  return { labels, count };
}

/**
 * Four straight edges fitted to the region's outline (top and bottom from each column's
 * first and last pixel, left and right from each row's), then intersected for the corners.
 * This copes with rounded corners and perspective.
 */
function fitQuad(labels: Int32Array, W: number, l: number, s: { x0: number; x1: number; y0: number; y1: number }): Quad | null {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const lft: Pt[] = [];
  const rgt: Pt[] = [];
  const bw = s.x1 - s.x0;
  const bh = s.y1 - s.y0;
  // Use the middle of each side only, away from rounded corners.
  for (let x = Math.round(s.x0 + bw * 0.12); x <= s.x1 - bw * 0.12; x++) {
    let a = -1;
    let b = -1;
    for (let y = s.y0; y <= s.y1; y++)
      if (labels[y * W + x] === l) {
        if (a < 0) a = y;
        b = y;
      }
    if (a >= 0) {
      top.push({ x, y: a });
      bot.push({ x, y: b });
    }
  }
  if (top.length < 6) return null;
  const T = fitLine(top, "y");
  const B = fitLine(bot, "y");
  if (!T || !B) return null;
  // Left and right ends: scan along lines running between the top and bottom edges (so a
  // tilted plate is measured along its own length, not across the photo's rows).
  const yOn = (ln: Line, x: number) => (ln.c - ln.a * x) / ln.b;
  for (let i = 0; i <= 12; i++) {
    const t = 0.22 + (0.56 * i) / 12;
    const at = (x: number) => (1 - t) * yOn(T, x) + t * yOn(B, x);
    let a = -1;
    let b = -1;
    for (let x = s.x0 - 2; x <= s.x1 + 2; x += 0.5) {
      const y = Math.round(at(x));
      const xi = Math.round(x);
      if (xi < 0 || xi >= W || y < 0 || y * W + xi >= labels.length) continue;
      if (labels[y * W + xi] === l) {
        if (a < 0) a = x;
        b = x;
      }
    }
    if (a >= 0) {
      lft.push({ x: a, y: at(a) });
      rgt.push({ x: b, y: at(b) });
    }
  }
  if (lft.length < 4) return null;
  const L = fitLine(lft, "x");
  const R = fitLine(rgt, "x");
  if (!T || !B || !L || !R) return null;
  const q: Quad = [cross(T, L), cross(T, R), cross(B, R), cross(B, L)];
  if (q.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  // Corners must sit near the region, not shoot off.
  const pad = Math.max(bw, bh) * 0.35;
  if (q.some((p) => p.x < s.x0 - pad || p.x > s.x1 + pad || p.y < s.y0 - pad || p.y > s.y1 + pad)) return null;
  return q;
}

type Line = { a: number; b: number; c: number }; // a·x + b·y = c

/**
 * Least-squares line through edge points, done twice: the second pass drops points far
 * from the first line (where a character or a shadow touches the edge).
 */
function fitLine(pts: Pt[], along: "x" | "y"): Line | null {
  const fit = (ps: Pt[]) => {
    // along "y": y = m·x + k (top/bottom). along "x": x = m·y + k (left/right).
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of ps) {
      const u = along === "y" ? p.x : p.y;
      const v = along === "y" ? p.y : p.x;
      sx += u;
      sy += v;
      sxx += u * u;
      sxy += u * v;
    }
    const n = ps.length;
    const den = n * sxx - sx * sx;
    if (!den) return null;
    const m = (n * sxy - sx * sy) / den;
    const k = (sy - m * sx) / n;
    return { m, k };
  };
  let f = fit(pts);
  if (!f) return null;
  const res = pts.map((p) => {
    const u = along === "y" ? p.x : p.y;
    const v = along === "y" ? p.y : p.x;
    return Math.abs(v - (f!.m * u + f!.k));
  });
  const sorted = [...res].sort((a, b) => a - b);
  const cut = Math.max(1.5, sorted[Math.floor(sorted.length * 0.7)] * 1.5);
  const kept = pts.filter((_, i) => res[i] <= cut);
  if (kept.length >= 3) f = fit(kept) ?? f;
  return along === "y" ? { a: -f.m, b: 1, c: f.k } : { a: 1, b: -f.m, c: f.k };
}

function cross(p: Line, q: Line): Pt {
  const d = p.a * q.b - q.a * p.b;
  return { x: (p.c * q.b - q.c * p.b) / d, y: (p.a * q.c - q.a * p.c) / d };
}

/** How plate-like a region is: solid colour inside the four corners, dark characters across it, plate proportions. */
function scoreQuad(q: Quad, mask: Uint8Array, raw: Uint8Array, dark: Uint8Array, labels: Int32Array, l: number, W: number, H: number, n: number): number {
  const area = quadArea(q);
  if (area < 40) return 0;
  const width = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const height = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  const ratio = width / Math.max(1, height);
  if (ratio < 1.15 || ratio > 8) return 0;
  // Opposite edges can differ in perspective, but not wildly.
  const skew = Math.max(dist(q[0], q[1]) / dist(q[3], q[2]), dist(q[3], q[2]) / dist(q[0], q[1]), dist(q[0], q[3]) / dist(q[1], q[2]), dist(q[1], q[2]) / dist(q[0], q[3]));
  if (skew > 1.9) return 0;
  // Sample inside the quad through its own perspective grid.
  const Hm = homography(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    q,
  );
  const GX = 48;
  const GY = 12;
  let inside = 0, ink = 0, total = 0;
  const cols = new Array(8).fill(0);
  for (let j = 0; j < GY; j++)
    for (let i = 0; i < GX; i++) {
      const u = (i + 0.5) / GX;
      const v = (j + 0.5) / GY;
      const p = apply(Hm, u, v);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      total++;
      const k = y * W + x;
      if (labels[k] === l || mask[k]) inside++;
      // characters sit in the middle band of the plate
      if (dark[k] && v > 0.15 && v < 0.85) {
        ink++;
        cols[Math.min(7, Math.floor(u * 8))]++;
      }
    }
  if (!total) return 0;
  // A plate has a clear margin of plain background above and below its characters.
  // (This is what tells a plate apart from a car's own lettering or badges.)
  // (A border line may sit near the edge, so the clearest row above and below is what counts.)
  const rowFill = (v: number) => {
    let hit = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      const u = 0.14 + (0.8 * (i + 0.5)) / 40;
      const p = apply(Hm, u, v);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      n++;
      if (raw[y * W + x]) hit++;
    }
    return n ? hit / n : 0;
  };
  const topClear = Math.max(rowFill(0.03), rowFill(0.05), rowFill(0.07));
  const botClear = Math.max(rowFill(0.93), rowFill(0.95), rowFill(0.97));
  if (topClear < 0.85 || botClear < 0.85) return 0;
  const fill = (inside + ink) / total;
  const inkShare = ink / total;
  if (fill < 0.72) return 0;
  // Real plates have characters spread across them.
  const inkCols = cols.filter((c) => c > 1).length;
  if (inkShare < 0.035 || inkShare > 0.5 || inkCols < 3) return 0;
  const shape = 1 - Math.min(1, Math.abs(Math.log(ratio / 4.7)) / 1.6);
  const size = Math.min(1, n / (W * H * 0.01));
  const lower = (q[0].y + q[2].y) / 2 > H * 0.35 ? 0.1 : 0;
  return fill * 1.2 + Math.min(1, inkShare * 6) * 0.4 + shape * 0.5 + size * 0.3 + Math.min(1, inkCols / 6) * 0.3 + lower;
}

/** Grows the quad slightly outwards, so the new plate covers the old one's edge. */
export function growQuad(q: Quad, by: number): Quad {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4;
  const cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  return q.map((p) => ({ x: cx + (p.x - cx) * (1 + by), y: cy + (p.y - cy) * (1 + by) })) as Quad;
}

/* ------------------------------------------------------------------ */
/* Light on the original plate                                         */
/* ------------------------------------------------------------------ */

/**
 * A 3×3 map of how bright the original plate's background is (ignoring its characters),
 * relative to an evenly lit plate. Lets the new plate pick up the same shade and shadow.
 * Also returns the overall colour cast.
 */
export function plateLight(img: ImageData, q: Quad, colour: "yellow" | "white"): { grid: number[]; cast: [number, number, number] } {
  const Hm = homography(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    q,
  );
  const ref = colour === "yellow" ? [245, 200, 20] : [245, 245, 242];
  const refL = 0.299 * ref[0] + 0.587 * ref[1] + 0.114 * ref[2];
  const grid: number[] = [];
  const castSum = [0, 0, 0];
  let castN = 0;
  for (let gy = 0; gy < 3; gy++)
    for (let gx = 0; gx < 3; gx++) {
      const lums: number[] = [];
      const rgbs: number[][] = [];
      for (let j = 0; j < 6; j++)
        for (let i = 0; i < 10; i++) {
          const u = (gx + (i + 0.5) / 10) / 3;
          const v = (gy + (j + 0.5) / 6) / 3;
          const p = apply(Hm, u * 0.94 + 0.03, v * 0.9 + 0.05);
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
          const k = (y * img.width + x) * 4;
          const r = img.data[k];
          const g = img.data[k + 1];
          const b = img.data[k + 2];
          lums.push(0.299 * r + 0.587 * g + 0.114 * b);
          rgbs.push([r, g, b]);
        }
      if (!lums.length) {
        grid.push(1);
        continue;
      }
      // the background is the brighter part (characters are dark)
      const order = lums.map((L, i) => [L, i]).sort((a, b) => b[0] - a[0]);
      const top = order.slice(0, Math.max(1, Math.floor(order.length * 0.45)));
      const L = top.reduce((a, t) => a + t[0], 0) / top.length;
      grid.push(L / refL);
      for (const t of top) {
        const c = rgbs[t[1]];
        castSum[0] += c[0];
        castSum[1] += c[1];
        castSum[2] += c[2];
        castN++;
      }
    }
  const avg = castSum.map((v) => v / Math.max(1, castN));
  const avgL = 0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2] || 1;
  const refNorm = ref.map((v) => v / refL);
  // colour cast = the scene's tint relative to the plate's own colour, kept gentle
  const cast = avg.map((v, i) => Math.max(0.85, Math.min(1.15, v / avgL / refNorm[i]))) as [number, number, number];
  return { grid, cast };
}

/* ------------------------------------------------------------------ */
/* Putting the new plate on                                            */
/* ------------------------------------------------------------------ */

export type Light = { grid: number[]; cast: [number, number, number] } | null;

/** A smaller (or larger) plate placed in the middle of the old one, in the same perspective. */
export function subQuad(q: Quad, ru: number, rv: number): Quad {
  const Hm = homography(UNIT, q);
  const u0 = 0.5 - ru / 2, u1 = 0.5 + ru / 2, v0 = 0.5 - rv / 2, v1 = 0.5 + rv / 2;
  return [apply(Hm, u0, v0), apply(Hm, u1, v0), apply(Hm, u1, v1), apply(Hm, u0, v1)];
}
const UNIT: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** How grainy the photo is around the plate (so the new plate isn't cleaner than the picture). */
export function photoGrain(img: ImageData, q: Quad): number {
  const Hm = homography(UNIT, q);
  let sum = 0, n = 0;
  for (let i = 0; i < 160; i++) {
    const u = (i % 40) / 40 + 0.0125;
    const v = i < 80 ? -0.25 - (i % 2) * 0.1 : 1.25 + (i % 2) * 0.1;
    const p = apply(Hm, u, v);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (x < 1 || y < 0 || x >= img.width - 1 || y >= img.height) continue;
    const k = (y * img.width + x) * 4;
    const lum = (o: number) => 0.299 * img.data[k + o] + 0.587 * img.data[k + o + 1] + 0.114 * img.data[k + o + 2];
    sum += Math.abs(lum(0) - lum(4));
    n++;
  }
  return n ? Math.max(0, Math.min(16, (sum / n) * 0.75)) : 0;
}

/**
 * Removes the old plate (filling its area with the paint just above and below it), then draws
 * `plate` inside quad `place` with true perspective, smooth edges, the photo's light and grain,
 * and a soft contact shadow. Only the area around the plate is touched, so it's quick enough to
 * redraw while a corner is dragged. `base` is the untouched photo.
 */
export function composite(
  out: CanvasRenderingContext2D,
  base: ImageData,
  plate: ImageData,
  cover: Quad,
  place: Quad,
  light: Light,
  grain = 0,
): { x: number; y: number; w: number; h: number } {
  const W = base.width;
  const H = base.height;
  const all = [...cover, ...place];
  const minX = Math.max(0, Math.floor(Math.min(...all.map((p) => p.x))) - 3);
  const maxX = Math.min(W - 1, Math.ceil(Math.max(...all.map((p) => p.x))) + 3);
  const minY = Math.max(0, Math.floor(Math.min(...all.map((p) => p.y))) - 3);
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...all.map((p) => p.y))) + 6);
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  if (bw <= 0 || bh <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  const PW = plate.width;
  const PH = plate.height;
  const inv = homography(place, [
    { x: 0, y: 0 },
    { x: PW, y: 0 },
    { x: PW, y: PH },
    { x: 0, y: PH },
  ]);
  const invCover = homography(cover, UNIT);
  const fwdCover = homography(UNIT, cover);
  const coverW = (dist(cover[0], cover[1]) + dist(cover[3], cover[2])) / 2;
  const coverH = (dist(cover[0], cover[3]) + dist(cover[1], cover[2])) / 2;
  const bd = base.data;
  const pd = plate.data;

  // The paint just above and just below the old plate, in 64 slices across it.
  const SL = 64;
  const above: number[][] = [];
  const below: number[][] = [];
  const pick = (u: number, v: number) => {
    const acc = [0, 0, 0];
    let n = 0;
    for (const du of [-0.006, 0, 0.006])
      for (const dv of [0, 0.06]) {
        const p = apply(fwdCover, u + du, v + (v < 0 ? -dv : dv));
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const k = (y * W + x) * 4;
        acc[0] += bd[k];
        acc[1] += bd[k + 1];
        acc[2] += bd[k + 2];
        n++;
      }
    return n ? acc.map((c) => c / n) : null;
  };
  for (let i = 0; i < SL; i++) {
    const u = (i + 0.5) / SL;
    above.push(pick(u, -0.14) ?? pick(u, 1.14) ?? [60, 60, 60]);
    below.push(pick(u, 1.14) ?? pick(u, -0.14) ?? [60, 60, 60]);
  }
  // and just left and right of it, in 16 slices down it
  const SV = 16;
  const lefts: number[][] = [];
  const rights: number[][] = [];
  const pickSide = (u: number, v: number) => {
    const p = apply(fwdCover, u, v);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    const k = (y * W + x) * 4;
    return [bd[k], bd[k + 1], bd[k + 2]];
  };
  for (let j = 0; j < SV; j++) {
    const v = (j + 0.5) / SV;
    lefts.push(pickSide(-0.035, v) ?? above[0]);
    rights.push(pickSide(1.035, v) ?? above[SL - 1]);
  }

  const region = out.createImageData(bw, bh);
  const rd = region.data;
  const g = light?.grid;
  const cast = light?.cast ?? [1, 1, 1];
  const plateH = (dist(place[0], place[3]) + dist(place[1], place[2])) / 2;
  const shadowOff = Math.max(1, plateH * 0.04);

  const S = [0, 0, 0, 0];
  const sample = (x: number, y: number) => {
    S[0] = S[1] = S[2] = S[3] = 0;
    if (x < 0 || y < 0 || x > PW - 1 || y > PH - 1) return;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(PW - 1, x0 + 1);
    const y1 = Math.min(PH - 1, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;
    const add = (xx: number, yy: number, w: number) => {
      const k = (yy * PW + xx) * 4;
      const a = (pd[k + 3] / 255) * w;
      S[0] += pd[k] * a;
      S[1] += pd[k + 1] * a;
      S[2] += pd[k + 2] * a;
      S[3] += a;
    };
    add(x0, y0, (1 - fx) * (1 - fy));
    add(x1, y0, fx * (1 - fy));
    add(x0, y1, (1 - fx) * fy);
    add(x1, y1, fx * fy);
  };
  const lightAt = (u: number, v: number) => {
    if (!g) return 1;
    const gx = Math.max(0, Math.min(2, u * 3 - 0.5));
    const gy = Math.max(0, Math.min(2, v * 3 - 0.5));
    const ix = Math.min(1, Math.floor(gx));
    const iy = Math.min(1, Math.floor(gy));
    const fx = gx - ix;
    const fy = gy - iy;
    const c = (a: number, b: number) => g[b * 3 + a];
    const top = c(ix, iy) * (1 - fx) + c(ix + 1, iy) * fx;
    const bot = c(ix, iy + 1) * (1 - fx) + c(ix + 1, iy + 1) * fx;
    return Math.max(0.35, Math.min(1.25, top * (1 - fy) + bot * fy));
  };
  const noise = () => (Math.random() + Math.random() + Math.random() - 1.5) * grain * 1.2;
  const offsets = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  const acc = [0, 0, 0, 0];
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const bk = (y * W + x) * 4;
      const rk = ((y - minY) * bw + (x - minX)) * 4;
      let r = bd[bk];
      let gc = bd[bk + 1];
      let b = bd[bk + 2];
      // 1. paint out the old plate
      const c = apply(invCover, x + 0.5, y + 0.5);
      const edge = Math.min(c.x * coverW, (1 - c.x) * coverW, c.y * coverH, (1 - c.y) * coverH);
      if (edge > -1) {
        const a = Math.max(0, Math.min(1, edge + 0.5));
        const i = Math.max(0, Math.min(SL - 1, Math.floor(c.x * SL)));
        const j = Math.max(0, Math.min(SV - 1, Math.floor(c.y * SV)));
        // blend the paint from all four sides, nearest side counting most
        const dT = Math.max(0.5, c.y * coverH);
        const dB = Math.max(0.5, (1 - c.y) * coverH);
        const dL = Math.max(0.5, c.x * coverW);
        const dR = Math.max(0.5, (1 - c.x) * coverW);
        const wT = 1 / (dT * dT), wB = 1 / (dB * dB), wL = 1 / (dL * dL), wR = 1 / (dR * dR);
        const sw = wT + wB + wL + wR;
        const n = noise();
        const mix = (ch: number) => (above[i][ch] * wT + below[i][ch] * wB + lefts[j][ch] * wL + rights[j][ch] * wR) / sw + n;
        const fr = mix(0);
        const fg = mix(1);
        const fb = mix(2);
        r = fr * a + r * (1 - a);
        gc = fg * a + gc * (1 - a);
        b = fb * a + b * (1 - a);
      }
      // 2. a soft contact shadow just below the new plate, as it stands off the car
      const sp = apply(inv, x, y - shadowOff);
      if (sp.x > PW * 0.01 && sp.x < PW * 0.99 && sp.y > PH * 0.5 && sp.y < PH) {
        r *= 0.7;
        gc *= 0.7;
        b *= 0.7;
      }
      // 3. the new plate, four samples a pixel for clean edges and small text
      acc[0] = acc[1] = acc[2] = acc[3] = 0;
      for (const [ox, oy] of offsets) {
        const p = apply(inv, x + ox, y + oy);
        sample(p.x, p.y);
        if (S[3] <= 0) continue;
        const L = lightAt(p.x / PW, p.y / PH);
        acc[0] += S[0] * L * cast[0];
        acc[1] += S[1] * L * cast[1];
        acc[2] += S[2] * L * cast[2];
        acc[3] += S[3];
      }
      const a = acc[3] / 4;
      if (a > 0) {
        const n = noise();
        r = Math.min(255, acc[0] / 4 + n * a) + r * (1 - a);
        gc = Math.min(255, acc[1] / 4 + n * a) + gc * (1 - a);
        b = Math.min(255, acc[2] / 4 + n * a) + b * (1 - a);
      }
      rd[rk] = r;
      rd[rk + 1] = gc;
      rd[rk + 2] = b;
      rd[rk + 3] = 255;
    }
  out.putImageData(region, minX, minY);
  return { x: minX, y: minY, w: bw, h: bh };
}

/** The plate picture scaled to roughly twice its size in the photo (sharp, without shimmer). */
export function plateForQuad(plateCanvas: HTMLCanvasElement, q: Quad): ImageData {
  const target = Math.max(dist(q[0], q[1]), dist(q[3], q[2])) * 2;
  const scale = Math.max(0.08, Math.min(1, target / plateCanvas.width));
  const w = Math.max(8, Math.round(plateCanvas.width * scale));
  const h = Math.max(4, Math.round(plateCanvas.height * scale));
  // step down in halves for a cleaner result than one big jump
  let src: HTMLCanvasElement = plateCanvas;
  while (src.width / 2 > w) {
    const half = document.createElement("canvas");
    half.width = Math.round(src.width / 2);
    half.height = Math.round(src.height / 2);
    const hc = half.getContext("2d")!;
    hc.imageSmoothingQuality = "high";
    hc.drawImage(src, 0, 0, half.width, half.height);
    src = half;
  }
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.imageSmoothingQuality = "high";
  c.drawImage(src, 0, 0, w, h);
  return c.getImageData(0, 0, w, h);
}
