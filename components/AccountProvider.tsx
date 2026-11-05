"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SellOption } from "@/lib/brand";
import { cleanReg as cleanPortalReg, demoOrders, demoSubmissions, isoNow, newRef, packageOf, type ChangeRequest, type Order, type PlateDraft, type Submission } from "@/lib/portal";

/**
 * The customer's account: who they are, plates they own (with certificate expiry reminders),
 * plates they've put on the market, their wishlist and offers.
 *
 * PROTOTYPE: everything is kept in this browser only (localStorage), and no password is ever
 * stored. At launch this is replaced by real customer accounts plus a listings backend, so the
 * account works on every device, reminders are actually sent and the REG KING team can approve listings.
 */

export type Prefs = { email: boolean; sms: boolean; renewals: boolean; wanted: boolean; listings: boolean; news: boolean };
export type Address = { line1: string; line2: string; town: string; postcode: string };
export const emptyAddress: Address = { line1: "", line2: "", town: "", postcode: "" };
/** A saved address. One is the default for checkout and posting plates. */
export type SavedAddress = Address & { id: string; label: string; isDefault: boolean };
export type Customer = {
  name: string;
  email: string;
  phone: string;
  since: string;
  prefs: Prefs;
  demo?: boolean;
  address?: Address;
  addresses?: SavedAddress[];
  /** Marketing: emails about offers, texts about offers, and news of new registrations. All optional. */
  marketing?: boolean;
  marketingSms?: boolean;
  newRegs?: boolean;
};

/** How the plate is held: on a vehicle (V5C) or on a certificate (V750 entitlement / V778 retention). */
export type Held = "vehicle" | "certificate" | "unsure";
export type OwnedPlate = {
  id: string;
  reg: string;
  held: Held;
  cert: "" | "V750" | "V778";
  /** Certificate expiry date, yyyy-mm-dd. Empty when on a vehicle or not known. */
  expiry: string;
  vehicle: string;
  /** Remind this many days before expiry. 0 = no reminder. */
  remind: number;
  /** What the customer thinks it's worth, if they've said (pounds). */
  value?: number;
  added: string;
};

export type ListingStatus = "review" | "live" | "paused" | "sold";
export type Listing = {
  id: string;
  ownedId: string;
  reg: string;
  asking: number | null;
  valueFirst: boolean;
  option: SellOption;
  status: ListingStatus;
  created: string;
};
export type Wanted = { id: string; text: string; budget: number | null; created: string };
export type Offer = { id: string; reg: string; amount: number; created: string };
/** A pack reward: money off one plate until a set time (ISO date-time). */
export type Reward = { reg: string; handle: string; off: number; expires: string; claimed: string };

/** A registration transfer REG KING is handling (a plate bought from us, or one of theirs that sold). */
export type Transfer = { id: string; reg: string; kind: "buy" | "sell"; step: number; updated: string; vehicle: string };
export const TRANSFER_STEPS: Record<Transfer["kind"], string[]> = {
  buy: ["Paid", "Documents received", "Sent to the DVLA", "Assigned to your vehicle", "New V5C on its way"],
  sell: ["Sale agreed", "Documents received", "Sent to the DVLA", "Transferred to the buyer", "Payment sent to you"],
};

export type DocKind = "V5C" | "V750" | "V778" | "ID" | "Other";
/** A document we need or have. PROTOTYPE: only the file's name and size are kept, never the file. */
export type Doc = { id: string; kind: DocKind; reg: string; why: string; status: "needed" | "uploaded" | "checked"; file: string; size: number; updated: string };

/** An offer a buyer has made on one of the customer's listings. */
export type IncomingOffer = { id: string; listingId: string; reg: string; amount: number; created: string; status: "open" | "accepted" | "declined" | "countered"; counter: number | null };

type ListingInput = { asking: number | null; valueFirst: boolean; option: SellOption };

