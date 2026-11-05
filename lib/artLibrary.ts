/**
 * Artwork for surrounds (and logo plates): flags, faith symbols and a small library of simple shapes,
 * drawn here as plain vector layers so they show the same in the 2D picture and the 3D view.
 * Items with no drawing (layers empty) are shown by name in the preview; the team adds the artwork and
 * it appears on the proof the customer approves.
 */
export type ArtLayer = { d: string; fill?: string; stroke?: string; width?: number; evenodd?: boolean };
export type Region = "uk" | "europe" | "africa" | "asia" | "americas";
export type ArtItem = { key: string; name: string; group: "country" | "faith" | "other"; w: number; h: number; layers: ArtLayer[]; mono?: boolean; flag?: FlagDef; region?: Region };

/*
 * Flags. Each is drawn in "flag space": x from 0 to R (its width to height ratio), y from 0 (top) to 1.
 * Stripes, crosses and triangles are polygons, which stretch with the flag; emblems (stars, crescents, discs)
 * keep their shape. That lets one drawing be used two ways: as a normal flag on its button, and stretched
 * across the whole lip of a surround (stripes run along its length, as REG KING make them).
 */
type FPt = [number, number];
type FlagPart = { poly: FPt[]; fill: string } | { at: FPt; fill: string; em: (x: number, y: number, s: number) => string; evenodd?: boolean };
export type FlagDef = { key: string; name: string; region: Region; R: number; parts: FlagPart[] };

