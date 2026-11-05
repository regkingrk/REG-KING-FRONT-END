"use client";

/**
 * More of the admin portal: the Shopify-style Home, Live view and customer locations, the registration
 * editor, call bookings, DVLA transfers, selling packages, requests, logo approvals, trade accounts,
 * abandoned baskets, email marketing, site content, workshop materials, returns, the road legal plate
 * record book, privacy requests, website health, reports, team tasks and notifications.
 *
 * PREVIEW: records are EXAMPLES so each screen can be seen working, and every screen says so. Visits,
 * locations and live visitors come from website analytics at launch, and only for visitors who accept
 * analytics cookies; locations are town level from the visitor's connection, never a home address.
 */
import { useMemo, useState } from "react";
import { formatGBP } from "@/lib/brand";
import { customerPlates, regkingStock } from "@/lib/stock";
import { FAQS, TEAM, type FaqTab } from "@/lib/infoContent";
import { CUSTOMERS, JOBS, customerById, can, type AdminOrder, type AdminTab, type Role } from "@/lib/admin";
import { Card, Field, PriceIn, Status, Toggle } from "./AdminStore";

const money = (n: number) => formatGBP(n, Number.isInteger(n));
const uid = () => Math.random().toString(36).slice(2, 9);
type Rec = (what: string) => void;

