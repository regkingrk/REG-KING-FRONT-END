/**
 * Customer portal (phase one): types, settings REG KING can change, and the demo account.
 *
 * HOW IT CONNECTS TO SHOPIFY AT LAUNCH (not connected in this preview)
 * - Sign-in: Shopify customer accounts through the Customer Account API (OAuth 2.0 with PKCE,
 *   passwordless one-time email code hosted by Shopify). No passwords are built or stored here.
 *   Endpoints come from the shop's discovery URLs (/.well-known/openid-configuration and
 *   /.well-known/customer-account-api). Needs the custom domain set as the callback URL.
 * - My Orders: the signed-in customer's own orders from the Customer Account API (line items,
 *   financial status, fulfilments and tracking, order status page for the receipt). Assignment
 *   progress for registrations comes from order metafields the team updates in Shopify admin.
 * - Seller submissions and change requests: saved as Shopify metaobjects (one entry per plate,
 *   one per request) by a server route using the Admin API, each linked to the customer's ID.
 *   The server checks the customer's Customer Account API token first and only ever reads or
 *   writes records for that customer. The team reviews them in Shopify admin > Content > Metaobjects.
 * - Documents: kept in private storage and opened through short-lived signed links checked
 *   against the signed-in customer, never as public file URLs.
 * - Wishlist: a customer metafield (list of product handles), read and written for that customer only.
 */

import { sellOptions, type SellOption } from "./brand";

/* ------------------------------------------------------------------ */
/* Selling packages: descriptions and fees come from lib/brand.ts.     */
/* Terms are REG KING's own wording, added here before launch.         */
/* ------------------------------------------------------------------ */

export type Package = {
  key: SellOption;
  title: string;
  line: string;
  fee: string;
  /** REG KING's terms for this package, one paragraph per entry. null until supplied. */
  terms: string[] | null;
  /** Saved with every submission so we know which wording the customer accepted. */
  termsVersion: string;
};

// CONFIRM: add REG KING's own terms for each package and bump the version. The pre-launch check fails while any are null.
const TERMS: Record<SellOption, { terms: string[] | null; version: string }> = {
  uplift: { terms: null, version: "draft" },
  commission: { terms: null, version: "draft" },
};

export const PACKAGES: Package[] = sellOptions.map((o) => ({
  key: o.key,
  title: o.title,
  line: o.line,
  fee: o.fee,
  terms: TERMS[o.key].terms,
  termsVersion: TERMS[o.key].version,
}));
export const packageOf = (k: SellOption) => PACKAGES.find((p) => p.key === k) ?? PACKAGES[0];

/* ------------------------------------------------------------------ */
/* Seller submissions                                                   */
/* ------------------------------------------------------------------ */

export const MEANINGS = ["Name", "Initials", "Word", "Business", "Number", "Other", "Unsure"] as const;
export type Meaning = (typeof MEANINGS)[number];

export type ListingStatus = "review" | "active" | "reserved" | "sold" | "withdrawn";
export const LISTING_STATUS: Record<ListingStatus, { label: string; line: string }> = {
  review: { label: "Under review", line: "We're checking the details. It isn't on the site yet." },
  active: { label: "Active", line: "Advertised on the REG KING site." },
  reserved: { label: "Reserved", line: "A buyer has reserved this plate. We'll be in touch." },
  sold: { label: "Sold", line: "The sale is complete." },
  withdrawn: { label: "Withdrawn", line: "No longer for sale with REG KING." },
};

export type ChangeRequest = {
  id: string;
  kind: "price" | "removal" | "edit";
  /** price: the new amount asked for */
  amount?: number;
  /** removal: the reason picked, plus any note */
  reason?: string;
  /** "edit": each change asked for, in words ("Open to offers: No"). */
  changes?: string[];
  note?: string;
  status: "pending" | "approved" | "declined";
  created: string;
};

export type PlateDraft = {
  reg: string;
  meaning: Meaning | "";
  /** What the plate means, e.g. the name or word. Optional. */
  meaningText: string;
  held: "vehicle" | "retention" | "";
  /** The amount the seller wants to receive. null with `unsure` ticked. */
  desired: number | null;
  unsure: boolean;
  offers: "yes" | "no" | "";
  elsewhere: "yes" | "no" | "";
  elsewhereWhere: string;
  elsewherePrice: number | null;
  authorised: boolean;
  pkg: SellOption | "";
  termsAccepted: boolean;
};

export const emptyPlate = (reg = "", pkg: SellOption | "" = ""): PlateDraft => ({
  reg,
  meaning: "",
  meaningText: "",
  held: "",
  desired: null,
  unsure: false,
  offers: "",
  elsewhere: "",
  elsewhereWhere: "",
  elsewherePrice: null,
  authorised: false,
  pkg,
  termsAccepted: false,
});

