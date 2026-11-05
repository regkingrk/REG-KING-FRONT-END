/**
 * REG KING admin portal: staff roles, what each can do, and the records staff work on.
 *
 * PREVIEW: every record below is an EXAMPLE so the screens can be designed and tested. Plates and
 * prices come from the real stock snapshot (lib/stock.ts); customers, orders, offers and enquiries
 * are made up and the portal says so on every screen. On the live site all of this comes from the
 * database (see the developer brief), and every action is checked on the server, not just hidden.
 */
import { customerPlates, regkingStock } from "./stock";
import { stagesFor, type OrderType } from "./portal";

/* ------------------------------------------------------------------ */
/* Staff roles                                                         */
/* ------------------------------------------------------------------ */
export type Role = "owner" | "manager" | "sales" | "support" | "workshop";

/** Everything a member of staff can do. Each screen and button asks for one of these. */
export type Permission =
  | "orders.view"
  | "orders.update"
  | "orders.refund"
  | "dvla.view"
  | "dvla.retry"
  | "production.view"
  | "production.update"
  | "plates.view"
  | "plates.edit"
  | "listings.view"
  | "listings.approve"
  | "offers.view"
  | "offers.respond"
  | "enquiries.view"
  | "enquiries.reply"
  | "customers.view"
  | "customers.documents"
  | "payouts.view"
  | "payouts.send"
  | "prices.edit"
  | "staff.manage"
  | "activity.view"
  | "store.edit"
  | "discounts.edit"
  | "analytics.view"
  | "settings.manage";

export const ROLES: { key: Role; name: string; line: string; can: Permission[] }[] = [
  {
    key: "owner",
    name: "Owner",
    line: "Everything, including staff, prices, refunds and payouts",
    can: [
      "orders.view", "orders.update", "orders.refund", "dvla.view", "dvla.retry", "production.view", "production.update",
      "plates.view", "plates.edit", "listings.view", "listings.approve", "offers.view", "offers.respond", "enquiries.view",
      "enquiries.reply", "customers.view", "customers.documents", "payouts.view", "payouts.send", "prices.edit", "staff.manage", "activity.view",
      "store.edit", "discounts.edit", "analytics.view", "settings.manage",
    ],
  },
  {
    key: "manager",
    name: "Manager",
    line: "Runs the day to day: plates, listings, offers, orders and refunds up to a limit",
    can: [
      "orders.view", "orders.update", "orders.refund", "dvla.view", "dvla.retry", "production.view", "production.update",
      "plates.view", "plates.edit", "listings.view", "listings.approve", "offers.view", "offers.respond", "enquiries.view",
      "enquiries.reply", "customers.view", "customers.documents", "payouts.view", "activity.view", "store.edit", "discounts.edit", "analytics.view",
    ],
  },
  {
    key: "sales",
    name: "Sales",
    line: "Enquiries, offers and orders. Can't change prices, refund or approve listings",
    can: ["orders.view", "orders.update", "dvla.view", "plates.view", "listings.view", "offers.view", "offers.respond", "enquiries.view", "enquiries.reply", "customers.view"],
  },
  {
    key: "support",
    name: "Support",
    line: "Messages, order updates and documents",
    can: ["orders.view", "orders.update", "dvla.view", "enquiries.view", "enquiries.reply", "customers.view", "customers.documents"],
  },
  {
    key: "workshop",
    name: "Workshop",
    line: "The plate production queue and dispatch",
    can: ["production.view", "production.update", "orders.view"],
  },
];
export const roleOf = (r: Role) => ROLES.find((x) => x.key === r)!;
export const can = (r: Role, p: Permission) => roleOf(r).can.includes(p);
/** CONFIRM with REG KING: the most a Manager can refund without the Owner. */
export const MANAGER_REFUND_LIMIT = 250;

/* ------------------------------------------------------------------ */
/* The portal's pages                                                  */
/* ------------------------------------------------------------------ */
export type AdminTab =
  | "overview"
  | "live"
  | "tasks"
  | "calls"
  | "transfers"
  | "approvals"
  | "returns"
  | "abandoned"
  | "materials"
  | "locations"
  | "trade"
  | "requests"
  | "selling"
  | "email"
  | "reports"
  | "content"
  | "records"
  | "privacy"
  | "health"
  | "orders"
  | "dvla"
  | "production"
  | "products"
  | "plates"
  | "accessories"
  | "collections"
  | "prices"
  | "customers"
  | "enquiries"
  | "listings"
  | "offers"
  | "payouts"
  | "discounts"
  | "analytics"
  | "homepage"
  | "navigation"
  | "pages"
  | "media"
  | "seo"
  | "settings"
  | "staff"
  | "activity";

