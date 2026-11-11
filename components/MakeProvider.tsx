"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMode } from "./ModeProvider";
import type { BuildConfig } from "@/lib/builder";
import type { LogoPlateConfig, SurroundConfig } from "@/lib/accessories";

/** The three tools in Make. */
export type MakeTool = "plates" | "surrounds" | "logo";
export const MAKE_TOOLS: { key: MakeTool; label: string }[] = [
  { key: "plates", label: "Number plates" },
  { key: "surrounds", label: "Plate surrounds" },
  { key: "logo", label: "Logo plates" },
];

export type BasketLine = { label: string; amount: number | null };

/** One thing in the basket. `data` is kept so the customer can go back and edit it. */
export type BasketItem =
  | { id: string; kind: "plates"; title: string; detail: string; lines: BasketLine[]; data: { reg: string; cfg: BuildConfig } }
  | { id: string; kind: "surrounds"; title: string; detail: string; lines: BasketLine[]; data: { reg: string; cfg: SurroundConfig } }
  | { id: string; kind: "logo"; title: string; detail: string; lines: BasketLine[]; data: { cfg: LogoPlateConfig } }
  | { id: string; kind: "accessory"; title: string; detail: string; lines: BasketLine[]; data: { key: string; qty?: number } }
  | { id: string; kind: "registration"; title: string; detail: string; lines: BasketLine[]; data: RegistrationData };

/** A registration bought from its plate page, with how the customer chose to pay for it. */
export type RegistrationData = {
  reg: string;
  handle: string;
  source: "regking" | "customer" | "dvla";
  price: number;
  pay: "full" | "deposit" | "monthly";
  /** Physical plates ordered with it (road legal ones need ID and proof of the reg). */
  plates: string | null;
  /** Those plates' full design, so the checkout server can price them itself. */
  platesCfg?: BuildConfig | null;
  platesLegal: boolean;
  assign: boolean;
};

type Ctx = {
  tool: MakeTool;
  setTool: (t: MakeTool) => void;
  basket: BasketItem[];
  /** Adds an item, or replaces it when it has the id of one being edited. */
  save: (item: BasketItem) => void;
  remove: (id: string) => void;
  /** The item being edited (its tool reads its data back in). */
  editing: BasketItem | null;
  edit: (id: string) => void;
  doneEditing: () => void;
  /** Short message after adding to the basket. */
  notice: string;
};

const MakeContext = createContext<Ctx | null>(null);

export const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * Shared state for the Make tab: which tool is open and the basket.
 * PROTOTYPE: the basket lives in this page only. At launch it becomes the Shopify cart.
 */
export function MakeProvider({ children }: { children: ReactNode }) {
  const { mode, acc, go } = useMode();
  const [tool, setTool] = useState<MakeTool>("plates");
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [editing, setEditing] = useState<BasketItem | null>(null);
  const [notice, setNotice] = useState("");

  const save = useCallback((item: BasketItem) => {
    setBasket((b) => (b.some((x) => x.id === item.id) ? b.map((x) => (x.id === item.id ? item : x)) : [...b, item]));
    setEditing(null);
    setNotice(`${item.title} ${editingIdRef.current === item.id ? "updated" : "added to your basket"}`);
    editingIdRef.current = null;
    window.setTimeout(() => setNotice(""), 3500);
  }, []);
  const remove = useCallback((id: string) => setBasket((b) => b.filter((x) => x.id !== id)), []);
  const edit = useCallback(
    (id: string) => {
      const item = basket.find((x) => x.id === id) ?? null;
      // Shop accessories have nothing to design, so there's nothing to edit.
      if (!item || item.kind === "accessory") return;
      // A registration is changed on its own plate page.
      if (item.kind === "registration") return go(`plate-${item.data.handle}`);
      editingIdRef.current = id;
      setEditing(item);
      setTool(item.kind);
      // Number plates are built on Make; surrounds and logo plates on their Accessories pages.
      go(item.kind === "plates" ? "make-plates" : item.kind === "surrounds" ? "accessories-surrounds" : "accessories-logo");
    },
    [basket, go],
  );
  const doneEditing = useCallback(() => setEditing(null), []);

  // Make is number plates only; the Accessories pages set their own tool.
  useEffect(() => {
    if (mode === "build" && !acc) setTool("plates");
  }, [mode, acc]);

  const value = useMemo(() => ({ tool, setTool, basket, save, remove, editing, edit, doneEditing, notice }), [tool, basket, save, remove, editing, edit, doneEditing, notice]);
  return <MakeContext.Provider value={value}>{children}</MakeContext.Provider>;
}

/** Which basket item is being edited, read inside save() without a stale closure. */
const editingIdRef: { current: string | null } = { current: null };

export function useMake(): Ctx {
  const c = useContext(MakeContext);
  if (!c) throw new Error("useMake must be used inside MakeProvider");
  return c;
}

/** Same as useMake, but returns null outside a MakeProvider (the in-store studio has no basket). */
export function useMakeOptional(): Ctx | null {
  return useContext(MakeContext);
}

export const lineTotal = (lines: BasketLine[]) => ({
  known: lines.reduce((a, l) => a + (l.amount ?? 0), 0),
  onRequest: lines.some((l) => l.amount === null),
});