/** One plate, one submission: its own reference, package, accepted terms and status. */
export type Submission = Omit<PlateDraft, "authorised" | "termsAccepted"> & {
  id: string;
  ref: string;
  termsVersion: string;
  termsAcceptedAt: string;
  submittedAt: string;
  status: ListingStatus;
  /** Set by REG KING once it's advertised. */
  advertised: number | null;
  requests: ChangeRequest[];
  /** Once sold: where the transfer is (index into SALE_STAGES) and the seller's payout. */
  sale?: { stage: number; payout: "pending" | "paid"; paidOn?: string };
};

/** What's wrong with a plate draft, field by field (empty when it's ready). */
export function plateErrors(p: PlateDraft, others: string[] = []): Partial<Record<keyof PlateDraft, string>> {
  const e: Partial<Record<keyof PlateDraft, string>> = {};
  const reg = cleanReg(p.reg);
  if (reg.replace(/\s/g, "").length < 2) e.reg = "Enter the registration";
  else if (others.includes(reg)) e.reg = "You've already added this registration";
  if (!p.meaning) e.meaning = "Choose what the plate means, or Unsure";
  if (!p.held) e.held = "Choose where the plate is now";
  if (!p.unsure && !(p.desired && p.desired > 0)) e.desired = "Enter the amount you'd like to receive";
  if (!p.offers) e.offers = "Choose yes or no";
  if (!p.elsewhere) e.elsewhere = "Choose yes or no";
  if (p.elsewhere === "yes" && !p.elsewhereWhere.trim()) e.elsewhereWhere = "Tell us where it's listed";
  if (p.elsewhere === "yes" && !(p.elsewherePrice && p.elsewherePrice > 0)) e.elsewherePrice = "Enter the price it's advertised at there";
  if (!p.authorised) e.authorised = "Please confirm you're authorised to sell this registration";
  if (!p.pkg) e.pkg = "Choose how you'd like to sell";
  else if (!p.termsAccepted) e.termsAccepted = "Please read and accept the terms for this option";
  return e;
}

/* ------------------------------------------------------------------ */
/* Orders                                                               */
/* ------------------------------------------------------------------ */

export type OrderType = "registration" | "plates" | "accessories";
export type Order = {
  id: string;
  /** Shopify order name, e.g. #1042 */
  ref: string;
  date: string;
  type: OrderType;
  reg: string;
  items: { title: string; qty: number; price: number }[];
  total: number;
  paid: number;
  /** Physical plates: delivered or collected from the HQ. */
  fulfilment?: "delivery" | "collection";
  /** Index of the current stage in stagesFor(order). */
  stage: number;
  /** What happens next, in a sentence. `act` marks something the customer needs to do. */
  next: { text: string; act?: boolean };
  tracking?: { carrier: string; number: string; url: string };
  documents: { name: string; kind: "receipt" | "document" }[];
  /** Documents the customer needs to upload for this order (an action until they're in). */
  needs?: ("V5C" | "V750" | "V778" | "ID")[];
  /** A registration bought new from the DVLA (tagged "DVLA" in Shopify). */
  source?: "dvla";
};

/** A sold listing: the registration moving to its buyer. */
export const SALE_STAGES = ["Sold", "Documents received", "With the DVLA", "Transfer complete"];

/** Progress stages that fit each kind of order. */
export function stagesFor(o: Pick<Order, "type" | "fulfilment" | "source">): string[] {
  // CONFIRM with REG KING: the steps for a DVLA purchase.
  if (o.type === "registration" && o.source === "dvla") return ["Order placed", "Payment received", "Bought from the DVLA", "Certificate posted by the DVLA", "Complete"];
  if (o.type === "registration") return ["Order placed", "Payment received", "Documents checked", "With the DVLA", "Assigned to your vehicle", "Complete"];
  return o.fulfilment === "collection"
    ? ["Order placed", "Being made", "Ready to collect", "Collected"]
    : ["Order placed", "Being made", "Dispatched", "Delivered"];
}
export const orderStatus = (o: Order) => stagesFor(o)[Math.min(o.stage, stagesFor(o).length - 1)];
export const orderTypeLabel = (t: OrderType) => (t === "registration" ? "Registration" : t === "accessories" ? "Accessories" : "Physical plates");

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export const cleanReg = (r: string) => r.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
export const newId = () => Math.random().toString(36).slice(2, 10);
/** A submission reference: RK-S- and 6 characters. PROTOTYPE: the server issues these at launch. */
export const newRef = () => "RK-S-" + Math.random().toString(36).slice(2, 8).toUpperCase();
export const isoNow = () => new Date().toISOString();
const isoDay = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString();

export function niceDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

/* ------------------------------------------------------------------ */
/* Demo account (labelled as a demo everywhere it shows)               */
/* ------------------------------------------------------------------ */

