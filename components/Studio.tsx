"use client";

import { useEffect, useRef, useState } from "react";
import { spaceReg } from "@/lib/brand";
import { emptyBuild, regLength, sizeFits, type BuildConfig } from "@/lib/builder";
import { Plate3D } from "./Plate3D";
import { PlateBuilder } from "./PlateBuilder";
import { SurroundCreator } from "./MakeTools";

type Tab = "plates" | "surrounds";
const TABS: { key: Tab; label: string }[] = [
  { key: "plates", label: "Number plates" },
  { key: "surrounds", label: "Plate surrounds" },
];

/**
 * In-store studio. Staff open it on the shop TV to show a customer how their plates and surrounds
 * will look. It reuses the real plate builder, 3D preview and surround creator, with the `studio`
 * option on: no prices, no fitting kit, documents or delivery steps, no basket.
 * Both tabs stay mounted, so switching keeps each customer's progress; "Start again" clears both.
 */
export function Studio() {
  const [tab, setTab] = useState<Tab>("plates");
  const [reg, setReg] = useState("");
  const [cfg, setCfg] = useState<BuildConfig>(emptyBuild);
  // Changing the key rebuilds the builders from scratch (their own step state included).
  const [run, setRun] = useState(0);
  const regRef = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<BuildConfig>) => setCfg((c) => ({ ...c, ...p }));

  // Sizes depend on the reg's length: drop a chosen size the reg no longer fits (same rule as the Make tab).
  useEffect(() => {
    if (!regLength(reg)) return;
    const sameSizes = (c: BuildConfig) => !c.rearSize || c.rearSize === c.size;
    setCfg((c) => {
      let next = c;
      if (c.size && !sizeFits(c.size, c.vehicle, c.legal, reg, [c.style, sameSizes(c) ? c.rearStyle : null])) next = { ...next, size: null };
      if (c.rearSize && !sizeFits(c.rearSize, c.vehicle, c.legal, reg, [c.rearStyle ?? c.style])) next = { ...next, rearSize: null };
      return next;
    });
  }, [reg, cfg.legal, cfg.vehicle, cfg.style, cfg.rearStyle]);

  // The page has no shop header, so the shop's intro state means nothing here.
  useEffect(() => {
    document.documentElement.classList.remove("rk-intro-pending");
  }, []);

  const startAgain = () => {
    setReg("");
    setCfg(emptyBuild());
    setTab("plates");
    setRun((n) => n + 1);
    regRef.current?.focus();
  };

  const hasReg = reg.replace(/\s/g, "").length >= 2;

  return (
    <div className="rk-studio" data-studio>
      <header className="rk-studio__bar">
        <img className="rk-studio__logo" src="/brand/regking-logo.png" alt="REG KING" />
        <div className="rk-studio__tabs" role="tablist" aria-label="What to design">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" id={`studio-tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`studio-panel-${t.key}`} data-studio-tab={t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="rk-studio__regbox" htmlFor="studio-reg">
          <span>Registration</span>
          <input
            ref={regRef}
            id="studio-reg"
            className="rk-studio__reg"
            value={reg}
            onChange={(e) => setReg(spaceReg(e.target.value))}
            placeholder="TYPE REG"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
          />
        </label>
        <button type="button" className="rk-studio__again" data-studio-again onClick={startAgain}>
          Start again
        </button>
      </header>

      <main className="rk-studio__main">
        <section id="studio-panel-plates" role="tabpanel" aria-labelledby="studio-tab-plates" className="rk-studio__panel rk-studio__panel--plates" data-active={tab === "plates"} inert={tab !== "plates"}>
          <div className="rk-studio__view">
            <Plate3D key={`v${run}`} reg={hasReg ? reg : ""} c={cfg} />
          </div>
          <div className="rk-studio__ctl">
            <div className="rk-make">
              <PlateBuilder key={`b${run}`} studio reg={reg} c={cfg} set={patch} replace={setCfg} onRegStep={() => regRef.current?.focus()} title={<>Design your <span>plates</span></>} />
            </div>
          </div>
        </section>

        <section id="studio-panel-surrounds" role="tabpanel" aria-labelledby="studio-tab-surrounds" className="rk-studio__panel rk-studio__panel--surrounds" data-active={tab === "surrounds"} inert={tab !== "surrounds"}>
          <div className="rk-studio__acc">
            <SurroundCreator key={`s${run}`} studio reg={reg} />
          </div>
        </section>
      </main>
    </div>
  );
}
