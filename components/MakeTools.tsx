"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ACCESSORY_PRICES,
  FRAME_COLOURS,
  LOGO_PLATE_TYPES,
  LOGO_FILE_TYPES,
  LOGO_FILE_MAX_MB,
  MANUFACTURERS,
  ART_CATEGORIES,
  ART_FONTS,
  artCategoryOf,
  type ArtCategory,
  SURROUND_STYLES,
  TEXT_COLOURS,
  UPLOAD_NOTE,
  UPLOAD_TYPES,
  artworkText,
  defaultLogoPlateConfig,
  defaultSurroundConfig,
  surroundSummary,
  type Artwork,
  type LogoDesign,
  type LogoDelivery,
  type LogoPlateConfig,
  type Swatch,
  type SurroundConfig,
  type SurroundDesign,
  type SurroundShape,
  type SurroundSize,
  type SurroundStyle,
  swatch,
} from "@/lib/accessories";
import { ColourPicker } from "./ColourPicker";
import { hexPoints } from "@/lib/builder";
import { MEMBER_DISCOUNT, formatGBP } from "@/lib/brand";
import { useAccount } from "./AccountProvider";
import { useMode } from "./ModeProvider";
import { LogoPlatePreview, SurroundPreview } from "./AccessoryPreview";
import { RealPhotos } from "./RealPhotos";
import { ART_ITEMS, REGIONS, artItem, type ArtItem, type Region } from "@/lib/artLibrary";
import { carLogo, carLogoSrc, carLogosFor, type CarLogo } from "@/lib/carLogos";
import { PlateGL } from "./PlateGL";
import { canRender3D } from "@/lib/plate3d";
import { buildSurround, type SurroundView } from "@/lib/surround3d";
import { SURROUND_GROUPS, SURROUND_SIZE_LIST, sizeShortName, surroundSize } from "@/lib/surroundSizes";
import { lineTotal, newId, useMake, type BasketLine } from "./MakeProvider";

const money = (n: number | null) => (n === null ? "Price on request" : n === 0 ? "Free" : formatGBP(n, Number.isInteger(n)));
const each = (n: number | null, qty: number): number | null => (n === null ? null : n * qty);

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Step({ n, title, children, note }: { n: number; title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <li className="rk-bstep is-open rk-astep">
      <div className="rk-bstep__h">
        <b className="rk-bstep__n">{n}</b>
        <span className="rk-bstep__t">{title}</span>
      </div>
      <div className="rk-bstep__b">
        {children}
        {note && <p className="rk-bfine">{note}</p>}
      </div>
    </li>
  );
}

function Options<T extends string>({ label, value, options, onPick, name }: { label: string; value: T; options: { key: T; name: string; line?: string; visual?: ReactNode }[]; onPick: (v: T) => void; name: string }) {
  return (
    <div className="rk-choice rk-choice--acc" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} data-b={`${name}:${o.key}`} onClick={() => onPick(o.key)}>
          {o.visual && <span className="rk-choice__vis">{o.visual}</span>}
          <b>{o.name}</b>
          {o.line && <small>{o.line}</small>}
        </button>
      ))}
    </div>
  );
}