/** The menu, grouped like Shopify's: orders, products, customers, marketing, the online store, settings. */
export const ADMIN_NAV: { group: string; items: { key: AdminTab; label: string; needs: Permission }[] }[] = [
  {
    group: "",
    items: [
      { key: "overview", label: "Home", needs: "orders.view" },
      { key: "live", label: "Live view", needs: "analytics.view" },
      { key: "tasks", label: "Team tasks", needs: "orders.view" },
    ],
  },
  {
    group: "Orders",
    items: [
      { key: "orders", label: "Orders", needs: "orders.view" },
      { key: "calls", label: "Booked calls", needs: "orders.view" },
      { key: "dvla", label: "DVLA purchases", needs: "dvla.view" },
      { key: "transfers", label: "Transfers", needs: "orders.view" },
      { key: "production", label: "Plate production", needs: "production.view" },
      { key: "approvals", label: "Logo approvals", needs: "production.view" },
      { key: "abandoned", label: "Abandoned baskets", needs: "enquiries.view" },
      { key: "returns", label: "Returns & refunds", needs: "orders.refund" },
    ],
  },
  {
    group: "Products",
    items: [
      { key: "plates", label: "Registrations", needs: "plates.view" },
      { key: "products", label: "Plate styles", needs: "plates.view" },
      { key: "accessories", label: "Accessories", needs: "plates.view" },
      { key: "collections", label: "Categories", needs: "plates.view" },
      { key: "prices", label: "Price list", needs: "plates.view" },
      { key: "materials", label: "Workshop materials", needs: "production.view" },
    ],
  },
  {
    group: "Customers",
    items: [
      { key: "customers", label: "Customers", needs: "customers.view" },
      { key: "locations", label: "Where customers are", needs: "analytics.view" },
      { key: "trade", label: "Trade accounts", needs: "customers.view" },
      { key: "enquiries", label: "Enquiries", needs: "enquiries.view" },
      { key: "requests", label: "Sourcing & brokerage", needs: "enquiries.view" },
      { key: "listings", label: "Customer listings", needs: "listings.view" },
      { key: "offers", label: "Offers", needs: "offers.view" },
      { key: "payouts", label: "Seller payouts", needs: "payouts.view" },
      { key: "selling", label: "Selling packages", needs: "prices.edit" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { key: "discounts", label: "Discounts", needs: "discounts.edit" },
      { key: "email", label: "Email marketing", needs: "discounts.edit" },
      { key: "analytics", label: "Analytics", needs: "analytics.view" },
      { key: "reports", label: "Reports", needs: "analytics.view" },
    ],
  },
  {
    group: "Online store",
    items: [
      { key: "homepage", label: "Homepage", needs: "store.edit" },
      { key: "navigation", label: "Menus", needs: "store.edit" },
      { key: "pages", label: "Pages", needs: "store.edit" },
      { key: "content", label: "FAQs, team & reviews", needs: "store.edit" },
      { key: "media", label: "Photos & files", needs: "store.edit" },
      { key: "seo", label: "SEO & redirects", needs: "store.edit" },
    ],
  },
  {
    group: "Settings",
    items: [
      { key: "settings", label: "Store settings", needs: "settings.manage" },
      { key: "staff", label: "Staff & roles", needs: "staff.manage" },
      { key: "records", label: "Road legal records", needs: "production.view" },
      { key: "privacy", label: "Privacy requests", needs: "customers.documents" },
      { key: "health", label: "Website health", needs: "settings.manage" },
      { key: "activity", label: "Activity log", needs: "activity.view" },
    ],
  },
];
export const ADMIN_TABS = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.key));
export const tabNeeds = (t: AdminTab) => ADMIN_NAV.flatMap((g) => g.items).find((i) => i.key === t)!.needs;

