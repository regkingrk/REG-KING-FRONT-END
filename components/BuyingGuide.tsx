"use client";

import { useState } from "react";
import { MEMBER_DISCOUNT } from "@/lib/brand";
import { ArrowRight, CrownIcon } from "./Icons";
import { useMode } from "./ModeProvider";

const pct = Math.round(MEMBER_DISCOUNT * 100);

/**
 * How buying works, for the two kinds of plate on the site. Both processes are REG KING's own
 * (sent 26 Oct 2026): REG KING-owned plates include physical plates; customer plates go through
 * REG KING as the middleman, with the seller paid only after the buyer's 48-hour assignment.
 */
type Step = { t: string; d: string; more?: { h: string; d: string; list?: string[] }[] };
const GUIDES: Record<"regking" | "customer", { label: string; line: string; to: string; cta: string; steps: Step[]; end: string; notes?: { h: string; d: string }[] }> = {
  regking: {
    label: "Owned by REG KING",
    line: "Buying a registration we own is simple, secure and straightforward. Here's what to expect from start to finish.",
    to: "buy-regking",
    cta: "See our plates",
    steps: [
      {
        t: "Find and secure your registration",
        d: "Find the one, then reserve it with a deposit or pay in full. It's our own plate, so there's no waiting for a third-party seller to approve it.",
      },
      { t: "We arrange a call", d: "Once your order's placed, one of the team gets in touch to book a phone call at a time that suits you." },
      {
        t: "We personalise your order",
        d: "On the call we go through three things, so your order is set up exactly how you want it.",
        more: [
          { h: "Your number plates", d: "Physical plates are included at no extra cost. Pick standard, 3D, 4D or another style." },
          {
            h: "Your documents",
            d: "Choose how you'd like them:",
            list: [
              "Scanned copy of the current registration document",
              "Physical copy: the original document, sent with your plates",
              "Both: a scan now and the original by post",
              "New DVLA document, with you as the nominee, sent to your address",
              "Direct assignment: we help put the registration straight on your vehicle",
            ],
          },
          { h: "Any questions", d: "We make sure you've asked everything and you're happy with the next steps before we hang up." },
        ],
      },
      {
        t: "We get to work",
        d: "We aim to have your whole order prepared within 24 hours. A new document from DVLA can take up to 2 weeks, as DVLA advises.",
      },
      {
        t: "Your plates are ready",
        d: "We send you a photo of your finished plates before they go out, then post your plates and documents by Royal Mail Special Delivery, with tracking.",
      },
      {
        t: "We stay in touch",
        d: "We check everything arrived safely, and we're here whenever you need help assigning the plate, understanding your paperwork or anything else.",
      },
    ],
    end: "From your first enquiry to the moment your registration is on your vehicle, we're with you every step of the way.",
  },
  customer: {
    label: "Customer plate",
    line: "Buying from a private seller through us is simple, secure and stress-free. We act as the middleman, managing the process and protecting both buyer and seller.",
    to: "buy-customer",
    cta: "See customer plates",
    steps: [
      {
        t: "Find and secure your registration",
        d: "Reserve it with a deposit or pay in full. Customer plates are subject to the seller confirming. If it's already sold without the seller telling us, we let you know straight away and refund you in full.",
      },
      {
        t: "We contact the seller",
        d: "We confirm it's available and arrange the documents. If the plate is still on the seller's vehicle, they remove it through DVLA first, which can add a little time. REG KING holds the payment and doesn't pay the seller until the sale is complete.",
      },
      {
        t: "We arrange a call",
        d: "One of the team books a phone call at a time that suits you.",
        more: [
          { h: "Your number plates", d: "Physical plates aren't included with customer plates, but you get our exclusive trade pricing on them as a thank-you." },
          { h: "Your transfer", d: "How the transfer works, which documents you'll get and how to assign the registration to your vehicle." },
          { h: "Any questions", d: "We make sure you're comfortable with the process before we hang up." },
        ],
      },
      { t: "We get your documents", d: "Once the seller sends the documents, we check them and send you a scanned copy so you can start the DVLA assignment. We'll guide you if you need help." },
      {
        t: "Your 48-hour assignment",
        d: "Registration scams and forged documents do exist, so we ask you to assign the registration straight to your vehicle within 48 hours of getting the documents, and let us know how it went. The seller's money stays with us while you do. Any problems, call us straight away.",
      },
      { t: "We complete the sale", d: "You confirm it's assigned, we check it, then we finalise the sale. Only then is the seller paid." },
      {
        t: "Your plates and delivery",
        d: "If you've ordered plates at trade price, we make them to your spec, send you a photo, then post them and any documents by Royal Mail Special Delivery with tracking.",
      },
      { t: "We're always here", d: "We follow up to make sure everything went smoothly, and we're here for your registration, paperwork or future transfers." },
    ],
    end: "From securing your registration to completing the transfer, we're with you every step of the way.",
    notes: [
      { h: "Seller availability", d: "Every customer plate is subject to confirmation. If it's already sold, we tell you and refund you in full." },
      { h: "Possible delays", d: "Some plates have to come off the seller's vehicle first, and DVLA processing can add time." },
      { h: "48-hour assignment", d: "You need to attempt and complete the assignment within 48 hours of getting the documents, or contact us straight away if you have trouble." },
      { h: "Payment protection", d: "REG KING holds the seller's money until the sale is complete and checked." },
      { h: "Vehicle eligibility", d: "Your vehicle must meet DVLA's rules, and a registration can't make it look newer than it is." },
    ],
  },
};
type Key = keyof typeof GUIDES;

