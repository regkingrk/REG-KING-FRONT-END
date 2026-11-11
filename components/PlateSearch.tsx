"use client";

import { forwardRef, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatGBP, modeUrl, spaceReg, searchModes, type SearchMode } from "@/lib/brand";
import { fromSetPrice, withLegal, withVehicle, emptyBuild, isComplete, plateGaps, priceLines, rearOnly, regChars, regLength, sizeFits, spacingNote, summary, total, SPACING_PRESETS, type BuildConfig } from "@/lib/builder";
import { SpacingEditor } from "./SpacingEditor";
import { navigate } from "@/lib/nav";
import { ArrowRight, SearchIcon } from "./Icons";
import { useMode } from "./ModeProvider";
import { PlateBuilder } from "./PlateBuilder";
import { Plate3D } from "./Plate3D";
import { PlateDecor, bikeLines, plateAttrs } from "./PlatePreview";
import { newId, useMake } from "./MakeProvider";
import { FilterDropdown } from "./BuyFilters";
import { activeCount, catalogue, passes, type Filters } from "@/lib/filters";
import { searchAll } from "@/lib/search";

const STAMP = "SEARCH";

/**
 * The hero centrepiece: Buy / Build / Sell / Value tabs over a plate you type
 * into. Make swaps the plate colour (no animation) and opens the step-by-step plate builder,
 * with the big plate as the live preview. `stamp` holds the intro letters.
 */