/** Text, a manufacturer logo, the customer's own logo, or text with a logo. */
function ArtworkEditor<A extends Artwork>({ a, set, name, textLabel = "Your text" }: { a: A; set: (p: Partial<A>) => void; name: string; textLabel?: string }) {
  const [error, setError] = useState("");
  const make = MANUFACTURERS.find((m) => m.make === a.make);
  const onFile = (f: File | undefined) => {
    setError("");
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("That file is over 5MB. Try a smaller image.");
      return;
    }
    if (!/\.(png|jpe?g|webp|svg)$/i.test(f.name)) {
      setError("Please choose a PNG, JPG, WEBP or SVG file.");
      return;
    }
    const r = new FileReader();
    r.onload = () => set({ upload: String(r.result), uploadName: f.name, logo: "upload" } as Partial<A>);
    r.readAsDataURL(f);
  };
  return (
    <div className="rk-art">
      <label className="rk-art__field">
        <span>
          {textLabel} <i>optional</i>
        </span>
        <input value={a.text} maxLength={22} onChange={(e) => set({ text: e.target.value } as Partial<A>)} placeholder="For example REG KING" data-b={`${name}:text`} />
      </label>
      <div className="rk-art__sub">
        <span className="rk-art__l">Text colour</span>
        <ColourPicker label="Text colour" list={TEXT_COLOURS} value={a.textColour} onPick={(k) => set({ textColour: k } as Partial<A>)} name={`${name}-textcolour`} />
      </div>

      <div className="rk-art__sub">
        <span className="rk-art__l">Logo</span>
        <div className="rk-seg rk-art__logo" role="radiogroup" aria-label="Logo">
          {(
            [
              ["none", "No logo"],
              ["make", "Car brand"],
              ["upload", "Upload my own"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={a.logo === k} data-b={`${name}-logo:${k}`} onClick={() => set({ logo: k } as Partial<A>)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {a.logo === "make" && (
        <div className="rk-art__sub">
          <span className="rk-art__l">Choose the make</span>
          <div className="rk-pills rk-pills--wrap">
            {MANUFACTURERS.map((m) => (
              <button key={m.make} type="button" aria-pressed={a.make === m.make} data-b={`${name}-make:${m.make}`} onClick={() => set({ make: m.make, badge: "Logo only" } as Partial<A>)}>
                {m.make}
              </button>
            ))}
          </div>
          {make && make.badges.length > 1 && (
            <>
              <span className="rk-art__l">Model or badge</span>
              <div className="rk-pills rk-pills--wrap">
                {make.badges.map((b) => (
                  <button key={b} type="button" aria-pressed={a.badge === b} data-b={`${name}-badge:${b}`} onClick={() => set({ badge: b } as Partial<A>)}>
                    {b}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="rk-bfine">The preview shows the brand name. The finished product uses the official logo artwork.</p>
        </div>
      )}

      {a.logo === "upload" && (
        <div className="rk-art__sub">
          <label className="rk-upload">
            <input type="file" accept={UPLOAD_TYPES} onChange={(e) => onFile(e.target.files?.[0])} data-b={`${name}:upload`} />
            <span className="rk-upload__btn">{a.upload ? "Choose a different file" : "Choose a file"}</span>
            <span className="rk-upload__name">{a.uploadName || "No file chosen"}</span>
          </label>
          {error && <p className="rk-sellflow__err">{error}</p>}
          <p className="rk-bfine">{UPLOAD_NOTE}</p>
        </div>
      )}
    </div>
  );
}

function AddBar({ lines, label, onAdd, editing, waiting }: { lines: BasketLine[]; label: string; onAdd: () => void; editing: boolean; waiting?: string }) {
  const t = lineTotal(lines);
  return (
    <div className="rk-addbar">
      <ul>
        {lines.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <b>{money(l.amount)}</b>
          </li>
        ))}
      </ul>
      <div className="rk-addbar__row">
        <span className="rk-addbar__total">
          {t.onRequest && t.known === 0 ? "Price on request" : formatGBP(t.known, Number.isInteger(t.known)) + (t.onRequest ? "+" : "")}
        </span>
        <button type="button" className="rk-btn rk-btn--gold rk-addbar__go" onClick={onAdd} data-b="add-to-basket" disabled={!!waiting}>
          {editing ? "Update basket" : label}
        </button>
      </div>
      {waiting && <p className="rk-addbar__wait">{waiting}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plate surrounds                                                     */
/* ------------------------------------------------------------------ */

export const surroundLines = (c: SurroundConfig): BasketLine[] => {
  const qty = c.qty === "set" ? 2 : 1;
  return [{ label: `Personalised ${c.style ?? ""} surround${qty > 1 ? "s × 2" : ""}`.replace("  ", " "), amount: each(ACCESSORY_PRICES.customSurround, qty) }];
};

/** A size card's picture: the plate (hex or rounded) in its surround, in proportion. */
function SurroundSizeExample({ size, framed, side }: { size: SurroundSize; framed: boolean; side: "front" | "rear" }) {
  const z = surroundSize(size);
  const pad = framed ? 9 : 0;
  const w = z.w + pad * 2, h = z.h + pad * 2;
  const m = 8;
  const W = w + m * 2, H = h + m * 2;
  const shapeOf = (x: number, y: number, ww: number, hh: number, r: number) =>
    z.hex ? hexPoints(x, y, ww, hh).map(([px, py], i) => `${i ? "L" : "M"}${px} ${py}`).join("") + "Z" : `M${x + r} ${y}H${x + ww - r}Q${x + ww} ${y} ${x + ww} ${y + r}V${y + hh - r}Q${x + ww} ${y + hh} ${x + ww - r} ${y + hh}H${x + r}Q${x} ${y + hh} ${x} ${y + hh - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  const face = z.group === "Bike" || side === "rear" ? "#f6c900" : "#f6f6f2";
  return (
    <svg className="rk-sizecard__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {framed && <path d={shapeOf(m, m, w, h, 12)} fill="#111" />}
      <path d={shapeOf(m + pad, m + pad, z.w, z.h, 6)} fill={face} stroke={framed ? "none" : "#111"} strokeWidth={framed ? 0 : 6} />
    </svg>
  );
}

/** Why the artwork isn't ready yet (null when it is). */
function artProblem(kind: ArtCategory | null, d: Artwork): string | null {
  if (!kind) return "Choose what goes on it.";
  if (kind === "car" && !d.make) return "Choose a car brand.";
  if (kind === "text" && !d.text.trim()) return "Type your text.";
  if ((kind === "country" || kind === "other") && !d.item) return "Choose one from the list.";
  if (kind === "custom" && !d.upload && !d.note?.trim()) return "Upload your image, or tell us what you'd like in the note.";
  return null;
}

/** A brand logo as a small picture for its button: one-colour logos in dark ink, badges in their own colours. */
function LogoThumb({ logo }: { logo: CarLogo }) {
  const src = carLogoSrc(logo.key);
  if (logo.fullColour) return <img className="rk-artlib__logo" src={src} alt="" />;
  const mask = `url("${src}") center / contain no-repeat`;
  return <span className="rk-artlib__logo rk-artlib__logo--ink" style={{ WebkitMask: mask, mask }} aria-hidden />;
}

/** A library item as a small picture for its button. */
function ArtThumb({ item }: { item: ArtItem }) {
  if (!item.layers.length) return <span className="rk-artlib__name">{item.name}</span>;
  return (
    <svg viewBox={`0 0 ${item.w} ${item.h}`} className="rk-artlib__svg" aria-hidden>
      {item.layers.map((l, i) =>
        l.stroke ? (
          <path key={i} d={l.d} fill="none" stroke={l.stroke === "currentColor" ? "currentColor" : l.stroke} strokeWidth={l.width ?? 2} strokeLinejoin="round" />
        ) : (
          <path key={i} d={l.d} fill={l.fill ?? "currentColor"} fillRule={l.evenodd ? "evenodd" : "nonzero"} />
        ),
      )}
    </svg>
  );
}

/**
 * What goes on the surround: Car Related, Custom Text, Country & Caste, Other, Custom (upload), or None.
 * Every kind has a note box so the customer can explain exactly what they want.
 */
function ArtPicker<A extends Artwork>({
  d,
  setD,
  kind,
  setKind,
  err,
  where,
  onDone,
}: {
  d: A;
  setD: (p: Partial<A>) => void;
  kind: ArtCategory | null;
  setKind: (k: ArtCategory) => void;
  err: string;
  where: string;
  onDone: () => void;
}) {
  const [sub, setSub] = useState<"country" | "faith">(() => (artItem(d.item)?.group === "faith" ? "faith" : "country"));
  const [fileErr, setFileErr] = useState("");
  const [region, setRegion] = useState<Region>(() => artItem(d.item)?.region ?? "uk");
  const [flagQ, setFlagQ] = useState("");
  const make = MANUFACTURERS.find((m) => m.make === d.make);
  const logos = d.make ? carLogosFor(d.make) : [];
  const chosenLogo = carLogo(d.carLogo);
  const pickKind = (k: ArtCategory) => {
    setKind(k);
    const clear = { text: "", make: "", badge: "", item: undefined, carLogo: undefined, upload: null, uploadName: "" };
    if (k === "car") setD({ ...clear, cat: k, logo: "make" } as unknown as Partial<A>);
    else if (k === "custom") setD({ ...clear, cat: k, logo: "upload" } as unknown as Partial<A>);
    else setD({ ...clear, cat: k, logo: "none", font: k === "text" ? d.font ?? "plate" : d.font } as unknown as Partial<A>);
  };
  const onFile = (f: File | undefined) => {
    setFileErr("");
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setFileErr("That file is over 5MB. Try a smaller image.");
    if (!/\.(png|jpe?g|webp|svg)$/i.test(f.name)) return setFileErr("Please choose a PNG, JPG, WEBP or SVG file.");
    const r = new FileReader();
    r.onload = () => setD({ upload: String(r.result), uploadName: f.name, logo: "upload" } as Partial<A>);
    r.readAsDataURL(f);
  };
  const colour = (
    <div className="rk-art__sub">
      <span className="rk-art__l">Colour</span>
      <ColourPicker label="Colour" list={TEXT_COLOURS} value={d.textColour} onPick={(k) => setD({ textColour: k } as Partial<A>)} name="sart-textcolour" />
    </div>
  );
  const items = (group: ArtItem["group"], only?: (x: ArtItem) => boolean) => (
    <div className={`rk-artlib${group === "country" ? " rk-artlib--flags" : ""}`} role="radiogroup" aria-label="Choose one">
      {ART_ITEMS.filter((x) => x.group === group && (!only || only(x))).map((x) => (
        <button key={x.key} type="button" role="radio" aria-checked={d.item === x.key} data-b={`sart-item:${x.key}`} onClick={() => setD({ item: x.key } as Partial<A>)} title={x.name}>
          <ArtThumb item={x} />
          <small>{x.name}</small>
        </button>
      ))}
    </div>
  );
  return (
    <div className="rk-art">
      <p className="rk-bfine">Cut in raised 3D acrylic {where}.</p>
      <div className="rk-choice rk-art__cats" role="radiogroup" aria-label="What goes on it">
        {ART_CATEGORIES.map((x) => (
          <button key={x.key} type="button" role="radio" aria-checked={kind === x.key} data-b={`sartkind:${x.key}`} onClick={() => pickKind(x.key)}>
            <b>{x.name}</b>
            <small>{x.line}</small>
          </button>
        ))}
      </div>

      {kind === "car" && (
        <>
          <span className="rk-art__l">Brand</span>
          <div className="rk-pills rk-pills--wrap">
            {MANUFACTURERS.map((m) => (
              <button
                key={m.make}
                type="button"
                aria-pressed={d.make === m.make}
                data-b={`sart-make:${m.make}`}
                onClick={() => {
                  const first = carLogosFor(m.make)[0];
                  setD({ make: m.make, badge: first ? first.name : m.badges[0], carLogo: first?.key, logo: "make" } as Partial<A>);
                }}
              >
                {m.make}
              </button>
            ))}
          </div>
          {logos.length > 0 && (
            <>
              <span className="rk-art__l">Logo</span>
              <div className="rk-artlib rk-artlib--logos" role="radiogroup" aria-label={`${d.make} logos`}>
                {logos.map((l) => (
                  <button key={l.key} type="button" role="radio" aria-checked={d.carLogo === l.key} data-b={`sart-logo:${l.key}`} onClick={() => setD({ carLogo: l.key, badge: l.name } as Partial<A>)} title={l.name}>
                    <LogoThumb logo={l} />
                    <small>{l.name}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {make && !logos.length && make.badges.length > 1 && (
            <>
              <span className="rk-art__l">Badge</span>
              <div className="rk-pills rk-pills--wrap">
                {make.badges.map((b) => (
                  <button key={b} type="button" aria-pressed={d.badge === b} data-b={`sart-badge:${b}`} onClick={() => setD({ badge: b } as Partial<A>)}>
                    {b}
                  </button>
                ))}
              </div>
            </>
          )}
          {make && !logos.length && <p className="rk-bfine">The preview shows the name; we add the real badge artwork on your proof.</p>}
          {chosenLogo?.fullColour ? <p className="rk-bfine">This badge is made in its own colours.</p> : make && colour}
        </>
      )}

      {kind === "text" && (
        <>
          <span className="rk-art__l">Font</span>
          <div className="rk-seg" role="radiogroup" aria-label="Font">
            {ART_FONTS.map((f) => (
              <button key={f.key} type="button" role="radio" aria-checked={(d.font ?? "plate") === f.key} data-b={`sart-font:${f.key}`} onClick={() => setD({ font: f.key } as Partial<A>)} style={{ fontFamily: f.css }}>
                {f.name}
              </button>
            ))}
          </div>
          <label className="rk-art__field">
            <span>Your text</span>
            <input value={d.text} maxLength={22} onChange={(e) => setD({ text: e.target.value } as Partial<A>)} placeholder="For example REG KING" data-b="sart:text" style={{ fontFamily: ART_FONTS.find((f) => f.key === (d.font ?? "plate"))?.css }} />
          </label>
          {colour}
        </>
      )}

      {kind === "country" && (
        <>
          <div className="rk-seg" role="radiogroup" aria-label="Countries or faith">
            {(
              [
                ["country", "Countries"],
                ["faith", "Faith & heritage"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={sub === k} data-b={`sart-sub:${k}`} onClick={() => setSub(k)}>
                {l}
              </button>
            ))}
          </div>
          {sub === "country" && (
            <>
              <p className="rk-bfine">Printed in full colour across the whole lip, edge to edge, with the stripes running along it.</p>
              <label className="rk-art__field rk-art__search">
                <span>Find a country</span>
                <input type="search" value={flagQ} onChange={(e) => setFlagQ(e.target.value)} placeholder="For example Jamaica" data-b="sart:flagq" />
              </label>
              {!flagQ.trim() && (
                <div className="rk-pills rk-pills--wrap" role="radiogroup" aria-label="Region">
                  {REGIONS.map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={region === k} aria-pressed={region === k} data-b={`sart-region:${k}`} onClick={() => setRegion(k)}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {(() => {
                const q = flagQ.trim().toLowerCase();
                const any = ART_ITEMS.some((x) => x.group === "country" && (q ? x.name.toLowerCase().includes(q) : x.region === region));
                return any ? items("country", (x) => (q ? x.name.toLowerCase().includes(q) : x.region === region)) : <p className="rk-bfine">No flag by that name yet. Choose Custom and upload it, or tell us in the note.</p>;
              })()}
            </>
          )}
          {sub === "faith" && items("faith")}
          {sub === "faith" && <p className="rk-bfine">Symbols shown by name are drawn by our team and shown on your proof. Not listed? Tell us in the note.</p>}
          {(sub === "faith" || artItem(d.item)?.mono) && colour}
        </>
      )}

      {kind === "other" && (
        <>
          {items("other")}
          {colour}
        </>
      )}

      {kind === "custom" && (
        <>
          <label className="rk-art__file">
            <span>{d.upload ? `Chosen: ${d.uploadName}` : "Upload your image or logo"}</span>
            <input type="file" accept={UPLOAD_TYPES} onChange={(e) => onFile(e.target.files?.[0])} data-b="sart:upload" />
          </label>
          <p className="rk-bfine">{UPLOAD_NOTE}</p>
          {fileErr && (
            <p className="rk-sellflow__err" role="alert">
              {fileErr}
            </p>
          )}
        </>
      )}

      {kind && kind !== "plain" && (
        <label className="rk-art__field rk-art__note">
          <span>Note for our team (optional)</span>
          <textarea rows={3} maxLength={400} value={d.note ?? ""} onChange={(e) => setD({ note: e.target.value } as Partial<A>)} placeholder={kind === "custom" ? "Tell us what you'd like, sizes, colours, anything to clarify" : "Anything to clarify, for example the exact badge, colours or spelling"} data-b="sart:note" />
        </label>
      )}
      {kind === "plain" && <p className="rk-bfine">No text or logo.</p>}

      {err && (
        <p className="rk-sellflow__err" role="alert">
          {err}
        </p>
      )}
      {kind && (
        <button type="button" className="rk-bnext" data-b="sart:done" onClick={onDone}>
          Done
        </button>
      )}
    </div>
  );
}

type SurroundStep = "style" | "qty" | "size" | "rearSize" | "frame" | "backing" | "panel" | "art";

/**
 * Surround creator, one question at a time (like the plate builder): style, single or set, a size for
 * each surround (framed), frame colour, backing colour, then text OR a logo. Answered steps fold away
 * with a Change link. A set shares one design. The compact version (inside the plate builder) takes
 * the quantity and size from the plates and hands the design back with "Add to my plates".
 */
export function SurroundCreator({
  reg,
  compact,
  initial,
  plateQty,
  fit,
  onDone,
  onCancel,
}: {
  reg: string;
  compact?: boolean;
  initial?: SurroundConfig;
  plateQty?: "single" | "set";
  fit?: { shape: SurroundShape; size: SurroundSize };
  onDone?: (c: SurroundConfig) => void;
  onCancel?: () => void;
}) {
  const { save, editing } = useMake();
  const editItem = !compact && editing?.kind === "surrounds" ? editing : null;
  // the full maker starts on framed (switched with the Framed / Frameless toggle above the preview)
  const fresh = (): SurroundConfig => ({ ...defaultSurroundConfig(plateQty ?? "set"), ...(compact ? {} : { style: "framed" as SurroundStyle }), ...(fit ?? {}) });
  const [c, setC] = useState<SurroundConfig>(() => initial ?? fresh());
  // Which questions have been answered (colours have defaults, so a pick is what answers them).
  const [done, setDone] = useState<Set<SurroundStep>>(() => new Set(initial ? (["style", "qty", "size", "rearSize", "frame", "backing", "panel", "art"] as SurroundStep[]) : []));
  const [open, setOpen] = useState<SurroundStep | null>(null);
  const [sizeTab, setSizeTab] = useState<string | null>(null);
  const [artKind, setArtKind] = useState<ArtCategory | null>(() => (initial?.front ? artCategoryOf(initial.front) : null));
  const [err, setErr] = useState("");
  useEffect(() => {
    if (editItem) {
      setC(editItem.data.cfg);
      setDone(new Set(["style", "qty", "size", "rearSize", "frame", "backing", "panel", "art"]));
      const d = editItem.data.cfg.front;
      setArtKind(artCategoryOf(d));
    }
  }, [editItem]);
  useEffect(() => {
    if (fit) setC((x) => ({ ...x, ...fit }));
  }, [fit?.shape, fit?.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p: Partial<SurroundConfig>) => setC((x) => ({ ...x, ...p }));
  // One design for both surrounds
  const setD = (p: Partial<SurroundDesign>) => setC((x) => ({ ...x, same: true, front: { ...x.front, ...p }, rear: { ...x.front, ...p } }));
  const answer = (k: SurroundStep, p?: Partial<SurroundConfig>) => {
    if (p) set(p);
    setDone((d) => new Set(d).add(k));
    setOpen(null);
  };
  const d = c.front;
  const framed = c.style === "framed";
  const isSet = compact ? plateQty === "set" : c.qty === "set";
  const rearShape = c.rearShape ?? c.shape;
  const rearSize = c.rearSize ?? c.size;

  const steps: SurroundStep[] = [
    ...(compact ? (["style"] as SurroundStep[]) : []),
    ...(compact ? [] : (["qty"] as SurroundStep[])),
    ...(framed && !compact ? (["size"] as SurroundStep[]) : []),
    ...(framed && !compact && isSet ? (["rearSize"] as SurroundStep[]) : []),
    ...(framed ? (["frame"] as SurroundStep[]) : []),
    "backing",
    ...(framed ? [] : (["panel"] as SurroundStep[])),
    "art",
  ];
  const current = steps.find((k) => !done.has(k)) ?? null;
  const shown = open ?? current;
  const sizeName = (z: SurroundSize) => sizeShortName(surroundSize(z));
  const title: Record<SurroundStep, string> = {
    style: "Surround style",
    qty: "Single or set",
    size: isSet ? "Front surround size" : "Size",
    rearSize: "Rear surround size",
    frame: "Frame colour",
    backing: framed ? "Wing colour" : "Side pieces colour",
    panel: "Main part colour",
    art: "Text or logo",
  };
  const answerOf: Record<SurroundStep, string> = {
    style: framed ? "Framed" : "Frameless",
    qty: c.qty === "set" ? "Set (front and rear)" : "Single",
    size: sizeName(c.size),
    rearSize: sizeName(rearSize),
    frame: swatch(FRAME_COLOURS, d.frame).name,
    backing: swatch(FRAME_COLOURS, d.backing).name,
    panel: d.panel ? swatch(FRAME_COLOURS, d.panel).name : "Matching shade",
    art: artKind === "plain" ? "None" : `${ART_CATEGORIES.find((x) => x.key === artKind)?.name ?? ""}: ${artworkText(d)}`,
  };
  const allDone = current === null;
  const mmOf = (z: SurroundSize) => surroundSize(z).w;
  const scaleW = (z: SurroundSize) => `${((mmOf(z) + 38) / (Math.max(mmOf(c.size), mmOf(rearSize)) + 38)) * 100}%`;

  const sizeBody = (rear: boolean) => {
    const size = rear ? rearSize : c.size;
    const tab = sizeTab ?? surroundSize(size).group;
    const pick = (key: SurroundSize) => {
      const shape: SurroundShape = surroundSize(key).hex ? "hex" : "standard";
      set(rear ? { rearShape: shape, rearSize: key } : { shape, size: key, ...(!done.has("rearSize") ? { rearShape: shape, rearSize: key } : {}) });
    };
    return (
      <>
        <div className="rk-seg rk-acc__shape" role="radiogroup" aria-label="Plate type">
          {SURROUND_GROUPS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={tab === g} aria-selected={tab === g} onClick={() => setSizeTab(g)} data-b={`${rear ? "srgroup" : "sgroup"}:${g}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="rk-sizecards" role="radiogroup" aria-label={rear ? "Rear size" : "Size"}>
          {SURROUND_SIZE_LIST.filter((z) => z.group === tab).map((z) => (
            <button
              key={z.key}
              type="button"
              role="radio"
              className="rk-sizecard"
              aria-checked={surroundSize(size).key === z.key && done.has(rear ? "rearSize" : "size")}
              data-b={`${rear ? "srsize" : "ssize"}:${z.key}`}
              onClick={() => {
                pick(z.key);
                setSizeTab(null);
                answer(rear ? "rearSize" : "size");
              }}
            >
              <SurroundSizeExample size={z.key} framed={framed} side={rear || !isSet ? "rear" : "front"} />
              <b>{sizeShortName(z)}</b>
              <small>
                {Math.round(z.w)} × {Math.round(z.h)}mm
              </small>
            </button>
          ))}
        </div>
      </>
    );
  };

  const artBody = (
    <ArtPicker
      d={d}
      setD={setD}
      kind={artKind}
      setKind={(k) => {
        setArtKind(k);
        setErr("");
      }}
      err={err}
      where={framed ? "on the wing under the frame" : "on the main part under the plate"}
      onDone={() => {
        const msg = artProblem(artKind, d);
        if (msg) return setErr(msg);
        setErr("");
        answer("art");
      }}
    />
  );

  const body = (k: SurroundStep): ReactNode => {
    switch (k) {
      case "style":
        return (
          <Options
            label="Surround style"
            name="sstyle"
            value={(c.style ?? "") as SurroundStyle}
            onPick={(v) => answer("style", { style: v })}
            options={SURROUND_STYLES.map((s) => ({
              ...s,
              visual: (
                <SurroundPreview
                  style={s.key}
                  shape={s.key === "framed" ? c.shape : "standard"}
                  size={s.key === "framed" ? c.size : "standard"}
                  design={{ ...d, text: d.text || "REG KING", logo: d.text ? d.logo : "none", textColour: d.text ? d.textColour : "yellow" }}
                  side="rear"
                  reg={reg || "REG KING"}
                  label={`${s.name} example`}
                />
              ),
            }))}
          />
        );
      case "qty":
        return (
          <Options
            label="Single or set"
            name="sqty"
            value={done.has("qty") ? c.qty : ("" as "single")}
            onPick={(v) => answer("qty", { qty: v, same: true })}
            options={[
              { key: "single", name: "Single", line: "One surround" },
              { key: "set", name: "Set", line: "Front and rear, same design" },
            ]}
          />
        );
      case "size":
        return sizeBody(false);
      case "rearSize":
        return sizeBody(true);
      case "frame":
        return (
          <>
            <ColourPicker label="Frame colour" list={FRAME_COLOURS} value={d.frame} onPick={(k) => setD({ frame: k })} name="sframe" />
            <button type="button" className="rk-bnext" data-b="sframe:done" onClick={() => answer("frame")}>
              Use {swatch(FRAME_COLOURS, d.frame).name}
            </button>
          </>
        );
      case "backing":
        return (
          <>
            <ColourPicker label={framed ? "Wing colour" : "Side pieces colour"} list={FRAME_COLOURS} value={d.backing} onPick={(k) => setD({ backing: k })} name="sbacking" />
            <p className="rk-bfine">{framed ? "The wing in the middle under the frame, where your text or logo goes." : "The two side pieces that show either side of the main part, under the plate."}</p>
            <button type="button" className="rk-bnext" data-b="sbacking:done" onClick={() => answer("backing")}>
              Use {swatch(FRAME_COLOURS, d.backing).name}
            </button>
          </>
        );
      case "panel":
        return (
          <>
            <ColourPicker label="Main part colour" list={FRAME_COLOURS} value={d.panel ?? ""} onPick={(k) => setD({ panel: k })} name="spanel" />
            <p className="rk-bfine">The main part in the middle under the plate, carrying your text or logo.</p>
            <div className="rk-bnextrow">
              <button type="button" className="rk-bnext" data-b="spanel:done" onClick={() => answer("panel")}>
                {d.panel ? `Use ${swatch(FRAME_COLOURS, d.panel).name}` : "Use a matching shade"}
              </button>
              {d.panel && (
                <button type="button" className="rk-blink rk-blink--sm" data-b="spanel:match" onClick={() => setD({ panel: undefined })}>
                  Match the side pieces instead
                </button>
              )}
            </div>
          </>
        );
      case "art":
        return (
          <>
            <p className="rk-bfine">Cut in raised 3D acrylic {framed ? "on the wing under the frame" : "on the main part under the plate"}. Text or a logo, not both.</p>
            {artBody}
          </>
        );
    }
  };

  const add = () => {
    if (!allDone) return;
    const cfg = { ...c, same: true, rear: { ...c.front }, rearShape, rearSize };
    save({
      id: editItem?.id ?? newId(),
      kind: "surrounds",
      title: c.qty === "set" ? "Plate surrounds (pair)" : "Plate surround",
      detail: surroundSummary(cfg),
      lines: surroundLines(cfg),
      data: { reg, cfg },
    });
    if (!editItem) {
      setC(fresh());
      setDone(new Set());
      setArtKind(null);
    }
    requestAnimationFrame(() => document.getElementById("rk-basket")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // the preview is there from the start, so the customer sees each choice as they make it (framed until they pick)
  const style = c.style ?? (compact ? null : "framed");
  // the full maker shows the surrounds in 3D (turn, zoom, preset angles), like the plate builder
  const [gl, setGl] = useState(false);
  useEffect(() => setGl(!compact && canRender3D()), [compact]);
  // Phones: once the maker reaches the top, the preview is pinned under the menu bar (fixed, so it can't
  // drift on any browser) until the end of the options scrolls up to it; a spacer holds its place.
  const accRef = useRef<HTMLDivElement>(null);
  const pvRef = useRef<HTMLDivElement>(null);
  const [pinH, setPinH] = useState(0);
  useEffect(() => {
    if (compact) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    let raf = 0;
    const check = () => {
      raf = 0;
      const acc = accRef.current, pv = pvRef.current;
      if (!acc || !pv || !mq.matches) return setPinH(0);
      const top = document.getElementById("rk-header")?.getBoundingClientRect().bottom ?? 64;
      const r = acc.getBoundingClientRect();
      const h = pv.offsetHeight;
      setPinH(r.top < top && r.bottom > top + h + 320 ? h : 0);
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    check();
    return () => {
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      cancelAnimationFrame(raf);
    };
  }, [compact]);
  const views: SurroundView[] = style
    ? isSet
      ? [
          { style, shape: c.shape, size: c.size, design: d, side: "front", reg },
          { style, shape: rearShape, size: rearSize, design: d, side: "rear", reg },
        ]
      : [{ style, shape: c.shape, size: c.size, design: d, side: "rear", reg }]
    : [];
  return (
    <div ref={accRef} className={`rk-acc${compact ? " rk-acc--compact" : " rk-acc--live"}`} id={compact ? undefined : "rk-surrounds"}>
      {pinH > 0 && <div className="rk-acc__pinspace" style={{ height: pinH }} aria-hidden />}
      {style && (
        <div ref={pvRef} className={`rk-acc__preview${pinH > 0 ? " is-pinned" : ""}`} aria-live="polite" data-gl={gl || undefined}>
          {!compact && (
            <div className="rk-acc__styleseg" role="radiogroup" aria-label="Surround style">
              {SURROUND_STYLES.map((s) => (
                <button key={s.key} type="button" role="radio" aria-checked={style === s.key} data-b={`sstyle:${s.key}`} onClick={() => set({ style: s.key })}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {gl ? (
            <PlateGL angles={false} tight onFail={() => setGl(false)} groups={(soft, acrylic) => views.map((v) => buildSurround(v, soft, acrylic))} groupsKey={JSON.stringify(views)} />
          ) : isSet ? (
            <div className="rk-acc__pair">
              {/* both drawn to the same scale, so a smaller rear surround looks smaller */}
              <div className="rk-acc__pv">
                <div style={{ width: scaleW(c.size) }}>
                  <SurroundPreview style={style} shape={c.shape} size={c.size} design={d} side="front" reg={reg} label="Front surround preview" />
                </div>
                <span>Front</span>
              </div>
              <div className="rk-acc__pv">
                <div style={{ width: scaleW(rearSize) }}>
                  <SurroundPreview style={style} shape={rearShape} size={rearSize} design={d} side="rear" reg={reg} label="Rear surround preview" />
                </div>
                <span>Rear</span>
              </div>
            </div>
          ) : (
            <div className="rk-acc__one">
              <SurroundPreview style={style} shape={c.shape} size={c.size} design={d} side="rear" reg={reg} />
            </div>
          )}
        </div>
      )}

      <div className="rk-bpanel rk-acc__panel">
        <div className="rk-bpanel__h">
          <h2>{compact ? <>Personalise your <span>surrounds</span></> : <>Design your <span>surrounds</span></>}</h2>
        </div>
        <ol className="rk-bsteps">
          {steps.map((k, i) => {
            const isOpen = k === shown;
            const answered = done.has(k);
            if (!isOpen && !answered) return null;
            return (
              <li key={k} className={`rk-bstep${isOpen ? " is-open" : " is-done"} rk-astep`} data-sstep={k}>
                <div className="rk-bstep__h">
                  <b className="rk-bstep__n">{isOpen ? i + 1 : <Tick />}</b>
                  <span className="rk-bstep__t">{title[k]}</span>
                  {!isOpen && (
                    <>
                      <span className="rk-bstep__a">{answerOf[k]}</span>
                      <button type="button" className="rk-blink rk-blink--sm" data-sedit={k} onClick={() => setOpen(k)}>
                        Change
                      </button>
                    </>
                  )}
                </div>
                {isOpen && <div className="rk-bstep__b">{body(k)}</div>}
              </li>
            );
          })}
        </ol>
        {compact ? (
          <div className="rk-addbar">
            <div className="rk-addbar__row">
              <span className="rk-addbar__total">{money(surroundLines(c)[0].amount)}</span>
              <span className="rk-addbar__btns">
                {onCancel && (
                  <button type="button" className="rk-blink" onClick={onCancel}>
                    Cancel
                  </button>
                )}
                <button type="button" className="rk-btn rk-btn--gold rk-addbar__go" data-b="surround:done" disabled={!allDone} onClick={() => onDone?.({ ...c, same: true, rear: { ...c.front } })}>
                  Add to my plates
                </button>
              </span>
            </div>
          </div>
        ) : (
          style && <AddBar lines={surroundLines(c)} label="Add to basket" onAdd={add} editing={!!editItem} waiting={allDone ? undefined : "Answer each question to add it to your basket."} />
        )}
      </div>
    </div>
  );
}

/** Car brand or the customer's own logo (no text: that's a separate choice). */
function LogoPick<A extends Artwork>({ a, set, name }: { a: A; set: (p: Partial<A>) => void; name: string }) {
  const [error, setError] = useState("");
  const make = MANUFACTURERS.find((m) => m.make === a.make);
  const onFile = (f: File | undefined) => {
    setError("");
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError("That file is over 5MB. Try a smaller image.");
    if (!/\.(png|jpe?g|webp|svg)$/i.test(f.name)) return setError("Please choose a PNG, JPG, WEBP or SVG file.");
    const r = new FileReader();
    r.onload = () => set({ upload: String(r.result), uploadName: f.name, logo: "upload" } as Partial<A>);
    r.readAsDataURL(f);
  };
  return (
    <>
      <div className="rk-seg rk-art__logo" role="radiogroup" aria-label="Which logo">
        {(
          [
            ["make", "Car brand"],
            ["upload", "Upload my own"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={a.logo === k} aria-selected={a.logo === k} data-b={`${name}-logo:${k}`} onClick={() => set({ logo: k } as Partial<A>)}>
            {l}
          </button>
        ))}
      </div>
      {a.logo === "make" && (
        <div className="rk-art__sub">
          <span className="rk-art__l">Choose the make</span>
          <div className="rk-pills rk-pills--wrap">
            {MANUFACTURERS.map((m) => (
              <button key={m.make} type="button" aria-pressed={a.make === m.make} data-b={`${name}-make:${m.make}`} onClick={() => set({ make: m.make, badge: "Logo only" } as Partial<A>)}>
                {m.make}
              </button>
            ))}
          </div>
          {make && make.badges.length > 1 && (
            <>
              <span className="rk-art__l">Model or badge</span>
              <div className="rk-pills rk-pills--wrap">
                {make.badges.map((b) => (
                  <button key={b} type="button" aria-pressed={a.badge === b} data-b={`${name}-badge:${b}`} onClick={() => set({ badge: b } as Partial<A>)}>
                    {b}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="rk-bfine">The preview shows the brand name. The finished product uses the official logo artwork.</p>
        </div>
      )}
      {a.logo === "upload" && (
        <div className="rk-art__sub">
          <label className="rk-upload">
            <input type="file" accept={UPLOAD_TYPES} onChange={(e) => onFile(e.target.files?.[0])} data-b={`${name}:upload`} />
            <span className="rk-upload__btn">{a.upload ? "Choose a different file" : "Choose a file"}</span>
            <span className="rk-upload__name">{a.uploadName || "No file chosen"}</span>
          </label>
          {error && <p className="rk-sellflow__err">{error}</p>}
          <p className="rk-bfine">{UPLOAD_NOTE}</p>
        </div>
      )}
    </>
  );
}

const Tick = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Logo plates                                                         */
/* ------------------------------------------------------------------ */

const logoLines = (c: LogoPlateConfig): BasketLine[] => {
  const price = c.type === "acrylic" ? ACCESSORY_PRICES.acrylicLogoPlate : ACCESSORY_PRICES.printedLogoPlate;
  return [{ label: `${c.type === "acrylic" ? "4D acrylic" : "Printed"} logo plate${c.count > 1 ? `s × ${c.count}` : ""}`, amount: each(price, c.count) }];
};

export function LogoPlateCreator() {
  const { save, editing } = useMake();
  const editItem = editing?.kind === "logo" ? editing : null;
  const [c, setC] = useState<LogoPlateConfig>(defaultLogoPlateConfig);
  const [error, setError] = useState("");
  useEffect(() => {
    if (editItem) setC({ ...defaultLogoPlateConfig(), ...editItem.data.cfg });
  }, [editItem]);

  const qtyKey = c.count === 1 ? "single" : c.count === 2 ? "set" : "multiple";
  const d = c.designs[0];
  const hasFile = !!d.uploadName;
  const setCount = (count: number) => setC((x) => ({ ...x, count, same: true }));
  const onFile = (f: File | undefined) => {
    setError("");
    if (!f) return;
    if (f.size > LOGO_FILE_MAX_MB * 1024 * 1024) return setError(`That file is over ${LOGO_FILE_MAX_MB}MB. Try a smaller file.`);
    if (!/\.(png|jpe?g|webp|svg|pdf|ai|eps)$/i.test(f.name)) return setError("Please choose a PNG, JPG, WEBP, SVG, PDF, AI or EPS file.");
    const image = /\.(png|jpe?g|webp|svg)$/i.test(f.name);
    const put = (upload: string | null) => setC((x) => ({ ...x, designs: [{ ...x.designs[0], logo: "upload", upload, uploadName: f.name }] }));
    if (!image) return put(null); // design files are proofed by the team, so there's nothing to draw yet
    const r = new FileReader();
    r.onload = () => put(String(r.result));
    r.readAsDataURL(f);
  };
  // Before a file is chosen (or for a design file), the preview says where the logo goes.
  const shown: LogoDesign = d.upload ? d : { ...d, logo: "none", text: "YOUR LOGO" };

  const add = () => {
    const cfg = { ...c, same: true, designs: Array.from({ length: c.count }, () => ({ ...d })) };
    save({
      id: editItem?.id ?? newId(),
      kind: "logo",
      title: `${c.type === "acrylic" ? "4D acrylic" : "Printed"} logo plate${c.count > 1 ? `s (${c.count})` : ""}`,
      detail: `Your logo: ${d.uploadName} · ${c.delivery === "Collect" ? "collect in Bilston" : "delivered"}`,
      lines: logoLines(c),
      data: { cfg },
    });
    if (!editItem) setC(defaultLogoPlateConfig());
    requestAnimationFrame(() => document.getElementById("rk-basket")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  let n = 0;
  return (
    <div className="rk-acc rk-acc--live" id="rk-logoplates">
      <div className="rk-acc__preview" aria-live="polite">
        {/* Real photos of REG KING's work until there's a logo to show, then a clean, flat artwork preview (a proof always follows). */}
        {d.upload ? (
          <figure className="rk-lproof" data-lproof>
            <div className="rk-lproof__plate">
              <LogoPlatePreview type={c.type} design={shown} flat label="Your logo on the plate" />
            </div>
            <figcaption>
              <b>Artwork preview.</b> Layout only. Any see-through parts of your file show as a check pattern. We agree the colours and send you a proper {c.type === "acrylic" ? "4D" : "printed"} proof to approve before we make anything.
            </figcaption>
          </figure>
        ) : (
          <figure className="rk-lproof" data-lproof>
            <div className="rk-lproof__plate">
              <LogoPlatePreview type={c.type} design={shown} flat label="Where your logo goes on the plate" />
            </div>
            <figcaption>Add your logo and it shows here.</figcaption>
          </figure>
        )}
        {c.count > 1 && <p className="rk-acc__cap">{c.count} plates, all with your logo</p>}
      </div>

      <div className="rk-bpanel rk-acc__panel">
        <div className="rk-bpanel__h">
          <h2>
            Your logo on a <span>plate</span>
          </h2>
        </div>
        <ol className="rk-bsteps">
          <Step n={++n} title="Printed or 4D">
            <Options
              label="Printed or 4D"
              name="ltype"
              value={c.type}
              onPick={(v) => setC((x) => ({ ...x, type: v }))}
              options={LOGO_PLATE_TYPES.map((t) => ({
                ...t,
                name: t.key === "acrylic" ? "4D" : t.name,
                visual: <img className="rk-lopt" src={t.key === "acrylic" ? "examples/logo-4d-card.jpg" : "examples/logo-printed-card.jpg"} alt="" loading="lazy" />,
              }))}
            />
            <div className="rk-realrow">
              <RealPhotos k="logo:printed" label="Real printed logo plates" />
              <RealPhotos k="logo:acrylic" label="Real 4D logo plates" />
            </div>
          </Step>
          <Step n={++n} title="How many?">
            <Options
              label="How many?"
              name="lqty"
              value={qtyKey}
              onPick={(v) => setCount(v === "single" ? 1 : v === "set" ? 2 : Math.max(3, c.count))}
              options={[
                { key: "single", name: "One", line: "A single plate" },
                { key: "set", name: "Two", line: "A pair" },
                { key: "multiple", name: "More", line: "Three or more" },
              ]}
            />
            {qtyKey === "multiple" && (
              <div className="rk-stepper" role="group" aria-label="Number of plates">
                <button type="button" aria-label="One fewer" disabled={c.count <= 3} onClick={() => setCount(c.count - 1)}>
                  −
                </button>
                <output aria-live="polite">{c.count} plates</output>
                <button type="button" aria-label="One more" disabled={c.count >= 100} onClick={() => setCount(c.count + 1)}>
                  +
                </button>
              </div>
            )}
          </Step>
          <Step n={++n} title="Upload your logo" note="We check every logo and send you a proof to approve before we make anything.">
            <label className="rk-upload rk-upload--logo">
              <input type="file" accept={LOGO_FILE_TYPES} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} data-b="lart:upload" />
              <span className="rk-upload__btn">{hasFile ? "Choose a different file" : "Choose your logo file"}</span>
              <span className="rk-upload__name">{d.uploadName || "No file chosen"}</span>
            </label>
            {error && (
              <p className="rk-bdoc__err" role="alert">
                {error}
              </p>
            )}
            <p className="rk-bfine">PNG, JPG, WEBP or SVG shows on the preview. PDF, AI and EPS design files are welcome too. Up to {LOGO_FILE_MAX_MB}MB.</p>
          </Step>
          <Step n={++n} title="Delivery">
            <Options
              label="Delivery"
              name="ldel"
              value={c.delivery ?? ("" as LogoDelivery)}
              onPick={(v) => setC((x) => ({ ...x, delivery: v }))}
              options={[
                { key: "Deliver", name: "Deliver to me", line: "Posted to your door" },
                { key: "Collect", name: "Collect", line: "From our Bilston shop" },
              ]}
            />
            {c.delivery === "Deliver" && <p className="rk-bfine">Delivery cost is shown at checkout.</p>}
          </Step>
        </ol>
        <AddBar
          lines={logoLines(c)}
          label="Add to basket"
          onAdd={add}
          editing={!!editItem}
          waiting={!hasFile ? "Upload your logo to continue." : !c.delivery ? "Choose delivery or collection to continue." : undefined}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Basket                                                              */
/* ------------------------------------------------------------------ */

/** Everything added in Make, with edit and remove. PROTOTYPE: becomes the Shopify cart at launch. */
export function BasketPanel() {
  const { basket, remove, edit, notice, save } = useMake();
  const { go } = useMode();
  // Start another item: open that maker's page (Make for plates, Accessories for the rest).
  const another = (t: "plates" | "surrounds" | "logo") => go(t === "plates" ? "make-plates" : t === "surrounds" ? "accessories-surrounds" : "accessories-logo");
  const all = basket.flatMap((b) => b.lines);
  const t = lineTotal(all);
  const { customer } = useAccount();
  // Account holders get money off made plates, surrounds and logo plates (rounded to the penny).
  const made = lineTotal(basket.filter((b) => b.kind === "plates" || b.kind === "surrounds" || b.kind === "logo").flatMap((b) => b.lines)).known;
  const memberOff = customer ? Math.round(made * MEMBER_DISCOUNT * 100) / 100 : 0;
  return (
    <section className="rk-section rk-section--tight rk-basket" id="rk-basket" aria-labelledby="basket-title">
      <div className="rk-wrap">
        <p className="rk-basket__notice" role="status" aria-live="polite">
          {notice}
        </p>
        {basket.length > 0 && (
          <div className="rk-basket__box">
            <h2 id="basket-title" className="rk-shead__t">
              Your basket
            </h2>
            <ul className="rk-basket__list">
              {basket.map((b) => {
                const bt = lineTotal(b.lines);
                return (
                  <li key={b.id} data-basket={b.kind}>
                    <div className="rk-basket__item">
                      <b>{b.title}</b>
                      <span>{b.detail}</span>
                      {b.lines.length > 1 && (
                        <ul className="rk-basket__lines">
                          {b.lines.map((l) => (
                            <li key={l.label}>
                              {l.label}: {money(l.amount)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rk-basket__side">
                      <b>{bt.onRequest && bt.known === 0 ? "Price on request" : formatGBP(bt.known, Number.isInteger(bt.known)) + (bt.onRequest ? "+" : "")}</b>
                      <span>
                        {b.kind !== "accessory" && <button
                          type="button"
                          className="rk-blink rk-blink--sm"
                          data-edit-basket={b.id}
                          onClick={() => {
                            edit(b.id);
                            requestAnimationFrame(() => document.getElementById("rk-hero")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                          }}
                        >
                          Edit
                        </button>}
                        <button type="button" className="rk-blink rk-blink--sm" data-copy-basket={b.id} onClick={() => save({ ...b, id: newId() })}>
                          Add another the same
                        </button>
                        <button type="button" className="rk-blink rk-blink--sm" data-remove-basket={b.id} onClick={() => remove(b.id)}>
                          Remove
                        </button>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="rk-basket__more">
              <span>Ordering for more than one car?</span>
              <div>
                <button type="button" onClick={() => another("plates")} data-another="plates">
                  + Number plates
                </button>
                <button type="button" onClick={() => another("surrounds")} data-another="surrounds">
                  + Plate surrounds
                </button>
                <button type="button" onClick={() => another("logo")} data-another="logo">
                  + Logo plate
                </button>
              </div>
            </div>
            {customer && memberOff > 0 && (
              <p className="rk-basket__member">
                <span>Account holder discount ({Math.round(MEMBER_DISCOUNT * 100)}% off made plates)</span>
                <b>-{money(memberOff)}</b>
              </p>
            )}
            {!customer && made > 0 && (
              <p className="rk-basket__member rk-basket__member--out">
                <span>Account holders save {Math.round(MEMBER_DISCOUNT * 100)}% on made plates.</span>
                <a href="#account" onClick={(e) => { e.preventDefault(); go("account"); }}>
                  Sign in or create an account
                </a>
              </p>
            )}
            <div className="rk-basket__foot">
              <span>
                Total <b>{t.known === 0 && t.onRequest ? "Price on request" : formatGBP(t.known - memberOff, Number.isInteger(t.known - memberOff)) + (t.onRequest ? " + items priced on request" : "")}</b>
              </span>
              <button type="button" className="rk-btn rk-btn--ink" onClick={() => go("checkout")} data-basket-checkout>
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
