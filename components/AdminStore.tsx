"use client";

/**
 * The Shopify-style half of the admin portal: products (plate styles, extras, sizes, accessories,
 * categories), discounts, analytics, the online store (homepage, menus, pages, photos, SEO) and the
 * store settings.
 *
 * PREVIEW: everything starts from what the website uses today (lib/builder.ts, lib/accessoryShop.ts,
 * lib/filters.ts, lib/sitemap.ts and so on). Changes are kept on this page only, until it's closed.
 * On the live site each save goes to the database and the website reads it from there, so a price
 * changed here is the price in the builder straight away. Anything marked CONFIRM is a decision for
 * REG KING, not a fact.
 */
import { useMemo, useState, type ReactNode } from "react";
import { DEPOSIT_RATE, MEMBER_DISCOUNT, formatGBP, payl8rDisclaimer, slogan, supportEmail } from "@/lib/brand";
import { BIKE_STYLES, CAR_LEGAL, CAR_SHOW, EXTRAS, OWN_STOCK_DISCOUNT, SIZE_CHARGES, STYLES, TRADE_EXTRAS, TRADE_STYLES } from "@/lib/builder";
import { ACC_PRODUCTS } from "@/lib/accessoryShop";
import { ACCESSORY_PRICES } from "@/lib/accessories";
import { CAT_GROUPS, CATEGORIES } from "@/lib/filters";
import { SITEMAP } from "@/lib/sitemap";
import { GALLERY } from "@/lib/gallery";
import { HQ, PROVIDERS, phone, whatsapp } from "@/lib/infoContent";
import { DVLA_FEE_RATE } from "@/lib/dvlaPricing";
import { can, type AdminOrder, type Role } from "@/lib/admin";
import { DELIVERY, FREE_STANDARD_OVER } from "@/lib/checkoutRules";

const money = (n: number) => formatGBP(n, Number.isInteger(n));
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
const num = (v: string): number | null => (v.trim() === "" ? null : Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null);
const priceText = (n: number | null) => (n === null ? "On request" : money(n));

/* ------------------------------------------------------------------ */
/* The store's editable state, starting from what the site uses now     */
/* ------------------------------------------------------------------ */
export type StyleRow = {
  name: string;
  status: "active" | "draft";
  legal: boolean;
  show: boolean;
  bike: boolean;
  set: number | null;
  single: number | null;
  tradeSet: number | null;
  tradeSingle: number | null;
  description: string;
};
export type ExtraRow = { name: string; set: number | null; single: number | null; tradeSet: number | null; tradeSingle: number | null; status: "active" | "draft" };
export type SizeRow = { name: string; set: number | null; single: number | null; tradeSet: number | null; tradeSingle: number | null };
export type AccRow = { key: string; name: string; cat: string; line: string; price: number | null; status: "active" | "soon" | "draft"; from: boolean };
export type CatRow = { key: string; label: string; line: string; visible: boolean; subs: { key: string; label: string; words: string[]; visible: boolean }[] };
export type Discount = {
  id: string;
  code: string;
  kind: "percent" | "amount" | "delivery";
  value: number;
  appliesTo: "order" | "made" | "registrations" | "accessories";
  minSpend: number | null;
  starts: string;
  ends: string;
  limit: number | null;
  oncePer: boolean;
  used: number;
  on: boolean;
};
export type AutoRule = { key: string; name: string; line: string; value: number; unit: "%" | "£"; on: boolean };
export type HomeSection = { key: string; tab: "Buy" | "Sell" | "Make"; name: string; visible: boolean };
export type MenuItem = { id: string; label: string; link: string; visible: boolean; children: { id: string; label: string; link: string; visible: boolean }[] };
export type PageRow = { key: string; title: string; handle: string; status: "published" | "hidden" | "needs-content"; body: string; seoTitle: string; seoDesc: string; note?: string };
export type MediaRow = { id: string; src: string; alt: string; where: string };
export type Redirect = { id: string; from: string; to: string };

const id = () => Math.random().toString(36).slice(2, 9);

function initialState() {
  const styles: StyleRow[] = Object.values(STYLES).map((s) => ({
    name: s.name,
    status: "active",
    legal: CAR_LEGAL.includes(s.name),
    show: CAR_SHOW.includes(s.name),
    bike: BIKE_STYLES.includes(s.name),
    set: s.set,
    single: s.single,
    tradeSet: TRADE_STYLES[s.name]?.set ?? null,
    tradeSingle: TRADE_STYLES[s.name]?.single ?? null,
    description: "",
  }));
  const extras: ExtraRow[] = EXTRAS.map((e) => ({ name: e.name, set: e.set, single: e.single, tradeSet: TRADE_EXTRAS[e.name]?.set ?? null, tradeSingle: TRADE_EXTRAS[e.name]?.single ?? null, status: "active" }));
  const sizes: SizeRow[] = Object.entries(SIZE_CHARGES).map(([name, c]) => ({ name, set: c.retail.set, single: c.retail.single, tradeSet: c.trade.set, tradeSingle: c.trade.single }));
  const acc: AccRow[] = ACC_PRODUCTS.map((a) => ({
    key: a.key,
    name: a.name,
    cat: a.cat === "customisation" ? "Customisation" : a.cat === "fixings" ? "Fitting & fixings" : "Mounting",
    line: a.line,
    price: a.key === "surrounds" ? ACCESSORY_PRICES.customSurround : a.key === "logo" ? ACCESSORY_PRICES.acrylicLogoPlate : a.price,
    status: a.soon ? "soon" : "active",
    from: a.key === "surrounds" || a.key === "logo",
  }));
  const cats: CatRow[] = CAT_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    line: g.line,
    visible: true,
    subs: g.subs.map((k) => {
      const c = CATEGORIES.find((x) => x.key === k);
      return { key: k, label: c?.label ?? k, words: [...(c?.words ?? [])], visible: true };
    }),
  }));
  const auto: AutoRule[] = [
    { key: "own-stock", name: "Plates with REG KING's own registrations", line: "Off a plate style that isn't included with the registration", value: Math.round(OWN_STOCK_DISCOUNT * 100), unit: "%", on: true },
    { key: "account", name: "Account holder discount", line: "Off made plates, surrounds and logo plates", value: Math.round(MEMBER_DISCOUNT * 100), unit: "%", on: true },
    { key: "free-delivery", name: "Free standard delivery", line: "On orders over this amount", value: FREE_STANDARD_OVER, unit: "£", on: true },
  ];
  const home: HomeSection[] = [
    { key: "quick", tab: "Buy", name: "Quick links", visible: true },
    { key: "new", tab: "Buy", name: "New this week", visible: true },
    { key: "guide", tab: "Buy", name: "Buying guide", visible: true },
    { key: "seen", tab: "Buy", name: "As seen with", visible: true },
    { key: "value", tab: "Sell", name: "Value your plate", visible: true },
    { key: "sell-steps", tab: "Sell", name: "How selling works", visible: true },
    { key: "made", tab: "Make", name: "Made in house", visible: true },
    { key: "make-info", tab: "Make", name: "About our plates", visible: true },
  ];
  const menu: MenuItem[] = SITEMAP.map((s) => ({
    id: s.key,
    label: s.label,
    link: `#${s.hash}`,
    visible: true,
    children: s.items.map((i) => ({ id: `${s.key}-${i.key}`, label: i.label, link: `#${i.hash}`, visible: true })),
  }));
  const pages: PageRow[] = [
    { key: "privacy", title: "Privacy policy", handle: "privacy-policy", status: "needs-content", body: "", seoTitle: "", seoDesc: "", note: "Comes from the policy set in Shopify. Must be live before launch." },
    { key: "terms", title: "Terms and conditions", handle: "terms-of-service", status: "needs-content", body: "", seoTitle: "", seoDesc: "", note: "Comes from the policy set in Shopify. Must be live before launch." },
    { key: "refunds", title: "Refund policy", handle: "refund-policy", status: "needs-content", body: "", seoTitle: "", seoDesc: "", note: "CONFIRM: REG KING's refund terms, including deposits." },
    { key: "shipping", title: "Delivery policy", handle: "shipping-policy", status: "needs-content", body: "", seoTitle: "", seoDesc: "", note: "CONFIRM: the current one on Shopify is from 2021." },
    { key: "deposits", title: "Deposits", handle: "info-deposits", status: "published", body: "", seoTitle: "", seoDesc: "" },
    { key: "finance", title: "Finance", handle: "info-finance", status: "published", body: "", seoTitle: "", seoDesc: "" },
    { key: "faqs", title: "FAQs", handle: "info-faqs", status: "published", body: "", seoTitle: "", seoDesc: "" },
    { key: "gallery", title: "Gallery", handle: "info-gallery", status: "published", body: "", seoTitle: "", seoDesc: "" },
    { key: "about", title: "About us", handle: "info-about", status: "published", body: "", seoTitle: "", seoDesc: "" },
    { key: "contact", title: "Contact", handle: "info-contact", status: "published", body: "", seoTitle: "", seoDesc: "" },
  ];
  const media: MediaRow[] = [
    ...Object.values(GALLERY).flatMap((g) => g.photos.filter((p) => p.src).map((p) => ({ id: p.src as string, src: p.src as string, alt: p.alt, where: `Gallery: ${g.label}` }))),
    ...ACC_PRODUCTS.filter((a) => a.photo).map((a) => ({ id: `acc-${a.key}`, src: a.photo as string, alt: a.name, where: `Accessories: ${a.name}` })),
  ];
  return {
    styles,
    extras,
    sizes,
    acc,
    cats,
    discounts: [] as Discount[],
    auto,
    deposit: Math.round(DEPOSIT_RATE * 100),
    dvlaFee: Math.round(DVLA_FEE_RATE * 100),
    announcement: { on: false, text: "", link: "" },
    hero: { heading: slogan, sub: "" },
    home,
    menu,
    pages,
    media,
    seo: { title: "", desc: "" },
    redirects: [] as Redirect[],
    delivery: DELIVERY.map((d) => ({ key: d.key as string, name: d.name as string, line: d.line as string, price: d.price as number, on: true })),
    general: { name: "REG KING", email: supportEmail, phone: phone.display, whatsapp: whatsapp.display, address: HQ.lines.join(", "), hours: "" },
    tax: { registered: "confirm" as "yes" | "no" | "confirm", number: "", inclusive: true },
    balanceDays: "",
  };
}
export type Store = ReturnType<typeof initialState>;

