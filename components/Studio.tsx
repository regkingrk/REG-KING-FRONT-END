"use client";

import { useEffect, useRef, useState } from "react";
import { showReg, spaceReg } from "@/lib/brand";
import { emptyBuild, plateGaps, regChars, regLength, rearOnly, sizeFits, SPACING_PRESETS, type BuildConfig } from "@/lib/builder";
import { Plate3D } from "./Plate3D";
import { PlateBuilder } from "./PlateBuilder";
import { PlateOnCar } from "./PlateOnCar";
import { SurroundCreator } from "./MakeTools";

type Tab = "plates" | "surrounds";
/** Showcase scenes: how the finished design is lit, or a customer's own car photo. */
type Scene = "studio" | "day" | "night" | "lights" | "car";
const SCENES: { key: Scene; label: string }[] = [
  { key: "studio", label: "Studio" },
  { key: "day", label: "Day" },
  { key: "night", label: "Night" },
  { key: "lights", label: "Lights on" },
  { key: "car", label: "On a car" },
];
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
  // Full screen for the shop TV. Hidden where the browser can't do it (some tablets and embedded views).
  const wasFull = useRef(false);
  const [canFull, setCanFull] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    setCanFull(!!document.fullscreenEnabled);
    const sync = () => {
      const f = !!document.fullscreenElement;
      setFull(f);
      // Esc in browser full screen is taken by the browser: leave the showcase with it.
      if (!f && wasFull.current) setShowcase(false);
      wasFull.current = f;
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  // Showcase: hides the controls so the finished design fills the screen for the customer. Esc or the button goes back.
  const [showcase, setShowcase] = useState(false);
  const [scene, setScene] = useState<Scene>("studio");
  const [carSide, setCarSide] = useState<"front" | "rear">("rear");
  const enterShowcase = () => {
    setShowcase(true);
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {});
    } catch {
      /* the browser refused: the showcase still fills the page */
    }
  };
  const leaveShowcase = () => {
    setShowcase(false);
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {
      /* nothing to do */
    }
  };
  useEffect(() => {
    if (!showcase) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowcase(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showcase]);
  const toggleFull = () => {
    const done = () => {};
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(done);
      else void document.documentElement.requestFullscreen().catch(done);
    } catch {
      /* the browser refused: nothing to do */
    }
  };
  const patch = (p: Partial<BuildConfig>) => setCfg((c) => ({ ...c, ...p }));

  // Sizes depend on the reg's length: drop a chosen size the reg no longer fits (same rule as the Make tab).
  useEffect(() => {
    if (!regLength(reg)) return;
    const sameSizes = (c: BuildConfig) => !c.rearSize || c.rearSize === c.size;
    setCfg((c) => {
      let next = c;
      const gaps = plateGaps(c, reg);
      if (c.size && !sizeFits(c.size, c.vehicle, c.legal, reg, [c.style, sameSizes(c) ? c.rearStyle : null], gaps, c.extras)) next = { ...next, size: null };
      if (c.rearSize && !sizeFits(c.rearSize, c.vehicle, c.legal, reg, [c.rearStyle ?? c.style], gaps, c.extras)) next = { ...next, rearSize: null };
      return next;
    });
  }, [reg, cfg.legal, cfg.vehicle, cfg.style, cfg.rearStyle, cfg.spacing, cfg.extras]);
  // Show plates are spaced however the customer types them; road-legal and bike plates go back to the usual spacing
  useEffect(() => {
    if ((cfg.legal !== "Show" || cfg.vehicle === "Bike") && reg !== spaceReg(reg)) setReg(spaceReg(reg));
  }, [reg, cfg.legal, cfg.vehicle]);
  // Spacing REG KING has set up for a reg comes back when it's made a show plate again
  useEffect(() => {
    const preset = SPACING_PRESETS[regChars(reg)];
    if (cfg.legal === "Show" && cfg.spacing == null && preset) setCfg((c) => ({ ...c, spacing: preset }));
  }, [reg, cfg.legal, cfg.spacing]);

  // The page has no shop header, so the shop's intro state means nothing here.
  useEffect(() => {
    document.documentElement.classList.remove("rk-intro-pending");
  }, []);

  const startAgain = () => {
    setReg("");
    setCfg(emptyBuild());
    setTab("plates");
    setScene("studio");
    setCarSide("rear");
    setRun((n) => n + 1);
    regRef.current?.focus();
  };

  const hasReg = reg.replace(/\s/g, "").length >= 2;

  return (
    <div className={`rk-studio${showcase ? " rk-studio--show" : ""}`} data-studio data-scene={showcase ? scene : undefined}>
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
            onChange={(e) => {
              const next = cfg.legal === "Show" && cfg.vehicle !== "Bike" ? showReg(e.target.value) : spaceReg(e.target.value);
              if (regChars(next) !== regChars(reg)) patch({ spacing: SPACING_PRESETS[regChars(next)] ?? null });
              setReg(next);
            }}
            placeholder="TYPE REG"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={cfg.legal === "Show" && cfg.vehicle !== "Bike" ? 25 : 8}
          />
        </label>
        <button type="button" className="rk-studio__show" data-studio-showcase onClick={enterShowcase}>
          Showcase
        </button>
        {canFull && (
          <button type="button" className="rk-studio__full" data-studio-full aria-pressed={full} onClick={toggleFull}>
            {full ? "Exit full screen" : "Full screen"}
          </button>
        )}
        <button type="button" className="rk-studio__again" data-studio-again onClick={startAgain}>
          Start again
        </button>
      </header>

      {showcase && (
        <>
          <button type="button" className="rk-studio__back" data-studio-back onClick={leaveShowcase}>
            Back to design
          </button>
          <div className="rk-studio__scenes" role="radiogroup" aria-label="Showcase view">
            {SCENES.filter((x) => x.key !== "car" || tab === "plates").map((x) => (
              <button key={x.key} type="button" role="radio" aria-checked={scene === x.key} data-scene-btn={x.key} onClick={() => setScene(x.key)}>
                {x.label}
              </button>
            ))}
          </div>
        </>
      )}

      <main className="rk-studio__main">
        {showcase && scene === "car" && tab === "plates" && (
          <section className="rk-studio__car" aria-label="Your plates on a car">
            {!rearOnly(cfg.vehicle) && cfg.qty !== "Single" && (
              <div className="rk-studio__carside" role="radiogroup" aria-label="Which plate to show on the car">
                {(["rear", "front"] as const).map((x) => (
                  <button key={x} type="button" role="radio" aria-checked={carSide === x} onClick={() => setCarSide(x)}>
                    {x === "rear" ? "Rear plate" : "Front plate"}
                  </button>
                ))}
              </div>
            )}
            <PlateOnCar studio reg={hasReg ? reg : ""} c={cfg} side={rearOnly(cfg.vehicle) ? "rear" : cfg.qty === "Single" ? (cfg.side === "Front" ? "front" : "rear") : carSide} onStyle={(style) => patch({ style })} />
          </section>
        )}
        <section id="studio-panel-plates" role="tabpanel" aria-labelledby="studio-tab-plates" className="rk-studio__panel rk-studio__panel--plates" data-active={tab === "plates"} inert={tab !== "plates"}>
          <div className="rk-studio__view">
            <Plate3D key={`v${run}`} reg={hasReg ? reg : ""} c={cfg} bright />
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