type Ctx = {
  ready: boolean;
  customer: Customer | null;
  signIn: (c: { email: string; name?: string; phone?: string }) => void;
  update: (c: Partial<Customer>) => void;
  signOut: () => void;
  deleteAll: () => void;
  loadDemo: () => void;
  owned: OwnedPlate[];
  addOwned: (p: Omit<OwnedPlate, "id" | "added">) => string;
  updateOwned: (id: string, p: Partial<OwnedPlate>) => void;
  removeOwned: (id: string) => void;
  listings: Listing[];
  /** From the Sell form: adds the plate to My plates (if new) and lists it. */
  addListing: (l: ListingInput & { reg: string; held: string }) => void;
  /** From My plates: put an owned plate on the market. */
  putOnMarket: (ownedId: string, l: ListingInput) => void;
  updateListing: (id: string, l: Partial<Listing>) => void;
  removeListing: (id: string) => void;
  saved: string[];
  toggleSaved: (reg: string) => void;
  wanted: Wanted[];
  addWanted: (text: string, budget: number | null) => void;
  removeWanted: (id: string) => void;
  offers: Offer[];
  addOffer: (reg: string, amount: number) => void;
  /** £-off rewards won in plate packs, each for one plate, until `expires`. */
  rewards: Reward[];
  claimRewards: (r: Omit<Reward, "claimed">[]) => void;
  transfers: Transfer[];
  docs: Doc[];
  uploadDoc: (id: string | null, d: { kind: DocKind; reg: string; file: string; size: number }) => void;
  removeDoc: (id: string) => void;
  incoming: IncomingOffer[];
  respond: (id: string, status: IncomingOffer["status"], counter?: number) => void;
  /** Portal: the customer's orders. PROTOTYPE: demo orders only; at launch these come from Shopify. */
  orders: Order[];
  /** Portal: one record per plate submitted for sale. */
  submissions: Submission[];
  /** Saves each plate as its own submission. Returns the saved records, or null if saving failed. */
  submitPlates: (plates: PlateDraft[]) => Submission[] | null;
  /** Sends a price-change or removal request for REG KING to review. Returns false if it couldn't be saved. */
  requestChange: (id: string, r: Omit<ChangeRequest, "id" | "status" | "created">) => boolean;
};

const KEYS = { submissions: "rk-submissions", customer: "rk-customer", owned: "rk-owned", listings: "rk-listings", saved: "rk-wishlist", wanted: "rk-wanted", offers: "rk-offers", transfers: "rk-transfers", docs: "rk-docs", incoming: "rk-incoming", rewards: "rk-rewards" };
export const defaultPrefs: Prefs = { email: true, sms: false, renewals: true, wanted: true, listings: true, news: false };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, v: unknown): boolean {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
const newId = () => Math.random().toString(36).slice(2, 10);
const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);
const cleanReg = (r: string) => r.toUpperCase().replace(/\s+/g, " ").trim();

/** Days from today to a yyyy-mm-dd date (negative once it's passed). */
export function daysUntil(date: string): number | null {
  if (!date) return null;
  const d = new Date(date + "T12:00:00").getTime();
  if (Number.isNaN(d)) return null;
  return Math.round((d - new Date(isoDay() + "T12:00:00").getTime()) / 864e5);
}

/** Expiry state of an owned plate's certificate. */
export function expiryState(p: OwnedPlate): { kind: "none" | "ok" | "due" | "expired"; days: number | null } {
  if (p.held !== "certificate") return { kind: "none", days: null };
  const days = daysUntil(p.expiry);
  if (days === null) return { kind: "none", days: null };
  if (days < 0) return { kind: "expired", days };
  if (p.remind > 0 && days <= p.remind) return { kind: "due", days };
  return { kind: "ok", days };
}

const noop = () => {};
const AccountContext = createContext<Ctx>({
  ready: false,
  customer: null,
  signIn: noop,
  update: noop,
  signOut: noop,
  deleteAll: noop,
  loadDemo: noop,
  owned: [],
  addOwned: () => "",
  updateOwned: noop,
  removeOwned: noop,
  listings: [],
  addListing: noop,
  putOnMarket: noop,
  updateListing: noop,
  removeListing: noop,
  saved: [],
  toggleSaved: noop,
  wanted: [],
  addWanted: noop,
  removeWanted: noop,
  offers: [],
  addOffer: noop,
  rewards: [],
  claimRewards: noop,
  transfers: [],
  docs: [],
  uploadDoc: noop,
  removeDoc: noop,
  incoming: [],
  respond: noop,
  orders: [],
  submissions: [],
  submitPlates: () => null,
  requestChange: () => false,
});