export function BuyingGuide() {
  const { go } = useMode();
  const [k, setK] = useState<Key>("regking");
  const g = GUIDES[k];
  return (
    <section className="rk-howbuy" id="rk-howbuy" aria-labelledby="howbuy-title">
      <div className="rk-wrap rk-howbuy__in">
        <div className="rk-howbuy__side">
          <h2 id="howbuy-title">How buying works</h2>
          <div className="rk-howbuy__switch" role="tablist" aria-label="Type of plate">
            {(Object.keys(GUIDES) as Key[]).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={k === key} onClick={() => setK(key)} data-guide={key}>
                {key === "regking" && <CrownIcon />}
                {GUIDES[key].label}
              </button>
            ))}
          </div>
          <p className="rk-howbuy__line">{g.line}</p>
          {g.end && <p className="rk-howbuy__end">{g.end}</p>}
          <div className="rk-howbuy__acts">
            <button type="button" className="rk-btn rk-btn--ink" onClick={() => go(g.to)}>
              {g.cta} <ArrowRight />
            </button>
            <button type="button" className="rk-howbuy__link" onClick={() => go("info-faqs")}>
              Questions? Read the FAQs
            </button>
          </div>
        </div>

        {/* The steps as a road: each number on a small plate, joined by a dashed centre line */}
        <ol className="rk-howbuy__steps" key={k} role="tabpanel">
          {g.steps.map((s, i) => (
            <li key={s.t}>
              <span className="rk-howbuy__n" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <b>
                  <span className="rk-visually-hidden">Step {i + 1}: </span>
                  {s.t}
                </b>
                <span>{s.d}</span>
                {s.more && (
                  <details className="rk-howbuy__more">
                    <summary>What we&apos;ll go through</summary>
                    <ol>
                      {s.more.map((m) => (
                        <li key={m.h}>
                          <b>{m.h}</b>
                          <span>{m.d}</span>
                          {m.list && (
                            <ul>
                              {m.list.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
        {g.notes && (
          <aside className="rk-howbuy__notes" aria-labelledby="howbuy-notes">
            <h3 id="howbuy-notes">Important information before you buy</h3>
            <dl>
              {g.notes.map((n) => (
                <div key={n.h}>
                  <dt>{n.h}</dt>
                  <dd>{n.d}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>
    </section>
  );
}
