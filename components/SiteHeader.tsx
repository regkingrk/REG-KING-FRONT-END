"use client";

import { linkFor } from "@/lib/routes";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { instagram, routes, supportEmail, tiktok } from "@/lib/brand";
import { phone, whatsapp } from "@/lib/infoContent";
import { SITEMAP, type SectionKey } from "@/lib/sitemap";
import { BrandLogo } from "./BrandLogo";
import { useMake } from "./MakeProvider";
import { useMode } from "./ModeProvider";
import { BagIcon, CloseIcon, UserIcon } from "./Icons";

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
/** A link to the section's own page, listed first in its menu. */
const LEAD: Partial<Record<SectionKey, string>> = {
  buy: "Search all plates",
  sell: "Sell your plate",
};
/** These go straight to their page: the page itself has the options. */
const DIRECT = new Set<SectionKey>(["acc"]);

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rk-nav__chev">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * One bar, fixed to the top: logo, the four sections (Buy plates, Sell plates, Make, Information),
 * account and basket. On desktop each section opens a panel of its pages; on phones a Menu button
 * opens all four sections as a list.
 */
export function SiteHeader() {
  const [open, setOpen] = useState<SectionKey | "menu" | null>(null);
  const [fold, setFold] = useState<SectionKey | null>(null);
  const { focused, go, mode, info, acc, account, plate, vault } = useMode();
  const { basket } = useMake();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const follow = (e: ReactMouseEvent, hash: string) => {
    e.preventDefault();
    setOpen(null);
    go(hash);
  };
  const current: SectionKey | null = account ? null : info ? "info" : acc ? "acc" : mode === "build" ? "make" : mode;
  const section = open && open !== "menu" ? SITEMAP.find((s) => s.key === open) : null;
  // Line the links up under the tab that opened them.
  const megaRef = useRef<HTMLDivElement>(null);
  const [megaX, setMegaX] = useState(0);
  useEffect(() => {
    if (!section) return;
    const place = () => {
      const btn = document.querySelector<HTMLElement>(`.rk-nav [data-nav="${section.key}"]`);
      const wrap = megaRef.current?.querySelector<HTMLElement>(".rk-wrap");
      if (!btn || !wrap) return;
      const pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 0;
      const ul = wrap.querySelector<HTMLElement>(".rk-mega__links");
      const inner = wrap.clientWidth - pad * 2;
      // the row's own width, without the offset
      const rowW = ul ? [...ul.children].reduce((w, li, i) => w + (li as HTMLElement).offsetWidth + (i ? 36 : 0), 0) : 0;
      const want = btn.getBoundingClientRect().left - wrap.getBoundingClientRect().left - pad + 14;
      // under the tab, but never past the right edge
      setMegaX(Math.max(0, Math.min(want, inner - rowW)));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [section]);
  // Phone menu: the section you're in starts open
  useEffect(() => {
    if (open === "menu") setFold(current);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // keep the page still behind the open menu
  useEffect(() => {
    document.documentElement.classList.toggle("rk-menu-open", open === "menu");
    return () => document.documentElement.classList.remove("rk-menu-open");
  }, [open]);
  const basketCount = basket.length;

  // The bar fades into the dark top of Buy, Make and Accessories, and turns solid once you scroll.
  const heroShown = !info && !acc && !plate && !account && !(focused && mode !== "build");
  const darkTop = (heroShown && (mode === "buy" || mode === "build")) || !!acc || !!account || vault;
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const blend = darkTop && !scrolled && open === null;
  useEffect(() => {
    document.documentElement.toggleAttribute("data-blend", darkTop);
    document.documentElement.toggleAttribute("data-bar-clear", blend);
  }, [darkTop, blend]);

  return (
    <header className="rk-header" id="rk-header" ref={ref} data-clear={blend || undefined}>
      <div className="rk-wrap rk-header__inner">
        {/* The intro's 3D logo lands exactly on this element. */}
        <a id="rk-header-logo" className="rk-header__logo" href="/" aria-label="REG KING home">
          <BrandLogo priority />
        </a>

        <nav className="rk-nav" aria-label="Main">
          <ul>
            {SITEMAP.map((s) => (
              <li key={s.key}>
                {DIRECT.has(s.key) ? (
                  <a className="rk-nav__btn" href={linkFor(s.hash)} aria-current={current === s.key ? "true" : undefined} data-nav={s.key} onClick={(e) => follow(e, s.hash)}>
                    {s.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="rk-nav__btn"
                    aria-expanded={open === s.key}
                    aria-controls="rk-mega"
                    aria-current={current === s.key ? "true" : undefined}
                    data-nav={s.key}
                    onClick={() => setOpen((o) => (o === s.key ? null : s.key))}
                  >
                    {s.label}
                    <Chevron />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="rk-header__chrome" data-intro-chrome>
          <a className="rk-hicon" href="#account" aria-label="Account" aria-current={account ? "page" : undefined} onClick={(e) => follow(e, "account")}>
            <UserIcon />
          </a>
          <a className="rk-hicon" href={basketCount ? "#make" : routes.cart} aria-label={`Basket${basketCount ? `, ${basketCount} item${basketCount > 1 ? "s" : ""}` : ""}`} onClick={(e) => basketCount && follow(e, "make")}>
            <BagIcon />
            {basketCount > 0 && <span className="rk-hicon__n">{basketCount}</span>}
          </a>
          <button type="button" id="rk-more-btn" className="rk-hmore" aria-expanded={open === "menu"} aria-controls="rk-menu" onClick={() => setOpen((o) => (o === "menu" ? null : "menu"))}>
            {open === "menu" ? <CloseIcon /> : <MenuIcon />}
            <span>{open === "menu" ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {/* Desktop: one section's pages */}
      <div className="rk-mega" id="rk-mega" ref={megaRef} hidden={!section}>
        {section && (
          <div className="rk-wrap">
            <ul className="rk-mega__links" style={{ paddingLeft: megaX }} aria-label={section.label}>
              {LEAD[section.key] && (
                <li>
                  <a className="rk-mega__lead" href={linkFor(section.hash)} data-link={section.hash} onClick={(e) => follow(e, section.hash)}>
                    {LEAD[section.key]}
                  </a>
                </li>
              )}
              {section.items.map((it) => (
                <li key={it.key}>
                  <a href={linkFor(it.hash)} data-link={it.hash} onClick={(e) => follow(e, it.hash)}>
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Phones and tablets: a plain list of sections that fold open, then account links and contact. */}
      <div className="rk-hpanel rk-mnav" id="rk-menu" hidden={open !== "menu"}>
        <div className="rk-wrap rk-mnav__in">
          <nav className="rk-mnav__list" aria-label="Menu">
            {SITEMAP.map((s) => {
              const isOpen = fold === s.key;
              const lead = LEAD[s.key];
              if (DIRECT.has(s.key))
                return (
                  <section key={s.key} className="rk-mnav__sec" data-here={current === s.key || undefined}>
                    <h2>
                      <a href={linkFor(s.hash)} className="rk-mnav__direct" data-link={s.hash} onClick={(e) => follow(e, s.hash)}>
                        <span>{s.label}</span>
                        <Chevron />
                      </a>
                    </h2>
                  </section>
                );
              return (
                <section key={s.key} className="rk-mnav__sec" data-open={isOpen || undefined} data-here={current === s.key || undefined}>
                  <h2>
                    <button type="button" aria-expanded={isOpen} aria-controls={`rk-mnav-${s.key}`} onClick={() => setFold(isOpen ? null : s.key)} data-fold={s.key}>
                      <span>{s.label}</span>
                      <Chevron />
                    </button>
                  </h2>
                  <ul id={`rk-mnav-${s.key}`} hidden={!isOpen}>
                    {lead && (
                      <li>
                        <a href={linkFor(s.hash)} data-link={s.hash} onClick={(e) => follow(e, s.hash)}>
                          {lead}
                        </a>
                      </li>
                    )}
                    {s.items.map((it) => (
                      <li key={it.key}>
                        <a href={linkFor(it.hash)} data-link={it.hash} onClick={(e) => follow(e, it.hash)}>
                          {it.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </nav>

          <ul className="rk-mnav__util">
            <li>
              <a href="#account" onClick={(e) => follow(e, "account")}>
                <UserIcon /> Account
              </a>
            </li>
            <li>
              <a href={basketCount ? "#make" : routes.cart} onClick={(e) => basketCount && follow(e, "make")}>
                <BagIcon /> Basket{basketCount ? ` (${basketCount})` : ""}
              </a>
            </li>
          </ul>

          <TalkToUs />
        </div>
      </div>
    </header>
  );
}

const IG_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" />
  </svg>
);
const TT_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
    />
  </svg>
);

/**
 * "Talk to us" at the foot of the menu: call and WhatsApp as the two main ways in,
 * email with a copy button, then Instagram and TikTok.
 */
function TalkToUs() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  // TikTok: the link goes in lib/brand.ts. Until then the preview shows where it will sit; the live site hides it.
  const preview = typeof window !== "undefined" && "__RK_LOAD__" in window;
  return (
    <section className="mt" aria-labelledby="mt-t">
      <h2 id="mt-t" className="mt__t">
        Talk to us
      </h2>
      <p className="mt__line">A small team who know plates. Pick whichever suits you.</p>
      <div className="mt__acts">
        <a href={`tel:${phone.tel}`} className="mt__btn mt__btn--call" data-mt="call">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
          </svg>
          <span>
            <small>Call</small>
            <b>{phone.display}</b>
          </span>
        </a>
        <a href={whatsapp.href} target="_blank" rel="noopener noreferrer" className="mt__btn" data-mt="whatsapp">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
            <path d="M9 9.2c.3 2 1.8 3.6 3.8 4.2l1-1 1.8.8c-.2 1-1 1.6-2 1.5A6 6 0 0 1 8 9.2c0-1 .6-1.8 1.5-2l.8 1.8z" fill="currentColor" stroke="none" />
          </svg>
          <span>
            <small>WhatsApp</small>
            <b>{whatsapp.display}</b>
          </span>
        </a>
      </div>
      <div className="mt__mail">
        <span className="mt__mailtxt">{supportEmail}</span>
        <button type="button" onClick={copy} aria-live="polite" data-mt="copy">
          {copied ? "Copied" : "Copy email"}
        </button>
      </div>
      <div className="mt__social" aria-label="Follow us">
        <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="mt__soc" data-mt="instagram">
          {IG_ICON}
          <span>
            <b>Instagram</b>
            <small>{instagram.handle}</small>
          </span>
        </a>
        {tiktok.href ? (
          <a href={tiktok.href} target="_blank" rel="noopener noreferrer" className="mt__soc" data-mt="tiktok">
            {TT_ICON}
            <span>
              <b>TikTok</b>
              <small>{tiktok.handle}</small>
            </span>
          </a>
        ) : preview ? (
          <span className="mt__soc mt__soc--todo" data-mt="tiktok">
            {TT_ICON}
            <span>
              <b>TikTok</b>
              <small>Link to add</small>
            </span>
          </span>
        ) : null}
      </div>
    </section>
  );
}