/* ------------------------------------------------------------------ */
/* Places: a dotted map of the UK and the towns in the examples          */
/* ------------------------------------------------------------------ */
// Rough coastline (longitude, latitude), enough for a dotted map.
const GB: [number, number][] = [
  [-5.7, 50.05], [-5.0, 50.0], [-4.2, 50.35], [-3.5, 50.6], [-2.9, 50.7], [-2.0, 50.6], [-1.3, 50.75], [-0.8, 50.75], [0.3, 50.75], [1.0, 50.95],
  [1.4, 51.15], [1.4, 51.38], [0.6, 51.5], [0.9, 51.75], [1.3, 51.95], [1.75, 52.45], [1.7, 52.75], [1.3, 52.95], [0.4, 52.95], [0.2, 53.3],
  [0.15, 53.6], [-0.2, 54.1], [-0.6, 54.45], [-1.2, 54.65], [-1.4, 55.0], [-1.6, 55.6], [-2.0, 55.8], [-2.6, 56.0], [-2.58, 56.28], [-2.8, 56.45],
  [-2.5, 56.7], [-2.1, 57.15], [-1.8, 57.5], [-2.0, 57.7], [-3.0, 57.7], [-3.8, 57.6], [-3.5, 58.0], [-3.05, 58.45], [-3.1, 58.65], [-4.5, 58.55],
  [-5.0, 58.6], [-5.4, 58.2], [-5.7, 57.8], [-5.8, 57.3], [-5.6, 56.8], [-5.6, 56.3], [-5.6, 55.7], [-5.8, 55.3], [-5.3, 55.8], [-4.9, 55.7],
  [-4.6, 55.4], [-5.0, 55.0], [-5.1, 54.65], [-4.4, 54.7], [-3.6, 54.95], [-3.4, 54.6], [-3.2, 54.15], [-2.9, 53.95], [-3.05, 53.5], [-3.4, 53.35],
  [-4.2, 53.3], [-4.6, 53.3], [-4.7, 52.8], [-4.1, 52.55], [-4.6, 52.1], [-5.3, 51.85], [-5.0, 51.6], [-4.3, 51.65], [-3.9, 51.55], [-3.2, 51.4],
  [-2.7, 51.55], [-3.0, 51.2], [-3.6, 51.2], [-4.2, 51.2], [-4.6, 50.95], [-5.0, 50.55], [-5.6, 50.2],
];
const NI: [number, number][] = [[-5.45, 54.2], [-5.55, 54.7], [-5.9, 55.05], [-6.3, 55.25], [-7.2, 55.2], [-7.5, 55.05], [-7.6, 54.75], [-8.15, 54.45], [-7.6, 54.15], [-7.0, 54.2], [-6.6, 54.05], [-6.1, 54.0]];
const MAP = { w: 300, h: 380, lon0: -8.4, lat0: 59, kx: 300 / 10.4 * 0.95, ky: 380 / 9.2 };
const px = (lon: number, lat: number) => [(lon - MAP.lon0) * MAP.kx, (MAP.lat0 - lat) * MAP.ky] as const;
const inside = (lon: number, lat: number, poly: [number, number][]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const DOTS = (() => {
  const out: [number, number][] = [];
  for (let lat = 49.9; lat < 58.8; lat += 0.13) for (let lon = -8.3; lon < 1.9; lon += 0.2) if (inside(lon, lat, GB) || inside(lon, lat, NI)) out.push([lon, lat]);
  return out.map(([lo, la]) => px(lo, la));
})();

export const TOWNS: Record<string, { lat: number; lon: number; region: string }> = {
  Wolverhampton: { lat: 52.586, lon: -2.128, region: "West Midlands" },
  Birmingham: { lat: 52.486, lon: -1.89, region: "West Midlands" },
  Walsall: { lat: 52.586, lon: -1.982, region: "West Midlands" },
  London: { lat: 51.507, lon: -0.128, region: "London" },
  Manchester: { lat: 53.48, lon: -2.242, region: "North West" },
  Leeds: { lat: 53.8, lon: -1.549, region: "Yorkshire" },
  Bradford: { lat: 53.796, lon: -1.759, region: "Yorkshire" },
  Leicester: { lat: 52.637, lon: -1.139, region: "East Midlands" },
  Glasgow: { lat: 55.864, lon: -4.252, region: "Scotland" },
  Cardiff: { lat: 51.481, lon: -3.179, region: "Wales" },
  Bristol: { lat: 51.454, lon: -2.588, region: "South West" },
  Newcastle: { lat: 54.978, lon: -1.618, region: "North East" },
  Belfast: { lat: 54.597, lon: -5.93, region: "Northern Ireland" },
};
/** Where each example customer is. */
const CUSTOMER_TOWN: Record<string, string> = { c1: "Birmingham", c2: "Wolverhampton", c3: "Manchester", c4: "Walsall", c5: "London" };

type Pin = { town: string; kind: "visitor" | "order"; n?: number };
function UkMap({ pins, label }: { pins: Pin[]; label: string }) {
  return (
    <svg className="am-map" viewBox={`0 0 ${MAP.w} ${MAP.h}`} role="img" aria-label={label}>
      {DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.25} className="am-map__dot" />
      ))}
      {pins.map((p, i) => {
        const t = TOWNS[p.town];
        if (!t) return null;
        const [x, y] = px(t.lon, t.lat);
        return (
          <g key={i} className={`am-map__pin am-map__pin--${p.kind}`}>
            <circle cx={x} cy={y} r={p.kind === "order" ? 5 : 4 + Math.min(4, (p.n ?? 1) - 1)} />
            {p.kind === "visitor" && <circle cx={x} cy={y} r={9} className="am-map__ring" />}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Example visits (replaced by analytics at launch)                      */
/* ------------------------------------------------------------------ */
const DAYS = 30;
const dayLabel = (i: number) => {
  const d = new Date("2026-11-02T12:00:00");
  d.setDate(d.getDate() - (DAYS - 1 - i));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const wave = (seed: number) => Array.from({ length: DAYS }, (_, i) => Math.round(230 + 70 * Math.sin(i * 0.7 + seed) + 40 * Math.sin(i * 1.9 + seed * 2) + (i % 7 === 5 ? 120 : 0)));
const SESSIONS = wave(1);
const SESSIONS_PREV = wave(2.3);
const LIVE = [
  { town: "Wolverhampton", page: "Make: number plates", device: "Phone", source: "Instagram", mins: 4 },
  { town: "Birmingham", page: "Plate page: AM12 AAH", device: "Phone", source: "Google", mins: 2 },
  { town: "London", page: "Checkout", device: "Computer", source: "Direct", mins: 7 },
];

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */
export function HomeShop(p: {
  orders: AdminOrder[];
  waiting: { tab: AdminTab; n: number; label: string }[];
  open: (t: AdminTab) => void;
  log: { at: string; who: string; what: string }[];
  role: Role;
}) {
  const [metric, setMetric] = useState<"sessions" | "sales" | "orders">("sessions");
  const sales = useMemo(() => {
    const s = new Array(DAYS).fill(0), o = new Array(DAYS).fill(0);
    p.orders.forEach((x) => {
      const diff = Math.round((new Date("2026-11-02").getTime() - new Date(x.date).getTime()) / 864e5);
      const i = DAYS - 1 - diff;
      if (i >= 0 && i < DAYS) {
        s[i] += x.total;
        o[i] += 1;
      }
    });
    return { s, o };
  }, [p.orders]);
  const totalSales = sales.s.reduce((a, b) => a + b, 0);
  const totalOrders = sales.o.reduce((a, b) => a + b, 0);
  const series = metric === "sessions" ? SESSIONS : metric === "sales" ? sales.s : sales.o;
  const prev = metric === "sessions" ? SESSIONS_PREV : null;
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const change = Math.round(((sum(SESSIONS) - sum(SESSIONS_PREV)) / sum(SESSIONS_PREV)) * 100);
  const max = Math.max(1, ...series, ...(prev ?? []));
  const W = 600, H = 170;
  const path = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${((i / (DAYS - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 10)).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const fulfil = JOBS.filter((j) => j.status !== "dispatched").length;
  return (
    <div className="am-home">
      <section className="am-hero" aria-label="Last 30 days">
        <div className="am-hero__kpis" role="tablist" aria-label="Show on the chart">
          <div className="am-kpi am-kpi--live">
            <span>Live</span>
            <b>
              <i className="am-livedot" aria-hidden />
              {LIVE.length}
            </b>
          </div>
          {(
            [
              ["sessions", "Sessions", SESSIONS.reduce((a, b) => a + b, 0).toLocaleString("en-GB"), `${change > 0 ? "+" : ""}${change}%`],
              ["sales", "Total sales", money(Math.round(totalSales)), ""],
              ["orders", "Orders", String(totalOrders), ""],
            ] as const
          ).map(([k, label, v, ch]) => (
            <button key={k} type="button" role="tab" aria-selected={metric === k} className="am-kpi" onClick={() => setMetric(k)} data-am-metric={k}>
              <span>{label}</span>
              <b>
                {v}
                {ch && <small>{ch}</small>}
              </b>
            </button>
          ))}
        </div>
        <div className="am-chart">
          <div className="am-chart__y" aria-hidden>
            {ticks.reverse().map((t) => (
              <span key={t}>{metric === "sales" ? money(t) : t}</span>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${metric} over the last 30 days`}>
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1="0" x2={W} y1={H - f * (H - 10)} y2={H - f * (H - 10)} className="am-chart__grid" />
            ))}
            {prev && <path d={path(prev)} className="am-chart__prev" />}
            <path d={path(series)} className="am-chart__line" />
          </svg>
          <div className="am-chart__x" aria-hidden>
            <span>{dayLabel(0)}</span>
            <span>{dayLabel(15)}</span>
            <span>{dayLabel(29)}</span>
          </div>
        </div>
        <div className="am-hero__acts">
          <span className="am-pill">Last 30 days</span>
          <button type="button" className="am-pill" onClick={() => p.open("live")} data-am-live>
            Live view
          </button>
          <button type="button" className="am-pill" onClick={() => p.open("analytics")}>
            View report
          </button>
        </div>
        <p className="am-hero__note">Visits are examples until website analytics is connected. Sales and orders come from the example orders.</p>
      </section>

      <section className="am-sheet" aria-labelledby="am-act">
        <h2 id="am-act" className="am-sheet__h">
          <span>Hey there!</span> Here&apos;s your activity
        </h2>
        <div className="am-acts">
          <button type="button" className="am-act" onClick={() => p.open("settings")}>
            <span>Next payout</span>
            <b>Not connected</b>
          </button>
          <button type="button" className="am-act" onClick={() => p.open("production")}>
            <span>Fulfil orders</span>
            <b>{fulfil}</b>
          </button>
          {p.waiting.map((w) => (
            <button key={w.label} type="button" className="am-act" data-zero={!w.n || undefined} onClick={() => p.open(w.tab)}>
              <span>{w.label}</span>
              <b>{w.n}</b>
            </button>
          ))}
        </div>
        <Card title="Latest orders" action={<button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => p.open("orders")}>All orders</button>} flush>
          <ul className="am-list">
            {p.orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => p.open("orders")}>
                  <b>{o.ref}</b>
                  <span>{customerById(o.customer).name}</span>
                  {o.reg && <i className="ad-reg">{o.reg}</i>}
                  <em>{money(o.total)}</em>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity" flush>
          <ul className="am-list am-list--log">
            {p.log.slice(0, 5).map((l, i) => (
              <li key={i}>
                <span>{l.what}</span>
                <small>
                  {l.who} · {l.at.slice(5).replace("-", "/")}
                </small>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live view                                                           */
/* ------------------------------------------------------------------ */
export function LivePage({ orders }: { orders: AdminOrder[] }) {
  const today = orders.filter((o) => o.date === "2026-11-02");
  const pins: Pin[] = [
    ...Object.entries(LIVE.reduce<Record<string, number>>((a, v) => ((a[v.town] = (a[v.town] ?? 0) + 1), a), {})).map(([town, n]) => ({ town, kind: "visitor" as const, n })),
    ...today.map((o) => ({ town: CUSTOMER_TOWN[o.customer], kind: "order" as const })),
  ];
  return (
    <div className="as-stack">
      <p className="as-lede">Who&apos;s on the website right now and what they&apos;re looking at. Example visitors until analytics is connected.</p>
      <div className="am-live">
        <Card>
          <div className="am-legend">
            <span>
              <i className="is-order" /> Orders today
            </span>
            <span>
              <i className="is-visitor" /> Visitors right now
            </span>
          </div>
          <UkMap pins={pins} label={`Map of the UK: ${LIVE.length} visitors right now`} />
        </Card>
        <div className="as-stack">
          <div className="am-tiles">
            <div>
              <span>Visitors right now</span>
              <b>{LIVE.length}</b>
            </div>
            <div>
              <span>Sales today</span>
              <b>{money(today.reduce((a, o) => a + o.total, 0))}</b>
            </div>
            <div>
              <span>Sessions today</span>
              <b>{SESSIONS[DAYS - 1]}</b>
            </div>
            <div>
              <span>Orders today</span>
              <b>{today.length}</b>
            </div>
          </div>
          <Card title="Customer behaviour">
            <div className="am-funnel">
              <div>
                <span>Active baskets</span>
                <b>2</b>
              </div>
              <div>
                <span>Checking out</span>
                <b>1</b>
              </div>
              <div>
                <span>Purchased</span>
                <b>{today.length}</b>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Card title="On the website now" flush>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Town</th>
                <th scope="col">Looking at</th>
                <th scope="col">Came from</th>
                <th scope="col">Device</th>
                <th scope="col" className="is-num">On site</th>
              </tr>
            </thead>
            <tbody>
              {LIVE.map((v, i) => (
                <tr key={i}>
                  <th scope="row">{v.town}</th>
                  <td>{v.page}</td>
                  <td>{v.source}</td>
                  <td>{v.device}</td>
                  <td className="is-num">{v.mins} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="as-help">Locations are by town, worked out from the visitor&apos;s connection, and only for visitors who accept analytics cookies. Nobody&apos;s home address is shown here.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customer locations                                                  */
/* ------------------------------------------------------------------ */
export function LocationsPage({ orders }: { orders: AdminOrder[] }) {
  const rows = useMemo(() => {
    const m = new Map<string, { town: string; region: string; customers: Set<string>; orders: number; sales: number }>();
    CUSTOMERS.forEach((c) => {
      const town = CUSTOMER_TOWN[c.id];
      const r = m.get(town) ?? { town, region: TOWNS[town].region, customers: new Set(), orders: 0, sales: 0 };
      r.customers.add(c.id);
      m.set(town, r);
    });
    orders.forEach((o) => {
      const r = m.get(CUSTOMER_TOWN[o.customer]);
      if (r) {
        r.orders += 1;
        r.sales += o.total;
      }
    });
    return [...m.values()].sort((a, b) => b.sales - a.sales);
  }, [orders]);
  const regions = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.region, (m.get(r.region) ?? 0) + r.sales));
    const max = Math.max(1, ...m.values());
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, w: (v / max) * 100 }));
  }, [rows]);
  return (
    <div className="as-stack">
      <p className="as-lede">Where your customers and sales are, from their delivery and registration addresses (by town). Example customers in this preview.</p>
      <div className="am-live">
        <Card>
          <UkMap pins={rows.map((r) => ({ town: r.town, kind: "order" as const }))} label="Map of where customers are" />
        </Card>
        <Card title="Sales by region">
          <ul className="as-bars">
            {regions.map((r) => (
              <li key={r.k}>
                <span>{r.k}</span>
                <i>
                  <b style={{ width: `${r.w}%` }} />
                </i>
                <em>{money(Math.round(r.v))}</em>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Towns" flush>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Town</th>
                <th scope="col">Region</th>
                <th scope="col" className="is-num">Customers</th>
                <th scope="col" className="is-num">Orders</th>
                <th scope="col" className="is-num">Sales</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.town}>
                  <th scope="row">{r.town}</th>
                  <td>{r.region}</td>
                  <td className="is-num">{r.customers.size}</td>
                  <td className="is-num">{r.orders}</td>
                  <td className="is-num">{money(Math.round(r.sales * 100) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Where visitors come from">
        <p className="as-help">At launch: visits by town and region, and how they found you (Google, Instagram, TikTok, direct), from website analytics.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registrations                                                       */
/* ------------------------------------------------------------------ */
type RegRow = {
  reg: string;
  price: number | null;
  cost: number | null;
  source: "regking" | "customer";
  status: "sale" | "reserved" | "sold" | "hidden";
  exclusive: boolean;
  newWeek: boolean;
  held: "certificate" | "vehicle" | "confirm";
  expires: string;
  added: string;
  notes: string;
};
const REG_STATUS: Record<RegRow["status"], [string, "ok" | "info" | "plain" | "wait"]> = { sale: ["For sale", "ok"], reserved: ["Reserved", "info"], sold: ["Sold", "plain"], hidden: ["Hidden", "wait"] };
const toReg = (s: { reg: string; price: number; added: string }, source: RegRow["source"]): RegRow => ({
  reg: s.reg,
  price: s.price,
  cost: null,
  source,
  status: "sale",
  exclusive: s.price >= 15000,
  newWeek: false,
  held: "confirm",
  expires: "",
  added: s.added,
  notes: "",
});

export function RegistrationsPage({ role, record }: { role: Role; record: Rec }) {
  const edit = can(role, "plates.edit");
  const [rows, setRows] = useState<RegRow[]>(() => [...regkingStock.map((s) => toReg(s, "regking")), ...customerPlates.map((s) => toReg(s, "customer"))]);
  const [tab, setTab] = useState<"all" | "regking" | "customer" | "exclusive" | "reserved" | "sold">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ reg: "", price: "", source: "regking" as RegRow["source"] });
  const [bulk, setBulk] = useState("");
  const list = rows.filter(
    (r) =>
      (tab === "all" || (tab === "exclusive" ? r.exclusive : tab === "reserved" ? r.status === "reserved" : tab === "sold" ? r.status === "sold" : r.source === tab)) &&
      r.reg.replace(/\s/g, "").includes(q.replace(/\s/g, "").toUpperCase()),
  );
  const shown = list.slice(0, 60);
  const cur = rows.find((r) => r.reg === open) ?? null;
  const up = (reg: string, p: Partial<RegRow>, what: string) => {
    setRows((rs) => rs.map((r) => (r.reg === reg ? { ...r, ...p } : r)));
    record(what);
  };
  const add = (reg: string, price: number | null, source: RegRow["source"]) => {
    const r = reg.toUpperCase().replace(/\s+/g, " ").trim();
    if (!r || rows.some((x) => x.reg === r)) return false;
    setRows((rs) => [{ ...toReg({ reg: r, price: price ?? 0, added: "2026-11-02" }, source), price, newWeek: true }, ...rs]);
    return true;
  };
  return (
    <div className="as-stack">
      <div className="as-pagehead as-pagehead--row">
        <p className="as-lede">Every registration on the website: REG KING&apos;s own stock and customers&apos; plates. Click one to change its price, status or details.</p>
        {edit && (
          <div className="as-row">
            <button type="button" className="as-btn as-btn--ghost" onClick={() => setAdding(!adding)} data-am-addreg>
              Add or upload
            </button>
          </div>
        )}
      </div>
      {adding && (
        <Card title="Add registrations">
          <form
            className="as-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (add(draft.reg, draft.price ? Number(draft.price) : null, draft.source)) {
                record(`Added ${draft.reg.toUpperCase()}`);
                setDraft({ reg: "", price: "", source: draft.source });
              }
            }}
          >
            <input className="as-input" placeholder="Registration" value={draft.reg} onChange={(e) => setDraft({ ...draft, reg: e.target.value.toUpperCase() })} aria-label="Registration" data-am-newreg />
            <input className="as-input" placeholder="Price (£)" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/[^0-9.]/g, "") })} aria-label="Price" />
            <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as RegRow["source"] })} aria-label="Whose plate">
              <option value="regking">REG KING stock</option>
              <option value="customer">Customer plate</option>
            </select>
            <button type="submit" className="as-btn">
              Add
            </button>
          </form>
          <Field label="Or paste many at once" hint="One per line: registration, price. For example: AB12 CDE, 2499">
            <textarea rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} data-am-bulk />
          </Field>
          <div className="as-row">
            <button
              type="button"
              className="as-btn as-btn--ghost"
              disabled={!bulk.trim()}
              onClick={() => {
                let n = 0;
                bulk.split(/\n/).forEach((line) => {
                  const [r, p] = line.split(/[,\t]/);
                  if (r && add(r, p ? Number(p.replace(/[^0-9.]/g, "")) || null : null, draft.source)) n++;
                });
                record(`Uploaded ${n} registrations`);
                setBulk("");
              }}
            >
              Add all
            </button>
            <label className="as-btn as-btn--ghost as-upload">
              Upload a spreadsheet (CSV)
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setBulk(await f.text());
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Card>
      )}
      {cur && (
        <Card title={cur.reg} action={<button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => setOpen(null)}>Close</button>}>
          <div className="as-grid4">
            <Field label="Price">
              <PriceIn value={cur.price} label="Price" disabled={!edit} set={(n) => up(cur.reg, { price: n }, `${cur.reg}: price set to ${n === null ? "on request" : money(n)}`)} />
            </Field>
            <Field label="What we paid (private)">
              <PriceIn value={cur.cost} label="Cost" disabled={!edit} set={(n) => up(cur.reg, { cost: n }, `${cur.reg}: cost noted`)} />
            </Field>
            <Field label="Status">
              <select value={cur.status} disabled={!edit} onChange={(e) => up(cur.reg, { status: e.target.value as RegRow["status"] }, `${cur.reg}: ${REG_STATUS[e.target.value as RegRow["status"]][0]}`)} data-am-regstatus>
                {Object.entries(REG_STATUS).map(([k, [t]]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Held on">
              <select value={cur.held} disabled={!edit} onChange={(e) => up(cur.reg, { held: e.target.value as RegRow["held"] }, `${cur.reg}: held on ${e.target.value}`)}>
                <option value="confirm">Not recorded</option>
                <option value="certificate">Certificate (V750 or V778)</option>
                <option value="vehicle">A vehicle</option>
              </select>
            </Field>
          </div>
          {cur.price !== null && cur.cost !== null && <p className="as-help">Profit if sold at this price: {money(cur.price - cur.cost)}</p>}
          <div className="as-grid2">
            <Field label="Certificate expires" hint="We remind you 3 months before">
              <input className="as-input" type="date" value={cur.expires} disabled={!edit} onChange={(e) => up(cur.reg, { expires: e.target.value }, `${cur.reg}: certificate expiry ${e.target.value}`)} />
            </Field>
            <Field label="Notes for staff">
              <input className="as-input" value={cur.notes} disabled={!edit} onChange={(e) => setRows((rs) => rs.map((r) => (r.reg === cur.reg ? { ...r, notes: e.target.value } : r)))} />
            </Field>
          </div>
          <div className="as-checks as-checks--row">
            <label>
              <input type="checkbox" checked={cur.exclusive} disabled={!edit} onChange={(e) => up(cur.reg, { exclusive: e.target.checked }, `${cur.reg}: ${e.target.checked ? "in" : "out of"} Exclusive plates`)} />
              Show in Exclusive plates
            </label>
            <label>
              <input type="checkbox" checked={cur.newWeek} disabled={!edit} onChange={(e) => up(cur.reg, { newWeek: e.target.checked }, `${cur.reg}: ${e.target.checked ? "in" : "out of"} New this week`)} />
              Show in New this week
            </label>
          </div>
        </Card>
      )}
      <Card flush>
        <div className="as-tabs" role="tablist" aria-label="Filter">
          {(
            [
              ["all", "All"],
              ["regking", "REG KING stock"],
              ["customer", "Customer plates"],
              ["exclusive", "Exclusive"],
              ["reserved", "Reserved"],
              ["sold", "Sold"],
            ] as const
          ).map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {t}
            </button>
          ))}
        </div>
        <div className="as-searchrow">
          <input type="search" placeholder="Search registrations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search registrations" data-am-regsearch />
        </div>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Registration</th>
                <th scope="col">Whose</th>
                <th scope="col">Status</th>
                <th scope="col">Shown in</th>
                <th scope="col" className="is-num">Price</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.reg} className="is-click" onClick={() => setOpen(r.reg)} aria-selected={open === r.reg || undefined} data-am-reg={r.reg}>
                  <th scope="row">
                    <span className="ad-reg">{r.reg}</span>
                  </th>
                  <td className="as-muted">{r.source === "regking" ? "REG KING" : "Customer"}</td>
                  <td>
                    <span className="ad-tag" data-tone={REG_STATUS[r.status][1]}>
                      {REG_STATUS[r.status][0]}
                    </span>
                  </td>
                  <td className="as-muted">{[r.exclusive && "Exclusive", r.newWeek && "New this week"].filter(Boolean).join(", ")}</td>
                  <td className="is-num">{r.price === null ? "On request" : money(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length > shown.length && <p className="as-help as-help--pad">Showing {shown.length} of {list.length}. Search to find the rest.</p>}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calls booked at checkout                                             */
/* ------------------------------------------------------------------ */
type Call = { id: string; order: string; customer: string; reg: string; day: string; time: string; status: "booked" | "done" | "no-answer" | "moved"; note: string };
const CALLS: Call[] = [
  { id: "k1", order: "RK-1046", customer: "c1", reg: regkingStock[0].reg, day: "2026-11-03", time: "10:30", status: "booked", note: "Wants it on his BMW this month." },
  { id: "k2", order: "RK-1045", customer: "c2", reg: customerPlates[2].reg, day: "2026-11-03", time: "14:00", status: "booked", note: "" },
  { id: "k3", order: "RK-1038", customer: "c4", reg: customerPlates[6].reg, day: "2026-11-04", time: "11:00", status: "booked", note: "Gift for her brother." },
  { id: "k4", order: "RK-1036", customer: "c3", reg: regkingStock[5].reg, day: "2026-10-31", time: "16:30", status: "done", note: "V5C on its way." },
];
export function CallsPage({ role, record }: { role: Role; record: Rec }) {
  const [rows, setRows] = useState(CALLS);
  const [days, setDays] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false });
  const [hours, setHours] = useState({ from: "10:00", to: "17:00" });
  const byDay = useMemo(() => {
    const m = new Map<string, Call[]>();
    [...rows].sort((a, b) => (a.day + a.time < b.day + b.time ? -1 : 1)).forEach((c) => m.set(c.day, [...(m.get(c.day) ?? []), c]));
    return [...m.entries()];
  }, [rows]);
  const set = (c: Call, status: Call["status"], what: string) => {
    setRows((rs) => rs.map((x) => (x.id === c.id ? { ...x, status } : x)));
    record(what);
  };
  return (
    <div className="as-stack">
      <p className="as-lede">Calls customers booked at checkout to talk through their registration. Example bookings in this preview.</p>
      {byDay.map(([day, calls]) => (
        <Card key={day} title={new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + (day === "2026-11-03" ? " (tomorrow)" : "")}>
          <ul className="as-list">
            {calls.map((c) => {
              const cu = customerById(c.customer);
              return (
                <li key={c.id} data-off={c.status === "done" || undefined}>
                  <b className="am-time">{c.time}</b>
                  <div>
                    <b>
                      {cu.name} <span className="ad-reg">{c.reg}</span>
                    </b>
                    <small>
                      {cu.phone} · {c.order}
                      {c.note && ` · ${c.note}`}
                    </small>
                  </div>
                  <span className="ad-tag" data-tone={c.status === "done" ? "ok" : c.status === "booked" ? "info" : "wait"}>
                    {c.status === "booked" ? "Booked" : c.status === "done" ? "Done" : c.status === "no-answer" ? "No answer" : "Moved"}
                  </span>
                  {c.status !== "done" && can(role, "orders.update") && (
                    <div className="as-row as-row--tight">
                      <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => set(c, "done", `Call with ${cu.name} about ${c.reg}: done`)} data-am-calldone>
                        Done
                      </button>
                      <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => set(c, "no-answer", `Call with ${cu.name}: no answer, text sent`)}>
                        No answer
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      <Card title="When customers can book">
        <div className="as-checks as-checks--row">
          {(Object.keys(days) as (keyof typeof days)[]).map((d) => (
            <label key={d}>
              <input type="checkbox" checked={days[d]} onChange={(e) => (setDays({ ...days, [d]: e.target.checked }), record(`Calls ${e.target.checked ? "on" : "off"} on ${d}`))} />
              {d}
            </label>
          ))}
        </div>
        <div className="as-grid2">
          <Field label="First call">
            <input className="as-input" type="time" value={hours.from} step={1800} onChange={(e) => setHours({ ...hours, from: e.target.value })} />
          </Field>
          <Field label="Last call">
            <input className="as-input" type="time" value={hours.to} step={1800} onChange={(e) => setHours({ ...hours, to: e.target.value })} />
          </Field>
        </div>
        <p className="as-help">To confirm with REG KING: the checkout currently offers Monday to Saturday, 10:00 to 17:00.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DVLA transfers                                                       */
/* ------------------------------------------------------------------ */
const TSTEPS = ["Paperwork in", "Certificate checked", "Sent to the DVLA", "On the vehicle", "New V5C confirmed"];
type Transfer = { id: string; order: string; reg: string; buyer: string; vehicle: string; via: "V750" | "V778" | "Vehicle"; step: number; next: string; due: string };
const TRANSFERS: Transfer[] = [
  { id: "t1", order: "RK-1046", reg: regkingStock[0].reg, buyer: "c1", vehicle: "Example: BMW", via: "V750", step: 1, next: "Book the call, then assign online", due: "2026-11-09" },
  { id: "t2", order: "RK-1045", reg: customerPlates[2].reg, buyer: "c2", vehicle: "Example: Audi", via: "V778", step: 3, next: "Wait for the DVLA to post the new V5C", due: "2026-11-16" },
  { id: "t3", order: "RK-1038", reg: customerPlates[6].reg, buyer: "c4", vehicle: "On certificate", via: "Vehicle", step: 0, next: "Seller to send their V5C", due: "2026-11-06" },
];
export function TransfersPage({ role, record }: { role: Role; record: Rec }) {
  const [rows, setRows] = useState(TRANSFERS);
  return (
    <div className="as-stack">
      <p className="as-lede">Every registration being moved to its new owner, step by step, with what&apos;s needed next. Example transfers in this preview.</p>
      {rows.map((t) => (
        <Card key={t.id} title={`${t.reg} · ${customerById(t.buyer).name}`} action={<span className="as-muted">{t.order} · from {t.via === "Vehicle" ? "a vehicle" : t.via}</span>}>
          <ol className="am-steps">
            {TSTEPS.map((s, i) => (
              <li key={s} data-state={i < t.step ? "done" : i === t.step ? "now" : "later"}>
                {s}
              </li>
            ))}
          </ol>
          <div className="as-row" style={{ justifyContent: "space-between" }}>
            <span>
              <b>Next:</b> {t.next} <span className="as-muted">by {t.due.slice(8)}/{t.due.slice(5, 7)}</span>
            </span>
            {t.step < TSTEPS.length && can(role, "orders.update") && (
              <button
                type="button"
                className="as-btn as-btn--sm"
                onClick={() => {
                  setRows((rs) => rs.map((x) => (x.id === t.id ? { ...x, step: x.step + 1 } : x)));
                  record(`${t.reg}: ${TSTEPS[t.step]} done (customer emailed)`);
                }}
                data-am-tstep
              >
                Mark &quot;{TSTEPS[t.step]}&quot; done
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selling packages and requests                                        */
/* ------------------------------------------------------------------ */
export function SellingPage({ record }: { record: Rec }) {
  const [packs, setPacks] = useState([
    { key: "uplift", name: "Increased price sale", line: "REG KING adds its margin on top; the seller gets their asking price", fee: "", on: true },
    { key: "commission", name: "Commission based", line: "REG KING takes a percentage when it sells", fee: "10", on: true },
    { key: "brokerage", name: "Brokerage", line: "Sale already agreed; REG KING finalises it", fee: "", on: true },
  ]);
  return (
    <div className="as-stack">
      <p className="as-lede">The ways customers can sell through REG KING, and what each costs.</p>
      {packs.map((p, i) => (
        <Card key={p.key} title={p.name} action={<Toggle on={p.on} set={(v) => (setPacks(packs.map((x, j) => (j === i ? { ...x, on: v } : x))), record(`${v ? "Turned on" : "Turned off"} ${p.name}`))} label={`Offer ${p.name}`} />}>
          <p className="as-help">{p.line}</p>
          <Field label={p.key === "commission" ? "Commission (%)" : "Fee or margin"} hint={p.fee ? undefined : "To confirm with REG KING"}>
            <input className="as-input" value={p.fee} onChange={(e) => setPacks(packs.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} onBlur={() => record(`${p.name}: fee set to ${p.fee || "not set"}`)} />
          </Field>
        </Card>
      ))}
    </div>
  );
}

type Req = { id: string; kind: "Sourcing" | "Brokerage"; who: string; ask: string; budget: string; status: "new" | "searching" | "found" | "closed"; at: string };
const REQS: Req[] = [
  { id: "r1", kind: "Sourcing", who: "c1", ask: "Anything with DAN in it", budget: "£3,000", status: "searching", at: "2026-11-01" },
  { id: "r2", kind: "Brokerage", who: "c2", ask: `Sale agreed for ${customerPlates[10].reg}`, budget: "", status: "new", at: "2026-10-31" },
  { id: "r3", kind: "Sourcing", who: "c4", ask: "SOF 1A or close", budget: "£8,000", status: "new", at: "2026-10-29" },
];
export function RequestsPage({ record }: { record: Rec }) {
  const [rows, setRows] = useState(REQS);
  const label = { new: "New", searching: "Searching", found: "Found one", closed: "Closed" } as const;
  return (
    <div className="as-stack">
      <p className="as-lede">Plate sourcing (£9.99) and brokerage requests. Example requests in this preview.</p>
      <Card flush>
        <ul className="as-list as-list--pad">
          {rows.map((r) => (
            <li key={r.id}>
              <span className="ad-tag" data-tone="plain">
                {r.kind}
              </span>
              <div>
                <b>{r.ask}</b>
                <small>
                  {customerById(r.who).name}
                  {r.budget && ` · budget ${r.budget}`} · {r.at.slice(8)}/{r.at.slice(5, 7)}
                </small>
              </div>
              <select value={r.status} onChange={(e) => (setRows(rows.map((x) => (x.id === r.id ? { ...x, status: e.target.value as Req["status"] } : x))), record(`${r.kind} request: ${label[e.target.value as Req["status"]]}`))} aria-label="Status">
                {Object.entries(label).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Logo approvals                                                       */
/* ------------------------------------------------------------------ */
const LOGOS = [
  { id: "g1", who: "c3", file: "example-garage-logo.png", for: "Personalised surround (pair)", status: "waiting" as const, reason: "" },
  { id: "g2", who: "c4", file: "example-club-badge.svg", for: "4D acrylic logo plate", status: "waiting" as const, reason: "" },
];
export function ApprovalsPage({ record }: { record: Rec }) {
  const [rows, setRows] = useState<{ id: string; who: string; file: string; for: string; status: "waiting" | "approved" | "rejected"; reason: string }[]>(LOGOS);
  return (
    <div className="as-stack">
      <p className="as-lede">Customers&apos; own logos and artwork, checked before anything is made: is it clear enough, and are they allowed to use it? Example uploads in this preview.</p>
      {rows.map((g) => (
        <Card key={g.id} title={g.file} action={<Status s={g.status === "waiting" ? "needs-content" : g.status === "approved" ? "active" : "off"} />}>
          <p className="as-help">
            {customerById(g.who).name} · {g.for}
          </p>
          {g.status === "waiting" && (
            <div className="as-row">
              <button type="button" className="as-btn" onClick={() => (setRows(rows.map((x) => (x.id === g.id ? { ...x, status: "approved" } : x))), record(`Approved artwork ${g.file}`))} data-am-approve>
                Approve
              </button>
              <input className="as-input" placeholder="Reason, if you reject it" value={g.reason} onChange={(e) => setRows(rows.map((x) => (x.id === g.id ? { ...x, reason: e.target.value } : x)))} />
              <button type="button" className="as-btn as-btn--ghost" disabled={!g.reason.trim()} onClick={() => (setRows(rows.map((x) => (x.id === g.id ? { ...x, status: "rejected" } : x))), record(`Rejected artwork ${g.file}: ${g.reason}`))}>
                Reject and email them
              </button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trade accounts, abandoned baskets, email marketing                   */
/* ------------------------------------------------------------------ */
export function TradePage({ record }: { record: Rec }) {
  const [rows, setRows] = useState([
    { id: "w1", name: "Example: City Motors Ltd", contact: "07700 900201", town: "Birmingham", status: "applied" as "applied" | "approved" | "declined", since: "2026-11-01" },
    { id: "w2", name: "Example: AutoStyle Wolverhampton", contact: "07700 900202", town: "Wolverhampton", status: "approved" as "applied" | "approved" | "declined", since: "2025-08-12" },
  ]);
  return (
    <div className="as-stack">
      <p className="as-lede">Garages and dealers who buy at trade prices. Approved accounts see trade prices when signed in. Example accounts in this preview.</p>
      <Card flush>
        <ul className="as-list as-list--pad">
          {rows.map((r) => (
            <li key={r.id}>
              <div>
                <b>{r.name}</b>
                <small>
                  {r.town} · {r.contact}
                </small>
              </div>
              <span className="ad-tag" data-tone={r.status === "approved" ? "ok" : r.status === "applied" ? "wait" : "plain"}>
                {r.status === "approved" ? "Trade prices on" : r.status === "applied" ? "Applied" : "Declined"}
              </span>
              {r.status === "applied" && (
                <div className="as-row as-row--tight">
                  <button type="button" className="as-btn as-btn--sm" onClick={() => (setRows(rows.map((x) => (x.id === r.id ? { ...x, status: "approved" } : x))), record(`Approved trade account: ${r.name}`))} data-am-trade>
                    Approve
                  </button>
                  <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => (setRows(rows.map((x) => (x.id === r.id ? { ...x, status: "declined" } : x))), record(`Declined trade account: ${r.name}`))}>
                    Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <p className="as-help">Trade prices for each style are set in Products → Plate styles.</p>
    </div>
  );
}

export function AbandonedPage({ record }: { record: Rec }) {
  const [rows, setRows] = useState([
    { id: "b1", who: "c3", what: `${regkingStock[3].reg} with 3D Gel plates`, value: regkingStock[3].price, at: "2026-11-02 08:12", step: "Payment", sent: false },
    { id: "b2", who: "c5", what: "Retro set and UK badge", value: 80, at: "2026-11-01 21:40", step: "Delivery", sent: false },
    { id: "b3", who: "c1", what: "Plate surrounds (pair)", value: 0, at: "2026-10-30 18:05", step: "Your details", sent: true },
  ]);
  return (
    <div className="as-stack">
      <p className="as-lede">People who started checkout but didn&apos;t pay. Send a friendly reminder, or call if they booked a time. Example baskets in this preview.</p>
      <Card flush>
        <ul className="as-list as-list--pad">
          {rows.map((r) => (
            <li key={r.id}>
              <div>
                <b>{r.what}</b>
                <small>
                  {customerById(r.who).name} · stopped at {r.step} · {r.at.slice(8, 10)}/{r.at.slice(5, 7)} {r.at.slice(11)}
                </small>
              </div>
              <em className="as-muted">{r.value ? money(r.value) : "Price to confirm"}</em>
              {r.sent ? (
                <span className="ad-tag" data-tone="ok">
                  Reminder sent
                </span>
              ) : (
                <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => (setRows(rows.map((x) => (x.id === r.id ? { ...x, sent: true } : x))), record(`Sent a basket reminder to ${customerById(r.who).name}`))} data-am-remind>
                  Send reminder
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function EmailPage({ record }: { record: Rec }) {
  const [autos, setAutos] = useState([
    { key: "basket", name: "Basket reminder", line: "An hour after someone leaves checkout", on: true },
    { key: "review", name: "Ask for a review", line: "A week after plates are delivered or a transfer completes", on: true },
    { key: "expiry", name: "Certificate expiry reminder", line: "To customers whose V750 or V778 is due to run out", on: true },
    { key: "price", name: "Price drop", line: "When a plate someone saved goes down in price", on: false },
    { key: "birthday", name: "New plates like yours", line: "When we add plates matching what someone searched for", on: false },
  ]);
  return (
    <div className="as-stack">
      <div className="am-tiles">
        <div>
          <span>Subscribers</span>
          <b>0</b>
        </div>
        <div>
          <span>Campaigns sent</span>
          <b>0</b>
        </div>
        <div>
          <span>Email sending</span>
          <b className="am-small">Not connected</b>
        </div>
      </div>
      <Card title="Automatic emails">
        <ul className="as-list">
          {autos.map((a, i) => (
            <li key={a.key}>
              <div>
                <b>{a.name}</b>
                <small>{a.line}</small>
              </div>
              <Toggle on={a.on} set={(v) => (setAutos(autos.map((x, j) => (j === i ? { ...x, on: v } : x))), record(`${v ? "Turned on" : "Turned off"} ${a.name}`))} label={a.name} />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Campaigns">
        <p className="as-help">Write and send an email to everyone who agreed to hear from you, such as new stock or a sale. Only people who ticked to receive marketing get these.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Site content: FAQs, team, reviews                                    */
/* ------------------------------------------------------------------ */
export function ContentPage({ record }: { record: Rec }) {
  const [tab, setTab] = useState<FaqTab>("buy");
  const [faqs, setFaqs] = useState(() => Object.fromEntries(Object.entries(FAQS).map(([k, v]) => [k, v.items.map((x) => ({ ...x }))])) as Record<FaqTab, { q: string; a: string }[]>);
  const [team, setTeam] = useState(() => TEAM.map((t) => ({ ...t })));
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="as-stack">
      <Card title="FAQs" flush>
        <div className="as-tabs" role="tablist" aria-label="FAQ section">
          {(Object.keys(FAQS) as FaqTab[]).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => (setTab(k), setOpen(null))}>
              {FAQS[k].label}
              <i>{faqs[k].length}</i>
            </button>
          ))}
        </div>
        <ul className="as-list as-list--pad">
          {faqs[tab].map((f, i) => (
            <li key={i}>
              {open === i ? (
                <div className="as-stack as-stack--tight" style={{ flex: 1 }}>
                  <input className="as-input" value={f.q} onChange={(e) => setFaqs({ ...faqs, [tab]: faqs[tab].map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} aria-label="Question" />
                  <textarea className="as-input" rows={4} value={f.a} onChange={(e) => setFaqs({ ...faqs, [tab]: faqs[tab].map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} aria-label="Answer" />
                  <div className="as-row">
                    <button type="button" className="as-btn as-btn--sm" onClick={() => (setOpen(null), record(`Edited the FAQ "${f.q}"`))}>
                      Done
                    </button>
                    <button type="button" className="as-btn as-btn--danger as-btn--sm" onClick={() => (setFaqs({ ...faqs, [tab]: faqs[tab].filter((_, j) => j !== i) }), setOpen(null), record(`Removed the FAQ "${f.q}"`))}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <b>{f.q}</b>
                  </div>
                  <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => setOpen(i)}>
                    Edit
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="as-help--pad">
          <button type="button" className="as-btn as-btn--ghost" onClick={() => (setFaqs({ ...faqs, [tab]: [...faqs[tab], { q: "New question", a: "" }] }), setOpen(faqs[tab].length))}>
            Add a question
          </button>
        </div>
      </Card>
      <Card title="The team (About us)">
        <ul className="as-list">
          {team.map((t, i) => (
            <li key={t.name}>
              <span className="ad-reg">{t.plate}</span>
              <input className="as-input as-input--flat" value={t.role} aria-label={`${t.name}'s role`} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} onBlur={() => record(`Updated ${t.name} on About us`)} />
              <input className="as-input as-input--flat" value={t.line} aria-label={`${t.name}'s line`} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, line: e.target.value } : x)))} />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Reviews">
        <ul className="as-list">
          {["Trustpilot", "Google reviews"].map((n) => (
            <li key={n}>
              <div>
                <b>{n}</b>
                <small>Pick which real reviews show on the website, and reply to them</small>
              </div>
              <Status s="not-connected" />
            </li>
          ))}
        </ul>
        <p className="as-help">The website only ever shows real reviews from these feeds.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workshop materials                                                   */
/* ------------------------------------------------------------------ */
export function MaterialsPage({ record }: { record: Rec }) {
  const [rows, setRows] = useState([
    { name: "Standard plate blanks (white)", unit: "sheets", qty: 0, low: 50 },
    { name: "Standard plate blanks (yellow)", unit: "sheets", qty: 0, low: 50 },
    { name: "3MM black acrylic (4D)", unit: "sheets", qty: 0, low: 10 },
    { name: "6MM black acrylic (4D)", unit: "sheets", qty: 0, low: 10 },
    { name: "Gel resin", unit: "litres", qty: 0, low: 5 },
    { name: "Printer ink and vinyl", unit: "rolls", qty: 0, low: 3 },
    { name: "Sticky pads", unit: "packs", qty: 0, low: 20 },
    { name: "Screw kits", unit: "kits", qty: 0, low: 20 },
  ]);
  return (
    <div className="as-stack">
      <p className="as-lede">What the workshop has in stock to make plates, with a warning when something runs low. Counts start at zero: fill in the real numbers.</p>
      <Card flush>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col" className="is-num">In stock</th>
                <th scope="col" className="is-num">Warn below</th>
                <th scope="col">
                  <span className="rk-visually-hidden">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={m.name}>
                  <th scope="row">{m.name}</th>
                  <td className="is-num">
                    <label className="as-unit">
                      <span className="rk-visually-hidden">{m.name} in stock</span>
                      <input inputMode="numeric" value={m.qty} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} onBlur={() => record(`${m.name}: ${m.qty} ${m.unit}`)} />
                      <i>{m.unit}</i>
                    </label>
                  </td>
                  <td className="is-num">
                    <label className="as-unit">
                      <span className="rk-visually-hidden">Warn below for {m.name}</span>
                      <input inputMode="numeric" value={m.low} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, low: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} />
                    </label>
                  </td>
                  <td>
                    <span className="ad-tag" data-tone={m.qty > m.low ? "ok" : "wait"}>
                      {m.qty > m.low ? "OK" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Returns and refunds                                                  */
/* ------------------------------------------------------------------ */
export function ReturnsPage({ orders, record }: { orders: AdminOrder[]; record: Rec }) {
  const [rows, setRows] = useState<{ id: string; order: string; why: string; amount: number; status: "open" | "refunded" | "refused" }[]>([]);
  const [d, setD] = useState({ order: orders[0]?.ref ?? "", why: "", amount: "" });
  return (
    <div className="as-stack">
      <p className="as-lede">Returns, refunds and payment disputes in one place. Made-to-order plates and deposits follow your refund policy.</p>
      <Card title="Start a return or refund">
        <form
          className="as-row"
          onSubmit={(e) => {
            e.preventDefault();
            const amount = Number(d.amount);
            if (!d.why.trim() || !(amount > 0)) return;
            setRows([{ id: uid(), order: d.order, why: d.why.trim(), amount, status: "open" }, ...rows]);
            record(`Return opened on ${d.order}: ${d.why.trim()}`);
            setD({ ...d, why: "", amount: "" });
          }}
        >
          <select value={d.order} onChange={(e) => setD({ ...d, order: e.target.value })} aria-label="Order">
            {orders.map((o) => (
              <option key={o.id} value={o.ref}>
                {o.ref}
              </option>
            ))}
          </select>
          <input className="as-input" placeholder="Reason" value={d.why} onChange={(e) => setD({ ...d, why: e.target.value })} aria-label="Reason" />
          <input className="as-input" placeholder="Amount (£)" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value.replace(/[^0-9.]/g, "") })} aria-label="Amount" />
          <button type="submit" className="as-btn">
            Open
          </button>
        </form>
      </Card>
      <Card title="Returns and refunds" flush>
        {rows.length ? (
          <ul className="as-list as-list--pad">
            {rows.map((r) => (
              <li key={r.id}>
                <div>
                  <b>
                    {r.order} · {money(r.amount)}
                  </b>
                  <small>{r.why}</small>
                </div>
                <span className="ad-tag" data-tone={r.status === "refunded" ? "ok" : r.status === "open" ? "wait" : "plain"}>
                  {r.status === "open" ? "Open" : r.status === "refunded" ? "Refunded" : "Refused"}
                </span>
                {r.status === "open" && (
                  <div className="as-row as-row--tight">
                    <button type="button" className="as-btn as-btn--sm" onClick={() => (setRows(rows.map((x) => (x.id === r.id ? { ...x, status: "refunded" } : x))), record(`Refunded ${money(r.amount)} on ${r.order}`))}>
                      Refund
                    </button>
                    <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => (setRows(rows.map((x) => (x.id === r.id ? { ...x, status: "refused" } : x))), record(`Refused the return on ${r.order}`))}>
                      Refuse
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="as-empty">No returns or refunds.</p>
        )}
      </Card>
      <Card title="Payment disputes (chargebacks)">
        <p className="as-help">When a customer disputes a payment with their bank, it shows here with the deadline to reply and the evidence to send: the order, the signed terms, the DVLA paperwork and the call notes.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Road legal plate records (registered number plate supplier)          */
/* ------------------------------------------------------------------ */
export function RecordsPage() {
  const [rnps, setRnps] = useState("");
  const legal = JOBS.filter((j) => j.legal);
  return (
    <div className="as-stack">
      <p className="as-lede">The record book for road legal plates. Registered number plate suppliers must keep a record of each road legal plate they sell, with the customer&apos;s documents, and keep it for three years.</p>
      <Card title="Your supplier registration">
        <Field label="DVLA registered number plate supplier number" hint="To confirm with REG KING">
          <input className="as-input" value={rnps} onChange={(e) => setRnps(e.target.value)} />
        </Field>
      </Card>
      <Card title="Record book" flush>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Registration</th>
                <th scope="col">Order</th>
                <th scope="col">Plates</th>
                <th scope="col">Documents</th>
                <th scope="col">Keep until</th>
              </tr>
            </thead>
            <tbody>
              {legal.map((j) => (
                <tr key={j.id}>
                  <th scope="row">
                    <span className="ad-reg">{j.reg}</span>
                  </th>
                  <td>{j.order}</td>
                  <td className="as-muted">{j.spec}</td>
                  <td>
                    <span className="ad-tag" data-tone={j.status === "waiting-docs" ? "wait" : "ok"}>
                      {j.status === "waiting-docs" ? "Waiting" : "ID and proof seen"}
                    </span>
                  </td>
                  <td>{`${Number(j.due.slice(0, 4)) + 3}${j.due.slice(4)}`.split("-").reverse().join("/")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Privacy, website health, reports                                     */
/* ------------------------------------------------------------------ */
export function PrivacyPage({ record }: { record: Rec }) {
  const [rows, setRows] = useState([{ id: "y1", who: "c3", kind: "Copy of my data", at: "2026-11-01", done: false }]);
  return (
    <div className="as-stack">
      <p className="as-lede">Requests from customers to see, correct or delete their data. You have one month to answer each one. Example request in this preview.</p>
      <Card flush>
        <ul className="as-list as-list--pad">
          {rows.map((r) => (
            <li key={r.id}>
              <div>
                <b>{r.kind}</b>
                <small>
                  {customerById(r.who).name} · asked {r.at.slice(8)}/{r.at.slice(5, 7)} · answer by 01/12
                </small>
              </div>
              {r.done ? (
                <span className="ad-tag" data-tone="ok">
                  Done
                </span>
              ) : (
                <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => (setRows(rows.map((x) => (x.id === r.id ? { ...x, done: true } : x))), record(`Answered a privacy request from ${customerById(r.who).name}`))}>
                  Mark done
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Cookies">
        <p className="as-help">Analytics and live view only count visitors who accept analytics cookies. The share who accept shows here once analytics is connected.</p>
      </Card>
    </div>
  );
}

export function HealthPage() {
  const checks: [string, string, string][] = [
    ["Website up", "Checked every minute; you get a text if it goes down", "not-connected"],
    ["Speed", "How fast the homepage and plate pages load on a phone", "not-connected"],
    ["Broken links and missing pages", "Pages people tried to open that don't exist (redirect them in SEO)", "not-connected"],
    ["Errors", "Anything that went wrong for a customer, such as a failed payment screen", "not-connected"],
    ["Backups", "Daily copy of orders, customers and stock", "not-connected"],
    ["Security", "Staff two-step sign-in, failed sign-ins, keys kept on the server", "confirm"],
  ];
  return (
    <div className="as-stack">
      <p className="as-lede">Is the website working well? These connect when the site goes live.</p>
      <Card flush>
        <ul className="as-list as-list--pad">
          {checks.map(([n, l, s]) => (
            <li key={n}>
              <div>
                <b>{n}</b>
                <small>{l}</small>
              </div>
              <Status s={s} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function ReportsPage() {
  const reports: [string, string][] = [
    ["Sales", "By day, week or month, with deposits and balances"],
    ["VAT", "For your VAT return (once VAT registration is confirmed)"],
    ["Profit by registration", "Sale price against what you paid"],
    ["Seller payouts and commission", "What you owe sellers and what you earned"],
    ["DVLA purchases", "Every plate bought from the DVLA, with fees"],
    ["Road legal plate records", "The supplier record book, for an inspection"],
    ["Customers", "Everyone who has an account or ordered"],
    ["Stock", "All registrations with price and status"],
  ];
  return (
    <div className="as-stack">
      <p className="as-lede">Reports for you and your accountant. On the live site each downloads as a spreadsheet.</p>
      <Card flush>
        <ul className="as-list as-list--pad">
          {reports.map(([n, l]) => (
            <li key={n}>
              <div>
                <b>{n}</b>
                <small>{l}</small>
              </div>
              <button type="button" className="as-btn as-btn--ghost as-btn--sm" disabled title="Downloads work on the live site">
                Download
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team tasks                                                           */
/* ------------------------------------------------------------------ */
export function TasksPage({ record }: { record: Rec }) {
  const names = TEAM.map((t) => t.name);
  const [rows, setRows] = useState([
    { id: "x1", what: "Photograph the new stock for the website", who: names[1] ?? "", due: "2026-11-04", done: false },
    { id: "x2", what: "Chase the V5C for the customer plate transfer", who: names[2] ?? "", due: "2026-11-03", done: false },
  ]);
  const [d, setD] = useState({ what: "", who: names[0] ?? "", due: "" });
  return (
    <div className="as-stack">
      <p className="as-lede">The team&apos;s to-do list. Example tasks in this preview.</p>
      <Card>
        <form
          className="as-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!d.what.trim()) return;
            setRows([{ id: uid(), what: d.what.trim(), who: d.who, due: d.due, done: false }, ...rows]);
            record(`Task for ${d.who}: ${d.what.trim()}`);
            setD({ ...d, what: "" });
          }}
        >
          <input className="as-input" placeholder="What needs doing" value={d.what} onChange={(e) => setD({ ...d, what: e.target.value })} aria-label="Task" data-am-task />
          <select value={d.who} onChange={(e) => setD({ ...d, who: e.target.value })} aria-label="Who">
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <input className="as-input" type="date" value={d.due} onChange={(e) => setD({ ...d, due: e.target.value })} aria-label="Due" style={{ flex: "0 1 160px" }} />
          <button type="submit" className="as-btn">
            Add
          </button>
        </form>
        <ul className="as-list">
          {rows.map((r) => (
            <li key={r.id} data-off={r.done || undefined}>
              <label className="as-inlinecheck">
                <input type="checkbox" checked={r.done} onChange={(e) => (setRows(rows.map((x) => (x.id === r.id ? { ...x, done: e.target.checked } : x))), e.target.checked && record(`Done: ${r.what}`))} />
                <span className={r.done ? "am-done" : undefined}>{r.what}</span>
              </label>
              <small className="as-muted">
                {r.who}
                {r.due && ` · ${r.due.slice(8)}/${r.due.slice(5, 7)}`}
              </small>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications (the bell)                                             */
/* ------------------------------------------------------------------ */
export function Bell({ items, open }: { items: { tab: AdminTab; text: string }[]; open: (t: AdminTab) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="am-bell">
      <button type="button" className="am-bell__btn" aria-expanded={shown} aria-label={`Notifications: ${items.length}`} onClick={() => setShown(!shown)} data-am-bell>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
        </svg>
        {items.length > 0 && <i>{items.length}</i>}
      </button>
      {shown && (
        <div className="am-bell__list" role="dialog" aria-label="Notifications">
          <b>Notifications</b>
          {items.length ? (
            <ul>
              {items.map((n, i) => (
                <li key={i}>
                  <button type="button" onClick={() => (open(n.tab), setShown(false))}>
                    {n.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing waiting.</p>
          )}
        </div>
      )}
    </div>
  );
}