const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const star = (cx: number, cy: number, r: number, inner = 0.382, rot = -90) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = ((rot + i * 36) * Math.PI) / 180, rr = i % 2 ? r * inner : r;
    return `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join("") + "Z";
/** A straight band of width t from (x1,y1) to (x2,y2). */
const band = (x1: number, y1: number, x2: number, y2: number, t: number) => {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = (-dy / l) * (t / 2), ny = (dx / l) * (t / 2);
  return `M${x1 + nx} ${y1 + ny}L${x2 + nx} ${y2 + ny}L${x2 - nx} ${y2 - ny}L${x1 - nx} ${y1 - ny}Z`;
};
/** Crescent: a circle with an offset circle cut out (even-odd). */
const crescent = (cx: number, cy: number, r: number, cut: number, dx: number) => circle(cx, cy, r) + circle(cx + dx, cy, cut);
const tricolourV = (w: number, h: number, a: string, b: string, c: string): ArtLayer[] => [
  { d: rect(0, 0, w / 3, h), fill: a },
  { d: rect(w / 3, 0, w / 3, h), fill: b },
  { d: rect((2 * w) / 3, 0, w / 3, h), fill: c },
];
const tricolourH = (w: number, h: number, a: string, b: string, c: string): ArtLayer[] => [
  { d: rect(0, 0, w, h / 3), fill: a },
  { d: rect(0, h / 3, w, h / 3), fill: b },
  { d: rect(0, (2 * h) / 3, w, h / 3), fill: c },
];
const chakra = (cx: number, cy: number, r: number) => {
  let d = circle(cx, cy, r) + circle(cx, cy, r * 0.84) + circle(cx, cy, r * 0.18);
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    d += band(cx, cy, cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86, r * 0.06);
  }
  return d;
};

/* ---- flags ---- */
const fr = (x: number, y: number, w: number, h: number, fill: string): FlagPart => ({ poly: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill });
const fp = (poly: FPt[], fill: string): FlagPart => ({ poly, fill });
/** A straight band of thickness t (in flag heights) from one point to another. */
const fb = (x1: number, y1: number, x2: number, y2: number, t: number, fill: string): FlagPart => {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = (-dy / l) * (t / 2), ny = (dx / l) * (t / 2);
  return { poly: [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], fill };
};
/** Horizontal stripes, top to bottom (optional relative widths). */
const hs = (R: number, cols: string[], wts: number[] = cols.map(() => 1)): FlagPart[] => {
  const t = wts.reduce((a, b) => a + b, 0);
  let y = 0;
  return cols.map((c, i) => {
    const h = wts[i] / t, part = fr(0, y, R, h + (i < cols.length - 1 ? 0.002 : 0), c);
    y += h;
    return part;
  });
};
/** Vertical stripes, hoist to fly. */
const vs = (R: number, cols: string[], wts: number[] = cols.map(() => 1)): FlagPart[] => {
  const t = wts.reduce((a, b) => a + b, 0);
  let x = 0;
  return cols.map((c, i) => {
    const w = (wts[i] / t) * R, part = fr(x, 0, w + (i < cols.length - 1 ? 0.002 : 0), 1, c);
    x += w;
    return part;
  });
};
/** An emblem that keeps its shape: drawn by `em` round its anchor, `s` being one flag height. */
const fe = (at: FPt, fill: string, em: (x: number, y: number, s: number) => string, evenodd = false): FlagPart => ({ at, fill, em, evenodd });
const starN = (cx: number, cy: number, r: number, n: number, inner: number, rot = -90) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, rr = i % 2 ? r * inner : r;
    return `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(3)} ${(cy + rr * Math.sin(a)).toFixed(3)}`;
  }).join("") + "Z";
const tri = (cx: number, cy: number, r: number, up: boolean) => {
  const k = up ? 1 : -1;
  return `M${cx} ${cy - k * r}L${cx + 0.866 * r} ${cy + k * 0.5 * r}L${cx - 0.866 * r} ${cy + k * 0.5 * r}Z`;
};
const alt = (n: number, a: string, b: string) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));
const stG = (at: FPt, fill: string, r: number, rot = -90) => fe(at, fill, (x, y, s) => star(x, y, r * s, 0.382, rot));
const F = (key: string, name: string, region: Region, R: number, parts: FlagPart[]): FlagDef => ({ key, name, region, R, parts });
const W = "#FFFFFF", K = "#000000";

export const FLAGS: FlagDef[] = [
  /* UK and Ireland */
  F("uk", "United Kingdom", "uk", 2, [
    fr(0, 0, 2, 1, "#012169"),
    fb(0, 0, 2, 1, 0.2, W), fb(2, 0, 0, 1, 0.2, W),
    fb(0, 0, 2, 1, 0.067, "#C8102E"), fb(2, 0, 0, 1, 0.067, "#C8102E"),
    fr(0.8333, 0, 0.3333, 1, W), fr(0, 0.3333, 2, 0.3333, W),
    fr(0.9, 0, 0.2, 1, "#C8102E"), fr(0, 0.4, 2, 0.2, "#C8102E"),
  ]),
  F("england", "England", "uk", 5 / 3, [fr(0, 0, 5 / 3, 1, W), fr(5 / 6 - 0.1, 0, 0.2, 1, "#CE1124"), fr(0, 0.4, 5 / 3, 0.2, "#CE1124")]),
  F("scotland", "Scotland", "uk", 5 / 3, [fr(0, 0, 5 / 3, 1, "#005EB8"), fb(0, 0, 5 / 3, 1, 0.2, W), fb(5 / 3, 0, 0, 1, 0.2, W)]),
  F("cornwall", "Cornwall", "uk", 5 / 3, [fr(0, 0, 5 / 3, 1, K), fr(5 / 6 - 0.1, 0, 0.2, 1, W), fr(0, 0.4, 5 / 3, 0.2, W)]),
  F("ireland", "Ireland", "uk", 2, vs(2, ["#169B62", W, "#FF883E"])),

  /* Europe */
  F("france", "France", "europe", 1.5, vs(1.5, ["#0055A4", W, "#EF4135"])),
  F("italy", "Italy", "europe", 1.5, vs(1.5, ["#009246", W, "#CE2B37"])),
  F("germany", "Germany", "europe", 5 / 3, hs(5 / 3, [K, "#DD0000", "#FFCE00"])),
  F("spain", "Spain", "europe", 1.5, hs(1.5, ["#AA151B", "#F1BF00", "#AA151B"], [1, 2, 1])),
  F("netherlands", "Netherlands", "europe", 1.5, hs(1.5, ["#AE1C28", W, "#21468B"])),
  F("belgium", "Belgium", "europe", 15 / 13, vs(15 / 13, [K, "#FDDA24", "#EF3340"])),
  F("luxembourg", "Luxembourg", "europe", 5 / 3, hs(5 / 3, ["#EA141D", W, "#51ADDA"])),
  F("poland", "Poland", "europe", 1.6, hs(1.6, [W, "#DC143C"])),
  F("greece", "Greece", "europe", 1.5, [
    ...hs(1.5, alt(9, "#0D5EAF", W)),
    fr(0, 0, 5 / 9, 5 / 9, "#0D5EAF"), fr(2 / 9, 0, 1 / 9, 5 / 9, W), fr(0, 2 / 9, 5 / 9, 1 / 9, W),
  ]),
  F("romania", "Romania", "europe", 1.5, vs(1.5, ["#002B7F", "#FCD116", "#CE1126"])),
  F("bulgaria", "Bulgaria", "europe", 5 / 3, hs(5 / 3, [W, "#00966E", "#D62612"])),
  F("hungary", "Hungary", "europe", 2, hs(2, ["#CE2939", W, "#477050"])),
  F("austria", "Austria", "europe", 1.5, hs(1.5, ["#C8102E", W, "#C8102E"])),
  F("czechia", "Czechia", "europe", 1.5, [...hs(1.5, [W, "#D7141A"]), fp([[0, 0], [0.75, 0.5], [0, 1]], "#11457E")]),
  F("switzerland", "Switzerland", "europe", 1, [fr(0, 0, 1, 1, "#DA291C"), fe([0.5, 0.5], W, (x, y, s) => rect(x - 0.094 * s, y - 0.3125 * s, 0.1875 * s, 0.625 * s) + rect(x - 0.3125 * s, y - 0.094 * s, 0.625 * s, 0.1875 * s))]),
  F("sweden", "Sweden", "europe", 1.6, [fr(0, 0, 1.6, 1, "#006AA7"), fr(0.5, 0, 0.2, 1, "#FECC02"), fr(0, 0.4, 1.6, 0.2, "#FECC02")]),
  F("norway", "Norway", "europe", 22 / 16, [
    fr(0, 0, 22 / 16, 1, "#BA0C2F"), fr(6 / 16, 0, 4 / 16, 1, W), fr(0, 6 / 16, 22 / 16, 4 / 16, W),
    fr(7 / 16, 0, 2 / 16, 1, "#00205B"), fr(0, 7 / 16, 22 / 16, 2 / 16, "#00205B"),
  ]),
  F("denmark", "Denmark", "europe", 37 / 28, [fr(0, 0, 37 / 28, 1, "#C8102E"), fr(12 / 28, 0, 4 / 28, 1, W), fr(0, 12 / 28, 37 / 28, 4 / 28, W)]),
  F("finland", "Finland", "europe", 18 / 11, [fr(0, 0, 18 / 11, 1, W), fr(5 / 11, 0, 3 / 11, 1, "#002F6C"), fr(0, 4 / 11, 18 / 11, 3 / 11, "#002F6C")]),
  F("iceland", "Iceland", "europe", 25 / 18, [
    fr(0, 0, 25 / 18, 1, "#02529C"), fr(7 / 18, 0, 4 / 18, 1, W), fr(0, 7 / 18, 25 / 18, 4 / 18, W),
    fr(8 / 18, 0, 2 / 18, 1, "#DC1E35"), fr(0, 8 / 18, 25 / 18, 2 / 18, "#DC1E35"),
  ]),
  F("ukraine", "Ukraine", "europe", 1.5, hs(1.5, ["#0057B7", "#FFD700"])),
  F("lithuania", "Lithuania", "europe", 5 / 3, hs(5 / 3, ["#FDB913", "#006A44", "#C1272D"])),
  F("latvia", "Latvia", "europe", 2, hs(2, ["#9E3039", W, "#9E3039"], [2, 1, 2])),
  F("estonia", "Estonia", "europe", 11 / 7, hs(11 / 7, ["#0072CE", K, W])),
  F("serbia", "Serbia", "europe", 1.5, hs(1.5, ["#C6363C", "#0C4076", W])),
  F("bosnia", "Bosnia and Herzegovina", "europe", 2, [
    fr(0, 0, 2, 1, "#002395"),
    fp([[0.54, 0], [1.54, 0], [1.54, 1]], "#FECB00"),
    ...Array.from({ length: 9 }, (_, k): FlagPart => stG([0.42 + 0.06 + k * 0.11, 0.06 + k * 0.11], W, 0.055)),
  ]),
  F("russia", "Russia", "europe", 1.5, hs(1.5, [W, "#0039A6", "#D52B1E"])),

  /* Africa */
  F("nigeria", "Nigeria", "africa", 2, vs(2, ["#008751", W, "#008751"])),
  F("ghana", "Ghana", "africa", 1.5, [...hs(1.5, ["#CE1126", "#FCD116", "#006B3F"]), stG([0.75, 0.5], K, 0.16)]),
  F("sierra-leone", "Sierra Leone", "africa", 1.5, hs(1.5, ["#1EB53A", W, "#0072C6"])),
  F("gambia", "Gambia", "africa", 1.5, hs(1.5, ["#CE1126", W, "#0C1C8C", W, "#3A7728"], [6, 1, 4, 1, 6])),
  F("senegal", "Senegal", "africa", 1.5, [...vs(1.5, ["#00853F", "#FDEF42", "#E31B23"]), stG([0.75, 0.5], "#00853F", 0.13)]),
  F("mali", "Mali", "africa", 1.5, vs(1.5, ["#14B53A", "#FCD116", "#CE1126"])),
  F("guinea", "Guinea", "africa", 1.5, vs(1.5, ["#CE1126", "#FCD116", "#009460"])),
  F("ivory-coast", "Ivory Coast", "africa", 1.5, vs(1.5, ["#F77F00", W, "#009E60"])),
  F("cameroon", "Cameroon", "africa", 1.5, [...vs(1.5, ["#007A5E", "#CE1126", "#FCD116"]), stG([0.75, 0.5], "#FCD116", 0.13)]),
  F("gabon", "Gabon", "africa", 4 / 3, hs(4 / 3, ["#009E60", "#FCD116", "#3A75C4"])),
  F("dr-congo", "DR Congo", "africa", 4 / 3, [fr(0, 0, 4 / 3, 1, "#007FFF"), fb(0, 1, 4 / 3, 0, 0.32, "#F7D618"), fb(0, 1, 4 / 3, 0, 0.22, "#CE1021"), stG([0.28, 0.25], "#F7D618", 0.15)]),
  F("tanzania", "Tanzania", "africa", 1.5, [fp([[0, 0], [1.5, 0], [0, 1]], "#1EB53A"), fp([[1.5, 0], [1.5, 1], [0, 1]], "#00A3DD"), fb(0, 1, 1.5, 0, 0.36, "#FCD116"), fb(0, 1, 1.5, 0, 0.26, K)]),
  F("botswana", "Botswana", "africa", 1.5, [fr(0, 0, 1.5, 1, "#6DA9D2"), fr(0, 0.3833, 1.5, 0.2333, W), fr(0, 0.4167, 1.5, 0.1667, K)]),
  F("somalia", "Somalia", "africa", 1.5, [fr(0, 0, 1.5, 1, "#4189DD"), stG([0.75, 0.5], W, 0.3)]),
  F("sudan", "Sudan", "africa", 2, [...hs(2, ["#D21034", W, K]), fp([[0, 0], [0.7, 0.5], [0, 1]], "#007229")]),
  F("libya", "Libya", "africa", 2, [
    ...hs(2, ["#E70013", K, "#239E46"], [1, 2, 1]),
    fe([1, 0.5], W, (x, y, s) => crescent(x - 0.03 * s, y, 0.17 * s, 0.14 * s, 0.05 * s), true),
    fe([1, 0.5], W, (x, y, s) => star(x + 0.13 * s, y, 0.075 * s, 0.382, -90)),
  ]),
  F("tunisia", "Tunisia", "africa", 1.5, [
    fr(0, 0, 1.5, 1, "#E70013"),
    fe([0.75, 0.5], W, (x, y, s) => circle(x, y, 0.25 * s)),
    fe([0.75, 0.5], "#E70013", (x, y, s) => crescent(x, y, 0.1875 * s, 0.15 * s, 0.05 * s), true),
    fe([0.75, 0.5], "#E70013", (x, y, s) => star(x + 0.06 * s, y, 0.09 * s, 0.382, -90)),
  ]),
  F("algeria", "Algeria", "africa", 1.5, [
    ...vs(1.5, ["#006233", W]),
    fe([0.75, 0.5], "#D21034", (x, y, s) => crescent(x, y, 0.25 * s, 0.2 * s, 0.0625 * s), true),
    fe([0.75, 0.5], "#D21034", (x, y, s) => star(x + 0.17 * s, y, 0.11 * s, 0.382, -90)),
  ]),
  F("morocco", "Morocco", "africa", 1.5, [
    fr(0, 0, 1.5, 1, "#C1272D"),
    fe([0.75, 0.52], "#006233", (x, y, s) => {
      const p = Array.from({ length: 5 }, (_, i) => [x + 0.27 * s * Math.cos(((-90 + i * 72) * Math.PI) / 180), y + 0.27 * s * Math.sin(((-90 + i * 72) * Math.PI) / 180)]);
      return p.map((a, i) => band(a[0], a[1], p[(i + 2) % 5][0], p[(i + 2) % 5][1], 0.04 * s)).join("");
    }),
  ]),

  /* Middle East and Asia */
  F("turkey", "Turkey", "asia", 1.5, [
    fr(0, 0, 1.5, 1, "#E30A17"),
    fe([0.5625, 0.5], W, (x, y, s) => crescent(x, y, 0.25 * s, 0.2 * s, 0.0625 * s), true),
    fe([0.5625, 0.5], W, (x, y, s) => star(x + 0.2425 * s, y, 0.125 * s, 0.382, 0)),
  ]),
  F("pakistan", "Pakistan", "asia", 1.5, [
    fr(0, 0, 0.375, 1, W), fr(0.375, 0, 1.125, 1, "#01411C"),
    fe([0.9375, 0.5], W, (x, y, s) => crescent(x, y, 0.275 * s, 0.235 * s, 0.0825 * s), true),
    fe([0.9375, 0.5], W, (x, y, s) => star(x + 0.1425 * s, y - 0.1175 * s, 0.085 * s, 0.382, -144)),
  ]),
  F("india", "India", "asia", 1.5, [...hs(1.5, ["#FF9933", W, "#138808"]), fe([0.75, 0.5], "#000080", (x, y, s) => chakra(x, y, 0.14 * s), true)]),
  F("bangladesh", "Bangladesh", "asia", 5 / 3, [fr(0, 0, 5 / 3, 1, "#006A4E"), fe([0.75, 0.5], "#F42A41", (x, y, s) => circle(x, y, 0.3333 * s))]),
  F("kurdistan", "Kurdistan", "asia", 1.5, [...hs(1.5, ["#ED2024", W, "#278E43"]), fe([0.75, 0.5], "#FEBD11", (x, y, s) => starN(x, y, 0.27 * s, 21, 0.62))]),
  F("palestine", "Palestine", "asia", 2, [...hs(2, [K, W, "#007A3D"]), fp([[0, 0], [0.6667, 0.5], [0, 1]], "#CE1126")]),
  F("jordan", "Jordan", "asia", 2, [...hs(2, [K, W, "#007A3D"]), fp([[0, 0], [1, 0.5], [0, 1]], "#CE1126"), fe([0.38, 0.5], W, (x, y, s) => starN(x, y, 0.09 * s, 7, 0.45))]),
  F("syria", "Syria", "asia", 1.5, [...hs(1.5, ["#007A3D", W, K]), fe([0.75, 0.5], "#CE1126", (x, y, s) => [-0.3, 0, 0.3].map((o) => star(x + o * s, y, 0.1 * s)).join(""))]),
  F("yemen", "Yemen", "asia", 1.5, hs(1.5, ["#CE1126", W, K])),
  F("uae", "United Arab Emirates", "asia", 2, [fr(0, 0, 0.5, 1, "#FF0000"), fr(0.498, 0, 1.502, 0.3353, "#00732F"), fr(0.498, 0.3333, 1.502, 0.3353, W), fr(0.498, 0.6667, 1.502, 0.3333, K)]),
  F("kuwait", "Kuwait", "asia", 2, [...hs(2, ["#007A3D", W, "#CE1126"]), fp([[0, 0], [0.5, 0.3333], [0.5, 0.6667], [0, 1]], K)]),
  F("qatar", "Qatar", "asia", 28 / 11, [
    fr(0, 0, 28 / 11, 1, "#8A1538"),
    fp([[0, 0], [0.82, 0], ...Array.from({ length: 9 }, (_, i): FPt[] => [[1.06, (i + 0.5) / 9], [0.82, (i + 1) / 9]]).flat(), [0, 1]], W),
  ]),
  F("bahrain", "Bahrain", "asia", 5 / 3, [
    fr(0, 0, 5 / 3, 1, "#CE1126"),
    fp([[0, 0], [0.42, 0], ...Array.from({ length: 5 }, (_, i): FPt[] => [[0.64, (i + 0.5) / 5], [0.42, (i + 1) / 5]]).flat(), [0, 1]], W),
  ]),
  F("azerbaijan", "Azerbaijan", "asia", 2, [
    ...hs(2, ["#00B5E2", "#EF3340", "#509E2F"]),
    fe([1, 0.5], W, (x, y, s) => crescent(x - 0.03 * s, y, 0.15 * s, 0.125 * s, 0.04 * s), true),
    fe([1, 0.5], W, (x, y, s) => starN(x + 0.08 * s, y, 0.065 * s, 8, 0.5)),
  ]),
  F("japan", "Japan", "asia", 1.5, [fr(0, 0, 1.5, 1, W), fe([0.75, 0.5], "#BC002D", (x, y, s) => circle(x, y, 0.3 * s))]),
  F("china", "China", "asia", 1.5, [
    fr(0, 0, 1.5, 1, "#EE1C25"),
    fe([0.25, 0.25], "#FFDE00", (x, y, s) => star(x, y, 0.15 * s) + [[0.25, -0.15], [0.35, -0.05], [0.35, 0.1], [0.25, 0.2]].map(([dx, dy]) => star(x + dx * s, y + dy * s, 0.05 * s)).join("")),
  ]),
  F("vietnam", "Vietnam", "asia", 1.5, [fr(0, 0, 1.5, 1, "#DA251D"), stG([0.75, 0.5], "#FFFF00", 0.3)]),
  F("thailand", "Thailand", "asia", 1.5, hs(1.5, ["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"], [1, 1, 2, 1, 1])),
  F("indonesia", "Indonesia", "asia", 1.5, hs(1.5, ["#FF0000", W])),

  /* Americas and the Caribbean */
  F("jamaica", "Jamaica", "americas", 2, [
    fr(0, 0, 2, 1, "#009B3A"),
    fp([[0, 0], [1, 0.5], [0, 1]], K), fp([[2, 0], [1, 0.5], [2, 1]], K),
    fb(0, 0, 2, 1, 0.13, "#FED100"), fb(2, 0, 0, 1, 0.13, "#FED100"),
  ]),
  F("trinidad", "Trinidad and Tobago", "americas", 5 / 3, [fr(0, 0, 5 / 3, 1, "#CE1126"), fb(0, 0, 5 / 3, 1, 0.36, W), fb(0, 0, 5 / 3, 1, 0.26, K)]),
  F("guyana", "Guyana", "americas", 5 / 3, [
    fr(0, 0, 5 / 3, 1, "#009E49"),
    fp([[0, 0], [5 / 3, 0.5], [0, 1]], W), fp([[0, 0.045], [5 / 3 - 0.1, 0.5], [0, 0.955]], "#FCD116"),
    fp([[0, 0], [5 / 6, 0.5], [0, 1]], K), fp([[0, 0.06], [5 / 6 - 0.09, 0.5], [0, 0.94]], "#CE1126"),
  ]),
  F("bahamas", "Bahamas", "americas", 2, [...hs(2, ["#00778B", "#FFC72C", "#00778B"]), fp([[0, 0], [0.866, 0.5], [0, 1]], K)]),
  F("cuba", "Cuba", "americas", 2, [...hs(2, alt(5, "#002A8F", W)), fp([[0, 0], [0.866, 0.5], [0, 1]], "#CB1515"), stG([0.29, 0.5], W, 0.13)]),
  F("puerto-rico", "Puerto Rico", "americas", 1.5, [...hs(1.5, alt(5, "#ED0000", W)), fp([[0, 0], [0.866, 0.5], [0, 1]], "#0050F0"), stG([0.29, 0.5], W, 0.13)]),
  F("colombia", "Colombia", "americas", 1.5, hs(1.5, ["#FCD116", "#003893", "#CE1126"], [2, 1, 1])),
  F("chile", "Chile", "americas", 1.5, [...hs(1.5, [W, "#D52B1E"]), fr(0, 0, 0.5, 0.5, "#0039A6"), stG([0.25, 0.25], W, 0.15)]),
];

const toD = (pts: FPt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("") + "Z";

/** A flag drawn as an ordinary flag, w by h (for its button and the 2D picture). */
export function flagLayers(f: FlagDef, w: number, h: number): ArtLayer[] {
  const k = w / f.R;
  return f.parts.map((p) =>
    "poly" in p ? { d: toD(p.poly.map(([x, y]) => [x * k, y * h] as FPt)), fill: p.fill } : { d: p.em(p.at[0] * k, p.at[1] * h, h), fill: p.fill, evenodd: p.evenodd },
  );
}

/**
 * A flag printed across a surround's whole lip: `quad` is the lip's corners (top left, top right, bottom right,
 * bottom left; y down). Stripes and crosses stretch to its full width with their ends following the angled
 * sides; emblems keep their shape, sized to the lip's height.
 */
export function flagLipLayers(f: FlagDef, quad: FPt[]): ArtLayer[] {
  const [tl, tr, br, bl] = quad;
  const warp = (u: number, v: number): FPt => {
    const lx = tl[0] + (bl[0] - tl[0]) * v, ly = tl[1] + (bl[1] - tl[1]) * v;
    const rx = tr[0] + (br[0] - tr[0]) * v, ry = tr[1] + (br[1] - tr[1]) * v;
    return [lx + (rx - lx) * u, ly + (ry - ly) * u];
  };
  const h = Math.abs(bl[1] - tl[1]);
  return f.parts.map((p) => {
    if (!("poly" in p)) {
      const [x, y] = warp(p.at[0] / f.R, p.at[1]);
      return { d: p.em(x, y, h), fill: p.fill, evenodd: p.evenodd };
    }
    // edges split up so diagonals follow the stretch smoothly
    const pts: FPt[] = [];
    p.poly.forEach((a, i) => {
      const b = p.poly[(i + 1) % p.poly.length];
      for (let j = 0; j < 16; j++) pts.push(warp((a[0] + ((b[0] - a[0]) * j) / 16) / f.R, a[1] + ((b[1] - a[1]) * j) / 16));
    });
    return { d: toD(pts), fill: p.fill };
  });
}

const flagItem = (f: FlagDef): ArtItem => ({ key: f.key, name: f.name, group: "country", region: f.region, w: f.R * 40, h: 40, layers: flagLayers(f, f.R * 40, 40), flag: f });

export const REGIONS: [Region, string][] = [
  ["uk", "UK & Ireland"],
  ["europe", "Europe"],
  ["africa", "Africa"],
  ["asia", "Middle East & Asia"],
  ["americas", "Americas"],
];


export const ART_ITEMS: ArtItem[] = [
  ...FLAGS.map(flagItem),
  /* faith and heritage (drawn where the shape is simple; the rest come on the proof) */
  { key: "khanda", name: "Khanda", group: "faith", w: 100, h: 100, layers: [], mono: true },
  { key: "ik-onkar", name: "Ik Onkar", group: "faith", w: 100, h: 100, layers: [], mono: true },
  { key: "om", name: "Om", group: "faith", w: 100, h: 100, layers: [], mono: true },
  { key: "crescent-star", name: "Crescent and star", group: "faith", w: 100, h: 100, layers: [{ d: crescent(44, 50, 34, 28, 11), evenodd: true }, { d: star(70, 42, 12, 0.382, -144) }], mono: true },
  { key: "cross", name: "Cross", group: "faith", w: 60, h: 100, layers: [{ d: rect(23, 4, 14, 92) + rect(4, 24, 52, 14) }], mono: true },
  { key: "star-of-david", name: "Star of David", group: "faith", w: 100, h: 100, layers: [{ d: "M50 4L90 73H10Z M50 96L10 27H90Z M50 18L28 55H72Z M50 82L72 45H28Z", evenodd: true }], mono: true },
  /* other: a small library of simple shapes, in the text colour */
  { key: "crown", name: "Crown", group: "other", w: 100, h: 100, layers: [{ d: "M8 78L4 24L30 46L50 12L70 46L96 24L92 78Z M8 84H92V96H8Z" }], mono: true },
  { key: "star", name: "Star", group: "other", w: 100, h: 100, layers: [{ d: star(50, 53, 48) }], mono: true },
  { key: "heart", name: "Heart", group: "other", w: 100, h: 92, layers: [{ d: "M50 88C20 66 4 50 4 32C4 16 16 6 30 6C40 6 46 12 50 20C54 12 60 6 70 6C84 6 96 16 96 32C96 50 80 66 50 88Z" }], mono: true },
  { key: "lightning", name: "Lightning bolt", group: "other", w: 100, h: 100, layers: [{ d: "M58 2L18 56H44L36 98L82 40H54Z" }], mono: true },
  { key: "flame", name: "Flame", group: "other", w: 100, h: 100, layers: [{ d: "M50 4C58 26 82 36 82 62C82 82 68 96 50 96C32 96 18 82 18 64C18 50 26 42 32 34C34 46 40 52 46 54C42 38 44 20 50 4Z" }], mono: true },
  { key: "diamond", name: "Diamond", group: "other", w: 100, h: 100, layers: [{ d: "M20 8H80L98 34L50 96L2 34Z" }], mono: true },
  {
    key: "chequered", name: "Chequered flag", group: "other", w: 100, h: 100, mono: true,
    layers: [{ d: rect(6, 6, 6, 92) + Array.from({ length: 20 }, (_, i) => ((i % 5) + Math.floor(i / 5)) % 2 ? "" : rect(14 + (i % 5) * 16, 8 + Math.floor(i / 5) * 12, 16, 12)).join("") + `M14 8H94V56H14Z` , evenodd: true }],
  },
  { key: "paw", name: "Paw print", group: "other", w: 100, h: 100, layers: [{ d: circle(22, 40, 10) + circle(40, 22, 11) + circle(60, 22, 11) + circle(78, 40, 10) + "M50 44C66 44 82 66 82 80C82 92 70 96 60 92C55 90 45 90 40 92C30 96 18 92 18 80C18 66 34 44 50 44Z" }], mono: true },
  { key: "music", name: "Music note", group: "other", w: 100, h: 100, layers: [{ d: "M38 14L84 4V70A14 11 0 1 1 74 60V26L48 32V80A14 11 0 1 1 38 70Z" }], mono: true },
  { key: "infinity", name: "Infinity", group: "other", w: 100, h: 60, layers: [{ d: "M50 30C40 15 30 8 20 10C8 12 4 24 6 32C8 44 20 52 32 48C40 45 46 37 50 30C54 23 60 15 68 12C80 8 92 16 94 28C96 40 88 52 76 50C64 48 56 38 50 30Z", stroke: "currentColor", width: 8 }], mono: true },
];

export const artItem = (key: string | null | undefined) => ART_ITEMS.find((i) => i.key === key) ?? null;

/** Draw an item onto a canvas (for the 3D view). Mono items use `colour`. Returns null if it has no drawing. */
export function artCanvas(item: ArtItem, colour: string, px = 512): HTMLCanvasElement | null {
  if (!item.layers.length || typeof document === "undefined") return null;
  const k = px / Math.max(item.w, item.h);
  const cv = document.createElement("canvas");
  cv.width = Math.round(item.w * k);
  cv.height = Math.round(item.h * k);
  const g = cv.getContext("2d")!;
  g.scale(k, k);
  for (const l of item.layers) {
    const p = new Path2D(l.d);
    if (l.stroke) {
      g.strokeStyle = l.stroke === "currentColor" || !l.stroke ? colour : l.stroke;
      g.lineWidth = l.width ?? 2;
      g.lineJoin = "round";
      g.stroke(p);
    } else {
      g.fillStyle = l.fill ?? colour;
      g.fill(p, l.evenodd ? "evenodd" : "nonzero");
    }
  }
  return cv;
}
