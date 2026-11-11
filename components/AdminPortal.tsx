"use client";

/**
 * REG KING admin portal (#admin). One place for staff to run the business: orders, DVLA purchases,
 * plate production, stock, customer listings, offers, enquiries, customers, seller payouts, prices,
 * staff and an activity log.
 *
 * PREVIEW: the records are examples (lib/admin.ts) and actions change this page only. The "Viewing
 * as" switch shows what each role sees. On the live site staff sign in with two-step sign-in, the
 * role comes from their account, and the server checks every action, not just the screen.
 */
import { useMemo, useState, type ReactNode } from "react";
import { formatGBP } from "@/lib/brand";
import { BrandLogo } from "./BrandLogo";
import { useMode } from "./ModeProvider";
import { AbandonedPage, ApprovalsPage, Bell, CallsPage, ContentPage, EmailPage, HealthPage, HomeShop, LivePage, LocationsPage, MaterialsPage, PrivacyPage, RecordsPage, RegistrationsPage, ReportsPage, RequestsPage, ReturnsPage, SellingPage, TasksPage, TradePage, TransfersPage } from "./AdminMore";
import { AccessoriesPage, AnalyticsPage, CollectionsPage, DiscountsPage, HomepagePage, MediaPage, NavigationPage, PagesPage, ProductsPage, SeoPage, SettingsPage, useStoreState } from "./AdminStore";
import {
  ACTIVITY,
  ADMIN_NAV,
  ADMIN_TABS,
  CUSTOMERS,
  DVLA_PURCHASES,
  ENQUIRIES,
  JOBS,
  LISTINGS,
  MANAGER_REFUND_LIMIT,
  OFFERS,
  ORDERS,
  PAYOUTS,
  PAYOUT_NOTE,
  ROLES,
  STAFF,
  can,
  customerById,
  orderStages,
  regkingStock,
  roleOf,
  tabNeeds,
  type AdminOrder,
  type AdminTab,
  type DvlaPurchase,
  type Enquiry,
  type Job,
  type Listing,
  type LogEntry,
  type Offer,
  type Payout,
  type Permission,
  type Role,
} from "@/lib/admin";
import { ASSIGN } from "@/lib/services";
import { EXTRAS, OWN_STOCK_DISCOUNT, SIZE_CHARGES, STYLES, TRADE_EXTRAS, TRADE_STYLES } from "@/lib/builder";
import { DVLA_FEE_RATE } from "@/lib/dvlaPricing";
import { DEPOSIT_RATE, MEMBER_DISCOUNT } from "@/lib/brand";
import { CAT_GROUPS, inGroup } from "@/lib/filters";
import { styleOf, type Result } from "@/lib/search";

