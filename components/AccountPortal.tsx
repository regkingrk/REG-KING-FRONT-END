"use client";

import { useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { formatGBP, spaceReg } from "@/lib/brand";
import { phone as shopPhone } from "@/lib/infoContent";
import {
  LISTING_STATUS,
  SALE_STAGES,
  cleanReg,
  niceDate,
  orderStatus,
  orderTypeLabel,
  packageOf,
  stagesFor,
  type ListingStatus,
  type Order,
  type Submission,
} from "@/lib/portal";
import { expiryState, useAccount, type Doc, type OwnedPlate, type SavedAddress } from "./AccountProvider";
import { AccountGate } from "./AccountGate";
import { SellWizard } from "./SellWizard";
import { useMode } from "./ModeProvider";
import { ALL_PLATES } from "./PlateView";

/** Pounds, without pence for whole amounts. */
const gbp = (n: number) => formatGBP(n, Number.isInteger(n));

/* ------------------------------------------------------------------ */
/* Where things live: BUY, SELL and MAKE, plus Account settings.       */
/* ------------------------------------------------------------------ */

type Tab = "buy" | "sell" | "make" | "settings";
const TABS: { key: Exclude<Tab, "settings">; label: string }[] = [
  { key: "buy", label: "Buy" },
  { key: "sell", label: "Sell" },
  { key: "make", label: "Make" },
];
/** Older account links still land somewhere sensible. */
const ALIAS: Record<string, Tab> = {
  overview: "buy",
  orders: "buy",
  transfers: "buy",
  documents: "buy",
  wishlist: "buy",
  saved: "buy",
  offers: "buy",
  made: "make",
  listings: "sell",
  list: "sell",
  value: "sell",
  plates: "sell",
  selling: "sell",
  market: "sell",
  details: "settings",
};
export const portalTab = (t: string): Tab => (t === "buy" || t === "sell" || t === "make" || t === "settings" ? t : ALIAS[t] ?? "buy");

/** Contact REG KING with the form already pointed at this order or listing. */
function useContact() {
  const { go } = useMode();
  return (c: { topic: "buy" | "sell" | "make"; sub: string; reg?: string; order?: string; note?: string }) => {
    try {
      sessionStorage.setItem("rk-contact", JSON.stringify(c));
    } catch {}
    go("info-contact");
  };
}

/** Something was tapped elsewhere (the Action required banner): open it once its tab shows. */
let pendingOpen: { tab: Tab; id: string } | null = null;
const takePending = (tab: Tab): string | null => {
  if (pendingOpen?.tab !== tab) return null;
  const id = pendingOpen.id;
  pendingOpen = null;
  return id;
};

const DOC_NAMES: Record<string, string> = { V5C: "V5C logbook", V750: "V750 certificate", V778: "V778 retention document", ID: "Photo ID" };

/** Documents this order still needs from the customer. */
function missingDocs(o: Order, docs: Doc[]) {
  return (o.needs ?? []).filter((k) => !docs.some((d) => d.kind === k && (d.reg === o.reg || (k === "ID" && d.reg === `order:${o.id}`)) && d.status !== "needed"));
}
/** Does this order need the customer to do something? */
const needsAction = (o: Order, docs: Doc[]) => (o.needs?.length ? missingDocs(o, docs).length > 0 : !!o.next.act);

/** Listing statuses in the customer's words. */
const LISTING_LABEL: Record<ListingStatus, string> = { review: "Pending approval", active: "Live", reserved: "Live", sold: "Sold", withdrawn: "Withdrawn" };

/* ------------------------------------------------------------------ */
/* The account                                                          */
/* ------------------------------------------------------------------ */

export function AccountPortal({ tab: raw }: { tab: string }) {
  const tab = portalTab(raw);
  const { ready, customer, signOut: endSession, deleteAll, loadDemo } = useAccount();
  // Leaving the demo account clears its example data, so the next person starts with an empty account.
  const signOut = () => (customer?.demo ? deleteAll() : endSession());
  // #account-demo opens the demo account (clearly labelled) so the account can be looked round.
  useEffect(() => {
    if (raw === "demo" && ready && !customer) loadDemo();
  }, [raw, ready, customer, loadDemo]);
  const { go } = useMode();

  // Signed out and listing a plate: the List a Plate form creates the account at the end.
  if (ready && !customer && raw === "list")
    return (
      <section className="pt" id="rk-info" aria-labelledby="pt-title">
        <div className="rk-wrap pt__in">
          <header className="ca__top">
            <div>
              <p className="ca__hi">Sell</p>
              <h1 id="pt-title">List a registration</h1>
            </div>
          </header>
          <SellWizard />
        </div>
      </section>
    );

  // Signed out: the sign-in / create-account page takes the whole screen.
  if (ready && !customer)
    return (
      <section className="pt pt--gate" id="rk-info" aria-labelledby="pt-title">
        <AccountGate />
      </section>
    );

  const first = customer?.name && !customer.demo ? customer.name.trim().split(/\s+/)[0] : customer?.demo ? "Demo" : "";

  return (
    <section className="pt ca" id="rk-info" aria-labelledby="pt-title">
      <div className="ca-band">
        <div className="rk-wrap ca-band__in">
          <header className="ca__top">
            <div>
              <p className="ca__hi">My account</p>
              <h1 id="pt-title">Welcome back{first ? `, ${first}` : ""}</h1>
            </div>
            <div className="ca__links">
              <button type="button" aria-current={tab === "settings" ? "page" : undefined} onClick={() => go("account-settings")} data-ca-settings>
                Account settings
              </button>
              <button type="button" onClick={signOut} data-signout>
                Sign out
              </button>
            </div>
          </header>
          <Summary />
          <nav className="ca-tabs" aria-label="My account">
            {TABS.map((t) => (
              <a
                key={t.key}
                href={`#account-${t.key}`}
                aria-current={t.key === tab ? "page" : undefined}
                data-ca-tab={t.key}
                onClick={(e) => {
                  e.preventDefault();
                  go(`account-${t.key}`);
                }}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="rk-wrap ca__in">

        <div className="ca__main">
          {!ready ? null : tab === "buy" ? (
            <BuyTab />
          ) : tab === "sell" ? (
            <SellTab start={raw === "list" ? "list" : raw === "value" ? "value" : "home"} />
          ) : tab === "make" ? (
            <MakeTab />
          ) : (
            <Settings />
          )}
        </div>

        <footer className="ca__foot">
          <span>
            Questions? Call <b>{shopPhone.display}</b> or{" "}
            <button type="button" className="ca-link" onClick={() => go("info-contact")}>
              send us a message
            </button>
            .
          </span>
          <span className="pt-demo">Preview: not connected to Shopify yet, so nothing here is sent to REG KING.{customer?.demo ? " This is the demo account." : ""}</span>
        </footer>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

/**
 * The three numbers at the top: plates owned, plates for sale, and what they're worth.
 * A plate counts once however it got here (bought from us, listed with us, or added by hand).
 * Its value is, in order: the price it's advertised at or the amount wanted, the value the customer gave it,
 * or what they paid us. Plates with none of those aren't added in, and we say how many.
 */
function Summary() {
  const { orders, submissions, owned } = useAccount();
  const { go } = useMode();
  const plates = new Map<string, number | null>();
  const put = (reg: string, v: number | null | undefined) => {
    const k = cleanReg(reg).replace(/\s/g, "");
    if (!k) return;
    if (!plates.has(k) || (plates.get(k) == null && v)) plates.set(k, v ?? null);
  };
  const selling = submissions.filter((x) => x.status === "review" || x.status === "active" || x.status === "reserved");
  selling.forEach((x) => put(x.reg, x.advertised ?? (x.unsure ? null : x.desired)));
  owned.forEach((p) => put(p.reg, p.value));
  orders.filter((o) => o.type === "registration").forEach((o) => put(o.reg, o.items.find((i) => i.title.toUpperCase().includes(o.reg.toUpperCase()))?.price ?? o.total));
  const values = [...plates.values()];
  const total = values.reduce<number>((a, v) => a + (v ?? 0), 0);
  const unvalued = values.filter((v) => v == null).length;
  if (!plates.size) return null;
  return (
    <dl className="ca-sum">
      <div>
        <dt>Plates owned</dt>
        <dd>{plates.size}</dd>
      </div>
      <div>
        <dt>For sale</dt>
        <dd>
          <button type="button" onClick={() => go("account-sell")} data-sum-sale>
            {selling.length}
          </button>
        </dd>
      </div>
      <div className="ca-sum__value">
        <dt>Total value</dt>
        <dd>{gbp(total)}</dd>
        <small>
          From asking prices, your own values and prices paid{unvalued ? `. ${unvalued} plate${unvalued === 1 ? "" : "s"} not valued yet` : ""}.
        </small>
      </div>
    </dl>
  );
}

/** A registration as a plate; an order with no registration (accessories) gets a plain tile. */
const PlateOr = ({ reg, xl }: { reg: string; xl?: boolean }) =>
  reg ? <span className={xl ? "ca-plate ca-plate--xl" : "ca-plate"}>{reg}</span> : <span className={xl ? "ca-plate ca-plate--none ca-plate--xl" : "ca-plate ca-plate--none"}>Accessories</span>;

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ca-chev">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

function Section({ title, children, extra, id }: { title: string; children: ReactNode; extra?: ReactNode; id: string }) {
  return (
    <section className="ca-sec" aria-labelledby={id}>
      <div className="ca-sec__head">
        <h2 id={id}>{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Empty({ line, button, onClick }: { line: string; button: string; onClick: () => void }) {
  return (
    <div className="ca-empty">
      <p>{line}</p>
      <button type="button" className="ca-btn" onClick={onClick}>
        {button}
      </button>
    </div>
  );
}

function Back({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="ca-back" onClick={onClick} data-back>
      <span aria-hidden>←</span> {children}
    </button>
  );
}

/** One line in a list: the plate, what it is, where it's up to. The whole row opens it. */
function Row({ reg, title, sub, state, act, onOpen, data }: { reg: string; title: string; sub: string; state: string; act?: boolean; onOpen: () => void; data?: Record<string, string> }) {
  return (
    <li>
      <button type="button" className="ca-row" onClick={onOpen} {...data}>
        <PlateOr reg={reg} />
        <span className="ca-row__main">
          <b>{title}</b>
          <span>{sub}</span>
        </span>
        <span className="ca-row__state">
          <span>{state}</span>
          {act ? <em className="ca-tag ca-tag--act">Action required</em> : null}
        </span>
        <Chevron />
      </button>
    </li>
  );
}

function Stages({ stages, at }: { stages: string[]; at: number }) {
  return (
    <ol className="ca-stages" style={{ "--n": stages.length } as CSSProperties}>
      {stages.map((s, i) => (
        <li key={s} data-state={i < at ? "done" : i === at ? "now" : "todo"}>
          <span aria-hidden />
          <b>{s}</b>
          {i === at && <span className="rk-visually-hidden"> (current stage)</span>}
        </li>
      ))}
    </ol>
  );
}

/** Pick a file and keep its name (PROTOTYPE: the file itself isn't stored). */
function Upload({ kind, reg, orderId }: { kind: "V5C" | "V750" | "V778" | "ID"; reg: string; orderId: string }) {
  const { docs, uploadDoc } = useAccount();
  const docReg = kind === "ID" ? `order:${orderId}` : reg;
  const have = docs.find((d) => d.kind === kind && d.reg === docReg && d.status !== "needed") ?? (kind !== "ID" ? docs.find((d) => d.kind === kind && d.reg === reg && d.status !== "needed") : undefined);
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadDoc(have?.id ?? null, { kind, reg: docReg, file: f.name, size: f.size });
    e.target.value = "";
  };
  return (
    <div className="ca-up" data-done={have ? "" : undefined} data-up={kind}>
      <div>
        <b>{DOC_NAMES[kind]}</b>
        <span>{have ? `Uploaded: ${have.file}. We'll check it and let you know.` : kind === "ID" ? "A clear photo of your driving licence or passport." : "A clear photo or scan of every page."}</span>
      </div>
      <label className={have ? "ca-btn ca-btn--ghost" : "ca-btn"}>
        {have ? "Replace" : "Upload"}
        <input type="file" accept="image/*,.pdf" onChange={pick} className="rk-visually-hidden" data-f={`upload-${kind}`} />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BUY: registrations bought, and the wishlist                          */
/* ------------------------------------------------------------------ */

function BuyTab() {
  const { orders, docs, saved, toggleSaved } = useAccount();
  const { go } = useMode();
  const regs = orders.filter((o) => o.type === "registration");
  const [openId, setOpenId] = useState<string | null>(() => takePending("buy"));
  useEffect(() => {
    const on = () => setOpenId(takePending("buy"));
    window.addEventListener("rk-ca-open", on);
    return () => window.removeEventListener("rk-ca-open", on);
  }, []);
  const open = regs.find((o) => o.id === openId);
  if (open) return <OrderDetail o={open} back={() => setOpenId(null)} backLabel="Your registrations" />;

  return (
    <>
      <Section title="Your registrations" id="ca-regs">
        {regs.length ? (
          <ul className="ca-rows">
            {regs.map((o) => (
              <Row key={o.id} reg={o.reg} title={`Bought ${niceDate(o.date)}`} sub={o.source === "dvla" ? `Order ${o.ref}. New from the DVLA` : `Order ${o.ref}`} state={orderStatus(o)} act={needsAction(o, docs)} onOpen={() => setOpenId(o.id)} data={{ "data-order": o.ref }} />
            ))}
          </ul>
        ) : (
          <Empty line="Registrations you buy from REG KING will show here, with each transfer's progress." button="Find a registration" onClick={() => go("buy-regking")} />
        )}
      </Section>

      <PlateTracker />

      <Section title="Wishlist" id="ca-wish" extra={saved.length ? <span className="ca-count">{saved.length} saved</span> : undefined}>
        {saved.length ? (
          <ul className="ca-rows">
            {saved.map((reg) => {
              const p = ALL_PLATES.find((x) => cleanReg(x.reg) === cleanReg(reg));
              return (
                <li key={reg}>
                  <div className="ca-row ca-row--static" data-wish={reg} data-gone={!p || undefined}>
                    <span className="ca-plate">{reg}</span>
                    <span className="ca-row__main">
                      <b>{p ? gbp(p.price) : "No longer for sale"}</b>
                      <span>{p ? "Still for sale with REG KING" : "This registration has sold or been taken off sale"}</span>
                    </span>
                    <span className="ca-row__acts">
                      {p && (
                        <button type="button" className="ca-btn ca-btn--sm" onClick={() => go(`plate-${p.handle}`)} data-view-plate={reg}>
                          View
                        </button>
                      )}
                      <button type="button" className="ca-link" onClick={() => toggleSaved(reg)} data-unsave={reg}>
                        Remove
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty line="Tap the heart on any registration to save it here." button="Browse registrations" onClick={() => go("buy-regking")} />
        )}
      </Section>

      <section className="ca-next" aria-labelledby="ca-browse">
        <div>
          <h2 id="ca-browse">Browse for something new</h2>
          <p>Thousands of registrations for sale, with new ones added every week.</p>
        </div>
        <div className="ca-next__acts">
          <button type="button" className="ca-btn" onClick={() => go("buy-regking")} data-browse-new>
            Browse registrations
          </button>
        </div>
      </section>
    </>
  );
}

/* ---------- Plates you own: where each one is, and when certificates run out ---------- */

const WHERE: { k: string; t: string }[] = [
  { k: "vehicle", t: "On a vehicle" },
  { k: "V750", t: "On a V750 certificate" },
  { k: "V778", t: "On a V778 retention document" },
];
const RENEW_URL = "https://www.gov.uk/personalised-vehicle-registration-numbers/renew-private-number-certificate";

/** "40 days left", "5 months left", "4 years left" */
const timeLeft = (days: number) =>
  days <= 60 ? `${days} day${days === 1 ? "" : "s"} left` : days < 730 ? `${Math.floor(days / 30.4)} months left` : `${Math.floor(days / 365.25)} years left`;

/** "28 Oct 2026" from yyyy-mm-dd */
const dayLabel = (d: string) => niceDate(d + "T12:00:00");

type Draft = { id: string; reg: string; where: string; vehicle: string; expiry: string; remind: number; value: string };
const toDraft = (p?: OwnedPlate): Draft => ({
  id: p?.id ?? "",
  reg: p?.reg ?? "",
  where: p ? (p.held === "vehicle" ? "vehicle" : p.held === "certificate" ? p.cert || "V778" : "") : "",
  vehicle: p?.vehicle ?? "",
  expiry: p?.expiry ?? "",
  remind: p?.remind ?? 30,
  value: p?.value ? String(p.value) : "",
});

function PlateTracker() {
  const { owned, addOwned, updateOwned, removeOwned } = useAccount();
  const { go } = useMode();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [tried, setTried] = useState(false);
  const cert = edit && edit.where !== "vehicle" && edit.where !== "";
  const ok = edit ? { reg: cleanReg(edit.reg).replace(/\s/g, "").length >= 2, where: !!edit.where, expiry: !cert || /^\d{4}-\d{2}-\d{2}$/.test(edit.expiry) } : null;
  // Certificates come first, soonest expiry at the top; plates on vehicles after.
  const list = [...owned].sort((a, b) => {
    const ea = a.held === "certificate" && a.expiry ? a.expiry : "9999";
    const eb = b.held === "certificate" && b.expiry ? b.expiry : "9999";
    return ea.localeCompare(eb);
  });

  const save = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!edit || !ok || !ok.reg || !ok.where || !ok.expiry) return;
    const p = {
      reg: cleanReg(edit.reg),
      held: (edit.where === "vehicle" ? "vehicle" : "certificate") as OwnedPlate["held"],
      cert: (edit.where === "vehicle" ? "" : edit.where) as OwnedPlate["cert"],
      vehicle: edit.where === "vehicle" ? edit.vehicle.trim() : "",
      expiry: edit.where === "vehicle" ? "" : edit.expiry,
      remind: edit.where === "vehicle" ? 0 : edit.remind,
      value: Number(edit.value.replace(/[^\d]/g, "")) || undefined,
    };
    if (edit.id) updateOwned(edit.id, p);
    else addOwned(p);
    setEdit(null);
    setTried(false);
  };

  const status = (p: OwnedPlate) => {
    if (p.held === "vehicle") return { text: "No expiry while it's on a vehicle", tag: "" as const };
    if (!p.expiry) return { text: "Add the expiry date to track it", tag: "" as const };
    const st = expiryState(p);
    const days = st.days ?? 0;
    if (st.kind === "expired") return { text: `Expired ${dayLabel(p.expiry)}`, tag: "bad" as const };
    if (days <= 28) return { text: `Expires ${dayLabel(p.expiry)}. You can renew it now.`, tag: "now" as const, days };
    return { text: `Expires ${dayLabel(p.expiry)}`, tag: st.kind === "due" ? ("soon" as const) : ("" as const), days };
  };

  const form = edit && (
    <form className="ca-form ca-tracker__form" onSubmit={save} noValidate>
      <h3>{edit.id ? `Edit ${edit.reg}` : "Add a plate you own"}</h3>
      <label className="ca-f">
        <span>Registration</span>
        <input className="ca-reginput" value={edit.reg} onChange={(e) => setEdit({ ...edit, reg: spaceReg(e.target.value) })} maxLength={8} placeholder="YOUR REG" autoCapitalize="characters" aria-invalid={tried && !ok?.reg} data-f="own-reg" />
        {tried && !ok?.reg && <small className="ca-err">Enter the registration.</small>}
      </label>
      <div className="ca-f">
        <span>Where is it now?</span>
        <Choice name="own-where" label="Where it is" value={edit.where} options={WHERE} onPick={(v) => setEdit({ ...edit, where: v })} />
        {tried && !ok?.where && <small className="ca-err">Choose where it is.</small>}
      </div>
      {edit.where === "vehicle" && (
        <label className="ca-f">
          <span>
            Which car? <i>(optional)</i>
          </span>
          <input value={edit.vehicle} onChange={(e) => setEdit({ ...edit, vehicle: e.target.value })} placeholder="For example: BMW M4" data-f="own-car" />
        </label>
      )}
      {cert && (
        <>
          <label className="ca-f">
            <span>Expiry date on the certificate</span>
            <input type="date" value={edit.expiry} onChange={(e) => setEdit({ ...edit, expiry: e.target.value })} aria-invalid={tried && !ok?.expiry} data-f="own-expiry" />
            {tried && !ok?.expiry && <small className="ca-err">Enter the expiry date shown on the {edit.where}.</small>}
          </label>
          <div className="ca-f">
            <span>Email me a reminder</span>
            <Choice
              name="own-remind"
              label="Reminder"
              value={String(edit.remind)}
              options={[
                { k: "90", t: "3 months before" },
                { k: "30", t: "1 month before" },
                { k: "0", t: "No reminder" },
              ]}
              onPick={(v) => setEdit({ ...edit, remind: Number(v) })}
            />
          </div>
        </>
      )}
      <label className="ca-f">
        <span>
          What&apos;s it worth? <i>(optional)</i>
        </span>
        <span className="ca-money">
          <span aria-hidden>£</span>
          <input inputMode="numeric" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} data-f="own-value" />
        </span>
        <small className="ca-hint">
          Adds to your total value. Not sure?{" "}
          <button type="button" className="ca-link" onClick={() => go("account-value")}>
            Ask us for a valuation
          </button>
        </small>
      </label>
      <div className="ca-detail__acts">
        <button type="submit" className="ca-btn" data-own-save>
          {edit.id ? "Save" : "Add plate"}
        </button>
        <button type="button" className="ca-link" onClick={() => (setEdit(null), setTried(false))}>
          Cancel
        </button>
        {edit.id && (
          <button
            type="button"
            className="ca-link ca-link--bad"
            onClick={() => {
              removeOwned(edit.id);
              setEdit(null);
            }}
            data-own-remove
          >
            Remove from my plates
          </button>
        )}
      </div>
    </form>
  );

  return (
    <Section
      title="Plates you own"
      id="ca-owned"
      extra={
        !edit ? (
          <button type="button" className="ca-btn ca-btn--ghost" onClick={() => (setEdit(toDraft()), setTried(false))} data-own-add>
            Add a plate
          </button>
        ) : undefined
      }
    >
      <p className="ca-sec__line">Keep every registration you own in one place, wherever you bought it. We&apos;ll keep an eye on certificate expiry dates for you.</p>
      {edit && !edit.id && form}
      {list.length ? (
        <ul className="ca-rows">
          {list.map((p) => {
            const st = status(p);
            if (edit?.id === p.id) return <li key={p.id}>{form}</li>;
            return (
              <li key={p.id}>
                <button type="button" className="ca-row ca-row--own" onClick={() => (setEdit(toDraft(p)), setTried(false))} data-own={p.reg} data-tag={st.tag || undefined}>
                  <span className="ca-plate">{p.reg}</span>
                  <span className="ca-row__main">
                    <b>{p.held === "vehicle" ? `On ${p.vehicle || "a vehicle"}` : p.held === "certificate" ? `On a ${p.cert || "certificate"}` : "Not sure where it is"}</b>
                    <span>{st.text}</span>
                  </span>
                  <span className="ca-row__state">
                    {st.tag === "bad" ? (
                      <em className="ca-tag ca-tag--bad">Expired</em>
                    ) : st.tag === "now" ? (
                      <em className="ca-tag ca-tag--act">Renew now</em>
                    ) : "days" in st && st.days !== undefined && p.held === "certificate" ? (
                      <span className={st.tag === "soon" ? "ca-tag ca-tag--act" : "ca-tag"}>{timeLeft(st.days)}</span>
                    ) : null}
                    <span className="ca-row__edit">Edit</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !edit && <Empty line="Add the registrations you own and we'll show where each one is and when any certificate runs out." button="Add a plate" onClick={() => setEdit(toDraft())} />
      )}
      {list.some((p) => p.held === "certificate") && (
        <p className="ca-note ca-note--box">
          V750 and V778 certificates last 10 years. You can renew one free on GOV.UK up to 28 days before it expires. If it isn&apos;t renewed by the expiry date, the right to the registration is lost for good.{" "}
          <a href={RENEW_URL} target="_blank" rel="noopener noreferrer">
            Renew on GOV.UK
          </a>
        </p>
      )}
    </Section>
  );
}

/** A registration purchase or a plate order, opened. */
function OrderDetail({ o, back, backLabel }: { o: Order; back: () => void; backLabel: string }) {
  const { docs } = useAccount();
  const { go } = useMode();
  const contact = useContact();
  const stages = stagesFor(o);
  const at = Math.min(o.stage, stages.length - 1);
  const owed = Math.max(0, Math.round((o.total - o.paid) * 100) / 100);
  const reg = o.type === "registration";
  const missing = missingDocs(o, docs);
  const act = needsAction(o, docs);
  const invoice = o.documents.find((d) => d.kind === "receipt");

  return (
    <div className="ca-detail">
      <Back onClick={back}>{backLabel}</Back>
      <div className="ca-detail__head">
        <PlateOr reg={o.reg} xl />
        <div>
          <h2>{reg ? `Registration ${o.reg}` : orderTypeLabel(o.type)}</h2>
          {o.source === "dvla" && <p className="ca-detail__src">New from the DVLA. It comes on a V750 certificate of entitlement.</p>}
          <p>
            Order {o.ref} · {reg ? "bought" : "ordered"} {niceDate(o.date)}
          </p>
        </div>
      </div>

      {o.needs?.length ? (
        <section className="ca-card ca-card--act" data-act={act || undefined}>
          <h3>{act ? "Action required" : "Thanks, we have your documents"}</h3>
          <p>{act ? o.next.text : "We'll check them and update this order."}</p>
          <div className="ca-ups">
            {o.needs.map((k) => (
              <Upload key={k} kind={k} reg={o.reg} orderId={o.id} />
            ))}
          </div>
          {act && missing.length < o.needs.length && <p className="ca-note">Still needed: {missing.map((k) => DOC_NAMES[k]).join(", ")}.</p>}
        </section>
      ) : (
        <section className="ca-card" data-act={o.next.act || undefined}>
          <h3>{o.next.act ? "Action required" : "What happens next"}</h3>
          <p>{o.next.text}</p>
        </section>
      )}

      <section className="ca-card">
        <h3>
          {reg ? "Transfer progress" : "Order progress"} <small>{stages[at]}</small>
        </h3>
        <Stages stages={stages} at={at} />
        {!reg &&
          (o.tracking ? (
            <p className="ca-track">
              {o.tracking.carrier} tracking <b>{o.tracking.number}</b>{" "}
              <a href={o.tracking.url} target="_blank" rel="noopener noreferrer">
                Track delivery
              </a>
            </p>
          ) : (
            <p className="ca-note">{o.fulfilment === "collection" ? "Collection from REG KING HQ. We'll tell you when they're ready." : "Tracking appears here once your plates are dispatched."}</p>
          ))}
      </section>

      <section className="ca-card">
        <h3>{reg ? "Purchase details" : o.type === "accessories" ? "Items" : "Plate specification"}</h3>
        <ul className="ca-items">
          {o.items.map((it, i) => (
            <li key={i}>
              <span>
                {it.title}
                {it.qty > 1 ? ` × ${it.qty}` : ""}
              </span>
              <span>{it.price === 0 ? "Included" : gbp(it.price * it.qty)}</span>
            </li>
          ))}
          <li className="ca-items__total">
            <span>Total</span>
            <span>{gbp(o.total)}</span>
          </li>
          <li>
            <span>Paid</span>
            <span>{gbp(o.paid)}</span>
          </li>
          {owed > 0 && (
            <li className="ca-items__owed">
              <span>Balance to pay</span>
              <span>{gbp(owed)}</span>
            </li>
          )}
        </ul>
      </section>

      <section className="ca-card">
        <h3>Invoice and documents</h3>
        <ul className="ca-docs">
          {invoice && (
            <li>
              <span>Invoice</span>
              {/* At launch: Shopify's order status page; documents open through a signed, private link. */}
              <button type="button" className="ca-link" disabled title="Preview: not connected">
                View invoice
              </button>
            </li>
          )}
          {o.documents
            .filter((d) => d.kind !== "receipt")
            .map((d) => (
              <li key={d.name}>
                <span>{d.name}</span>
                <button type="button" className="ca-link" disabled title="Preview: not connected">
                  View
                </button>
              </li>
            ))}
        </ul>
      </section>

      <div className="ca-detail__acts">
        {!reg && (
          <button type="button" className="ca-btn" onClick={() => go(o.type === "accessories" ? "accessories" : "make-plates")} data-reorder>
            {o.type === "accessories" ? "Order again" : "Reorder plates"}
          </button>
        )}
        <button
          type="button"
          className="ca-btn ca-btn--ghost"
          onClick={() => contact(reg ? { topic: "buy", sub: "transfer", reg: o.reg, order: o.ref } : { topic: "make", sub: "order", reg: o.reg, order: o.ref })}
          data-contact-order
        >
          Help with this order
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAKE: physical plate orders                                          */
/* ------------------------------------------------------------------ */

function MakeTab() {
  const { orders, docs } = useAccount();
  const { go } = useMode();
  const made = orders.filter((o) => o.type === "plates" || o.type === "accessories");
  const [openId, setOpenId] = useState<string | null>(() => takePending("make"));
  useEffect(() => {
    const on = () => setOpenId(takePending("make"));
    window.addEventListener("rk-ca-open", on);
    return () => window.removeEventListener("rk-ca-open", on);
  }, []);
  const open = made.find((o) => o.id === openId);
  if (open) return <OrderDetail o={open} back={() => setOpenId(null)} backLabel="Your orders" />;
  return (
    <>
      <Section title="Your plates and accessories" id="ca-make">
        {made.length ? (
          <ul className="ca-rows">
            {made.map((o) => (
              <Row
                key={o.id}
                reg={o.reg}
                title={`${o.type === "accessories" ? o.items.map((i) => i.title).slice(0, 2).join(", ") : "Number plates"}`}
                sub={`Ordered ${niceDate(o.date)} · Order ${o.ref}`}
                state={orderStatus(o)}
                act={needsAction(o, docs)}
                onOpen={() => setOpenId(o.id)}
                data={{ "data-order": o.ref }}
              />
            ))}
          </ul>
        ) : (
          <Empty line="Number plates, plate holders and accessories you order from REG KING will show here." button="Make your plates" onClick={() => go("make-plates")} />
        )}
      </Section>

      <section className="ca-next" aria-labelledby="ca-build">
        <div>
          <h2 id="ca-build">Build a new plate</h2>
          <p>
            <b>5% off for account holders.</b> Choose your style, border and badge and see it as you build.
          </p>
        </div>
        <div className="ca-next__acts">
          <button type="button" className="ca-btn" onClick={() => go("make-plates")} data-build-new>
            Build a plate
          </button>
          <button type="button" className="ca-btn ca-btn--ghost" onClick={() => go("accessories")} data-shop-acc>
            Plate holders and accessories
          </button>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* SELL: listings, list a registration, value a registration            */
/* ------------------------------------------------------------------ */

type SellView = "home" | "list" | "value";

function SellTab({ start }: { start: SellView }) {
  const { submissions } = useAccount();
  const [view, setView] = useState<SellView>(start);
  const [openId, setOpenId] = useState<string | null>(() => takePending("sell"));
  const valuations = useValuations();
  const open = submissions.find((s) => s.id === openId);
  const toTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));

  if (open) return <ListingDetail s={open} back={() => setOpenId(null)} />;
  if (view === "list")
    return (
      <div className="ca-detail ca-flow">
        <button type="button" className="ca-back" onClick={() => setView("home")} data-back>
          <span aria-hidden>←</span> Sell
        </button>
        <h2 className="ca-flow__h">List a registration</h2>
        <SellWizard onDone={() => setView("home")} />
      </div>
    );
  if (view === "value") return <ValueFlow back={() => setView("home")} add={valuations.add} />;

  return (
    <>
      <Section
        title="Your listings"
        id="ca-listings"
        extra={
          <div className="ca-sec__acts">
            <button type="button" className="ca-btn" onClick={() => (setView("list"), toTop())} data-ca-list>
              List a registration
            </button>
            <button type="button" className="ca-btn ca-btn--ghost" onClick={() => (setView("value"), toTop())} data-ca-value>
              Value a registration
            </button>
          </div>
        }
      >
        {submissions.length ? (
          <ul className="ca-rows">
            {submissions.map((s) => {
              const pending = s.requests.some((r) => r.status === "pending");
              return (
                <Row
                  key={s.id}
                  reg={s.reg}
                  title={s.advertised ? `Advertised at ${gbp(s.advertised)}` : "Price to be set"}
                  sub={pending ? "Changes pending approval" : s.status === "reserved" ? "A buyer has reserved it" : `Reference ${s.ref}`}
                  state={LISTING_LABEL[s.status]}
                  onOpen={() => setOpenId(s.id)}
                  data={{ "data-listing": s.reg }}
                />
              );
            })}
          </ul>
        ) : (
          <Empty line="Registrations you're selling with REG KING will show here." button="List a registration" onClick={() => setView("list")} />
        )}
      </Section>

      {valuations.list.length > 0 && (
        <Section title="Valuation requests" id="ca-vals">
          <ul className="ca-rows">
            {valuations.list.map((v) => (
              <li key={v.id}>
                <div className="ca-row ca-row--static">
                  <span className="ca-plate">{v.reg}</span>
                  <span className="ca-row__main">
                    <b>Requested {niceDate(v.created)}</b>
                    <span>We&apos;ll email your valuation.</span>
                  </span>
                  <span className="ca-tag">Requested</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

const REMOVE_REASONS = ["Sold elsewhere", "Keeping the plate", "Changed my mind about selling", "Other"];

function ListingDetail({ s, back }: { s: Submission; back: () => void }) {
  const { requestChange } = useAccount();
  const contact = useContact();
  const [form, setForm] = useState<"edit" | "remove" | null>(null);
  const [want, setWant] = useState(s.desired ? String(s.desired) : "");
  const [offers, setOffers] = useState<"yes" | "no">(s.offers === "no" ? "no" : "yes");
  const [meaningText, setMeaningText] = useState(s.meaningText);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pkg = s.pkg ? packageOf(s.pkg) : null;
  const finished = s.status === "sold" || s.status === "withdrawn";
  const pending = s.requests.filter((r) => r.status === "pending");
  const pendingEdit = pending.find((r) => r.kind === "edit" || r.kind === "price");
  const pendingRemoval = pending.find((r) => r.kind === "removal");
  const wantNum = Number(want.replace(/[^\d.]/g, ""));

  const changes = () => {
    const c: string[] = [];
    if (wantNum > 0 && wantNum !== s.desired) c.push(`Amount you want to receive: ${gbp(wantNum)}`);
    if (offers !== (s.offers === "no" ? "no" : "yes")) c.push(`Open to offers: ${offers === "yes" ? "Yes" : "No"}`);
    if (meaningText.trim() !== s.meaningText.trim()) c.push(`What it means: ${meaningText.trim() || "(blank)"}`);
    return c;
  };
  const send = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (form === "edit") {
      const c = changes();
      if (!c.length) return;
      const ok = requestChange(s.id, { kind: "edit", changes: c, amount: wantNum > 0 && wantNum !== s.desired ? wantNum : undefined });
      setMsg(ok ? { ok, text: "Changes sent. Your listing stays live as it is until REG KING approves them." } : { ok, text: "Sorry, we couldn't send your changes. Please try again." });
    } else if (form === "remove") {
      if (!reason) return;
      const ok = requestChange(s.id, { kind: "removal", reason });
      setMsg(ok ? { ok, text: "Request sent. REG KING will confirm before it comes off sale." } : { ok, text: "Sorry, we couldn't send that request. Please try again." });
    }
    setForm(null);
    setTried(false);
  };

  return (
    <div className="ca-detail">
      <Back onClick={back}>Your listings</Back>
      <div className="ca-detail__head">
        <span className="ca-plate ca-plate--xl">{s.reg}</span>
        <div>
          <h2>
            <span className="ca-tag ca-tag--lg" data-status={s.status}>
              {LISTING_LABEL[s.status]}
            </span>
          </h2>
          <p>
            Reference {s.ref} · submitted {niceDate(s.submittedAt)}
          </p>
        </div>
      </div>

      {msg && (
        <p className={msg.ok ? "ca-ok" : "ca-err ca-err--block"} role="status">
          {msg.text}
        </p>
      )}

      {pending.length > 0 && (
        <section className="ca-card ca-card--pending" data-pending>
          <h3>Changes pending approval</h3>
          <ul className="ca-list">
            {pending.map((r) =>
              r.kind === "edit" ? (
                (r.changes ?? []).map((c) => <li key={r.id + c}>{c}</li>)
              ) : (
                <li key={r.id}>{r.kind === "price" ? `New price: ${gbp(r.amount ?? 0)}` : `Take off sale: ${r.reason}`}</li>
              ),
            )}
          </ul>
          <p className="ca-note">Sent {niceDate(pending[0].created)}. {s.status === "review" ? "" : "Your listing stays live as it is until we've reviewed them."}</p>
        </section>
      )}

      {s.status === "sold" && s.sale ? (
        <>
          <section className="ca-card">
            <h3>
              Transfer progress <small>{SALE_STAGES[Math.min(s.sale.stage, SALE_STAGES.length - 1)]}</small>
            </h3>
            <Stages stages={SALE_STAGES} at={s.sale.stage} />
          </section>
          <section className="ca-card">
            <h3>Payout</h3>
            <dl className="ca-dl">
              <div>
                <dt>Status</dt>
                <dd>{s.sale.payout === "paid" ? `Paid${s.sale.paidOn ? ` on ${niceDate(s.sale.paidOn)}` : ""}` : "Pending"}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{s.desired ? gbp(s.desired) : "As agreed with you"}</dd>
              </div>
            </dl>
            {s.sale.payout !== "paid" && <p className="ca-note">We&apos;ll confirm with you when your payout is on its way.</p>}
          </section>
        </>
      ) : (
        <section className="ca-card">
          <h3>Listing</h3>
          <p className="ca-note">{s.status === "review" ? "We're checking the details. It isn't on the site yet." : s.status === "reserved" ? "Live on the site. A buyer has reserved it and we'll be in touch." : LISTING_STATUS[s.status].line}</p>
          <dl className="ca-dl">
            <div>
              <dt>Advertised price</dt>
              <dd>{s.advertised ? gbp(s.advertised) : "Not set yet"}</dd>
            </div>
            <div>
              <dt>You want to receive</dt>
              <dd>{s.unsure || !s.desired ? "To be agreed with you" : gbp(s.desired)}</dd>
            </div>
            <div>
              <dt>Open to offers</dt>
              <dd>{s.offers === "yes" ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>What it means</dt>
              <dd>
                {s.meaning}
                {s.meaningText ? `: ${s.meaningText}` : ""}
              </dd>
            </div>
            <div>
              <dt>Where it is</dt>
              <dd>{s.held === "vehicle" ? "On a vehicle" : "On a retention certificate"}</dd>
            </div>
            {pkg && (
              <div>
                <dt>How you're selling</dt>
                <dd>
                  {pkg.title}. {pkg.fee}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {!finished && (
        <section className="ca-card">
          <h3>Make changes</h3>
          {form === null && (
            <div className="ca-detail__acts">
              <button type="button" className="ca-btn" disabled={!!pendingEdit} onClick={() => (setForm("edit"), setMsg(null))} data-ca-edit>
                {pendingEdit ? "Changes pending approval" : "Edit listing"}
              </button>
              <button type="button" className="ca-link" disabled={!!pendingRemoval} onClick={() => (setForm("remove"), setMsg(null))} data-req-remove>
                {pendingRemoval ? "Removal pending" : "Take it off sale"}
              </button>
            </div>
          )}
          {form === "edit" && (
            <form className="ca-form" onSubmit={send} noValidate>
              <label className="ca-f">
                <span>Amount you want to receive</span>
                <span className="ca-money">
                  <span aria-hidden>£</span>
                  <input inputMode="numeric" value={want} onChange={(e) => setWant(e.target.value)} data-f="edit-want" />
                </span>
              </label>
              <div className="ca-f">
                <span>Open to offers?</span>
                <div className="ca-choice" role="radiogroup" aria-label="Open to offers">
                  {(["yes", "no"] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={offers === v} onClick={() => setOffers(v)}>
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="ca-f">
                <span>
                  What it means <i>(optional)</i>
                </span>
                <input value={meaningText} onChange={(e) => setMeaningText(e.target.value)} data-f="edit-meaning" />
              </label>
              {tried && !changes().length && <p className="ca-err">Change something first, or cancel.</p>}
              <p className="ca-note">REG KING approves every change. Until then your listing stays live as it is.</p>
              <div className="ca-detail__acts">
                <button type="submit" className="ca-btn" data-send-req>
                  Submit for approval
                </button>
                <button type="button" className="ca-link" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {form === "remove" && (
            <form className="ca-form" onSubmit={send} noValidate>
              <div className="ca-f">
                <span>Why are you taking it off sale?</span>
                <div className="ca-choice" role="radiogroup" aria-label="Reason">
                  {REMOVE_REASONS.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} data-pick={`reason:${r}`}>
                      {r}
                    </button>
                  ))}
                </div>
                {tried && !reason && <p className="ca-err">Choose a reason.</p>}
              </div>
              <p className="ca-note">REG KING confirms with you first. It stays on sale until then.</p>
              <div className="ca-detail__acts">
                <button type="submit" className="ca-btn" data-send-req>
                  Send request
                </button>
                <button type="button" className="ca-link" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="ca-detail__acts">
        <button type="button" className="ca-btn ca-btn--ghost" onClick={() => contact({ topic: "sell", sub: "listing", reg: s.reg, note: `About my listing ${s.reg}, reference ${s.ref}.` })} data-contact-listing>
          Help with this listing
        </button>
      </div>
    </div>
  );
}

/* ---------- List a registration: reg, details, review, submit ---------- */

function Steps({ at, labels }: { at: number; labels: string[] }) {
  return (
    <ol className="ca-steps" aria-label="Steps">
      {labels.map((l, i) => (
        <li key={l} data-state={i < at ? "done" : i === at ? "now" : "todo"}>
          <span>{i + 1}</span>
          <b>{l}</b>
        </li>
      ))}
    </ol>
  );
}

function Choice<T extends string>({ value, options, onPick, label, name }: { value: T | ""; options: { k: T; t: string }[]; onPick: (v: T) => void; label: string; name: string }) {
  return (
    <div className="ca-choice" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={value === o.k} onClick={() => onPick(o.k)} data-pick={`${name}:${o.k}`}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

/* ---------- Value a registration: reg, a few details, submit ---------- */

type Valuation = { id: string; reg: string; held: string; note: string; created: string };
/** Valuation requests the customer has sent (sent to REG KING by /api/valuation-request; this list is kept in this browser). */
function useValuations() {
  const [list, setList] = useState<Valuation[]>([]);
  useEffect(() => {
    try {
      setList(JSON.parse(localStorage.getItem("rk-valuations") ?? "[]"));
    } catch {}
  }, []);
  const add = (v: Omit<Valuation, "id" | "created">): boolean => {
    const next = [{ ...v, id: Math.random().toString(36).slice(2, 10), created: new Date().toISOString() }, ...list];
    try {
      localStorage.setItem("rk-valuations", JSON.stringify(next));
      setList(next);
      return true;
    } catch {
      return false;
    }
  };
  return { list, add };
}

function ValueFlow({ back, add }: { back: () => void; add: (v: Omit<Valuation, "id" | "created">) => boolean }) {
  const { customer } = useAccount();
  const [step, setStep] = useState(0);
  const [reg, setReg] = useState("");
  const [held, setHeld] = useState<"" | "vehicle" | "retention" | "unsure">("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(-1);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState("");
  const [sending, setSending] = useState(false);
  const [tel, setTel] = useState(customer?.phone ?? "");
  const regOk = cleanReg(reg).replace(/\s/g, "").length >= 2;
  const telOk = tel.replace(/\D/g, "").length >= 10;

  // The request goes to the REG KING team (/api/valuation-request), who value it and get in touch.
  const next = async (ev: FormEvent) => {
    ev.preventDefault();
    setTried(Math.max(tried, step));
    if (step === 0) {
      if (regOk) setStep(1);
      return;
    }
    if (!held || !telOk || sending) return;
    setSending(true);
    setFailed("");
    try {
      const res = await fetch("/api/valuation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg: cleanReg(reg), name: customer?.name ?? "", email: customer?.email ?? "", phone: tel, held, note: note.trim(), source: "account" }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      add({ reg: cleanReg(reg), held, note: note.trim() });
      setDone(true);
    } catch (err) {
      setFailed((err as Error).message || "Sorry, we couldn't send your request. Please try again, or call 01922 333451.");
    } finally {
      setSending(false);
    }
  };

  if (done)
    return (
      <div className="ca-detail">
        <section className="ca-card ca-card--done" role="status">
          <span className="ca-tick" aria-hidden>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2>Valuation requested</h2>
          <span className="ca-plate ca-plate--xl">{cleanReg(reg)}</span>
          <p>
            The REG KING team will value {cleanReg(reg)} and contact you on {tel} or at <b>{customer?.email}</b>.
          </p>
          <button type="button" className="ca-btn" onClick={back} data-ca-done>
            Back to Sell
          </button>
        </section>
      </div>
    );

  return (
    <form className="ca-detail ca-flow" onSubmit={next} noValidate>
      <Back onClick={step ? () => setStep(0) : back}>{step ? "Back" : "Sell"}</Back>
      <h2 className="ca-flow__h">Value a registration</h2>
      <Steps at={step} labels={["Registration", "Details"]} />
      {step === 0 ? (
        <section className="ca-card">
          <label className="ca-f">
            <span>Which registration would you like valued?</span>
            <input className="ca-reginput" value={reg} onChange={(ev) => setReg(spaceReg(ev.target.value))} maxLength={8} placeholder="YOUR REG" autoCapitalize="characters" aria-invalid={tried >= 0 && !regOk} data-f="value-reg" />
            {tried >= 0 && !regOk && <small className="ca-err">Enter the registration.</small>}
          </label>
        </section>
      ) : (
        <section className="ca-card ca-fields">
          <span className="ca-plate ca-plate--xl">{cleanReg(reg)}</span>
          <div className="ca-f">
            <span>Where is it now?</span>
            <Choice
              name="vheld"
              label="Where it is"
              value={held}
              options={[
                { k: "vehicle", t: "On a vehicle" },
                { k: "retention", t: "On a retention certificate" },
                { k: "unsure", t: "Not sure" },
              ]}
              onPick={(v) => setHeld(v)}
            />
            {tried >= 1 && !held && <small className="ca-err">Choose one.</small>}
          </div>
          <label className="ca-f">
            <span>
              Anything we should know? <i>(optional)</i>
            </span>
            <textarea rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="For example: what it means, or a price you've been offered" data-f="value-note" />
          </label>
          {!customer?.phone && (
            <label className="ca-f">
              <span>Your phone number</span>
              <input type="tel" value={tel} onChange={(ev) => setTel(ev.target.value)} autoComplete="tel" maxLength={20} aria-invalid={tried >= 1 && !telOk} data-f="value-tel" />
              {tried >= 1 && !telOk && <small className="ca-err">Enter a phone number we can call.</small>}
            </label>
          )}
          <p className="ca-note">We&apos;ll contact you about your valuation by phone or at {customer?.email}.</p>
        </section>
      )}
      {failed && (
        <p className="ca-err ca-err--block" role="alert">
          {failed}
        </p>
      )}
      <button type="submit" className="ca-btn ca-btn--big" data-ca-next disabled={sending}>
        {step === 1 ? (sending ? "Sending…" : "Request valuation") : "Continue"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Account settings                                                     */
/* ------------------------------------------------------------------ */

const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const blankAddr = (): SavedAddress => ({ id: "", label: "", line1: "", line2: "", town: "", postcode: "", isDefault: false });

function Settings() {
  const { customer } = useAccount();
  if (!customer) return null;
  return (
    <div className="ca-settings">
      <h2 className="ca-flow__h">Account settings</h2>
      <Details />
      <Addresses />
      <Marketing />
      <Security />
    </div>
  );
}

/** Save to the account, then read it back so "Saved" only shows once it really has (PROTOTYPE: this browser). */
function useSaved() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const check = (test: (c: Record<string, unknown>) => boolean, okText = "Saved.") => {
    setTimeout(() => {
      let ok = false;
      try {
        ok = test(JSON.parse(localStorage.getItem("rk-customer") ?? "null") ?? {});
      } catch {}
      setMsg(ok ? { ok, text: okText } : { ok, text: "Sorry, we couldn't save that. Please try again." });
    }, 30);
  };
  return { msg, setMsg, check };
}

function Details() {
  const { customer, update } = useAccount();
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [tel, setTel] = useState(customer?.phone ?? "");
  const [tried, setTried] = useState(false);
  const { msg, setMsg, check } = useSaved();
  const ok = { name: name.trim().length > 1, email: /^\S+@\S+\.\S+$/.test(email.trim()), tel: !tel.trim() || tel.replace(/\D/g, "").length >= 10 };
  const save = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setMsg(null);
    if (!ok.name || !ok.email || !ok.tel) return;
    const next = { name: name.trim(), email: email.trim(), phone: tel.trim() };
    update(next);
    check((c) => c.name === next.name && c.email === next.email, "Your details are saved.");
  };
  return (
    <form className="ca-card ca-fields" onSubmit={save} noValidate>
      <h3>Personal details</h3>
      <label className="ca-f">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !ok.name} data-f="set-name" />
        {tried && !ok.name && <small className="ca-err">Enter your name.</small>}
      </label>
      <label className="ca-f">
        <span>Email address</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={tried && !ok.email} data-f="set-email" />
        {tried && !ok.email && <small className="ca-err">Enter an email address like name@example.com.</small>}
      </label>
      <label className="ca-f">
        <span>Contact number</span>
        <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" aria-invalid={tried && !ok.tel} data-f="set-tel" />
        {tried && !ok.tel && <small className="ca-err">Enter a number with at least 10 digits.</small>}
      </label>
      {msg && (
        <p className={msg.ok ? "ca-ok" : "ca-err ca-err--block"} role="status">
          {msg.text}
        </p>
      )}
      <button type="submit" className="ca-btn" data-save-details>
        Save details
      </button>
    </form>
  );
}

function Addresses() {
  const { customer, update } = useAccount();
  const list: SavedAddress[] = customer?.addresses ?? (customer?.address?.line1 ? [{ ...customer.address, id: "a0", label: "Home", isDefault: true }] : []);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [tried, setTried] = useState(false);
  const { msg, setMsg, check } = useSaved();
  const commit = (next: SavedAddress[], text: string) => {
    const def = next.find((a) => a.isDefault) ?? next[0];
    const fixed = next.map((a) => ({ ...a, isDefault: !!def && a.id === def.id }));
    update({ addresses: fixed, address: def ? { line1: def.line1, line2: def.line2, town: def.town, postcode: def.postcode } : undefined });
    check((c) => Array.isArray(c.addresses) && (c.addresses as unknown[]).length === fixed.length, text);
  };
  const ok = editing ? { line1: editing.line1.trim().length > 1, town: editing.town.trim().length > 1, postcode: POSTCODE.test(editing.postcode.trim()) } : null;
  const saveEdit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!editing || !ok || !ok.line1 || !ok.town || !ok.postcode) return;
    const a = { ...editing, label: editing.label.trim() || "Address", postcode: editing.postcode.toUpperCase().trim() };
    const next = a.id ? list.map((x) => (x.id === a.id ? a : x)) : [...list, { ...a, id: Math.random().toString(36).slice(2, 9), isDefault: list.length === 0 }];
    commit(next, a.id ? "Address updated." : "Address added.");
    setEditing(null);
    setTried(false);
  };
  const f = (k: keyof SavedAddress) => (e: ChangeEvent<HTMLInputElement>) => editing && setEditing({ ...editing, [k]: e.target.value });

  return (
    <section className="ca-card">
      <h3>Saved addresses</h3>
      {msg && (
        <p className={msg.ok ? "ca-ok" : "ca-err ca-err--block"} role="status">
          {msg.text}
        </p>
      )}
      {list.length > 0 ? (
        <ul className="ca-addrs">
          {list.map((a) => (
            <li key={a.id} data-addr={a.label}>
              <div>
                <b>
                  {a.label} {a.isDefault && <span className="ca-tag ca-tag--y">Default</span>}
                </b>
                <span>{[a.line1, a.line2, a.town, a.postcode].filter(Boolean).join(", ")}</span>
              </div>
              <div className="ca-addrs__acts">
                <button type="button" className="ca-link" onClick={() => (setEditing(a), setMsg(null))}>
                  Edit
                </button>
                {!a.isDefault && (
                  <button type="button" className="ca-link" onClick={() => commit(list.map((x) => ({ ...x, isDefault: x.id === a.id })), `${a.label} is now your default address.`)} data-default={a.label}>
                    Set as default
                  </button>
                )}
                <button type="button" className="ca-link" onClick={() => commit(list.filter((x) => x.id !== a.id), "Address removed.")} data-remove-addr={a.label}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !editing && <p className="ca-note">No saved addresses yet.</p>
      )}
      {editing ? (
        <form className="ca-form ca-fields" onSubmit={saveEdit} noValidate>
          <label className="ca-f">
            <span>
              Name this address <i>(optional)</i>
            </span>
            <input value={editing.label} onChange={f("label")} placeholder="Home, Work..." data-f="addr-label" />
          </label>
          <label className="ca-f">
            <span>Address line 1</span>
            <input value={editing.line1} onChange={f("line1")} autoComplete="address-line1" aria-invalid={tried && !ok?.line1} data-f="addr-1" />
            {tried && !ok?.line1 && <small className="ca-err">Enter the first line of the address.</small>}
          </label>
          <label className="ca-f">
            <span>
              Address line 2 <i>(optional)</i>
            </span>
            <input value={editing.line2} onChange={f("line2")} autoComplete="address-line2" />
          </label>
          <div className="ca-row2">
            <label className="ca-f">
              <span>Town or city</span>
              <input value={editing.town} onChange={f("town")} autoComplete="address-level2" aria-invalid={tried && !ok?.town} data-f="addr-town" />
              {tried && !ok?.town && <small className="ca-err">Enter the town or city.</small>}
            </label>
            <label className="ca-f">
              <span>Postcode</span>
              <input value={editing.postcode} onChange={f("postcode")} autoComplete="postal-code" aria-invalid={tried && !ok?.postcode} data-f="addr-pc" />
              {tried && !ok?.postcode && <small className="ca-err">Enter a UK postcode like WV14 6NW.</small>}
            </label>
          </div>
          <div className="ca-detail__acts">
            <button type="submit" className="ca-btn" data-save-addr>
              {editing.id ? "Save address" : "Add address"}
            </button>
            <button type="button" className="ca-link" onClick={() => (setEditing(null), setTried(false))}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="ca-btn ca-btn--ghost" onClick={() => (setEditing(blankAddr()), setMsg(null))} data-add-addr>
          + Add an address
        </button>
      )}
    </section>
  );
}

function Toggle({ on, set, title, line, data }: { on: boolean; set: (v: boolean) => void; title: string; line: string; data: string }) {
  return (
    <label className="ca-toggle">
      <span>
        <b>{title}</b>
        <small>{line}</small>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} data-f={data} />
      <i aria-hidden />
    </label>
  );
}

function Marketing() {
  const { customer, update } = useAccount();
  const { msg, check } = useSaved();
  if (!customer) return null;
  const email = !!customer.marketing || !!customer.prefs.news;
  const save = (p: { marketing?: boolean; marketingSms?: boolean; newRegs?: boolean }) => {
    update({ ...p, ...(p.marketing !== undefined ? { prefs: { ...customer.prefs, news: p.marketing } } : {}) });
    const [k, v] = Object.entries(p)[0];
    check((c) => !!c[k] === v, "Your preferences are saved.");
  };
  return (
    <section className="ca-card">
      <h3>Marketing preferences</h3>
      <div className="ca-toggles">
        <Toggle on={email} set={(v) => save({ marketing: v })} title="Marketing emails" line="Offers and news from REG KING by email." data="mk-email" />
        <Toggle on={!!customer.marketingSms} set={(v) => save({ marketingSms: v })} title="Marketing texts" line="Offers and news from REG KING by text message." data="mk-sms" />
        <Toggle on={!!customer.newRegs} set={(v) => save({ newRegs: v })} title="New registration updates" line="Hear when new registrations are added to the site." data="mk-new" />
      </div>
      {msg && (
        <p className={msg.ok ? "ca-ok" : "ca-err ca-err--block"} role="status">
          {msg.text}
        </p>
      )}
      <p className="ca-note ca-note--box">These are only for marketing. We&apos;ll always contact you about your orders, listings and account, whatever you choose here.</p>
    </section>
  );
}

function Security() {
  const { customer, signOut: endSession, deleteAll } = useAccount();
  const signOut = () => (customer?.demo ? deleteAll() : endSession());
  // CONFIRM: written for Shopify's customer accounts (one-time email code, no password).
  // If the store uses legacy accounts with passwords, swap this for a "Change password" link.
  return (
    <section className="ca-card">
      <h3>Password and security</h3>
      <p className="ca-note">
        You sign in with a one-time code we email to <b>{customer?.email}</b>. There&apos;s no password to set or change. Sign-in is handled securely by Shopify.
      </p>
      <button type="button" className="ca-btn ca-btn--ghost" onClick={signOut} data-signout-device>
        Sign out on this device
      </button>
    </section>
  );
}