/* ------------------------------------------------------------------ */
/* Example records                                                     */
/* ------------------------------------------------------------------ */
export const TODAY = "2026-11-02";

const ours = (i: number) => regkingStock[i % regkingStock.length];
const theirs = (i: number) => customerPlates[i % customerPlates.length];

export type Customer = { id: string; name: string; email: string; phone: string; since: string; orders: number; listings: number; idChecked: boolean };
export const CUSTOMERS: Customer[] = [
  { id: "c1", name: "Example: Daniel Hughes", email: "daniel@example.com", phone: "07700 900101", since: "2025-03-14", orders: 2, listings: 0, idChecked: true },
  { id: "c2", name: "Example: Priya Sandhu", email: "priya@example.com", phone: "07700 900102", since: "2026-06-02", orders: 1, listings: 1, idChecked: true },
  { id: "c3", name: "Example: Marcus Reid", email: "marcus@example.com", phone: "07700 900103", since: "2026-10-30", orders: 1, listings: 0, idChecked: false },
  { id: "c4", name: "Example: Sofia Ahmed", email: "sofia@example.com", phone: "07700 900104", since: "2024-11-19", orders: 3, listings: 2, idChecked: true },
  { id: "c5", name: "Example: Tom Gill", email: "tom@example.com", phone: "07700 900105", since: "2026-11-01", orders: 1, listings: 0, idChecked: false },
];
export const customerById = (id: string) => CUSTOMERS.find((c) => c.id === id)!;

export type PayMethod = "card" | "deposit" | "finance" | "pay-in-3";
export type AdminOrder = {
  id: string;
  ref: string;
  date: string;
  customer: string;
  type: OrderType;
  source?: "regking" | "customer" | "dvla";
  reg: string;
  items: { title: string; price: number }[];
  total: number;
  paid: number;
  pay: PayMethod;
  fulfilment?: "delivery" | "collection";
  stage: number;
  /** Road legal plates: ID and proof of entitlement seen (registered number plate supplier rules). */
  docs?: "needed" | "received" | "checked";
  flag?: string;
};

export const ORDERS: AdminOrder[] = [
  {
    id: "o1", ref: "RK-1048", date: "2026-11-02", customer: "c5", type: "registration", source: "dvla", reg: "AL24 KNG",
    items: [{ title: "AL24 KNG (new from the DVLA)", price: 499 }], total: 499, paid: 499, pay: "card", stage: 1,
  },
  {
    id: "o2", ref: "RK-1047", date: "2026-11-01", customer: "c3", type: "plates", reg: "MR15 RID",
    items: [{ title: "Retro set (pair)", price: 70 }, { title: "Hex size (pair)", price: 10 }, { title: "Standard delivery", price: 3.99 }],
    total: 83.99, paid: 83.99, pay: "card", fulfilment: "delivery", stage: 0, docs: "needed",
  },
  {
    id: "o3", ref: "RK-1046", date: "2026-10-31", customer: "c1", type: "registration", source: "regking", reg: ours(0).reg,
    items: [{ title: `${ours(0).reg} (REG KING stock)`, price: ours(0).price }, { title: "4D 3MM set (included)", price: 0 }],
    total: ours(0).price, paid: Math.round(ours(0).price * 0.1 * 100) / 100, pay: "deposit", stage: 1,
  },
  {
    id: "o4", ref: "RK-1045", date: "2026-10-30", customer: "c2", type: "registration", source: "customer", reg: theirs(2).reg,
    items: [{ title: `${theirs(2).reg} (customer plate)`, price: theirs(2).price }, { title: "Plate Assignment Management", price: 29.99 }],
    total: theirs(2).price + 29.99, paid: theirs(2).price + 29.99, pay: "finance", stage: 3,
  },
  {
    id: "o5", ref: "RK-1044", date: "2026-10-29", customer: "c4", type: "plates", reg: "S0 FIA",
    items: [{ title: "3D Gel set (pair)", price: 35 }, { title: "UK Badge (pair)", price: 10 }],
    total: 45, paid: 45, pay: "card", fulfilment: "collection", stage: 1, docs: "checked",
  },
  {
    id: "o6", ref: "RK-1043", date: "2026-10-28", customer: "c4", type: "accessories", reg: "",
    items: [{ title: "Screw Kit", price: 1.99 }, { title: "Sticky Pads ×10", price: 1.99 }, { title: "Standard delivery", price: 3.99 }],
    total: 7.97, paid: 7.97, pay: "card", fulfilment: "delivery", stage: 2,
  },
  {
    id: "o7", ref: "RK-1042", date: "2026-10-27", customer: "c1", type: "registration", source: "dvla", reg: "DH25 RKS",
    items: [{ title: "DH25 RKS (new from the DVLA)", price: 329 }], total: 329, paid: 0, pay: "card", stage: 0,
    flag: "The DVLA sold this plate before we could buy it. Card hold released, customer emailed.",
  },
];
export const orderStages = (o: AdminOrder) => stagesFor({ type: o.type, fulfilment: o.fulfilment, source: o.source === "dvla" ? "dvla" : undefined });