const money = (n: number) => formatGBP(n, Number.isInteger(n));
const nameOf = (id: string) => customerById(id).name;
const staffFor = (r: Role) => STAFF.find((s) => s.role === r)?.name ?? `Example: ${roleOf(r).name}`;
const stamp = () => {
  const d = new Date();
  return `2026-11-02 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** A status word with its own colour, so a list can be scanned. */
function Tag({ tone, children }: { tone: "ok" | "wait" | "bad" | "info" | "plain"; children: ReactNode }) {
  return (
    <span className="ad-tag" data-tone={tone}>
      {children}
    </span>
  );
}

function Locked({ what }: { what: string }) {
  return (
    <div className="ad-locked" role="note">
      <b>Your role can&apos;t {what}.</b>
      <span>Ask the Owner or a Manager.</span>
    </div>
  );
}

export function AdminPortal({ tab }: { tab: AdminTab }) {
  const { go } = useMode();
  const [role, setRole] = useState<Role>("owner");
  const [orders, setOrders] = useState<AdminOrder[]>(ORDERS);
  const [dvla, setDvla] = useState<DvlaPurchase[]>(DVLA_PURCHASES);
  const [jobs, setJobs] = useState<Job[]>(JOBS);
  const [listings, setListings] = useState<Listing[]>(LISTINGS);
  const [offers, setOffers] = useState<Offer[]>(OFFERS);
  const [enquiries, setEnquiries] = useState<Enquiry[]>(ENQUIRIES);
  const [payouts, setPayouts] = useState<Payout[]>(PAYOUTS);
  const [log, setLog] = useState<LogEntry[]>(ACTIVITY);
  const [navOpen, setNavOpen] = useState(false);
  const [find, setFind] = useState("");
  const store = useStoreState();
  const allowed = (p: Permission) => can(role, p);
  const record = (what: string) => setLog((l) => [{ at: stamp(), who: staffFor(role), what }, ...l]);
  const open = (t: AdminTab) => {
    setNavOpen(false);
    go(t === "overview" ? "admin" : `admin-${t}`);
  };

  const title = ADMIN_NAV.flatMap((g) => g.items).find((i) => i.key === tab)?.label ?? "Overview";
  const may = allowed(tabNeeds(tab));

  const sp = { st: store.st, patch: store.patch, role, record };
  const waiting = (
    [
      { tab: "dvla", n: dvla.filter((d) => d.status === "waiting").length, label: "DVLA purchases in progress" },
      { tab: "production", n: jobs.filter((j) => j.status === "waiting-docs").length, label: "Plates waiting for documents" },
      { tab: "listings", n: listings.filter((l) => l.status === "review").length, label: "Listings to review" },
      { tab: "offers", n: offers.filter((o) => o.status === "new").length, label: "New offers" },
      { tab: "enquiries", n: enquiries.filter((e) => e.status === "new").length, label: "New enquiries" },
      { tab: "payouts", n: payouts.filter((x) => x.status === "ready").length, label: "Payouts ready" },
    ] as { tab: AdminTab; n: number; label: string }[]
  ).filter((w) => allowed(tabNeeds(w.tab)));
  const alerts = [
    { tab: "calls" as AdminTab, text: "2 calls booked for tomorrow" },
    ...waiting.filter((w) => w.n).map((w) => ({ tab: w.tab, text: `${w.label}: ${w.n}` })),
  ].filter((a) => allowed(tabNeeds(a.tab)));
  const page = (() => {
    if (!may) return <Locked what={`open ${title}`} />;
    switch (tab) {
      case "overview":
        return <HomeShop orders={orders} waiting={waiting} open={open} log={log} role={role} />;
      case "live":
        return <LivePage orders={orders} />;
      case "locations":
        return <LocationsPage orders={orders} />;
      case "tasks":
        return <TasksPage record={record} />;
      case "calls":
        return <CallsPage role={role} record={record} />;
      case "transfers":
        return <TransfersPage role={role} record={record} />;
      case "approvals":
        return <ApprovalsPage record={record} />;
      case "abandoned":
        return <AbandonedPage record={record} />;
      case "returns":
        return <ReturnsPage orders={orders} record={record} />;
      case "materials":
        return <MaterialsPage record={record} />;
      case "trade":
        return <TradePage record={record} />;
      case "requests":
        return <RequestsPage record={record} />;
      case "selling":
        return <SellingPage record={record} />;
      case "email":
        return <EmailPage record={record} />;
      case "reports":
        return <ReportsPage />;
      case "content":
        return <ContentPage record={record} />;
      case "records":
        return <RecordsPage />;
      case "privacy":
        return <PrivacyPage record={record} />;
      case "health":
        return <HealthPage />;
      case "orders":
        return <Orders orders={orders} setOrders={setOrders} role={role} record={record} />;
      case "dvla":
        return <Dvla rows={dvla} setRows={setDvla} role={role} record={record} />;
      case "production":
        return <Production jobs={jobs} setJobs={setJobs} role={role} record={record} />;
      case "plates":
        return <RegistrationsPage role={role} record={record} />;
      case "listings":
        return <Listings rows={listings} setRows={setListings} role={role} record={record} />;
      case "offers":
        return <Offers rows={offers} setRows={setOffers} role={role} record={record} />;
      case "enquiries":
        return <Enquiries rows={enquiries} setRows={setEnquiries} role={role} record={record} />;
      case "customers":
        return <Customers role={role} />;
      case "payouts":
        return <Payouts rows={payouts} setRows={setPayouts} role={role} record={record} />;
      case "prices":
        return <Prices role={role} />;
      case "staff":
        return <StaffPage />;
      case "products":
        return <ProductsPage {...sp} />;
      case "accessories":
        return <AccessoriesPage {...sp} />;
      case "collections":
        return <CollectionsPage {...sp} />;
      case "discounts":
        return <DiscountsPage {...sp} />;
      case "analytics":
        return <AnalyticsPage orders={orders} />;
      case "homepage":
        return <HomepagePage {...sp} />;
      case "navigation":
        return <NavigationPage {...sp} />;
      case "pages":
        return <PagesPage {...sp} />;
      case "media":
        return <MediaPage {...sp} />;
      case "seo":
        return <SeoPage {...sp} />;
      case "settings":
        return <SettingsPage {...sp} />;
      case "activity":
        return <Activity log={log} />;
    }
  })();

  const hits = find.trim()
    ? ADMIN_NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).filter((i) => allowed(i.needs) && `${i.label} ${i.group}`.toLowerCase().includes(find.trim().toLowerCase()))
    : [];

  return (
    <div className="ad ad--shop" data-admin={tab} data-nav={navOpen || undefined}>
      <header className="ad-bar">
        <button type="button" className="ad-bar__menu" aria-expanded={navOpen} aria-label="Menu" onClick={() => setNavOpen(!navOpen)} data-ad-menu>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="ad-bar__brand">
          <BrandLogo className="ad-side__logo" />
        </div>
        <div className="ad-bar__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search the admin"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) {
                open(hits[0].key);
                setFind("");
              }
            }}
            aria-label="Search the admin"
            data-ad-find
          />
          {hits.length > 0 && (
            <ul className="ad-bar__hits" role="listbox">
              {hits.slice(0, 8).map((h) => (
                <li key={h.key}>
                  <button type="button" onClick={() => (open(h.key), setFind(""))}>
                    {h.label}
                    {h.group && <small>{h.group}</small>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Bell items={alerts} open={open} />
        <label className="ad-bar__role">
          <span>Viewing as</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} data-ad-role>
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <a
          className="ad-bar__site"
          href="#buy"
          onClick={(e) => {
            e.preventDefault();
            go("buy");
          }}
        >
          View website
        </a>
      </header>
      <aside className="ad-side" aria-label="Admin">
        <nav className="ad-nav">
          {ADMIN_NAV.map((g) => {
            const items = g.items.filter((i) => allowed(i.needs));
            if (!items.length) return null;
            return (
              <div key={g.group || "top"} className="ad-nav__group">
                {g.group && <p className="ad-nav__h">{g.group}</p>}
                {items.map((i) => (
                  <a
                    key={i.key}
                    href={i.key === "overview" ? "#admin" : `#admin-${i.key}`}
                    aria-current={tab === i.key ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      open(i.key);
                    }}
                    data-ad-nav={i.key}
                  >
                    <NavIcon k={i.key} />
                    <span>{i.label}</span>
                    <Count tab={i.key} orders={orders} dvla={dvla} jobs={jobs} listings={listings} offers={offers} enquiries={enquiries} payouts={payouts} />
                  </a>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="ad-main">
        <div className="ad-head">
          <h1 className="ad-top__t">{title}</h1>
        </div>
        <p className="ad-preview" role="note">
          Preview with example records. Changes only last until you leave this page; on the live site they save and update the website.
        </p>
        <div className="ad-page">{page}</div>
      </div>
    </div>
  );
}