export function demoOrders(): Order[] {
  return [
    {
      id: "do1",
      ref: "#DEMO-1042",
      date: isoDay(-3),
      type: "registration",
      reg: "K1 NGS",
      items: [
        { title: "K1 NGS registration", qty: 1, price: 7995 },
        { title: "Number plates (set)", qty: 1, price: 0 },
      ],
      total: 7995,
      paid: 799.5,
      stage: 2,
      next: { text: "Please upload your V5C logbook so we can assign K1 NGS to your vehicle.", act: true },
      needs: ["V5C"],
      documents: [{ name: "Deposit receipt", kind: "receipt" }],
    },
    {
      id: "do2",
      ref: "#DEMO-1038",
      date: isoDay(-9),
      type: "plates",
      reg: "AB12 CDE",
      items: [
        { title: "4D Raised plates (set)", qty: 1, price: 64.99 },
        { title: "Sticky pad kit", qty: 1, price: 0 },
      ],
      total: 64.99,
      paid: 64.99,
      fulfilment: "delivery",
      stage: 2,
      next: { text: "Your plates are on their way with Royal Mail Special Delivery." },
      tracking: { carrier: "Royal Mail", number: "DEMO 1234 5678 9GB", url: "https://www.royalmail.com/track-your-item" },
      documents: [{ name: "Receipt", kind: "receipt" }],
    },
    {
      id: "do6",
      ref: "#DEMO-1049",
      date: isoDay(-2),
      type: "registration",
      source: "dvla",
      reg: "AL24 KNG",
      items: [{ title: "AL24 KNG registration (new from the DVLA)", qty: 1, price: 499 }],
      total: 499,
      paid: 499,
      stage: 2,
      next: { text: "We've bought AL24 KNG from the DVLA. The DVLA is posting the V750 certificate straight to you, in your name." },
      documents: [{ name: "Receipt", kind: "receipt" }],
    },
    {
      id: "do4",
      ref: "#DEMO-1046",
      date: isoDay(-1),
      type: "plates",
      reg: "K1 NGS",
      items: [
        { title: "3D Gel plates (set)", qty: 1, price: 54.99 },
        { title: "Black plate surround (pair)", qty: 1, price: 14.99 },
      ],
      total: 69.98,
      paid: 69.98,
      fulfilment: "collection",
      stage: 0,
      next: { text: "Road legal plates need proof you can use K1 NGS. Upload your V5C and photo ID and we'll start making them.", act: true },
      needs: ["V5C", "ID"],
      documents: [{ name: "Receipt", kind: "receipt" }],
    },
    {
      id: "do5",
      ref: "#DEMO-1031",
      date: isoDay(-16),
      type: "accessories",
      reg: "",
      items: [
        { title: "Magnetic plate holder (pair)", qty: 1, price: 24.99 },
        { title: "Sticky pad kit", qty: 1, price: 4.99 },
      ],
      total: 29.98,
      paid: 29.98,
      fulfilment: "delivery",
      stage: 3,
      next: { text: "Delivered. Thanks for your order." },
      documents: [{ name: "Receipt", kind: "receipt" }],
    },
    {
      id: "do3",
      ref: "#DEMO-0991",
      date: isoDay(-60),
      type: "registration",
      reg: "ARM 4N",
      items: [{ title: "ARM 4N registration", qty: 1, price: 5250 }],
      total: 5250,
      paid: 5250,
      stage: 5,
      next: { text: "All done. Your new V5C logbook comes from the DVLA." },
      documents: [
        { name: "Receipt", kind: "receipt" },
        { name: "DVLA assignment confirmation", kind: "document" },
      ],
    },
  ];
}

export function demoSubmissions(): Submission[] {
  const base = (s: Partial<Submission> & Pick<Submission, "id" | "ref" | "reg" | "status">): Submission => ({
    ...emptyPlate(s.reg),
    meaning: "Name",
    meaningText: "",
    held: "retention",
    desired: 5000,
    unsure: false,
    offers: "yes",
    elsewhere: "no",
    elsewhereWhere: "",
    elsewherePrice: null,
    pkg: "commission",
    termsVersion: "draft",
    termsAcceptedAt: isoDay(-20),
    submittedAt: isoDay(-20),
    advertised: null,
    requests: [],
    ...s,
  });
  return [
    base({ id: "ds1", ref: "RK-S-DEMO01", reg: "J4 MES", status: "active", meaning: "Name", meaningText: "James", desired: 6000, advertised: 6000, pkg: "commission" }),
    base({
      id: "ds2",
      ref: "RK-S-DEMO02",
      reg: "S4 RAH",
      status: "active",
      meaning: "Name",
      meaningText: "Sarah",
      desired: 4500,
      advertised: 5495,
      pkg: "uplift",
      requests: [{ id: "dr1", kind: "price", amount: 4000, status: "pending", created: isoDay(-1) }],
    }),
    base({ id: "ds3", ref: "RK-S-DEMO03", reg: "M786 AKH", status: "review", meaning: "Initials", desired: null, unsure: true, pkg: "commission", held: "vehicle", submittedAt: isoDay(-1), termsAcceptedAt: isoDay(-1) }),
    base({ id: "ds4", ref: "RK-S-DEMO04", reg: "B16 BOS", status: "reserved", meaning: "Word", meaningText: "Big boss", desired: 3000, advertised: 3000 }),
    base({ id: "ds5", ref: "RK-S-DEMO05", reg: "D4 NNY", status: "sold", meaning: "Name", meaningText: "Danny", desired: 2500, advertised: 2500, submittedAt: isoDay(-90), sale: { stage: 2, payout: "pending" } }),
  ];
}