export const PlateSearch = forwardRef<HTMLDivElement>(function PlateSearch(_, plateRef) {
  const [reg, setReg] = useState("");
  const { mode, setMode, query, setQuery, setSellReg, filters, setFilters, setBrowse, item } = useMode();
  const [cfg, setCfg] = useState<BuildConfig>(emptyBuild);
  const building = mode === "build";
  const inputRef = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<BuildConfig>) => setCfg((c) => ({ ...c, ...p }));
  const { save, editing } = useMake();
  // Make is number plates only (surrounds and logo plates live under Accessories).
  const otherTool = false;
  // Menu links that start the builder part-way: road legal, show or motorbike plates.
  useEffect(() => {
    if (!building) return;
    if (item === "legal") setCfg((c) => withLegal(c, "Legal"));
    if (item === "show") setCfg((c) => withLegal(c, "Show"));
    if (item === "bike") setCfg((c) => withVehicle(c, "Bike"));
  }, [building, item]);
  const editingPlates = editing?.kind === "plates" ? editing : null;
  useEffect(() => {
    if (!editingPlates) return;
    setReg(editingPlates.data.reg);
    setCfg({ ...emptyBuild(), ...editingPlates.data.cfg });
  }, [editingPlates]);

  useEffect(() => {
    document.getElementById("rk-hero")?.setAttribute("data-mode", mode);
  }, [mode]);
  // Sizes depend on the reg's length: drop a chosen size the reg no longer fits.
  useEffect(() => {
    const n = regLength(reg);
    if (!n) return;
    // a set with one size shared front and rear has to fit both plates' styles
    const sameSizes = (c: BuildConfig) => !c.rearSize || c.rearSize === c.size;
    setCfg((c) => {
      let next = c;
      const gaps = plateGaps(c, reg);
      if (c.size && !sizeFits(c.size, c.vehicle, c.legal, reg, [c.style, sameSizes(c) ? c.rearStyle : null], gaps, c.extras)) next = { ...next, size: null };
      if (c.rearSize && !sizeFits(c.rearSize, c.vehicle, c.legal, reg, [c.rearStyle ?? c.style], gaps, c.extras)) next = { ...next, rearSize: null };
      return next;
    });
  }, [reg, cfg.legal, cfg.vehicle, cfg.style, cfg.rearStyle, cfg.spacing, cfg.extras]);
  // Spacing REG KING has set up for a reg comes back when it's made a show plate again
  useEffect(() => {
    const preset = SPACING_PRESETS[regChars(reg)];
    if (cfg.legal === "Show" && cfg.spacing == null && preset) setCfg((c) => ({ ...c, spacing: preset }));
  }, [reg, cfg.legal, cfg.spacing]);
  // A shared ?q= link (or "Clear search") keeps the plate in step with the results.
  useEffect(() => {
    if (mode === "buy") setReg(query);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = searchModes.find((x) => x.key === mode)!;
  const lines = priceLines(cfg);
  const t = total(lines);
  const ready = isComplete(cfg) && reg.replace(/\s/g, "").length >= 2;

  // Buy filters: how many plates the dropdown's choices leave, for the search typed (or everything).
  const pool = useMemo(() => (mode !== "buy" ? [] : reg.trim().length >= 2 ? searchAll(reg) : catalogue()), [mode, reg]);
  const filterCount = pool.filter((r) => passes(r, filters)).length;
  const setF = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const showFiltered = () => {
    if (reg.trim().length >= 2) setQuery(reg.trim());
    else {
      setQuery("");
      setBrowse(true);
    }
    inputRef.current?.blur();
    window.scrollTo({ top: 0 });
  };

  const go = (value: string, as: SearchMode = mode) => {
    if (!value.trim() && as === "buy" && activeCount(filters) > 0) {
      showFiltered();
      return;
    }
    if (!value.trim()) {
      inputRef.current?.focus();
      return;
    }
    if (as === "buy" || as === "sell") {
      // Buy opens the results; Sell opens the sell form. Either way the hero steps aside
      // and Buy / Sell / Make move into the bar at the top.
      if (as === "buy") setQuery(value.trim());
      else setSellReg(value.trim());
      if (mode !== as) setMode(as);
      inputRef.current?.blur();
      window.scrollTo({ top: 0 });
      return;
    }
    navigate(modeUrl(as, value, as === "build" ? { spec: summary(cfg) } : {}), as);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otherTool) return;
    if (building && ready) {
      // PROTOTYPE: goes into the on-page basket; at launch this adds to the Shopify cart.
      save({
        id: editingPlates?.id ?? newId(),
        kind: "plates",
        title: `Number plates: ${reg.trim()}`,
        detail: [summary(cfg), spacingNote(cfg, reg)].filter(Boolean).join(", "),
        lines: priceLines(cfg),
        data: { reg: reg.trim(), cfg },
      });
      setCfg(emptyBuild());
      setReg("");
      requestAnimationFrame(() => document.getElementById("rk-basket")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    if (building && !ready) {
      document.querySelector<HTMLElement>("#rk-builder .rk-bstep.is-open")?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (reg.trim().length < 2) inputRef.current?.focus();
      return;
    }
    go(reg);
  };

  // Big plate: white front for Buy, yellow rear for Sell; in Build it shows what's being built.
  const side: "front" | "rear" = building ? (cfg.qty === "Single" && cfg.side === "Front" ? "front" : "rear") : "front";
  // Sell uses the yellow rear plate so it stands out on the white Sell background.
  const attrs = building ? plateAttrs(cfg, side) : { "data-side": mode === "sell" ? "rear" : "front", "data-look": "printed" };
  // A set (front and rear): the white front plate sits above the yellow one you type on, at full size.
  const showFront = building && !rearOnly(cfg.vehicle) && cfg.qty !== "Single";
  // Motorbikes: the plate becomes a two-line bike plate.
  const bike = building && cfg.vehicle === "Bike";

  // Make: the lowest set price up front, worked out from the price list so it's never out of date
  const from = fromSetPrice();
  const makeHelp = mode === "build" && from !== null ? `Road-legal and show plates from ${formatGBP(from, false)} a set, made to order and delivered to your door.` : m.help;
  const buttonLabel = building
    ? ready
      ? `${editingPlates ? "Update basket" : "Add to basket"} · ${t.known === 0 && t.onRequest ? "price on request" : formatGBP(t.known, Number.isInteger(t.known)) + (t.onRequest ? "+" : "")}`
      : "Make my plate"
    : m.button;

  return (
    <form id="plate-search" className="rk-search" role="search" onSubmit={onSubmit} data-mode={mode}>

      <div className="rk-modes" role="tablist" aria-label="What would you like to do?" data-hero-item>
        {searchModes.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            className="rk-mode"
            data-mode-btn={x.key}
            aria-selected={mode === x.key}
            onClick={() => {
              setMode(x.key);
              inputRef.current?.focus();
            }}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="rk-plates" hidden={otherTool}>
      {/* Make: the plates on the left stay in view while you choose on the right (stacked on phones). */}
      {building ? (
        <div className="rk-make" data-make-layout>
          <div className="rk-make__view">
            <Plate3D reg={reg.replace(/\s/g, "").length >= 2 ? reg : ""} c={cfg} onStyle={(style) => patch({ style })} />
          </div>
          <div className="rk-make__opts">
            <div id="rk-regbox" className="rk-regbox">
              <label htmlFor="rk-reg">Your registration</label>
              <input
                ref={inputRef}
                id="rk-reg"
                className="rk-regbox__input"
                name="q"
                value={reg}
                onChange={(e) => {
                  const next = spaceReg(e.target.value);
                  // a different reg starts from its own spacing (or one REG KING has set up for it)
                  if (regChars(next) !== regChars(reg)) patch({ spacing: SPACING_PRESETS[regChars(next)] ?? null });
                  setReg(next);
                }}
                placeholder="e.g. AB12 CDE"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={8}
              />
            </div>
            <SpacingEditor reg={reg} c={cfg} onChange={(spacing) => patch({ spacing })} />
            <PlateBuilder reg={reg} c={cfg} set={patch} replace={setCfg} onRegStep={() => inputRef.current?.focus()} />
            <button type="submit" className="rk-search__go" data-after>
              <ArrowRight /> <span id="rk-go-label">{buttonLabel}</span>
            </button>
            <p className="rk-search__help" id="rk-help" data-after>
              {cfg.style ? [summary(cfg), spacingNote(cfg, reg)].filter(Boolean).join(", ") : makeHelp}
            </p>
          </div>
        </div>
      ) : (
        <>
      <label htmlFor="rk-reg" className="rk-visually-hidden">
          {m.help}
        </label>
        {showFront && (
          <div className="rk-plate rk-plate--front is-ready" {...plateAttrs(cfg, "front")} aria-hidden onClick={() => inputRef.current?.focus()}>
            <PlateDecor c={cfg} />
            <span className={`rk-plate__input rk-ptext rk-plate__mirror${reg ? "" : " is-empty"}`}>{reg || m.placeholder}</span>
          </div>
        )}
        <div ref={plateRef} id="rk-plate" className="rk-plate is-ready" {...attrs} data-bike={bike || undefined}>
          {building && <PlateDecor c={cfg} />}
          {bike && (
            <span className="rk-plate__bike rk-ptext" aria-hidden>
              {bikeLines(reg || m.placeholder).map((l, i) => (
                <span key={i} className={reg ? undefined : "is-empty"}>
                  {l}
                </span>
              ))}
            </span>
          )}
          {/* Our own placeholder, centred by layout rather than by the browser (Safari places the native one differently) */}
          {!bike && !reg && (
            <span className="rk-plate__ph rk-ptext" aria-hidden>
              {m.placeholder}
            </span>
          )}
          <input
            ref={inputRef}
            id="rk-reg"
            className="rk-plate__input rk-ptext"
            name="q"
            value={reg}
            onChange={(e) => setReg(spaceReg(e.target.value))}
            placeholder={m.placeholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
          />
          <div className="rk-plate__stamp" aria-hidden hidden>
            {Array.from(STAMP).map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </div>
        </div>
        </>
      )}

      {!building && (
        <>
          <button type="submit" className="rk-search__go" data-after>
            <SearchIcon /> <span id="rk-go-label">{buttonLabel}</span>
          </button>
          <p className="rk-search__help" id="rk-help" data-after>
            {makeHelp}
          </p>
        </>
      )}
      {mode === "buy" && <FilterDropdown f={filters} set={setF} count={filterCount} onShow={showFiltered} />}
      </div>

    </form>
  );
});