/** One small line icon per menu item, like Shopify's sidebar. */
function NavIcon({ k }: { k: AdminTab }) {
  const d: Partial<Record<AdminTab, string>> = {
    overview: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    orders: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3",
    dvla: "M4 7h16v10H4zM8 12h8",
    production: "M3 20h18M6 20V9l6-4 6 4v11M10 20v-5h4v5",
    products: "M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8",
    plates: "M3 8h18v8H3zM7 12h3M13 12h4",
    accessories: "M12 3v4M12 17v4M3 12h4M17 12h4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    collections: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    prices: "M4 12l8-8h8v8l-8 8zM15 8h.01",
    customers: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
    enquiries: "M4 5h16v11H8l-4 4z",
    listings: "M5 4h14v16H5zM9 8h6M9 12h6",
    offers: "M7 12h10M12 7v10",
    payouts: "M3 7h18v10H3zM12 12h.01M7 12h.01M17 12h.01",
    discounts: "M5 19L19 5M7 7h.01M17 17h.01",
    analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    homepage: "M3 5h18v14H3zM3 9h18",
    navigation: "M4 6h16M4 12h16M4 18h10",
    pages: "M6 3h9l4 4v14H6zM14 3v5h5",
    media: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6",
    seo: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2L6 8.5 4 8 3 11l2 1v0l-2 1 1 3 2-.5L7.5 16 7 18l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3z",
    staff: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.6",
    activity: "M3 12h4l3-8 4 16 3-8h4",
    live: "M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13",
    tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
    calls: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
    transfers: "M4 8h13l-3-3M20 16H7l3 3",
    approvals: "M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7zM9 12l2 2 4-4",
    abandoned: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2M10 13l4 4M14 13l-4 4",
    returns: "M9 14l-5-5 5-5M4 9h11a5 5 0 0 1 0 10h-3",
    materials: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
    locations: "M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    trade: "M3 21V8l6 4V8l6 4V4h6v17z",
    requests: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M11 8v6M8 11h6",
    selling: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    email: "M3 6h18v12H3zM3 7l9 6 9-6",
    reports: "M6 3h9l4 4v14H6zM9 17v-3M12 17v-6M15 17v-4",
    content: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01",
    records: "M5 4h14v16H5zM9 4v16M12 8h4M12 12h4",
    privacy: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
    health: "M20.5 12.5L12 21l-8.5-8.5A5 5 0 0 1 12 5.6a5 5 0 0 1 8.5 6.9zM7 12h3l2-3 2 5 1-2h2",
  };
  return (
    <svg className="ad-nav__i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d[k] ?? "M4 4h16v16H4z"} />
    </svg>
  );
}