/** A small helper: state that is also written to localStorage on every change. */
function useStored<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(fallback);
  const set = useCallback(
    (fn: (old: T) => T) =>
      setV((old) => {
        const next = fn(old);
        store(key, next);
        return next;
      }),
    [key],
  );
  return [v, set, setV] as const;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customer, setCustomer, rawCustomer] = useStored<Customer | null>(KEYS.customer, null);
  const [owned, setOwned, rawOwned] = useStored<OwnedPlate[]>(KEYS.owned, []);
  const [listings, setListings, rawListings] = useStored<Listing[]>(KEYS.listings, []);
  const [saved, setSaved, rawSaved] = useStored<string[]>(KEYS.saved, []);
  const [wanted, setWanted, rawWanted] = useStored<Wanted[]>(KEYS.wanted, []);
  const [offers, setOffers, rawOffers] = useStored<Offer[]>(KEYS.offers, []);
  const [rewards, setRewards, rawRewards] = useStored<Reward[]>(KEYS.rewards, []);
  const [transfers, , rawTransfers] = useStored<Transfer[]>(KEYS.transfers, []);
  const [docs, setDocs, rawDocs] = useStored<Doc[]>(KEYS.docs, []);
  const [incoming, setIncoming, rawIncoming] = useStored<IncomingOffer[]>(KEYS.incoming, []);
  const [submissions, , rawSubmissions] = useStored<Submission[]>(KEYS.submissions, []);
  const subsRef = useRef(submissions);
  subsRef.current = submissions;

  useEffect(() => {
    const c = load<Customer | null>(KEYS.customer, null);
    rawCustomer(c ? { ...c, prefs: { ...defaultPrefs, ...(c.prefs ?? {}) } } : null);
    rawOwned(load<OwnedPlate[]>(KEYS.owned, []));
    rawListings(load<Listing[]>(KEYS.listings, []).map((l) => ({ ...l, ownedId: l.ownedId ?? "" })));
    rawSaved(load<string[]>(KEYS.saved, []));
    rawWanted(load<Wanted[]>(KEYS.wanted, []));
    rawOffers(load<Offer[]>(KEYS.offers, []));
    rawRewards(load<Reward[]>(KEYS.rewards, []).filter((r) => new Date(r.expires).getTime() > Date.now()));
    rawTransfers(load<Transfer[]>(KEYS.transfers, []));
    rawDocs(load<Doc[]>(KEYS.docs, []));
    rawIncoming(load<IncomingOffer[]>(KEYS.incoming, []));
    rawSubmissions(load<Submission[]>(KEYS.submissions, []));
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(
    (c: { email: string; name?: string; phone?: string }) =>
      setCustomer((old) => ({
        name: c.name ?? old?.name ?? "",
        email: c.email,
        phone: c.phone ?? old?.phone ?? "",
        since: old?.since ?? isoDay(),
        prefs: old?.prefs ?? defaultPrefs,
      })),
    [setCustomer],
  );
  const update = useCallback((c: Partial<Customer>) => setCustomer((old) => (old ? { ...old, ...c } : old)), [setCustomer]);
  const signOut = useCallback(() => setCustomer(() => null), [setCustomer]);
  const deleteAll = useCallback(() => {
    Object.values(KEYS).forEach((k) => store(k, null));
    rawCustomer(null);
    rawOwned([]);
    rawListings([]);
    rawSaved([]);
    rawWanted([]);
    rawOffers([]);
    rawRewards([]);
    rawTransfers([]);
    rawDocs([]);
    rawIncoming([]);
    rawSubmissions([]);
  }, [rawSubmissions, rawCustomer, rawOwned, rawListings, rawSaved, rawWanted, rawOffers, rawTransfers, rawDocs, rawIncoming, rawRewards]);

  const addOwned = useCallback(
    (p: Omit<OwnedPlate, "id" | "added">) => {
      const id = newId();
      setOwned((old) => [{ ...p, reg: cleanReg(p.reg), id, added: isoDay() }, ...old]);
      return id;
    },
    [setOwned],
  );
  const updateOwned = useCallback((id: string, p: Partial<OwnedPlate>) => setOwned((old) => old.map((x) => (x.id === id ? { ...x, ...p } : x))), [setOwned]);
  const removeOwned = useCallback(
    (id: string) => {
      setOwned((old) => old.filter((x) => x.id !== id));
      setListings((old) => old.filter((l) => l.ownedId !== id));
    },
    [setOwned, setListings],
  );

  // Latest owned plates, for actions that need to look one up (kept out of state updaters).
  const ownedRef = useRef(owned);
  ownedRef.current = owned;

  /** Selling needs proof of ownership and, once, photo ID: ask for whatever isn't there yet. */
  const requestSellDocs = useCallback(
    (reg: string, held: Held, cert: OwnedPlate["cert"]) =>
      setDocs((old) => {
        const add: Doc[] = [];
        const kind: DocKind = held === "certificate" ? cert || "V778" : held === "vehicle" ? "V5C" : "Other";
        if (!old.some((d) => d.reg === reg && d.kind === kind))
          add.push({ id: newId(), kind, reg, why: kind === "Other" ? `Proof you own ${reg}` : `So we can list ${reg} for you`, status: "needed", file: "", size: 0, updated: isoDay() });
        if (!old.some((d) => d.kind === "ID")) add.push({ id: newId(), kind: "ID", reg: "", why: "Photo ID, needed once for selling", status: "needed", file: "", size: 0, updated: isoDay() });
        return add.length ? [...add, ...old] : old;
      }),
    [setDocs],
  );

  const putOnMarket = useCallback(
    (ownedId: string, l: ListingInput) => {
      const p = ownedRef.current.find((x) => x.id === ownedId);
      if (!p) return;
      requestSellDocs(p.reg, p.held, p.cert);
      setListings((ls) => [{ ...l, id: newId(), ownedId, reg: p.reg, status: "review", created: isoDay() }, ...ls.filter((x) => x.ownedId !== ownedId)]);
    },
    [setListings, requestSellDocs],
  );
  const addListing = useCallback(
    (l: ListingInput & { reg: string; held: string }) => {
      const reg = cleanReg(l.reg);
      let ownedId = ownedRef.current.find((x) => x.reg === reg)?.id;
      if (!ownedId) {
        const id = newId();
        ownedId = id;
        const held: Held = l.held === "vehicle" || l.held === "certificate" ? l.held : "unsure";
        const plate: OwnedPlate = { id, reg, held, cert: "", expiry: "", vehicle: "", remind: 30, added: isoDay() };
        ownedRef.current = [plate, ...ownedRef.current];
        setOwned((old) => [plate, ...old]);
      }
      const oid = ownedId;
      const op = ownedRef.current.find((x) => x.id === oid);
      if (op) requestSellDocs(op.reg, op.held, op.cert);
      setListings((ls) => [{ asking: l.asking, valueFirst: l.valueFirst, option: l.option, id: newId(), ownedId: oid, reg, status: "review", created: isoDay() }, ...ls.filter((x) => x.ownedId !== oid)]);
    },
    [setOwned, setListings, requestSellDocs],
  );
  const updateListing = useCallback((id: string, l: Partial<Listing>) => setListings((old) => old.map((x) => (x.id === id ? { ...x, ...l } : x))), [setListings]);
  const removeListing = useCallback((id: string) => setListings((old) => old.filter((x) => x.id !== id)), [setListings]);

  const toggleSaved = useCallback((reg: string) => setSaved((old) => (old.includes(reg) ? old.filter((r) => r !== reg) : [...old, reg])), [setSaved]);
  const addWanted = useCallback((text: string, budget: number | null) => setWanted((old) => [{ id: newId(), text: text.trim(), budget, created: isoDay() }, ...old]), [setWanted]);
  const removeWanted = useCallback((id: string) => setWanted((old) => old.filter((w) => w.id !== id)), [setWanted]);
  const claimRewards = useCallback(
    (r: Omit<Reward, "claimed">[]) =>
      setRewards((old) => {
        const now = new Date().toISOString();
        const live = old.filter((x) => new Date(x.expires).getTime() > Date.now() && !r.some((n) => n.reg === x.reg));
        return [...r.map((x) => ({ ...x, claimed: now })), ...live];
      }),
    [setRewards],
  );
  const addOffer = useCallback((reg: string, amount: number) => setOffers((old) => [{ id: newId(), reg, amount, created: isoDay() }, ...old]), [setOffers]);

  const uploadDoc = useCallback(
    (id: string | null, d: { kind: DocKind; reg: string; file: string; size: number }) =>
      setDocs((old) => {
        const now = isoDay();
        if (id) return old.map((x) => (x.id === id ? { ...x, ...d, status: "uploaded", updated: now } : x));
        return [{ id: newId(), why: "", status: "uploaded", updated: now, ...d }, ...old];
      }),
    [setDocs],
  );
  const removeDoc = useCallback((id: string) => setDocs((old) => old.filter((x) => x.id !== id)), [setDocs]);
  const respond = useCallback(
    (id: string, status: IncomingOffer["status"], counter?: number) => setIncoming((old) => old.map((x) => (x.id === id ? { ...x, status, counter: counter ?? x.counter } : x))),
    [setIncoming],
  );

  /**
   * Portal saves. PROTOTYPE: written to this browser, then read back, so success is only shown once it has
   * really saved. At launch these post to a server route that saves Shopify metaobjects for the signed-in customer.
   */
  const commitSubs = useCallback(
    (next: Submission[]): boolean => {
      if (!store(KEYS.submissions, next)) return false;
      const back = load<Submission[]>(KEYS.submissions, []);
      if (back.length !== next.length) return false;
      subsRef.current = next;
      rawSubmissions(next);
      return true;
    },
    [rawSubmissions],
  );
  const submitPlates = useCallback(
    (plates: PlateDraft[]): Submission[] | null => {
      const now = isoNow();
      const made: Submission[] = plates.map((p) => {
        const { authorised: _a, termsAccepted: _t, ...rest } = p;
        void _a;
        void _t;
        return {
          ...rest,
          reg: cleanPortalReg(p.reg),
          pkg: p.pkg,
          id: newId(),
          ref: newRef(),
          termsVersion: p.pkg ? packageOf(p.pkg).termsVersion : "",
          termsAcceptedAt: now,
          submittedAt: now,
          status: "review",
          advertised: null,
          requests: [],
        };
      });
      return commitSubs([...made, ...subsRef.current]) ? made : null;
    },
    [commitSubs],
  );
  const requestChange = useCallback(
    (id: string, r: Omit<ChangeRequest, "id" | "status" | "created">): boolean => {
      const sub = subsRef.current.find((x) => x.id === id);
      // One pending request of each kind at a time; nothing on finished listings.
      if (!sub || sub.status === "sold" || sub.status === "withdrawn") return false;
      if (sub.requests.some((q) => q.kind === r.kind && q.status === "pending")) return false;
      const req: ChangeRequest = { ...r, id: newId(), status: "pending", created: isoNow() };
      return commitSubs(subsRef.current.map((x) => (x.id === id ? { ...x, requests: [req, ...x.requests] } : x)));
    },
    [commitSubs],
  );
  const orders = customer?.demo ? demoOrders() : [];

  /** Clearly marked example data, so the dashboard can be looked round without signing in. */
  const loadDemo = useCallback(() => {
    const c: Customer = {
      name: "Demo customer",
      email: "demo@example.com",
      phone: "07700 900123",
      since: isoDay(-400),
      prefs: defaultPrefs,
      demo: true,
      address: { line1: "1 Example Street", line2: "", town: "Wolverhampton", postcode: "WV1 1AA" },
      addresses: [
        { id: "d-a1", label: "Home", line1: "1 Example Street", line2: "", town: "Wolverhampton", postcode: "WV1 1AA", isDefault: true },
        { id: "d-a2", label: "Work", line1: "2 Sample Road", line2: "Unit 4", town: "Bilston", postcode: "WV14 0AA", isDefault: false },
      ],
      marketing: false,
    };
    const subs = demoSubmissions();
    rawSubmissions(subs);
    store(KEYS.submissions, subs);
    const o: OwnedPlate[] = [
      { id: "d-o1", reg: "K1 NGS", held: "certificate", cert: "V778", expiry: isoDay(24), vehicle: "", remind: 30, added: isoDay(-300) },
      { id: "d-o2", reg: "ARM 4N", held: "vehicle", cert: "", expiry: "", vehicle: "Mercedes C-Class", remind: 0, added: isoDay(-200) },
      { id: "d-o3", reg: "M786 AKH", held: "certificate", cert: "V750", expiry: isoDay(1650), vehicle: "", remind: 90, added: isoDay(-20) },
      { id: "d-o4", reg: "J4 MES", held: "vehicle", cert: "", expiry: "", vehicle: "BMW M4", remind: 0, added: isoDay(-90) },
    ];
    const l: Listing[] = [
      { id: "d-l1", ownedId: "d-o1", reg: "K1 NGS", asking: 7500, valueFirst: false, option: "commission", status: "live", created: isoDay(-21) },
      { id: "d-l2", ownedId: "d-o2", reg: "ARM 4N", asking: 6500, valueFirst: false, option: "uplift", status: "paused", created: isoDay(-12) },
      { id: "d-l3", ownedId: "d-o3", reg: "M786 AKH", asking: null, valueFirst: true, option: "commission", status: "review", created: isoDay(-1) },
    ];
    // The last one isn't in stock, to show how a sold or unavailable plate looks.
    const sv = ["AM12 RRA", "AD12 RES", "A33 BDU", "DEMO 1"];
    const w: Wanted[] = [
      { id: "d-w1", text: "ARMAN", budget: 5000, created: isoDay(-30) },
      { id: "d-w2", text: "AMG 1", budget: null, created: isoDay(-6) },
    ];
    const of: Offer[] = [{ id: "d-f1", reg: "B33 OYY", amount: 2200, created: isoDay(-3) }];
    const tr: Transfer[] = [{ id: "d-t1", reg: "AM12 RXH", kind: "buy", step: 2, updated: isoDay(-2), vehicle: "Audi RS3" }];
    const dc: Doc[] = [
      { id: "d-d1", kind: "V5C", reg: "AM12 RXH", why: "To put AM12 RXH on your Audi RS3", status: "checked", file: "v5c-audi.pdf", size: 412000, updated: isoDay(-5) },
      { id: "d-d2", kind: "ID", reg: "", why: "Photo ID, needed once for selling", status: "checked", file: "driving-licence.jpg", size: 1300000, updated: isoDay(-20) },
      { id: "d-d3", kind: "V750", reg: "M786 AKH", why: "So we can list M786 AKH for you", status: "needed", file: "", size: 0, updated: isoDay(-1) },
    ];
    const inc: IncomingOffer[] = [
      { id: "d-i1", listingId: "d-l1", reg: "K1 NGS", amount: 6800, created: isoDay(-1), status: "open", counter: null },
      { id: "d-i2", listingId: "d-l1", reg: "K1 NGS", amount: 5500, created: isoDay(-9), status: "declined", counter: null },
    ];
    rawCustomer(c);
    rawOwned(o);
    rawListings(l);
    rawSaved(sv);
    rawWanted(w);
    rawOffers(of);
    rawTransfers(tr);
    rawDocs(dc);
    rawIncoming(inc);
    store(KEYS.transfers, tr);
    store(KEYS.docs, dc);
    store(KEYS.incoming, inc);
    store(KEYS.customer, c);
    store(KEYS.owned, o);
    store(KEYS.listings, l);
    store(KEYS.saved, sv);
    store(KEYS.wanted, w);
    store(KEYS.offers, of);
  }, [rawCustomer, rawOwned, rawListings, rawSaved, rawWanted, rawOffers, rawTransfers, rawDocs, rawIncoming, rawRewards]);

  return (
    <AccountContext.Provider
      value={{
        ready,
        customer,
        signIn,
        update,
        signOut,
        deleteAll,
        loadDemo,
        owned,
        addOwned,
        updateOwned,
        removeOwned,
        listings,
        addListing,
        putOnMarket,
        updateListing,
        removeListing,
        saved,
        toggleSaved,
        wanted,
        addWanted,
        removeWanted,
        offers,
        addOffer,
        rewards,
        claimRewards,
        transfers,
        docs,
        uploadDoc,
        removeDoc,
        incoming,
        respond,
        orders,
        submissions,
        submitPlates,
        requestChange,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);