export function useStoreState() {
  const [st, setSt] = useState<Store>(initialState);
  const patch = (p: Partial<Store>) => setSt((s) => ({ ...s, ...p }));
  return { st, patch };
}
type P = { st: Store; patch: (p: Partial<Store>) => void; role: Role; record: (what: string) => void };

/* ------------------------------------------------------------------ */
/* Small parts                                                          */
/* ------------------------------------------------------------------ */
export function Card({ title, action, children, flush }: { title?: string; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={`as-card${flush ? " as-card--flush" : ""}`}>
      {(title || action) && (
        <header className="as-card__h">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="as-switch" onClick={() => set(!on)}>
      <i />
    </button>
  );
}
export function Status({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    active: ["ok", "Active"],
    published: ["ok", "Published"],
    draft: ["plain", "Draft"],
    hidden: ["plain", "Hidden"],
    soon: ["info", "Coming soon"],
    "needs-content": ["wait", "Needs content"],
    scheduled: ["info", "Scheduled"],
    expired: ["plain", "Expired"],
    off: ["plain", "Off"],
    "not-connected": ["wait", "Not connected"],
    confirm: ["wait", "To confirm"],
  };
  const [tone, text] = map[s] ?? ["plain", s];
  return (
    <span className="ad-tag" data-tone={tone}>
      {text}
    </span>
  );
}
export function PriceIn({ value, set, label, disabled }: { value: number | null; set: (n: number | null) => void; label: string; disabled?: boolean }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <label className="as-money">
      <span className="rk-visually-hidden">{label}</span>
      <i aria-hidden>£</i>
      <input
        inputMode="decimal"
        value={text}
        placeholder="On request"
        disabled={disabled}
        onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={() => {
          const n = num(text);
          if (n !== value) set(n);
          setText(n === null ? "" : String(n));
        }}
      />
    </label>
  );
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="as-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function ReadOnly({ what }: { what: string }) {
  return <p className="as-ro">You can see {what}, but your role can&apos;t change it.</p>;
}
export function SavedBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null;
  return (
    <div className="as-savebar" role="region" aria-label="Unsaved changes">
      <span>Unsaved changes</span>
      <div>
        <button type="button" className="as-btn as-btn--ghost" onClick={onDiscard}>
          Discard
        </button>
        <button type="button" className="as-btn" onClick={onSave} data-as-save>
          Save
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Products: plate styles, extras and size charges                      */
/* ------------------------------------------------------------------ */
export function ProductsPage({ st, patch, role, record }: P) {
  const editPrices = can(role, "prices.edit");
  const editItems = can(role, "plates.edit");
  const [filter, setFilter] = useState<"all" | "legal" | "show" | "bike" | "draft">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = st.styles.filter(
    (s) =>
      (filter === "all" || (filter === "draft" ? s.status === "draft" : filter === "legal" ? s.legal : filter === "show" ? s.show && !s.legal : s.bike)) &&
      s.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const editing = st.styles.find((s) => s.name === open) ?? null;
  const setStyle = (name: string, p: Partial<StyleRow>, what: string) => {
    patch({ styles: st.styles.map((s) => (s.name === name ? { ...s, ...p } : s)) });
    record(what);
  };
  const tabs: [typeof filter, string, number][] = [
    ["all", "All", st.styles.length],
    ["legal", "Road legal", st.styles.filter((s) => s.legal).length],
    ["show", "Show only", st.styles.filter((s) => s.show && !s.legal).length],
    ["bike", "Motorbike", st.styles.filter((s) => s.bike).length],
    ["draft", "Drafts", st.styles.filter((s) => s.status === "draft").length],
  ];
  return (
    <div className="as-stack">
      <div className="as-pagehead">
        <p className="as-lede">The plate styles customers can choose in the builder, with their prices. Draft styles are hidden from the website.</p>
      </div>
      <Card flush>
        <div className="as-tabs" role="tablist" aria-label="Filter styles">
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} data-as-filter={k}>
              {label}
              <i>{n}</i>
            </button>
          ))}
        </div>
        <div className="as-searchrow">
          <input type="search" placeholder="Search styles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search styles" />
        </div>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Style</th>
                <th scope="col">Status</th>
                <th scope="col">Sold as</th>
                <th scope="col" className="is-num">Set</th>
                <th scope="col" className="is-num">Single</th>
                <th scope="col" className="is-num">Trade set</th>
                <th scope="col" className="is-num">Trade single</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.name} className="is-click" onClick={() => setOpen(s.name)} aria-selected={open === s.name || undefined} data-as-style={s.name}>
                  <td>
                    <button type="button" className="as-rowlink" onClick={(e) => (e.stopPropagation(), setOpen(s.name))}>
                      {s.name}
                    </button>
                  </td>
                  <td>
                    <Status s={s.status} />
                  </td>
                  <td className="as-muted">{[s.legal && "Road legal", s.show && "Show", s.bike && "Motorbike"].filter(Boolean).join(", ") || "Not offered"}</td>
                  <td className="is-num">{priceText(s.set)}</td>
                  <td className="is-num">{priceText(s.single)}</td>
                  <td className="is-num">{priceText(s.tradeSet)}</td>
                  <td className="is-num">{priceText(s.tradeSingle)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="as-empty">
                    No styles match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <StyleEditor
          key={editing.name}
          s={editing}
          editPrices={editPrices}
          editItems={editItems}
          close={() => setOpen(null)}
          save={(p) => {
            setStyle(editing.name, p, `Updated the ${editing.name} plate style`);
            setOpen(null);
          }}
        />
      )}

      <Card title="Extras">
        {!editPrices && <ReadOnly what="extras" />}
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Extra</th>
                <th scope="col">On the website</th>
                <th scope="col" className="is-num">Set</th>
                <th scope="col" className="is-num">Single</th>
                <th scope="col" className="is-num">Trade set</th>
                <th scope="col" className="is-num">Trade single</th>
              </tr>
            </thead>
            <tbody>
              {st.extras.map((e, i) => {
                const up = (p: Partial<ExtraRow>, what: string) => {
                  patch({ extras: st.extras.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                  record(what);
                };
                return (
                  <tr key={e.name}>
                    <th scope="row">{e.name}</th>
                    <td>
                      <Toggle on={e.status === "active"} set={(v) => editItems && up({ status: v ? "active" : "draft" }, `${v ? "Showed" : "Hid"} the ${e.name} extra`)} label={`Show ${e.name} on the website`} />
                    </td>
                    {(["set", "single", "tradeSet", "tradeSingle"] as const).map((k) => (
                      <td key={k} className="is-num">
                        <PriceIn value={e[k]} label={`${e.name} ${k}`} disabled={!editPrices} set={(n) => up({ [k]: n }, `${e.name}: ${k} price set to ${priceText(n)}`)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Size charges">
        <p className="as-help">Added to the style price when a customer picks a size that isn&apos;t standard.</p>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col" className="is-num">Set</th>
                <th scope="col" className="is-num">Single</th>
                <th scope="col" className="is-num">Trade set</th>
                <th scope="col" className="is-num">Trade single</th>
              </tr>
            </thead>
            <tbody>
              {st.sizes.map((z, i) => (
                <tr key={z.name}>
                  <th scope="row">{z.name}</th>
                  {(["set", "single", "tradeSet", "tradeSingle"] as const).map((k) => (
                    <td key={k} className="is-num">
                      <PriceIn
                        value={z[k]}
                        label={`${z.name} ${k}`}
                        disabled={!editPrices}
                        set={(n) => {
                          patch({ sizes: st.sizes.map((x, j) => (j === i ? { ...x, [k]: n } : x)) });
                          record(`${z.name} size: ${k} charge set to ${priceText(n)}`);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StyleEditor({ s, editPrices, editItems, close, save }: { s: StyleRow; editPrices: boolean; editItems: boolean; close: () => void; save: (p: Partial<StyleRow>) => void }) {
  const [d, setD] = useState<StyleRow>(s);
  const dirty = JSON.stringify(d) !== JSON.stringify(s);
  const up = (p: Partial<StyleRow>) => setD((x) => ({ ...x, ...p }));
  return (
    <div className="as-editor" data-as-editor>
      <div className="as-editor__head">
        <h2>{s.name}</h2>
        <button type="button" className="as-btn as-btn--ghost" onClick={close}>
          Close
        </button>
      </div>
      <div className="as-editor__grid">
        <div className="as-stack">
          <Card title="Details">
            <Field label="Description on the website" hint="Optional. Shown under the style in the builder.">
              <textarea rows={3} value={d.description} disabled={!editItems} onChange={(e) => up({ description: e.target.value })} />
            </Field>
          </Card>
          <Card title="Pricing">
            {!editPrices && <ReadOnly what="these prices" />}
            <div className="as-grid4">
              <Field label="Set (front & rear)">
                <PriceIn value={d.set} set={(n) => up({ set: n })} label="Set price" disabled={!editPrices} />
              </Field>
              <Field label="Single plate">
                <PriceIn value={d.single} set={(n) => up({ single: n })} label="Single price" disabled={!editPrices} />
              </Field>
              <Field label="Trade set">
                <PriceIn value={d.tradeSet} set={(n) => up({ tradeSet: n })} label="Trade set price" disabled={!editPrices} />
              </Field>
              <Field label="Trade single">
                <PriceIn value={d.tradeSingle} set={(n) => up({ tradeSingle: n })} label="Trade single price" disabled={!editPrices} />
              </Field>
            </div>
            <p className="as-help">Leave a price empty to show &quot;Price on request&quot;.</p>
          </Card>
        </div>
        <div className="as-stack">
          <Card title="Status">
            <select value={d.status} disabled={!editItems} onChange={(e) => up({ status: e.target.value as StyleRow["status"] })} aria-label="Status" data-as-status>
              <option value="active">Active</option>
              <option value="draft">Draft (hidden)</option>
            </select>
          </Card>
          <Card title="Sold as">
            <div className="as-checks">
              {(
                [
                  ["legal", "Road legal (cars)"],
                  ["show", "Show plates"],
                  ["bike", "Motorbike"],
                ] as const
              ).map(([k, label]) => (
                <label key={k}>
                  <input type="checkbox" checked={d[k]} disabled={!editItems} onChange={(e) => up({ [k]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <SavedBar dirty={dirty} onSave={() => save(d)} onDiscard={() => setD(s)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accessories                                                          */
/* ------------------------------------------------------------------ */
export function AccessoriesPage({ st, patch, role, record }: P) {
  const editPrices = can(role, "prices.edit");
  const editItems = can(role, "plates.edit");
  return (
    <div className="as-stack">
      <p className="as-lede">Everything on the Accessories page. &quot;Coming soon&quot; shows the item with a coming soon image and no price.</p>
      {!editPrices && <ReadOnly what="accessory prices" />}
      <Card flush>
        <div className="ad-tablewrap as-tablewrap">
          <table className="as-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col" className="is-num">Price</th>
              </tr>
            </thead>
            <tbody>
              {st.acc.map((a, i) => {
                const up = (p: Partial<AccRow>, what: string) => {
                  patch({ acc: st.acc.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                  record(what);
                };
                return (
                  <tr key={a.key}>
                    <th scope="row">
                      <b>{a.name}</b>
                      <small className="as-sub">{a.line}</small>
                    </th>
                    <td className="as-muted">{a.cat}</td>
                    <td>
                      <select value={a.status} disabled={!editItems} onChange={(e) => up({ status: e.target.value as AccRow["status"] }, `${a.name}: status set to ${e.target.value}`)} aria-label={`${a.name} status`} data-as-acc={a.key}>
                        <option value="active">Active</option>
                        <option value="soon">Coming soon</option>
                        <option value="draft">Draft (hidden)</option>
                      </select>
                    </td>
                    <td className="is-num">
                      <div className="as-pricecell">
                        {a.from && <span className="as-muted">From</span>}
                        <PriceIn value={a.price} label={`${a.name} price`} disabled={!editPrices || a.status === "soon"} set={(n) => up({ price: n }, `${a.name}: price set to ${priceText(n)}`)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="as-help">Empty prices show as &quot;Price on request&quot; on the website. Surround and logo plate prices are still to be set by REG KING.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Categories (Shopify's collections)                                   */
/* ------------------------------------------------------------------ */
export function CollectionsPage({ st, patch, role, record }: P) {
  const edit = can(role, "plates.edit");
  const [open, setOpen] = useState<string | null>(null);
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const setCat = (key: string, f: (c: CatRow) => CatRow, what: string) => {
    patch({ cats: st.cats.map((c) => (c.key === key ? f(c) : c)) });
    record(what);
  };
  return (
    <div className="as-stack">
      <p className="as-lede">The categories customers browse on Buy. Plates go in a sub-category when they match one of its words. At launch, plates are tagged in the stock system instead.</p>
      {!edit && <ReadOnly what="categories" />}
      {st.cats.map((c) => (
        <Card
          key={c.key}
          title={c.label}
          action={<Toggle on={c.visible} set={(v) => edit && setCat(c.key, (x) => ({ ...x, visible: v }), `${v ? "Showed" : "Hid"} the ${c.label} category`)} label={`Show ${c.label}`} />}
        >
          <p className="as-help">{c.line}</p>
          <ul className="as-chips">
            {c.subs.map((s) => (
              <li key={s.key} data-off={!s.visible || undefined}>
                <button type="button" onClick={() => setOpen(open === s.key ? null : s.key)} aria-expanded={open === s.key} data-as-sub={s.key}>
                  {s.label}
                  <i>{s.words.length}</i>
                </button>
              </li>
            ))}
          </ul>
          {c.subs.map(
            (s) =>
              open === s.key && (
                <div key={s.key} className="as-subedit">
                  <Field label="Name">
                    <input value={s.label} disabled={!edit} onChange={(e) => patch({ cats: st.cats.map((x) => (x.key === c.key ? { ...x, subs: x.subs.map((y) => (y.key === s.key ? { ...y, label: e.target.value } : y)) } : x)) })} />
                  </Field>
                  <Field label="Words that put a plate here" hint="Separate with commas.">
                    <textarea
                      rows={3}
                      disabled={!edit}
                      defaultValue={s.words.join(", ")}
                      onBlur={(e) => {
                        const words = e.target.value.split(",").map((w) => w.trim().toUpperCase()).filter(Boolean);
                        setCat(c.key, (x) => ({ ...x, subs: x.subs.map((y) => (y.key === s.key ? { ...y, words } : y)) }), `${s.label}: words updated (${words.length})`);
                      }}
                    />
                  </Field>
                  <div className="as-row">
                    <label className="as-inlinecheck">
                      <input type="checkbox" checked={s.visible} disabled={!edit} onChange={(e) => setCat(c.key, (x) => ({ ...x, subs: x.subs.map((y) => (y.key === s.key ? { ...y, visible: e.target.checked } : y)) }), `${e.target.checked ? "Showed" : "Hid"} ${s.label}`)} />
                      Show on the website
                    </label>
                    {edit && (
                      <button type="button" className="as-btn as-btn--danger" onClick={() => (setCat(c.key, (x) => ({ ...x, subs: x.subs.filter((y) => y.key !== s.key) }), `Removed the ${s.label} sub-category`), setOpen(null))}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ),
          )}
          {edit && (
            <form
              className="as-row"
              onSubmit={(e) => {
                e.preventDefault();
                const label = (newSub[c.key] ?? "").trim();
                if (!label) return;
                setCat(c.key, (x) => ({ ...x, subs: [...x.subs, { key: `${c.key}-${id()}`, label, words: [], visible: true }] }), `Added ${label} to ${c.label}`);
                setNewSub((n) => ({ ...n, [c.key]: "" }));
              }}
            >
              <input className="as-input" placeholder="New sub-category" value={newSub[c.key] ?? ""} onChange={(e) => setNewSub((n) => ({ ...n, [c.key]: e.target.value }))} aria-label={`New sub-category in ${c.label}`} />
              <button type="submit" className="as-btn as-btn--ghost">
                Add
              </button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Discounts                                                            */
/* ------------------------------------------------------------------ */
const blankDiscount = (): Discount => ({ id: "", code: "", kind: "percent", value: 10, appliesTo: "made", minSpend: null, starts: "2026-11-02", ends: "", limit: null, oncePer: true, used: 0, on: true });
const discountState = (d: Discount) => (!d.on ? "off" : d.starts > "2026-11-02" ? "scheduled" : d.ends && d.ends < "2026-11-02" ? "expired" : "active");
const APPLIES: Record<Discount["appliesTo"], string> = { order: "Whole order", made: "Made plates, surrounds and logo plates", registrations: "Registrations", accessories: "Accessories" };

export function DiscountsPage({ st, patch, record }: P) {
  const [d, setD] = useState<Discount | null>(null);
  const up = (p: Partial<Discount>) => setD((x) => (x ? { ...x, ...p } : x));
  const codeOk = !!d && /^[A-Z0-9-]{3,20}$/.test(d.code) && !st.discounts.some((x) => x.code === d.code && x.id !== d.id);
  const describe = (x: Discount) =>
    x.kind === "delivery" ? "Free delivery" : `${x.kind === "percent" ? `${x.value}%` : money(x.value)} off ${APPLIES[x.appliesTo].toLowerCase()}`;
  return (
    <div className="as-stack">
      <Card title="Automatic discounts" action={<span className="as-muted">Applied for customers, no code needed</span>}>
        <ul className="as-list">
          {st.auto.map((a, i) => (
            <li key={a.key}>
              <div>
                <b>{a.name}</b>
                <small>{a.line}</small>
              </div>
              <label className="as-unit">
                <span className="rk-visually-hidden">{a.name} value</span>
                {a.unit === "£" && <i>£</i>}
                <input
                  inputMode="decimal"
                  defaultValue={a.value}
                  onBlur={(e) => {
                    const n = num(e.target.value);
                    if (n === null || n === a.value) return;
                    patch({ auto: st.auto.map((x, j) => (j === i ? { ...x, value: n } : x)) });
                    record(`${a.name} set to ${a.unit === "£" ? money(n) : `${n}%`}`);
                  }}
                />
                {a.unit === "%" && <i>%</i>}
              </label>
              <Toggle
                on={a.on}
                set={(v) => {
                  patch({ auto: st.auto.map((x, j) => (j === i ? { ...x, on: v } : x)) });
                  record(`${v ? "Turned on" : "Turned off"}: ${a.name}`);
                }}
                label={`${a.name} on`}
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Discount codes"
        action={
          !d && (
            <button type="button" className="as-btn" onClick={() => setD({ ...blankDiscount(), id: "" })} data-as-newcode>
              Create discount
            </button>
          )
        }
      >
        {d && (
          <form
            className="as-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!codeOk || (d.kind !== "delivery" && !(d.value > 0))) return;
              if (d.id) {
                patch({ discounts: st.discounts.map((x) => (x.id === d.id ? d : x)) });
                record(`Updated discount ${d.code}`);
              } else {
                patch({ discounts: [{ ...d, id: id() }, ...st.discounts] });
                record(`Created discount ${d.code}: ${describe(d)}`);
              }
              setD(null);
            }}
          >
            <div className="as-grid2">
              <Field label="Code" hint="Letters, numbers and dashes. Customers type this at checkout.">
                <div className="as-row">
                  <input className="as-input" value={d.code} onChange={(e) => up({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} data-as-code />
                  <button type="button" className="as-btn as-btn--ghost" onClick={() => up({ code: `RK${Math.random().toString(36).slice(2, 8).toUpperCase()}` })}>
                    Generate
                  </button>
                </div>
              </Field>
              <Field label="Type">
                <select value={d.kind} onChange={(e) => up({ kind: e.target.value as Discount["kind"] })}>
                  <option value="percent">Percentage off</option>
                  <option value="amount">Fixed amount off</option>
                  <option value="delivery">Free delivery</option>
                </select>
              </Field>
              {d.kind !== "delivery" && (
                <Field label={d.kind === "percent" ? "Percentage" : "Amount (£)"}>
                  <input className="as-input" inputMode="decimal" value={d.value} onChange={(e) => up({ value: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} data-as-value />
                </Field>
              )}
              {d.kind !== "delivery" && (
                <Field label="Applies to">
                  <select value={d.appliesTo} onChange={(e) => up({ appliesTo: e.target.value as Discount["appliesTo"] })}>
                    {Object.entries(APPLIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Minimum spend (£)" hint="Optional">
                <input className="as-input" inputMode="decimal" value={d.minSpend ?? ""} onChange={(e) => up({ minSpend: num(e.target.value.replace(/[^0-9.]/g, "")) })} />
              </Field>
              <Field label="Total uses" hint="Optional. Leave empty for no limit.">
                <input className="as-input" inputMode="numeric" value={d.limit ?? ""} onChange={(e) => up({ limit: num(e.target.value.replace(/[^0-9]/g, "")) })} />
              </Field>
              <Field label="Starts">
                <input className="as-input" type="date" value={d.starts} onChange={(e) => up({ starts: e.target.value })} />
              </Field>
              <Field label="Ends" hint="Optional">
                <input className="as-input" type="date" value={d.ends} onChange={(e) => up({ ends: e.target.value })} />
              </Field>
            </div>
            <label className="as-inlinecheck">
              <input type="checkbox" checked={d.oncePer} onChange={(e) => up({ oncePer: e.target.checked })} />
              One use per customer
            </label>
            {d.appliesTo === "registrations" && d.kind !== "delivery" && <p className="as-warn">Registrations bought from the DVLA can&apos;t be discounted: the DVLA sets their price.</p>}
            {!codeOk && d.code.length > 0 && <p className="as-warn">{st.discounts.some((x) => x.code === d.code && x.id !== d.id) ? "That code is already used." : "Use 3 to 20 letters, numbers or dashes."}</p>}
            <div className="as-row">
              <button type="submit" className="as-btn" disabled={!codeOk} data-as-savecode>
                {d.id ? "Save discount" : "Create discount"}
              </button>
              <button type="button" className="as-btn as-btn--ghost" onClick={() => setD(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {!d && !st.discounts.length && <p className="as-empty">No discount codes yet. Create one for a sale, an event or a customer.</p>}
        {st.discounts.length > 0 && (
          <div className="ad-tablewrap as-tablewrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Discount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Dates</th>
                  <th scope="col" className="is-num">Used</th>
                  <th scope="col">
                    <span className="rk-visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {st.discounts.map((x) => (
                  <tr key={x.id}>
                    <th scope="row">
                      <code className="as-code">{x.code}</code>
                    </th>
                    <td>
                      {describe(x)}
                      {x.minSpend ? <small className="as-sub">Over {money(x.minSpend)}</small> : null}
                    </td>
                    <td>
                      <Status s={discountState(x)} />
                    </td>
                    <td className="as-muted">
                      {x.starts}
                      {x.ends ? ` to ${x.ends}` : " onwards"}
                    </td>
                    <td className="is-num">
                      {x.used}
                      {x.limit ? ` / ${x.limit}` : ""}
                    </td>
                    <td className="as-actions">
                      <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => setD(x)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="as-btn as-btn--ghost as-btn--sm"
                        onClick={() => {
                          patch({ discounts: st.discounts.map((y) => (y.id === x.id ? { ...y, on: !y.on } : y)) });
                          record(`${x.on ? "Turned off" : "Turned on"} discount ${x.code}`);
                        }}
                      >
                        {x.on ? "Turn off" : "Turn on"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics                                                            */
/* ------------------------------------------------------------------ */
const PAY_NAMES: Record<string, string> = { card: "Card", deposit: "Deposit", finance: "Payl8r finance", "pay-in-3": "Pay in 3" };
const TYPE_NAMES: Record<string, string> = { registration: "Registrations", plates: "Made plates", accessories: "Accessories" };

export function AnalyticsPage({ orders }: { orders: AdminOrder[] }) {
  const [range, setRange] = useState<"7" | "30" | "all">("all");
  const from = range === "all" ? "" : range === "7" ? "2026-10-27" : "2026-10-04";
  const list = orders.filter((o) => o.date >= from);
  const total = list.reduce((a, o) => a + o.total, 0);
  const paid = list.reduce((a, o) => a + o.paid, 0);
  const group = (key: (o: AdminOrder) => string, names: Record<string, string>) => {
    const m = new Map<string, number>();
    list.forEach((o) => m.set(key(o), (m.get(key(o)) ?? 0) + o.total));
    const max = Math.max(1, ...m.values());
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k: names[k] ?? k, v, w: (v / max) * 100 }));
  };
  const byType = group((o) => o.type, TYPE_NAMES);
  const byPay = group((o) => o.pay, PAY_NAMES);
  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((o) => m.set(o.date, (m.get(o.date) ?? 0) + o.total));
    const max = Math.max(1, ...m.values());
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => ({ k, v, h: (v / max) * 100 }));
  }, [list]);
  const Bars = ({ rows }: { rows: { k: string; v: number; w: number }[] }) => (
    <ul className="as-bars">
      {rows.map((r) => (
        <li key={r.k}>
          <span>{r.k}</span>
          <i>
            <b style={{ width: `${r.w}%` }} />
          </i>
          <em>{money(r.v)}</em>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="as-stack">
      <div className="as-pagehead as-pagehead--row">
        <p className="as-lede">Worked out from the example orders in this preview. At launch it uses real orders.</p>
        <div className="as-seg" role="radiogroup" aria-label="Date range">
          {(
            [
              ["7", "Last 7 days"],
              ["30", "Last 30 days"],
              ["all", "All"],
            ] as const
          ).map(([k, t]) => (
            <button key={k} type="button" role="radio" aria-checked={range === k} onClick={() => setRange(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="as-kpis">
        <div>
          <span>Sales</span>
          <b>{money(total)}</b>
        </div>
        <div>
          <span>Taken so far</span>
          <b>{money(paid)}</b>
        </div>
        <div>
          <span>Orders</span>
          <b>{list.length}</b>
        </div>
        <div>
          <span>Average order</span>
          <b>{list.length ? money(Math.round((total / list.length) * 100) / 100) : "None"}</b>
        </div>
      </div>
      <Card title="Sales by day">
        {byDay.length ? (
          <div className="as-cols" role="img" aria-label={byDay.map((d) => `${d.k}: ${money(d.v)}`).join(", ")}>
            {byDay.map((d) => (
              <div key={d.k} title={`${d.k}: ${money(d.v)}`}>
                <i style={{ height: `${Math.max(4, d.h)}%` }} />
                <span>{d.k.slice(8)}/{d.k.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="as-empty">No orders in this range.</p>
        )}
      </Card>
      <div className="as-grid2">
        <Card title="Sales by type">{byType.length ? <Bars rows={byType} /> : <p className="as-empty">No orders in this range.</p>}</Card>
        <Card title="How customers paid">{byPay.length ? <Bars rows={byPay} /> : <p className="as-empty">No orders in this range.</p>}</Card>
      </div>
      <Card title="Website visits and conversion">
        <p className="as-help">Connect Google Analytics or Shopify analytics at launch to see visits, where customers come from and how many reach checkout.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Online store: homepage                                               */
/* ------------------------------------------------------------------ */
export function HomepagePage({ st, patch, record }: P) {
  const [ann, setAnn] = useState(st.announcement);
  const [hero, setHero] = useState(st.hero);
  const dirty = JSON.stringify(ann) !== JSON.stringify(st.announcement) || JSON.stringify(hero) !== JSON.stringify(st.hero);
  const move = (i: number, by: number) => {
    const list = [...st.home];
    const j = i + by;
    if (j < 0 || j >= list.length || list[j].tab !== list[i].tab) return;
    [list[i], list[j]] = [list[j], list[i]];
    patch({ home: list });
    record(`Moved "${list[j].name}" ${by < 0 ? "up" : "down"} on the ${list[j].tab} tab`);
  };
  return (
    <div className="as-stack">
      <Card title="Announcement bar" action={<Toggle on={ann.on} set={(v) => setAnn({ ...ann, on: v })} label="Show the announcement bar" />}>
        <p className="as-help">A thin bar above the header on every page, for a sale or a holiday closing date.</p>
        <div className="as-grid2">
          <Field label="Text">
            <input className="as-input" value={ann.text} onChange={(e) => setAnn({ ...ann, text: e.target.value })} maxLength={90} data-as-ann />
          </Field>
          <Field label="Link (optional)" hint="A page on the site, such as #buy-regking">
            <input className="as-input" value={ann.link} onChange={(e) => setAnn({ ...ann, link: e.target.value })} />
          </Field>
        </div>
        {ann.on && ann.text && (
          <div className="as-annprev" aria-label="Preview">
            {ann.text}
          </div>
        )}
      </Card>
      <Card title="Hero">
        <div className="as-grid2">
          <Field label="Heading">
            <input className="as-input" value={hero.heading} onChange={(e) => setHero({ ...hero, heading: e.target.value })} />
          </Field>
          <Field label="Line under it (optional)">
            <input className="as-input" value={hero.sub} onChange={(e) => setHero({ ...hero, sub: e.target.value })} />
          </Field>
        </div>
      </Card>
      <Card title="Sections" action={<span className="as-muted">Shown under the search for each tab</span>}>
        {(["Buy", "Sell", "Make"] as const).map((t) => (
          <div key={t} className="as-secgroup">
            <h3>{t}</h3>
            <ul className="as-list">
              {st.home.map((h, i) =>
                h.tab !== t ? null : (
                  <li key={h.key} data-off={!h.visible || undefined}>
                    <div>
                      <b>{h.name}</b>
                    </div>
                    <div className="as-row as-row--tight">
                      <button type="button" className="as-icon" onClick={() => move(i, -1)} aria-label={`Move ${h.name} up`}>
                        ↑
                      </button>
                      <button type="button" className="as-icon" onClick={() => move(i, 1)} aria-label={`Move ${h.name} down`}>
                        ↓
                      </button>
                      <Toggle
                        on={h.visible}
                        set={(v) => {
                          patch({ home: st.home.map((x) => (x.key === h.key ? { ...x, visible: v } : x)) });
                          record(`${v ? "Showed" : "Hid"} "${h.name}" on the ${t} tab`);
                        }}
                        label={`Show ${h.name}`}
                      />
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </Card>
      <SavedBar
        dirty={dirty}
        onSave={() => {
          patch({ announcement: ann, hero });
          record("Updated the homepage announcement and hero");
        }}
        onDiscard={() => {
          setAnn(st.announcement);
          setHero(st.hero);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Online store: menus                                                  */
/* ------------------------------------------------------------------ */
export function NavigationPage({ st, patch, record }: P) {
  const [open, setOpen] = useState<string | null>(st.menu[0]?.id ?? null);
  const [add, setAdd] = useState({ label: "", link: "" });
  const setMenu = (menu: MenuItem[], what: string) => {
    patch({ menu });
    record(what);
  };
  return (
    <div className="as-stack">
      <p className="as-lede">The main menu in the header. The footer uses the same menu.</p>
      {st.menu.map((m, i) => (
        <Card
          key={m.id}
          title={m.label}
          action={
            <div className="as-row as-row--tight">
              <button type="button" className="as-icon" aria-label={`Move ${m.label} up`} onClick={() => i > 0 && setMenu(swap(st.menu, i, i - 1), `Moved ${m.label} up the menu`)}>
                ↑
              </button>
              <button type="button" className="as-icon" aria-label={`Move ${m.label} down`} onClick={() => i < st.menu.length - 1 && setMenu(swap(st.menu, i, i + 1), `Moved ${m.label} down the menu`)}>
                ↓
              </button>
              <Toggle on={m.visible} set={(v) => setMenu(st.menu.map((x) => (x.id === m.id ? { ...x, visible: v } : x)), `${v ? "Showed" : "Hid"} ${m.label} in the menu`)} label={`Show ${m.label}`} />
              <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
                {open === m.id ? "Done" : "Edit"}
              </button>
            </div>
          }
        >
          {open === m.id ? (
            <div className="as-stack as-stack--tight">
              <Field label="Menu label">
                <input className="as-input" value={m.label} onChange={(e) => patch({ menu: st.menu.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)) })} />
              </Field>
              <ul className="as-list">
                {m.children.map((c, j) => (
                  <li key={c.id} data-off={!c.visible || undefined}>
                    <input className="as-input as-input--flat" value={c.label} aria-label="Label" onChange={(e) => patch({ menu: st.menu.map((x) => (x.id === m.id ? { ...x, children: x.children.map((y) => (y.id === c.id ? { ...y, label: e.target.value } : y)) } : x)) })} />
                    <code className="as-code as-code--muted">{c.link}</code>
                    <div className="as-row as-row--tight">
                      <button type="button" className="as-icon" aria-label={`Move ${c.label} up`} onClick={() => j > 0 && setMenu(st.menu.map((x) => (x.id === m.id ? { ...x, children: swap(x.children, j, j - 1) } : x)), `Moved ${c.label} up`)}>
                        ↑
                      </button>
                      <button type="button" className="as-icon" aria-label={`Move ${c.label} down`} onClick={() => j < m.children.length - 1 && setMenu(st.menu.map((x) => (x.id === m.id ? { ...x, children: swap(x.children, j, j + 1) } : x)), `Moved ${c.label} down`)}>
                        ↓
                      </button>
                      <Toggle on={c.visible} set={(v) => setMenu(st.menu.map((x) => (x.id === m.id ? { ...x, children: x.children.map((y) => (y.id === c.id ? { ...y, visible: v } : y)) } : x)), `${v ? "Showed" : "Hid"} ${c.label}`)} label={`Show ${c.label}`} />
                    </div>
                  </li>
                ))}
              </ul>
              <form
                className="as-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!add.label.trim() || !add.link.trim()) return;
                  setMenu(st.menu.map((x) => (x.id === m.id ? { ...x, children: [...x.children, { id: id(), label: add.label.trim(), link: add.link.trim(), visible: true }] } : x)), `Added ${add.label.trim()} to ${m.label}`);
                  setAdd({ label: "", link: "" });
                }}
              >
                <input className="as-input" placeholder="Label" value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} aria-label="New item label" />
                <input className="as-input" placeholder="Link, such as #info-faqs" value={add.link} onChange={(e) => setAdd({ ...add, link: e.target.value })} aria-label="New item link" />
                <button type="submit" className="as-btn as-btn--ghost">
                  Add item
                </button>
              </form>
            </div>
          ) : (
            <p className="as-help">{m.children.filter((c) => c.visible).map((c) => c.label).join(", ")}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
function swap<T>(list: T[], a: number, b: number): T[] {
  const l = [...list];
  [l[a], l[b]] = [l[b], l[a]];
  return l;
}

/* ------------------------------------------------------------------ */
/* Online store: pages                                                  */
/* ------------------------------------------------------------------ */
export function PagesPage({ st, patch, record }: P) {
  const [open, setOpen] = useState<string | null>(null);
  const editing = st.pages.find((p) => p.key === open) ?? null;
  return (
    <div className="as-stack">
      <div className="as-pagehead as-pagehead--row">
        <p className="as-lede">Policy and information pages. The privacy policy and terms must be live before launch.</p>
        <button
          type="button"
          className="as-btn"
          onClick={() => {
            const key = `page-${id()}`;
            patch({ pages: [...st.pages, { key, title: "New page", handle: "new-page", status: "hidden", body: "", seoTitle: "", seoDesc: "" }] });
            setOpen(key);
          }}
          data-as-newpage
        >
          Add page
        </button>
      </div>
      {editing ? (
        <PageEditor
          key={editing.key}
          p={editing}
          close={() => setOpen(null)}
          save={(p) => {
            patch({ pages: st.pages.map((x) => (x.key === editing.key ? p : x)) });
            record(`Saved the "${p.title}" page`);
            setOpen(null);
          }}
        />
      ) : (
        <Card flush>
          <div className="ad-tablewrap as-tablewrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Status</th>
                  <th scope="col">Address</th>
                </tr>
              </thead>
              <tbody>
                {st.pages.map((p) => (
                  <tr key={p.key} className="is-click" onClick={() => setOpen(p.key)}>
                    <th scope="row">
                      <button type="button" className="as-rowlink" onClick={(e) => (e.stopPropagation(), setOpen(p.key))}>
                        {p.title}
                      </button>
                      {p.note && <small className="as-sub">{p.note}</small>}
                    </th>
                    <td>
                      <Status s={p.status} />
                    </td>
                    <td>
                      <code className="as-code as-code--muted">/{p.handle}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
function PageEditor({ p, close, save }: { p: PageRow; close: () => void; save: (p: PageRow) => void }) {
  const [d, setD] = useState(p);
  const up = (x: Partial<PageRow>) => setD((v) => ({ ...v, ...x }));
  const dirty = JSON.stringify(d) !== JSON.stringify(p);
  const built = !["privacy", "terms", "refunds", "shipping"].includes(p.key) && !p.key.startsWith("page-");
  return (
    <div className="as-editor" data-as-page={p.key}>
      <div className="as-editor__head">
        <h2>{p.title}</h2>
        <button type="button" className="as-btn as-btn--ghost" onClick={close}>
          Back to pages
        </button>
      </div>
      <div className="as-editor__grid">
        <div className="as-stack">
          <Card>
            <Field label="Title">
              <input className="as-input" value={d.title} onChange={(e) => up({ title: e.target.value })} />
            </Field>
            {built ? (
              <p className="as-help">This page is built into the site (its content comes from the FAQs, finance details and so on). On the live site each part is editable here.</p>
            ) : (
              <Field label="Content" hint="Plain text. Headings start with ## on their own line.">
                <textarea rows={14} value={d.body} onChange={(e) => up({ body: e.target.value })} data-as-body />
              </Field>
            )}
          </Card>
          <Card title="Search engine listing">
            <Field label="Page title" hint={`${d.seoTitle.length} of 60 characters`}>
              <input className="as-input" value={d.seoTitle} maxLength={70} onChange={(e) => up({ seoTitle: e.target.value })} />
            </Field>
            <Field label="Description" hint={`${d.seoDesc.length} of 160 characters`}>
              <textarea rows={3} value={d.seoDesc} maxLength={200} onChange={(e) => up({ seoDesc: e.target.value })} />
            </Field>
            <Field label="Web address">
              <div className="as-prefix">
                <span>regking.co.uk/</span>
                <input value={d.handle} onChange={(e) => up({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
              </div>
            </Field>
          </Card>
        </div>
        <div className="as-stack">
          <Card title="Visibility">
            <select value={d.status} onChange={(e) => up({ status: e.target.value as PageRow["status"] })} aria-label="Visibility">
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="needs-content">Needs content</option>
            </select>
            {d.status === "published" && !built && !d.body.trim() && <p className="as-warn">This page has no content yet.</p>}
          </Card>
        </div>
      </div>
      <SavedBar dirty={dirty} onSave={() => save(d)} onDiscard={() => setD(p)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Online store: photos and files                                       */
/* ------------------------------------------------------------------ */
export function MediaPage({ st, patch, record }: P) {
  const [sure, setSure] = useState<string | null>(null);
  return (
    <div className="as-stack">
      <div className="as-pagehead as-pagehead--row">
        <p className="as-lede">REG KING&apos;s own photos used on the site. Only use your own photos: no stock or AI images.</p>
        <label className="as-btn as-upload">
          Upload photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              if (!files.length) return;
              patch({ media: [...files.map((f) => ({ id: id(), src: URL.createObjectURL(f), alt: "", where: "Not used yet" })), ...st.media] });
              record(`Uploaded ${files.length} photo${files.length > 1 ? "s" : ""}`);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <ul className="as-media">
        {st.media.map((m) => (
          <li key={m.id}>
            <div className="as-media__img">
              <img src={m.src} alt="" loading="lazy" />
            </div>
            <label className="as-field">
              <span>Description (alt text)</span>
              <input value={m.alt} onChange={(e) => patch({ media: st.media.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)) })} placeholder="What's in the photo" />
            </label>
            <small className="as-muted">{m.where}</small>
            {sure === m.id ? (
              <div className="as-row as-row--tight">
                <button
                  type="button"
                  className="as-btn as-btn--danger as-btn--sm"
                  onClick={() => {
                    patch({ media: st.media.filter((x) => x.id !== m.id) });
                    record(`Removed a photo (${m.where})`);
                    setSure(null);
                  }}
                >
                  Remove
                </button>
                <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => setSure(null)}>
                  Keep
                </button>
              </div>
            ) : (
              <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => setSure(m.id)}>
                Remove
              </button>
            )}
            {!m.alt && <span className="as-warn as-warn--sm">Add a description for screen readers and Google.</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Online store: SEO and redirects                                      */
/* ------------------------------------------------------------------ */
export function SeoPage({ st, patch, record }: P) {
  const [seo, setSeo] = useState(st.seo);
  const [r, setR] = useState({ from: "", to: "" });
  const dirty = JSON.stringify(seo) !== JSON.stringify(st.seo);
  return (
    <div className="as-stack">
      <Card title="Homepage in Google">
        <Field label="Title" hint={`${seo.title.length} of 60 characters`}>
          <input className="as-input" value={seo.title} maxLength={70} onChange={(e) => setSeo({ ...seo, title: e.target.value })} placeholder="REG KING" />
        </Field>
        <Field label="Description" hint={`${seo.desc.length} of 160 characters`}>
          <textarea rows={3} value={seo.desc} maxLength={200} onChange={(e) => setSeo({ ...seo, desc: e.target.value })} />
        </Field>
        <div className="as-serp" aria-label="How it could look in Google">
          <small>regking.co.uk</small>
          <b>{seo.title || "REG KING"}</b>
          <span>{seo.desc || "Add a description so Google shows your own words."}</span>
        </div>
      </Card>
      <Card title="Redirects">
        <p className="as-help">Send old Shopify links to the new pages, so links people saved and Google results keep working.</p>
        <form
          className="as-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!r.from.trim() || !r.to.trim()) return;
            patch({ redirects: [{ id: id(), from: r.from.trim(), to: r.to.trim() }, ...st.redirects] });
            record(`Added a redirect from ${r.from.trim()} to ${r.to.trim()}`);
            setR({ from: "", to: "" });
          }}
        >
          <input className="as-input" placeholder="Old address, such as /products/ab12-cde" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} aria-label="Redirect from" data-as-from />
          <input className="as-input" placeholder="New address" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} aria-label="Redirect to" />
          <button type="submit" className="as-btn as-btn--ghost">
            Add redirect
          </button>
        </form>
        {st.redirects.length ? (
          <ul className="as-list">
            {st.redirects.map((x) => (
              <li key={x.id}>
                <code className="as-code">{x.from}</code>
                <span className="as-muted">to</span>
                <code className="as-code">{x.to}</code>
                <button type="button" className="as-btn as-btn--ghost as-btn--sm" onClick={() => (patch({ redirects: st.redirects.filter((y) => y.id !== x.id) }), record(`Removed the redirect from ${x.from}`))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="as-empty">No redirects yet.</p>
        )}
      </Card>
      <SavedBar dirty={dirty} onSave={() => (patch({ seo }), record("Updated the homepage search listing"))} onDiscard={() => setSeo(st.seo)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                             */
/* ------------------------------------------------------------------ */
type SettingsTab = "general" | "delivery" | "payments" | "checkout" | "emails" | "taxes" | "domain" | "apps" | "legal";
const SETTINGS: { key: SettingsTab; label: string; line: string }[] = [
  { key: "general", label: "Store details", line: "Name, contact details and address" },
  { key: "delivery", label: "Delivery and collection", line: "Rates and free delivery" },
  { key: "payments", label: "Payments", line: "Card payments, Pay in 3 and finance" },
  { key: "checkout", label: "Deposits and checkout", line: "Deposits, fees and the balance" },
  { key: "emails", label: "Customer emails", line: "The emails customers get" },
  { key: "taxes", label: "Taxes", line: "VAT" },
  { key: "domain", label: "Domain and launch", line: "What's needed before going live" },
  { key: "apps", label: "Connections", line: "Shopify, the DVLA and other services" },
  { key: "legal", label: "Legal", line: "Company and finance details" },
];
const EMAILS = [
  ["Order confirmation", "Straight after checkout"],
  ["DVLA purchase confirmed", "When the DVLA confirms a new registration"],
  ["DVLA plate no longer available", "If the DVLA sold it first; the card hold is released"],
  ["Documents needed", "Road legal plates, until ID and proof of the reg are uploaded"],
  ["Documents checked", "When staff have checked them"],
  ["Plates dispatched", "With the tracking number"],
  ["Ready to collect", "Collections from the HQ"],
  ["Transfer started", "Registrations from REG KING or a seller"],
  ["Deposit balance reminder", "Before the balance is due"],
  ["Offer received / answered", "Customer plates"],
  ["Listing approved", "Sellers"],
  ["Payout sent", "Sellers"],
] as const;
const CONNECTIONS = [
  ["Shopify", "Stock, customers and the privacy and terms pages"],
  ["DVLA", "Buying new registrations and live DVLA prices"],
  ["Card payments", "Card, Apple Pay and Google Pay (Stripe or similar)"],
  ...PROVIDERS.map((p) => [p.name, p.tag] as const),
  ["Trustpilot", "Reviews on the website"],
  ["Google reviews", "Reviews on the website"],
  ["Postcode lookup", "Find an address at checkout"],
  ["Email sending", "Customer emails"],
  ["Google Analytics", "Visits and conversion"],
] as const;

export function SettingsPage({ st, patch, record }: P) {
  const [tab, setTab] = useState<SettingsTab | null>(null);
  const [general, setGeneral] = useState(st.general);
  const [tax, setTax] = useState(st.tax);
  const dirty = JSON.stringify(general) !== JSON.stringify(st.general) || JSON.stringify(tax) !== JSON.stringify(st.tax);
  const cur = SETTINGS.find((s) => s.key === tab);
  const body = (() => {
    switch (tab) {
      case "general":
        return (
          <Card title="Store details">
            <div className="as-grid2">
              <Field label="Store name">
                <input className="as-input" value={general.name} onChange={(e) => setGeneral({ ...general, name: e.target.value })} />
              </Field>
              <Field label="Customer email">
                <input className="as-input" value={general.email} onChange={(e) => setGeneral({ ...general, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className="as-input" value={general.phone} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <input className="as-input" value={general.whatsapp} onChange={(e) => setGeneral({ ...general, whatsapp: e.target.value })} />
              </Field>
              <Field label="HQ address">
                <input className="as-input" value={general.address} onChange={(e) => setGeneral({ ...general, address: e.target.value })} />
              </Field>
              <Field label="Opening hours" hint="To confirm: not on the site yet">
                <input className="as-input" value={general.hours} onChange={(e) => setGeneral({ ...general, hours: e.target.value })} placeholder="e.g. Mon to Fri 9:00 to 17:30" />
              </Field>
            </div>
          </Card>
        );
      case "delivery":
        return (
          <Card title="Delivery and collection">
            <ul className="as-list">
              {st.delivery.map((d, i) => (
                <li key={d.key}>
                  <div>
                    <b>{d.name}</b>
                    <small>{d.line}</small>
                  </div>
                  <PriceIn
                    value={d.price}
                    label={`${d.name} price`}
                    set={(n) => {
                      patch({ delivery: st.delivery.map((x, j) => (j === i ? { ...x, price: n ?? 0 } : x)) });
                      record(`${d.name} set to ${money(n ?? 0)}`);
                    }}
                  />
                  <Toggle on={d.on} set={(v) => (patch({ delivery: st.delivery.map((x, j) => (j === i ? { ...x, on: v } : x)) }), record(`${v ? "Turned on" : "Turned off"} ${d.name}`))} label={`Offer ${d.name}`} />
                </li>
              ))}
            </ul>
            <p className="as-help">Free standard delivery over {money(st.auto.find((a) => a.key === "free-delivery")?.value ?? FREE_STANDARD_OVER)} is set in Discounts. To confirm: these rates come from REG KING&apos;s 2021 Shopify delivery policy.</p>
          </Card>
        );
      case "payments":
        return (
          <Card title="Payments">
            <ul className="as-list">
              {[["Card, Apple Pay and Google Pay", "Through the payment provider. REG KING never sees card numbers."], ...PROVIDERS.map((p) => [p.name, p.tag])].map(([n, l]) => (
                <li key={n}>
                  <div>
                    <b>{n}</b>
                    <small>{l}</small>
                  </div>
                  <Status s="not-connected" />
                </li>
              ))}
            </ul>
            <p className="as-help">{payl8rDisclaimer}</p>
          </Card>
        );
      case "checkout":
        return (
          <Card title="Deposits and checkout">
            <div className="as-grid2">
              <Field label="Deposit to reserve a registration (%)">
                <input
                  className="as-input"
                  inputMode="decimal"
                  defaultValue={st.deposit}
                  onBlur={(e) => {
                    const n = num(e.target.value);
                    if (n !== null && n !== st.deposit && n > 0 && n < 100) (patch({ deposit: n }), record(`Deposit set to ${n}%`));
                  }}
                  data-as-deposit
                />
              </Field>
              <Field label="REG KING fee on DVLA registrations (%)">
                <input
                  className="as-input"
                  inputMode="decimal"
                  defaultValue={st.dvlaFee}
                  onBlur={(e) => {
                    const n = num(e.target.value);
                    if (n !== null && n !== st.dvlaFee) (patch({ dvlaFee: n }), record(`DVLA fee set to ${n}%`));
                  }}
                />
              </Field>
              <Field label="Days to pay the balance after a deposit" hint="To confirm with REG KING">
                <input className="as-input" inputMode="numeric" value={st.balanceDays} onChange={(e) => patch({ balanceDays: e.target.value.replace(/[^0-9]/g, "") })} onBlur={() => st.balanceDays && record(`Balance due within ${st.balanceDays} days`)} />
              </Field>
            </div>
            <p className="as-help">Deposits are non-refundable and customers tick to agree at checkout. The current deposit is {pct(st.deposit / 100)} of the registration price.</p>
          </Card>
        );
      case "emails":
        return (
          <Card title="Customer emails" flush>
            <ul className="as-list as-list--pad">
              {EMAILS.map(([n, l]) => (
                <li key={n}>
                  <div>
                    <b>{n}</b>
                    <small>{l}</small>
                  </div>
                  <Status s="draft" />
                </li>
              ))}
            </ul>
            <p className="as-help as-help--pad">Each email&apos;s wording is written and edited here once email sending is connected.</p>
          </Card>
        );
      case "taxes":
        return (
          <Card title="VAT">
            <Field label="Is REG KING VAT registered?">
              <select value={tax.registered} onChange={(e) => setTax({ ...tax, registered: e.target.value as typeof tax.registered })}>
                <option value="confirm">To confirm</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            {tax.registered === "yes" && (
              <>
                <Field label="VAT number">
                  <input className="as-input" value={tax.number} onChange={(e) => setTax({ ...tax, number: e.target.value.toUpperCase() })} />
                </Field>
                <label className="as-inlinecheck">
                  <input type="checkbox" checked={tax.inclusive} onChange={(e) => setTax({ ...tax, inclusive: e.target.checked })} />
                  Prices on the site include VAT
                </label>
              </>
            )}
          </Card>
        );
      case "domain":
        return (
          <Card title="Before launch">
            <ul className="as-list">
              {[
                ["Custom domain connected (regking.co.uk)", "not-connected"],
                ["Favicon added", "active"],
                ["Website builder tag removed", "active"],
                ["Privacy policy page live", st.pages.find((p) => p.key === "privacy")?.status === "published" ? "active" : "needs-content"],
                ["Terms and conditions page live", st.pages.find((p) => p.key === "terms")?.status === "published" ? "active" : "needs-content"],
                ["Payments connected", "not-connected"],
                ["Real stock and orders connected", "not-connected"],
              ].map(([n, s]) => (
                <li key={n}>
                  <div>
                    <b>{n}</b>
                  </div>
                  <span className="ad-tag" data-tone={s === "active" ? "ok" : "wait"}>
                    {s === "active" ? "Done" : "Not done"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        );
      case "apps":
        return (
          <Card title="Connections" flush>
            <ul className="as-list as-list--pad">
              {CONNECTIONS.map(([n, l]) => (
                <li key={n}>
                  <div>
                    <b>{n}</b>
                    <small>{l}</small>
                  </div>
                  <Status s="not-connected" />
                </li>
              ))}
            </ul>
            <p className="as-help as-help--pad">The developer connects these with REG KING&apos;s own accounts. Keys are kept on the server, never in the website.</p>
          </Card>
        );
      case "legal":
        return (
          <Card title="Legal">
            <p className="as-help">Shown in the footer for finance:</p>
            <p className="as-quote">{payl8rDisclaimer}</p>
          </Card>
        );
      default:
        return null;
    }
  })();
  if (!tab || !cur)
    return (
      <div className="as-stack">
        <ul className="as-settings">
          {SETTINGS.map((s) => (
            <li key={s.key}>
              <button type="button" onClick={() => setTab(s.key)} data-as-setting={s.key}>
                <b>{s.label}</b>
                <small>{s.line}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="as-stack">
      <button type="button" className="as-back" onClick={() => setTab(null)}>
        ← All settings
      </button>
      {body}
      <SavedBar
        dirty={dirty}
        onSave={() => {
          patch({ general, tax });
          record(`Saved ${cur.label.toLowerCase()}`);
        }}
        onDiscard={() => {
          setGeneral(st.general);
          setTax(st.tax);
        }}
      />
    </div>
  );
}