export type DvlaPurchase = { id: string; order: string; reg: string; dvlaPrice: number; ourFee: number; status: "waiting" | "bought" | "failed" | "released"; at: string; note: string; certificateTo: string };
export const DVLA_PURCHASES: DvlaPurchase[] = [
  { id: "d1", order: "RK-1048", reg: "AL24 KNG", dvlaPrice: 453.64, ourFee: 45.36, status: "waiting", at: "2026-11-02 09:41", note: "Card held. Buying from the DVLA now.", certificateTo: "Example: Tom Gill" },
  { id: "d2", order: "RK-1042", reg: "DH25 RKS", dvlaPrice: 299.09, ourFee: 29.91, status: "released", at: "2026-10-27 14:05", note: "DVLA: already sold. Card hold released.", certificateTo: "Example: Daniel Hughes" },
  { id: "d3", order: "RK-1039", reg: "SA26 HMD", dvlaPrice: 399.09, ourFee: 39.91, status: "bought", at: "2026-10-24 11:12", note: "Bought. DVLA reference RKX-EXAMPLE-0393. Card charged.", certificateTo: "Example: Sofia Ahmed" },
];

export type Job = { id: string; order: string; reg: string; spec: string; legal: boolean; fulfilment: "delivery" | "collection"; due: string; status: "waiting-docs" | "to-make" | "made" | "dispatched" };
export const JOBS: Job[] = [
  { id: "j1", order: "RK-1047", reg: "MR15 RID", spec: "Retro, set, Hex Normal front and rear, road legal", legal: true, fulfilment: "delivery", due: "2026-11-05", status: "waiting-docs" },
  { id: "j2", order: "RK-1044", reg: "S0 FIA", spec: "3D Gel, set, standard 520mm, UK badge, road legal", legal: true, fulfilment: "collection", due: "2026-11-03", status: "to-make" },
  { id: "j3", order: "RK-1041", reg: "BIG BOSS", spec: "4D Gel 3MM, single rear, 18 inch, show plate, custom text", legal: false, fulfilment: "delivery", due: "2026-11-04", status: "to-make" },
  { id: "j4", order: "RK-1040", reg: "AD12 ANN", spec: "Printed, set, standard 520mm, road legal", legal: true, fulfilment: "delivery", due: "2026-11-01", status: "made" },
];

export type Listing = { id: string; reg: string; seller: string; asking: number; pack: string; submitted: string; proof: boolean; status: "review" | "active" | "rejected" };
export const LISTINGS: Listing[] = [
  { id: "l1", reg: theirs(10).reg, seller: "c2", asking: theirs(10).price, pack: "Commission", submitted: "2026-11-01", proof: true, status: "review" },
  { id: "l2", reg: theirs(11).reg, seller: "c4", asking: theirs(11).price, pack: "Increased price", submitted: "2026-10-31", proof: false, status: "review" },
  { id: "l3", reg: theirs(12).reg, seller: "c4", asking: theirs(12).price, pack: "Commission", submitted: "2026-10-20", proof: true, status: "active" },
];