/** Small count beside a menu item: things waiting on staff. */
function Count(p: { tab: AdminTab; orders: AdminOrder[]; dvla: DvlaPurchase[]; jobs: Job[]; listings: Listing[]; offers: Offer[]; enquiries: Enquiry[]; payouts: Payout[] }) {
  const n =
    p.tab === "dvla"
      ? p.dvla.filter((d) => d.status === "waiting").length
      : p.tab === "production"
        ? p.jobs.filter((j) => j.status !== "dispatched").length
        : p.tab === "listings"
          ? p.listings.filter((l) => l.status === "review").length
          : p.tab === "offers"
            ? p.offers.filter((o) => o.status === "new").length
            : p.tab === "enquiries"
              ? p.enquiries.filter((e) => e.status === "new").length
              : p.tab === "payouts"
                ? p.payouts.filter((x) => x.status === "ready").length
                : 0;
  return n ? <i className="ad-nav__n">{n}</i> : null;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */
function Overview(p: {
  orders: AdminOrder[];
  dvla: DvlaPurchase[];
  jobs: Job[];
  listings: Listing[];
  offers: Offer[];
  enquiries: Enquiry[];
  payouts: Payout[];
  log: LogEntry[];
  role: Role;
  open: (t: AdminTab) => void;
}) {
  type Waiting = { tab: AdminTab; n: number; label: string; line: string };
  const allWaiting: Waiting[] = [
    { tab: "dvla", n: p.dvla.filter((d) => d.status === "waiting").length, label: "DVLA purchases in progress", line: "Card held until the DVLA confirms" },
    { tab: "production", n: p.jobs.filter((j) => j.status === "waiting-docs").length, label: "Plates waiting for documents", line: "Road legal: ID and proof of the reg" },
    { tab: "production", n: p.jobs.filter((j) => j.status === "to-make").length, label: "Plates to make", line: "Ready for the workshop" },
    { tab: "listings", n: p.listings.filter((l) => l.status === "review").length, label: "Listings to review", line: "Customer plates waiting to go live" },
    { tab: "offers", n: p.offers.filter((o) => o.status === "new").length, label: "New offers", line: "On customer plates" },
    { tab: "enquiries", n: p.enquiries.filter((e) => e.status === "new").length, label: "New enquiries", line: "Not yet assigned" },
    { tab: "payouts", n: p.payouts.filter((x) => x.status === "ready").length, label: "Payouts ready", line: "Transfer complete, seller to be paid" },
  ];
  const waiting = allWaiting.filter((w) => can(p.role, tabNeeds(w.tab)));
  const today = p.orders.filter((o) => o.date >= "2026-11-01");
  return (
    <div className="ad-stack">
      <section aria-labelledby="ad-now">
        <h2 id="ad-now" className="ad-h2">
          Waiting on you
        </h2>
        <div className="ad-tiles">
          {waiting.map((w) => (
            <button key={w.label} type="button" className="ad-tile" data-zero={!w.n || undefined} onClick={() => p.open(w.tab)} data-ad-tile={w.tab}>
              <b>{w.n}</b>
              <span>{w.label}</span>
              <small>{w.line}</small>
            </button>
          ))}
        </div>
      </section>
      {can(p.role, "orders.view") && (
        <section aria-labelledby="ad-latest">
          <div className="ad-sechead">
            <h2 id="ad-latest" className="ad-h2">
              Latest orders
            </h2>
            <button type="button" className="ad-link" onClick={() => p.open("orders")}>
              All orders
            </button>
          </div>
          <OrderTable rows={today.length ? today : p.orders.slice(0, 3)} onOpen={() => p.open("orders")} />
        </section>
      )}
      {can(p.role, "activity.view") && (
        <section aria-labelledby="ad-recent">
          <h2 id="ad-recent" className="ad-h2">
            Recent activity
          </h2>
          <LogList log={p.log.slice(0, 5)} />
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
const payName: Record<AdminOrder["pay"], string> = { card: "Card", deposit: "Deposit", finance: "Payl8r finance", "pay-in-3": "Pay in 3" };
const typeName = (o: AdminOrder) =>
  o.type === "registration" ? (o.source === "dvla" ? "DVLA registration" : o.source === "customer" ? "Customer plate" : "REG KING plate") : o.type === "plates" ? "Physical plates" : "Accessories";
const statusTone = (o: AdminOrder): "ok" | "wait" | "bad" | "info" => (o.flag ? "bad" : o.stage >= orderStages(o).length - 1 ? "ok" : o.stage === 0 ? "wait" : "info");

function OrderTable({ rows, onOpen, selected }: { rows: AdminOrder[]; onOpen: (o: AdminOrder) => void; selected?: string }) {
  return (
    <div className="ad-tablewrap">
      <table className="ad-table">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Date</th>
            <th scope="col">Customer</th>
            <th scope="col">What</th>
            <th scope="col" className="is-num">
              Total
            </th>
            <th scope="col">Paid by</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} aria-selected={selected === o.id || undefined} onClick={() => onOpen(o)} data-ad-order={o.ref}>
              <td>
                <button type="button" className="ad-rowbtn" onClick={() => onOpen(o)}>
                  {o.ref}
                </button>
              </td>
              <td>{o.date.slice(5).split("-").reverse().join("/")}</td>
              <td>{nameOf(o.customer)}</td>
              <td>
                {o.reg && <span className="ad-reg">{o.reg}</span>} {typeName(o)}
              </td>
              <td className="is-num">{money(o.total)}</td>
              <td>{payName[o.pay]}</td>
              <td>
                <Tag tone={statusTone(o)}>{o.flag ? "Needs attention" : orderStages(o)[o.stage]}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Orders({ orders, setOrders, role, record }: { orders: AdminOrder[]; setOrders: (f: (o: AdminOrder[]) => AdminOrder[]) => void; role: Role; record: (w: string) => void }) {
  const [show, setShow] = useState<"all" | "registration" | "plates" | "accessories">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [refund, setRefund] = useState("");
  const rows = orders.filter((o) => show === "all" || o.type === show);
  const o = orders.find((x) => x.id === sel) ?? null;
  const update = (id: string, patch: Partial<AdminOrder>) => setOrders((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const limit = role === "owner" ? Infinity : MANAGER_REFUND_LIMIT;
  return (
    <div className="ad-split" data-open={o ? "" : undefined}>
      <div className="ad-stack">
        <div className="ad-filters" role="group" aria-label="Show">
          {(
            [
              ["all", "All"],
              ["registration", "Registrations"],
              ["plates", "Physical plates"],
              ["accessories", "Accessories"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)} data-ad-filter={k}>
              {l} <i>{k === "all" ? orders.length : orders.filter((x) => x.type === k).length}</i>
            </button>
          ))}
        </div>
        <OrderTable rows={rows} selected={sel ?? undefined} onOpen={(x) => setSel(x.id)} />
      </div>
      {o && (
        <section className="ad-panel" aria-labelledby="ad-order-t" data-ad-detail>
          <div className="ad-panel__head">
            <div>
              <h2 id="ad-order-t" className="ad-h2">
                {o.ref}
              </h2>
              <p className="ad-muted">
                {typeName(o)}, {nameOf(o.customer)}, {o.date.split("-").reverse().join("/")}
              </p>
            </div>
            <button type="button" className="ad-x" aria-label="Close order" onClick={() => setSel(null)}>
              ×
            </button>
          </div>
          {o.flag && <p className="ad-alert">{o.flag}</p>}
          <ol className="ad-steps" aria-label="Progress">
            {orderStages(o).map((s, i) => (
              <li key={s} data-state={i < o.stage ? "done" : i === o.stage ? "now" : "next"}>
                {s}
              </li>
            ))}
          </ol>
          {role !== "workshop" && (
            <div className="ad-actions">
              <button
                type="button"
                className="ad-btn"
                disabled={!can(role, "orders.update") || o.stage >= orderStages(o).length - 1 || !!o.flag}
                onClick={() => {
                  update(o.id, { stage: o.stage + 1 });
                  record(`${o.ref}: moved to "${orderStages(o)[o.stage + 1]}" (customer emailed)`);
                }}
                data-ad-next
              >
                Move to {orderStages(o)[Math.min(o.stage + 1, orderStages(o).length - 1)]}
              </button>
            </div>
          )}
          <h3 className="ad-h3">Items</h3>
          <ul className="ad-lines">
            {o.items.map((it) => (
              <li key={it.title}>
                <span>{it.title}</span>
                <b>{it.price === 0 ? "Included" : money(it.price)}</b>
              </li>
            ))}
            <li className="is-total">
              <span>Total</span>
              <b>{money(o.total)}</b>
            </li>
            <li>
              <span>Paid ({payName[o.pay]})</span>
              <b>{money(o.paid)}</b>
            </li>
            {o.paid < o.total && !o.flag && (
              <li>
                <span>Balance to pay</span>
                <b>{money(Math.round((o.total - o.paid) * 100) / 100)}</b>
              </li>
            )}
          </ul>
          {o.docs && (
            <>
              <h3 className="ad-h3">Documents (road legal plates)</h3>
              <p className="ad-muted">
                {o.docs === "checked" ? "ID and proof of the reg seen and recorded." : o.docs === "received" ? "Uploaded, not yet checked." : "Waiting for the customer to upload ID and proof of the reg. Plates can't be made until they're checked."}
              </p>
            </>
          )}
          <h3 className="ad-h3">Refund</h3>
          {can(role, "orders.refund") ? (
            <form
              className="ad-inline"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(refund);
                if (!(n > 0) || n > o.paid || n > limit) return;
                update(o.id, { paid: Math.round((o.paid - n) * 100) / 100 });
                record(`${o.ref}: refunded ${money(n)} to the original payment method`);
                setRefund("");
              }}
            >
              <label>
                <span>Amount (£)</span>
                <input inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" data-ad-refund />
              </label>
              <button type="submit" className="ad-btn ad-btn--line" disabled={!(Number(refund) > 0) || Number(refund) > o.paid || Number(refund) > limit}>
                Refund
              </button>
              <small className="ad-muted">
                {role === "owner" ? `Up to ${money(o.paid)}.` : `Managers can refund up to ${money(MANAGER_REFUND_LIMIT)}. Larger refunds need the Owner.`}
              </small>
            </form>
          ) : (
            <Locked what="refund orders" />
          )}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DVLA purchases                                                      */
/* ------------------------------------------------------------------ */
function Dvla({ rows, setRows, role, record }: { rows: DvlaPurchase[]; setRows: (f: (r: DvlaPurchase[]) => DvlaPurchase[]) => void; role: Role; record: (w: string) => void }) {
  const tone = { waiting: "wait", bought: "ok", failed: "bad", released: "plain" } as const;
  const word = { waiting: "Buying from the DVLA", bought: "Bought, card charged", failed: "Failed, needs a decision", released: "Sold elsewhere, hold released" };
  return (
    <div className="ad-stack">
      <ol className="ad-flow" aria-label="How a DVLA order runs">
        <li>Customer pays: the card is held, not charged</li>
        <li>We buy the plate from the DVLA in the customer&apos;s name</li>
        <li>DVLA confirms: the card is charged and the plate comes off the search</li>
        <li>DVLA says it&apos;s sold: the hold is released and the customer emailed</li>
      </ol>
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Plate</th>
              <th scope="col" className="is-num">
                DVLA price
              </th>
              <th scope="col" className="is-num">
                Our fee
              </th>
              <th scope="col">Certificate to</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="rk-visually-hidden">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} data-ad-dvla={d.reg}>
                <td>{d.order}</td>
                <td>
                  <span className="ad-reg">{d.reg}</span>
                </td>
                <td className="is-num">{money(d.dvlaPrice)}</td>
                <td className="is-num">{money(d.ourFee)}</td>
                <td>{d.certificateTo}</td>
                <td>
                  <Tag tone={tone[d.status]}>{word[d.status]}</Tag>
                  <small className="ad-cellnote">{d.note}</small>
                </td>
                <td>
                  {d.status === "waiting" && (
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm"
                      disabled={!can(role, "dvla.retry")}
                      onClick={() => {
                        setRows((all) => all.map((x) => (x.id === d.id ? { ...x, status: "bought", note: "Bought. DVLA reference RKX-EXAMPLE. Card charged.", at: stamp() } : x)));
                        record(`${d.order}: DVLA confirmed ${d.reg}. Card charged, plate removed from search`);
                      }}
                      data-ad-dvla-confirm
                    >
                      Check with the DVLA now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ad-muted">Every night the portal checks each DVLA order against a DVLA purchase and flags anything that doesn&apos;t match.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plate production                                                    */
/* ------------------------------------------------------------------ */
function Production({ jobs, setJobs, role, record }: { jobs: Job[]; setJobs: (f: (j: Job[]) => Job[]) => void; role: Role; record: (w: string) => void }) {
  const cols: { key: Job["status"]; label: string }[] = [
    { key: "waiting-docs", label: "Waiting for documents" },
    { key: "to-make", label: "To make" },
    { key: "made", label: "Made" },
    { key: "dispatched", label: "Sent or collected" },
  ];
  const move = (j: Job, to: Job["status"], what: string) => {
    setJobs((all) => all.map((x) => (x.id === j.id ? { ...x, status: to } : x)));
    record(`${j.order}: ${what}`);
  };
  const edit = can(role, "production.update");
  return (
    <div className="ad-board">
      {cols.map((c) => (
        <section key={c.key} className="ad-col" aria-labelledby={`ad-col-${c.key}`}>
          <h2 id={`ad-col-${c.key}`} className="ad-col__h">
            {c.label} <i>{jobs.filter((j) => j.status === c.key).length}</i>
          </h2>
          {jobs
            .filter((j) => j.status === c.key)
            .map((j) => (
              <article key={j.id} className="ad-job" data-ad-job={j.reg}>
                <div className="ad-job__plate" data-legal={j.legal || undefined}>
                  {j.reg}
                </div>
                <p>{j.spec}</p>
                <p className="ad-muted">
                  {j.order}, {j.fulfilment === "collection" ? "Collecting from the HQ" : "Delivery"}, due {j.due.slice(5).split("-").reverse().join("/")}
                </p>
                {j.status === "waiting-docs" && (
                  <button type="button" className="ad-btn ad-btn--sm" disabled={!can(role, "customers.documents")} onClick={() => move(j, "to-make", `ID and proof of ${j.reg} checked and recorded`)} data-ad-docs-ok>
                    Documents checked
                  </button>
                )}
                {j.status === "to-make" && (
                  <button type="button" className="ad-btn ad-btn--sm" disabled={!edit} onClick={() => move(j, "made", `${j.reg} plates made`)} data-ad-made>
                    Mark made
                  </button>
                )}
                {j.status === "made" && (
                  <button type="button" className="ad-btn ad-btn--sm" disabled={!edit} onClick={() => move(j, "dispatched", j.fulfilment === "collection" ? `${j.reg} collected` : `${j.reg} sent`)} data-ad-sent>
                    {j.fulfilment === "collection" ? "Mark collected" : "Mark sent"}
                  </button>
                )}
                {j.status === "waiting-docs" && !can(role, "customers.documents") && <small className="ad-muted">Support or a Manager checks documents.</small>}
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plates and stock                                                    */
/* ------------------------------------------------------------------ */
function Plates({ role, record }: { role: Role; record: (w: string) => void }) {
  const [q, setQ] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const rows = useMemo(() => regkingStock.filter((p) => !q || p.reg.replace(/\s/g, "").includes(q.toUpperCase().replace(/\s/g, ""))).slice(0, 30), [q]);
  const cats = (reg: string, price: number) => CAT_GROUPS.filter((g) => inGroup({ reg, price, style: styleOf(reg) } as Result, g.key)).map((g) => g.label);
  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <label className="ad-search">
          <span className="rk-visually-hidden">Search plates</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search REG KING stock" data-ad-search />
        </label>
        <button type="button" className="ad-btn ad-btn--line" disabled={!can(role, "plates.edit")}>
          Add a plate
        </button>
        <button type="button" className="ad-btn ad-btn--line" disabled={!can(role, "plates.edit")}>
          Import from a spreadsheet
        </button>
      </div>
      <p className="ad-muted">
        {regkingStock.length} REG KING plates from the stock snapshot. Showing {rows.length}. Categories are set by staff on the live site.
      </p>
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Plate</th>
              <th scope="col" className="is-num">
                Price
              </th>
              <th scope="col">Categories</th>
              <th scope="col">Added</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const price = prices[p.handle] ?? p.price;
              return (
                <tr key={p.handle}>
                  <td>
                    <span className="ad-reg">{p.reg}</span>
                  </td>
                  <td className="is-num">
                    {editing === p.handle ? (
                      <form
                        className="ad-pricein"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const n = Number(draft);
                          if (n > 0) {
                            setPrices((x) => ({ ...x, [p.handle]: n }));
                            record(`${p.reg}: price changed from ${money(price)} to ${money(n)}`);
                          }
                          setEditing(null);
                        }}
                      >
                        <input aria-label={`New price for ${p.reg}`} inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))} autoFocus />
                        <button type="submit" className="ad-btn ad-btn--sm">
                          Save
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="ad-rowbtn"
                        disabled={!can(role, "plates.edit")}
                        onClick={() => {
                          setEditing(p.handle);
                          setDraft(String(price));
                        }}
                        aria-label={`Change price of ${p.reg}, now ${money(price)}`}
                      >
                        {money(price)}
                      </button>
                    )}
                  </td>
                  <td className="ad-cats">{cats(p.reg, price).join(", ") || <span className="ad-muted">Not tagged</span>}</td>
                  <td>{p.added.split("-").reverse().join("/")}</td>
                  <td>
                    <Tag tone="ok">For sale</Tag>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customer listings                                                   */
/* ------------------------------------------------------------------ */
function Listings({ rows, setRows, role, record }: { rows: Listing[]; setRows: (f: (r: Listing[]) => Listing[]) => void; role: Role; record: (w: string) => void }) {
  const decide = (l: Listing, status: Listing["status"]) => {
    setRows((all) => all.map((x) => (x.id === l.id ? { ...x, status } : x)));
    record(`${status === "active" ? "Approved" : "Rejected"} listing ${l.reg} (seller emailed)`);
  };
  return (
    <div className="ad-cards">
      {rows.map((l) => (
        <article key={l.id} className="ad-card" data-ad-listing={l.reg}>
          <div className="ad-card__top">
            <span className="ad-reg ad-reg--lg">{l.reg}</span>
            <Tag tone={l.status === "active" ? "ok" : l.status === "rejected" ? "bad" : "wait"}>{l.status === "active" ? "Live" : l.status === "rejected" ? "Rejected" : "To review"}</Tag>
          </div>
          <dl className="ad-dl">
            <div>
              <dt>Seller</dt>
              <dd>{nameOf(l.seller)}</dd>
            </div>
            <div>
              <dt>Asking</dt>
              <dd>{money(l.asking)}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{l.pack}</dd>
            </div>
            <div>
              <dt>Proof of ownership</dt>
              <dd>{l.proof ? "Uploaded" : <span className="ad-warn">Missing</span>}</dd>
            </div>
          </dl>
          {l.status === "review" &&
            (can(role, "listings.approve") ? (
              <div className="ad-actions">
                <button type="button" className="ad-btn" disabled={!l.proof} onClick={() => decide(l, "active")} data-ad-approve>
                  Approve and publish
                </button>
                <button type="button" className="ad-btn ad-btn--line" onClick={() => decide(l, "rejected")} data-ad-reject>
                  Reject
                </button>
                {!l.proof && <small className="ad-muted">Needs proof of ownership before it can go live.</small>}
              </div>
            ) : (
              <Locked what="approve listings" />
            ))}
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */
function Offers({ rows, setRows, role, record }: { rows: Offer[]; setRows: (f: (r: Offer[]) => Offer[]) => void; role: Role; record: (w: string) => void }) {
  const [counter, setCounter] = useState<Record<string, string>>({});
  const set = (o: Offer, patch: Partial<Offer>, what: string) => {
    setRows((all) => all.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    record(what);
  };
  return (
    <div className="ad-stack">
      <p className="ad-muted">Offers are only taken on customer plates. Accepting sends the buyer a payment link; the seller agrees the price first.</p>
      <div className="ad-cards">
        {rows.map((o) => (
          <article key={o.id} className="ad-card" data-ad-offer={o.reg}>
            <div className="ad-card__top">
              <span className="ad-reg ad-reg--lg">{o.reg}</span>
              <Tag tone={o.status === "accepted" ? "ok" : o.status === "declined" ? "bad" : o.status === "countered" ? "info" : "wait"}>
                {o.status === "new" ? "New" : o.status === "countered" ? `Countered at ${money(o.counter ?? 0)}` : o.status === "accepted" ? "Accepted" : "Declined"}
              </Tag>
            </div>
            <dl className="ad-dl">
              <div>
                <dt>Offer</dt>
                <dd>
                  <b>{money(o.offer)}</b> ({Math.round((o.offer / o.asking) * 100)}% of asking)
                </dd>
              </div>
              <div>
                <dt>Asking</dt>
                <dd>{money(o.asking)}</dd>
              </div>
              <div>
                <dt>Buyer</dt>
                <dd>{nameOf(o.buyer)}</dd>
              </div>
              <div>
                <dt>Seller</dt>
                <dd>{nameOf(o.seller)}</dd>
              </div>
            </dl>
            {(o.status === "new" || o.status === "countered") &&
              (can(role, "offers.respond") ? (
                <div className="ad-actions">
                  <button type="button" className="ad-btn" onClick={() => set(o, { status: "accepted" }, `Accepted ${money(o.offer)} for ${o.reg}; payment link sent to the buyer`)} data-ad-accept>
                    Accept
                  </button>
                  <form
                    className="ad-inline"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = Number(counter[o.id]);
                      if (n > o.offer && n <= o.asking) set(o, { status: "countered", counter: n }, `Countered ${o.reg} at ${money(n)}`);
                    }}
                  >
                    <label>
                      <span className="rk-visually-hidden">Counter offer for {o.reg}</span>
                      <input inputMode="decimal" placeholder="Counter (£)" value={counter[o.id] ?? ""} onChange={(e) => setCounter((c) => ({ ...c, [o.id]: e.target.value.replace(/[^0-9.]/g, "") }))} />
                    </label>
                    <button type="submit" className="ad-btn ad-btn--line">
                      Counter
                    </button>
                  </form>
                  <button type="button" className="ad-btn ad-btn--line" onClick={() => set(o, { status: "declined" }, `Declined the offer on ${o.reg}`)} data-ad-decline>
                    Decline
                  </button>
                </div>
              ) : (
                <Locked what="answer offers" />
              ))}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Enquiries                                                           */
/* ------------------------------------------------------------------ */
function Enquiries({ rows, setRows, role, record }: { rows: Enquiry[]; setRows: (f: (r: Enquiry[]) => Enquiry[]) => void; role: Role; record: (w: string) => void }) {
  const [sel, setSel] = useState<string>(rows[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const e = rows.find((x) => x.id === sel);
  const set = (id: string, patch: Partial<Enquiry>) => setRows((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <div className="ad-inbox">
      <ul className="ad-inbox__list" aria-label="Enquiries">
        {rows.map((x) => (
          <li key={x.id}>
            <button type="button" aria-current={x.id === sel || undefined} onClick={() => setSel(x.id)} data-ad-enquiry={x.id}>
              <span className="ad-inbox__top">
                <b>{x.topic}</b>
                <Tag tone={x.status === "new" ? "wait" : x.status === "answered" ? "ok" : "info"}>{x.status === "new" ? "New" : x.status === "answered" ? "Answered" : `With ${roleOf(x.assignee ?? "sales").name}`}</Tag>
              </span>
              <span>{nameOf(x.from)}</span>
              <small>{x.message}</small>
            </button>
          </li>
        ))}
      </ul>
      {e && (
        <section className="ad-panel" aria-labelledby="ad-enq-t">
          <h2 id="ad-enq-t" className="ad-h2">
            {e.topic} from {nameOf(e.from)}
          </h2>
          <p className="ad-muted">
            {e.at.split(" ")[0].split("-").reverse().join("/")} at {e.at.split(" ")[1]}
            {e.reg ? `, about ${e.reg}` : ""}
          </p>
          <p className="ad-quote">{e.message}</p>
          <label className="ad-field">
            <span>Assign to</span>
            <select
              value={e.assignee ?? ""}
              disabled={!can(role, "enquiries.reply")}
              onChange={(ev) => {
                set(e.id, { assignee: ev.target.value as Role, status: e.status === "answered" ? "answered" : "assigned" });
                record(`Enquiry from ${nameOf(e.from)} assigned to ${roleOf(ev.target.value as Role).name}`);
              }}
            >
              <option value="" disabled>
                Choose
              </option>
              {ROLES.filter((r) => r.can.includes("enquiries.reply")).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {can(role, "enquiries.reply") ? (
            <form
              className="ad-reply"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!reply.trim()) return;
                set(e.id, { status: "answered" });
                record(`Replied to ${nameOf(e.from)} about ${e.topic.toLowerCase()}`);
                setReply("");
              }}
            >
              <label className="ad-field">
                <span>Reply by email</span>
                <textarea rows={4} value={reply} onChange={(ev) => setReply(ev.target.value)} data-ad-reply />
              </label>
              <button type="submit" className="ad-btn" disabled={!reply.trim()}>
                Send reply
              </button>
            </form>
          ) : (
            <Locked what="reply to enquiries" />
          )}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */
function Customers({ role }: { role: Role }) {
  return (
    <div className="ad-stack">
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Customer since</th>
              <th scope="col" className="is-num">
                Orders
              </th>
              <th scope="col" className="is-num">
                Listings
              </th>
              <th scope="col">ID documents</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOMERS.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.since.split("-").reverse().join("/")}</td>
                <td className="is-num">{c.orders}</td>
                <td className="is-num">{c.listings}</td>
                <td>{can(role, "customers.documents") ? <Tag tone={c.idChecked ? "ok" : "wait"}>{c.idChecked ? "Checked" : "Not yet"}</Tag> : <span className="ad-muted">Hidden for your role</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ad-muted">ID and V5C files open only for roles that need them, with every view recorded in the activity log.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seller payouts                                                      */
/* ------------------------------------------------------------------ */
function Payouts({ rows, setRows, role, record }: { rows: Payout[]; setRows: (f: (r: Payout[]) => Payout[]) => void; role: Role; record: (w: string) => void }) {
  return (
    <div className="ad-stack">
      <p className="ad-muted">Sellers are paid once the transfer to the buyer is complete. {PAYOUT_NOTE}</p>
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Plate</th>
              <th scope="col">Seller</th>
              <th scope="col" className="is-num">
                Sale
              </th>
              <th scope="col" className="is-num">
                Commission
              </th>
              <th scope="col" className="is-num">
                To pay
              </th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="rk-visually-hidden">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <span className="ad-reg">{x.reg}</span>
                </td>
                <td>{nameOf(x.seller)}</td>
                <td className="is-num">{money(x.sale)}</td>
                <td className="is-num">{money(x.commission)}</td>
                <td className="is-num">
                  <b>{money(Math.round((x.sale - x.commission) * 100) / 100)}</b>
                </td>
                <td>
                  <Tag tone={x.status === "paid" ? "ok" : x.status === "ready" ? "info" : "wait"}>{x.status === "paid" ? "Paid" : x.status === "ready" ? "Ready to pay" : "Waiting for transfer"}</Tag>
                </td>
                <td>
                  {x.status === "ready" && (
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm"
                      disabled={!can(role, "payouts.send")}
                      onClick={() => {
                        setRows((all) => all.map((y) => (y.id === x.id ? { ...y, status: "paid" } : y)));
                        record(`Paid ${nameOf(x.seller)} ${money(Math.round((x.sale - x.commission) * 100) / 100)} for ${x.reg} (statement emailed)`);
                      }}
                      data-ad-pay
                    >
                      Send payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!can(role, "payouts.send") && <Locked what="send payouts" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Prices (read from the same tables the site uses)                    */
/* ------------------------------------------------------------------ */
function Prices({ role }: { role: Role }) {
  const editable = can(role, "prices.edit");
  const cell = (n: number | null) => (n === null ? "On request" : money(n));
  return (
    <div className="ad-stack">
      <p className="ad-muted">
        These are the prices the website uses now. {editable ? "On the live site you change them here and the builder updates straight away." : "Only the Owner can change prices."}
      </p>
      <section aria-labelledby="ad-p-styles">
        <h2 id="ad-p-styles" className="ad-h2">
          Plate styles
        </h2>
        <div className="ad-tablewrap">
          <table className="ad-table ad-table--tight">
            <thead>
              <tr>
                <th scope="col">Style</th>
                <th scope="col" className="is-num">
                  Set
                </th>
                <th scope="col" className="is-num">
                  Single
                </th>
                <th scope="col" className="is-num">
                  Trade set
                </th>
                <th scope="col" className="is-num">
                  Trade single
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(STYLES).map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td className="is-num">{cell(s.set)}</td>
                  <td className="is-num">{cell(s.single)}</td>
                  <td className="is-num">{cell(TRADE_STYLES[s.name]?.set ?? null)}</td>
                  <td className="is-num">{cell(TRADE_STYLES[s.name]?.single ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="ad-p-extras">
        <h2 id="ad-p-extras" className="ad-h2">
          Extras and sizes (per plate)
        </h2>
        <div className="ad-tablewrap">
          <table className="ad-table ad-table--tight">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="is-num">
                  Retail
                </th>
                <th scope="col" className="is-num">
                  Trade
                </th>
              </tr>
            </thead>
            <tbody>
              {EXTRAS.map((e) => (
                <tr key={e.name}>
                  <td>{e.name}</td>
                  <td className="is-num">{cell(e.single)}</td>
                  <td className="is-num">{cell(TRADE_EXTRAS[e.name]?.single ?? null)}</td>
                </tr>
              ))}
              {Object.entries(SIZE_CHARGES).map(([k, v]) => (
                <tr key={k}>
                  <td>{k} size</td>
                  <td className="is-num">{cell(v.retail.single)}</td>
                  <td className="is-num">{cell(v.trade.single)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="ad-p-rules">
        <h2 id="ad-p-rules" className="ad-h2">
          Rules
        </h2>
        <ul className="ad-lines">
          <li>
            <span>DVLA plates: our service fee</span>
            <b>{Math.round(DVLA_FEE_RATE * 100)}% of the DVLA price</b>
          </li>
          <li>
            <span>Our plates: other styles, extras and sizes</span>
            <b>{Math.round(OWN_STOCK_DISCOUNT * 100)}% off retail</b>
          </li>
          <li>
            <span>Deposit to reserve a plate</span>
            <b>{Math.round(DEPOSIT_RATE * 100)}% of the price</b>
          </li>
          <li>
            <span>Account holder discount on made plates</span>
            <b>{Math.round(MEMBER_DISCOUNT * 100)}%</b>
          </li>
          <li>
            <span>{ASSIGN.name}</span>
            <b>{money(ASSIGN.price)}</b>
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Staff and roles                                                     */
/* ------------------------------------------------------------------ */
const PERM_LABELS: { p: Permission; label: string }[] = [
  { p: "orders.update", label: "Update orders" },
  { p: "orders.refund", label: "Refund" },
  { p: "dvla.retry", label: "Run DVLA purchases" },
  { p: "production.update", label: "Plate production" },
  { p: "plates.edit", label: "Edit plates and prices" },
  { p: "listings.approve", label: "Approve listings" },
  { p: "offers.respond", label: "Answer offers" },
  { p: "enquiries.reply", label: "Reply to enquiries" },
  { p: "customers.documents", label: "See ID documents" },
  { p: "payouts.send", label: "Pay sellers" },
  { p: "prices.edit", label: "Change price rules" },
  { p: "discounts.edit", label: "Discounts" },
  { p: "store.edit", label: "Edit the online store" },
  { p: "analytics.view", label: "See analytics" },
  { p: "settings.manage", label: "Store settings" },
  { p: "staff.manage", label: "Manage staff" },
];
function StaffPage() {
  return (
    <div className="ad-stack">
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Two-step sign-in</th>
              <th scope="col">Last signed in</th>
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{roleOf(s.role).name}</td>
                <td>{s.twoStep ? <Tag tone="ok">On</Tag> : <Tag tone="bad">Off: ask them to turn it on</Tag>}</td>
                <td>{s.lastIn.split(" ")[0].split("-").reverse().join("/")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="ad-roles">
        <h2 id="ad-roles" className="ad-h2">
          What each role can do
        </h2>
        <div className="ad-tablewrap">
          <table className="ad-table ad-table--matrix">
            <thead>
              <tr>
                <th scope="col">Can</th>
                {ROLES.map((r) => (
                  <th key={r.key} scope="col">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_LABELS.map(({ p, label }) => (
                <tr key={p}>
                  <th scope="row">{label}</th>
                  {ROLES.map((r) => (
                    <td key={r.key} data-yes={r.can.includes(p) || undefined}>
                      {r.can.includes(p) ? "Yes" : "No"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ad-muted">Refunds by a Manager are limited to {money(MANAGER_REFUND_LIMIT)} each (to confirm).</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity log                                                        */
/* ------------------------------------------------------------------ */
function LogList({ log }: { log: LogEntry[] }) {
  return (
    <ol className="ad-log">
      {log.map((l, i) => (
        <li key={`${l.at}-${i}`}>
          <time>{l.at.split(" ")[0].split("-").reverse().join("/")} {l.at.split(" ")[1]}</time>
          <b>{l.who}</b>
          <span>{l.what}</span>
        </li>
      ))}
    </ol>
  );
}
function Activity({ log }: { log: LogEntry[] }) {
  return (
    <div className="ad-stack">
      <p className="ad-muted">Every change, by whom and when. Entries can&apos;t be edited or deleted.</p>
      <LogList log={log} />
    </div>
  );
}

export const isAdminTab = (t: string): t is AdminTab => (ADMIN_TABS as string[]).includes(t);
