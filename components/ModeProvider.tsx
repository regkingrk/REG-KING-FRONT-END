"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SearchMode, SellOption } from "@/lib/brand";
import { parseHash, type SectionKey } from "@/lib/sitemap";
import { emptyFilters, type Filters } from "@/lib/filters";

/**
 * Where the customer is on the site.
 * - `mode`: the hero tab, Buy / Sell / Make ("build").
 * - `item`: the part of that section they asked for (#buy-dvla → "dvla").
 * - `info`: an Information page (#info-finance → "finance"); the hero steps aside while one is open.
 */
type Ctx = {
  mode: SearchMode;
  setMode: (m: SearchMode) => void;
  /** The current plate search (Buy tab). Empty = no search. */
  query: string;
  setQuery: (q: string) => void;
  /** Reg entered on the Sell tab: opens the on-page sell form. Empty = not started. */
  sellReg: string;
  setSellReg: (r: string) => void;
  /** How the customer said they'd like to sell, from the Sell menu or a "Sell this way" button. */
  sellOption: SellOption | "";
  setSellOption: (o: SellOption | "") => void;
  item: string | null;
  info: string | null;
  /** An Accessories page (#accessories-logo → "logo"). */
  acc: string | null;
  /** A plate's own page (#plate-am12-rra → "am12-rra"). */
  plate: string | null;
  /** The customer's account area (#account, #account-listings → "listings"). */
  account: string | null;
  /** A full page of its own: "checkout", or "admin:orders" for the staff portal (#admin-orders). */
  page: string | null;
  /** Buy filters, shared by the dropdown under the search and the results sidebar. */
  filters: Filters;
  setFilters: (f: Filters | ((f: Filters) => Filters)) => void;
  /** Browsing everything (filters, no search). */
  browse: boolean;
  setBrowse: (b: boolean) => void;
  /** Follow a site link (#buy-dvla, #info-faqs): opens the right tab or page and scrolls to it. */
  go: (hash: string) => void;
  /**
   * Once a customer commits (searched, started selling) or opens an Information page, the big hero
   * steps aside and Buy / Sell / Make move into a slim bar at the top for quick switching.
   */
  focused: boolean;
  /** A collection page: Exclusive plates, REG KING stock or customer plates. */
  vault: boolean;
};

const noop = () => {};
const ModeContext = createContext<Ctx>({
  mode: "buy",
  setMode: noop,
  query: "",
  setQuery: noop,
  sellReg: "",
  setSellReg: noop,
  sellOption: "",
  setSellOption: noop,
  item: null,
  info: null,
  acc: null,
  plate: null,
  account: null,
  page: null,
  filters: emptyFilters(),
  setFilters: noop,
  browse: false,
  setBrowse: noop,
  go: noop,
  focused: false,
  vault: false,
});

/** URL hash for each tab, so a view can be linked to and shared (#buy, #sell, #make). */
export const HASH: Record<SearchMode, string> = { buy: "buy", sell: "sell", build: "make" };
const MODE_OF: Record<Exclude<SectionKey, "info" | "acc">, SearchMode> = { buy: "buy", sell: "sell", make: "build" };
const SELL_OPTION: Record<string, SellOption> = { uplift: "uplift", commission: "commission" };