export type Offer = { id: string; reg: string; seller: string; buyer: string; asking: number; offer: number; at: string; status: "new" | "countered" | "accepted" | "declined"; counter?: number };
export const OFFERS: Offer[] = [
  { id: "f1", reg: theirs(3).reg, seller: "c4", buyer: "c1", asking: theirs(3).price, offer: Math.round(theirs(3).price * 0.8), at: "2026-11-02 08:15", status: "new" },
  { id: "f2", reg: theirs(5).reg, seller: "c2", buyer: "c3", asking: theirs(5).price, offer: Math.round(theirs(5).price * 0.9), at: "2026-11-01 19:40", status: "new" },
  { id: "f3", reg: theirs(7).reg, seller: "c4", buyer: "c5", asking: theirs(7).price, offer: Math.round(theirs(7).price * 0.7), at: "2026-10-30 12:02", status: "countered", counter: Math.round(theirs(7).price * 0.85) },
];

export type Enquiry = { id: string; topic: string; from: string; reg?: string; message: string; at: string; status: "new" | "assigned" | "answered"; assignee?: Role };
export const ENQUIRIES: Enquiry[] = [
  { id: "e1", topic: "Valuation", from: "c3", reg: "MR 15", message: "What would my plate be worth? It's on retention.", at: "2026-11-02 09:02", status: "new" },
  { id: "e2", topic: "Sourcing", from: "c1", message: "Looking for anything with DAN in it, budget around £3,000.", at: "2026-11-01 16:30", status: "assigned", assignee: "sales" },
  { id: "e3", topic: "Order help", from: "c4", reg: "S0 FIA", message: "Can I collect my plates on Saturday?", at: "2026-11-01 11:12", status: "new" },
  { id: "e4", topic: "Brokerage", from: "c2", reg: theirs(10).reg, message: "Would you handle the sale for me?", at: "2026-10-31 10:45", status: "answered", assignee: "manager" },
];

export type Payout = { id: string; reg: string; seller: string; sale: number; commission: number; status: "waiting-transfer" | "ready" | "paid"; at: string };
export const PAYOUTS: Payout[] = [
  { id: "p1", reg: theirs(2).reg, seller: "c2", sale: theirs(2).price, commission: Math.round(theirs(2).price * 0.1 * 100) / 100, status: "waiting-transfer", at: "2026-10-30" },
  { id: "p2", reg: theirs(20).reg, seller: "c4", sale: theirs(20).price, commission: Math.round(theirs(20).price * 0.1 * 100) / 100, status: "ready", at: "2026-10-22" },
  { id: "p3", reg: theirs(21).reg, seller: "c4", sale: theirs(21).price, commission: Math.round(theirs(21).price * 0.1 * 100) / 100, status: "paid", at: "2026-10-12" },
];
/** CONFIRM with REG KING: commission on each selling package (the example uses 10%). */
export const PAYOUT_NOTE = "Commission shown at 10% for the example. Set the real rate for each selling package.";

export type Staff = { id: string; name: string; email: string; role: Role; twoStep: boolean; lastIn: string };
export const STAFF: Staff[] = [
  { id: "s1", name: "Example: Owner", email: "owner@regking.co.uk", role: "owner", twoStep: true, lastIn: "2026-11-02 08:50" },
  { id: "s2", name: "Example: Manager", email: "manager@regking.co.uk", role: "manager", twoStep: true, lastIn: "2026-11-02 08:31" },
  { id: "s3", name: "Example: Sales", email: "sales@regking.co.uk", role: "sales", twoStep: true, lastIn: "2026-11-01 17:02" },
  { id: "s4", name: "Example: Workshop", email: "workshop@regking.co.uk", role: "workshop", twoStep: false, lastIn: "2026-11-02 07:58" },
];

export type LogEntry = { at: string; who: string; what: string };
export const ACTIVITY: LogEntry[] = [
  { at: "2026-11-02 09:41", who: "System", what: "RK-1048: card held, DVLA purchase of AL24 KNG started" },
  { at: "2026-11-02 08:52", who: "Example: Owner", what: "Signed in (two-step)" },
  { at: "2026-11-01 17:10", who: "Example: Sales", what: `Enquiry from Example: Daniel Hughes assigned to Sales` },
  { at: "2026-10-31 12:00", who: "Example: Manager", what: `Approved listing ${theirs(12).reg}` },
  { at: "2026-10-27 14:05", who: "System", what: "RK-1042: DVLA said DH25 RKS was already sold. Card hold released, customer emailed" },
];

export const OUR_STOCK_COUNT = regkingStock.length;
export const CUSTOMER_STOCK_COUNT = customerPlates.length;
export { regkingStock, customerPlates };