/** The element to scroll to for a link. */
const targetFor = (section: SectionKey, item: string | null) => {
  if (section === "info" || section === "acc") return "rk-info";
  if (item === "sourcing" || item === "brokerage") return "rk-broker";
  if (section === "buy" && item === "exclusive") return "rk-info";
  if (section === "buy" && item) return "rk-buyfrom";
  if (section === "sell" && item === "valuation") return "sell-valuation";
  if (section === "sell" && item) return "rk-ways";
  return "rk-hero";
};

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SearchMode>("buy");
  const [query, setQueryState] = useState("");
  const [sellReg, setSellReg] = useState("");
  const [sellOption, setSellOption] = useState<SellOption | "">("");
  const [item, setItem] = useState<string | null>(null);
  const [info, setInfoState] = useState<string | null>(null);
  const [acc, setAcc] = useState<string | null>(null);
  // Opening an Information page or anything else closes Accessories.
  const setInfo = useCallback((i: string | null) => {
    setInfoState(i);
    setAcc(null);
  }, []);
  const [plate, setPlatePage] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [page, setPage] = useState<string | null>(null);
  // Opening any other page closes the account area.
  const setPlate = useCallback((p: string | null) => {
    setPlatePage(p);
    setAccount(null);
    setAcc(null);
  }, []);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [browse, setBrowseState] = useState(false);
  const setBrowse = useCallback((b: boolean) => {
    setBrowseState(b);
    if (b) {
      setInfo(null);
      setPlate(null);
      setModeState("buy");
    }
  }, []);

  /** Searches are shareable: ?q=ARMAN */
  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (q) {
      setInfo(null);
      setPlate(null);
    }
    try {
      const url = new URL(location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url.pathname + url.search + (q ? "#buy" : url.hash));
    } catch {}
  }, []);

  const setMode = useCallback((m: SearchMode) => {
    setModeState(m);
    setPage(null);
    setInfo(null);
    setPlate(null);
    setItem(null);
    setBrowseState(false);
    try {
      history.replaceState(null, "", `#${HASH[m]}`);
    } catch {}
  }, []);

  /** Apply a link: set the tab / page and remember which part was asked for. */
  const apply = useCallback((hash: string, scroll: boolean) => {
    const h = hash.replace(/^#/, "").toLowerCase();
    // Checkout and the staff portal are pages of their own.
    const adm = h.match(/^admin(?:-([a-z]+))?$/);
    if (adm || h === "checkout") {
      setPlatePage(null);
      setInfo(null);
      setAccount(null);
      setPage(adm ? `admin:${adm[1] ?? "overview"}` : "checkout");
      if (scroll) setTimeout(() => window.scrollTo({ top: 0 }), 30);
      return;
    }
    setPage(null);
    const acct = h.match(/^account(?:-(buy|sell|make|value|orders|listings|list|wishlist|settings|overview|plates|selling|transfers|documents|market|made|saved|offers|details|demo))?$/);
    if (acct) {
      setPlatePage(null);
      setInfo(null);
      setAccount(acct[1] ?? "buy");
      if (scroll) setTimeout(() => window.scrollTo({ top: 0 }), 30);
      return;
    }
    if (/^plate-[a-z0-9-]+$/.test(h)) {
      setPlate(h.slice(6));
      setInfo(null);
      setModeState("buy");
      if (scroll) setTimeout(() => window.scrollTo({ top: 0 }), 30);
      return;
    }
    const p = parseHash(hash);
    if (!p) return;
    setPlate(null);
    if (p.section === "info") {
      setInfo(p.item ?? "about");
      setItem(null);
    } else if (p.section === "acc") {
      setInfo(null);
      setAcc(p.item ?? "all");
      setItem(null);
    } else {
      setInfo(null);
      setModeState(MODE_OF[p.section]);
      setItem(p.item);
      if (p.section === "buy") {
        setQueryState("");
        setBrowseState(false);
      }
      if (p.section === "sell") setSellReg("");
      if (p.section === "sell" && p.item && SELL_OPTION[p.item]) setSellOption(SELL_OPTION[p.item]);
    }
    if (scroll) {
      const id = targetFor(p.section, p.item);
      setTimeout(() => {
        if (id === "rk-info" || (id === "rk-hero" && p.section !== "make")) window.scrollTo({ top: 0, behavior: "smooth" });
        else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, []);

  const go = useCallback(
    (hash: string) => {
      const h = hash.startsWith("#") ? hash : `#${hash}`;
      try {
        history.replaceState(null, "", location.pathname + location.search.replace(/([?&])q=[^&]*&?/, "$1").replace(/\?$/, "") + h);
      } catch {}
      apply(h, true);
    },
    [apply],
  );

  // Open the tab or page named in the link, and follow links like #sell-commission.
  useEffect(() => {
    apply(location.hash, false);
    try {
      const q = new URLSearchParams(location.search).get("q");
      if (q) {
        setQueryState(q.toUpperCase().slice(0, 12));
        setModeState("buy");
        setInfo(null);
      }
    } catch {}
    const onHash = () => apply(location.hash, true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [apply]);

  // Make keeps the full hero (so the Buy / Sell / Make tabs never move). A search, a sell enquiry
  // or an Information page focuses the page.
  // The collection pages: Exclusive plates, REG KING stock and customer plates.
  const vault = mode === "buy" && (item === "exclusive" || item === "regking" || item === "customer") && !query && !browse && !info && !acc && !plate && !account && !page;
  const focused = vault || !!info || !!acc || !!plate || !!account || !!page || (mode === "buy" && (!!query || browse)) || (mode === "sell" && !!sellReg);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-rk-focused", focused);
  }, [focused]);

  return (
    <ModeContext.Provider value={{ mode, setMode, query, setQuery, sellReg, setSellReg, sellOption, setSellOption, item, info, acc, plate, account, page, filters, setFilters, browse, setBrowse, go, focused, vault }}>
      {children}
    </ModeContext.Provider>
  );
}

export const useMode = () => useContext(ModeContext);
