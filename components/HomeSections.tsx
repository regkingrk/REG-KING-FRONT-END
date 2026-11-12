import { linkFor } from "@/lib/routes";
import { SITEMAP } from "@/lib/sitemap";
import {
  auctionLots,
  faqs,
  formatGBP,
  instagram,
  COMPANY,
  payl8rDisclaimer,
  plateStyles,
  platesForSale,
  quickLinks,
  routes,
  sellSteps,
  supportEmail,
  tools,
} from "@/lib/brand";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { Carousel } from "./Carousel";
import { ArrowRight, InstagramIcon, ToolIcon } from "./Icons";
import { AuctionLots, SellForm } from "./Interactive";

/** The two core jobs, side by side. */
export function BuySellDoors() {
  return (
    <section className="rk-section rk-section--tight" aria-label="Buy or sell">
      <div className="rk-wrap rk-doors">
        <article className="rk-door rk-door--buy">
          <p className="rk-kicker">Buy</p>
          <h2 className="rk-door__title">Buy a private plate</h2>
          <p className="rk-door__line">Initials, names and dateless plates. Finance at checkout.</p>
          <div className="rk-door__plates" aria-hidden>
            {platesForSale.slice(0, 3).map((p) => (
              <span key={p.reg} className="rk-mini-plate">
                {p.reg}
              </span>
            ))}
          </div>
          <a className="rk-btn rk-btn--gold" href={routes.buy}>
            Browse plates <ArrowRight />
          </a>
        </article>

        <article className="rk-door rk-door--sell">
          <p className="rk-kicker">Sell</p>
          <h2 className="rk-door__title">Sell your plate</h2>
          <p className="rk-door__line">Enter the registration and we&apos;ll advertise it for you.</p>
          <SellForm />
        </article>
      </div>
    </section>
  );
}

/** Section heading with a quiet "view all" link on the right. */
function SectionHead({ id, title, href, link, tag }: { id: string; title: ReactNode; href: string; link: string; tag?: ReactNode }) {
  return (
    <div className="rk-shead">
      <h2 id={id} className="rk-shead__t">
        {title}
        {tag}
      </h2>
      <a className="rk-shead__link" href={href}>
        {link} <ArrowRight />
      </a>
    </div>
  );
}

export function PlatesForSale({ limit }: { limit?: number }) {
  return (
    <section className="rk-section rk-section--tight" aria-labelledby="plates-title">
      <div className="rk-wrap">
        <SectionHead id="plates-title" title="Plates for sale" href={routes.buy} link="View all" />
        <Carousel label="Plates for sale" className="rk-carousel--plates">
          {platesForSale.slice(0, limit ?? platesForSale.length).map((p) => (
            <a key={p.handle} className="rk-pcard" href={`${routes.buy}/products/${p.handle}`}>
              <span className="rk-card__plate">{p.reg}</span>
              <span className="rk-pcard__row">
                <span className="rk-pcard__price">{formatGBP(p.price, Number.isInteger(p.price))}</span>
                <span className="rk-pcard__go" aria-hidden>
                  <ArrowRight />
                </span>
              </span>
            </a>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

export function Auctions() {
  // No made-up lots: until real auctions are live, say so plainly.
  if (auctionLots.length === 0)
    return (
      <section id="auctions" className="rk-section rk-section--dark rk-section--tight" aria-labelledby="auctions-title">
        <div className="rk-wrap rk-noauc">
          <div>
            <h2 id="auctions-title" className="rk-shead__t">
              Auctions
            </h2>
            <p>No auctions are running right now.</p>
          </div>
          <a className="rk-btn rk-btn--gold" href={`${routes.contact}?enquiry=auctions`}>
            Get auction updates <ArrowRight />
          </a>
        </div>
      </section>
    );
  return (
    <section id="auctions" className="rk-section rk-section--dark rk-section--tight" aria-labelledby="auctions-title">
      <div className="rk-wrap">
        <SectionHead
          id="auctions-title"
          title={
            <>
              <span className="rk-live" aria-hidden /> Live auctions
            </>
          }
          href={routes.auctions}
          link="All auctions"
        />
        <AuctionLots />
      </div>
    </section>
  );
}

/** One tidy row of everything else, instead of separate tools / info sections. */
export function QuickLinks() {
  const links = [
    { key: "history", title: "Reg history check", href: routes.regHistory },
    { key: "viewer", title: "Plate viewer", href: routes.plateViewer },
    { key: "finance", title: "Finance", href: routes.finance },
  ];
  return (
    <nav id="tools" className="rk-section rk-section--tight rk-quicklinks" aria-label="More from REG KING">
      <div className="rk-wrap rk-tools">
        {links.map((t) => (
          <a key={t.key} className="rk-tool" href={t.href}>
            <span className="rk-tool__icon">
              <ToolIcon name={t.key} />
            </span>
            <span className="rk-tool__title">{t.title}</span>
            <ArrowRight className="rk-tool__arrow" />
          </a>
        ))}
      </div>
    </nav>
  );
}

/** @deprecated kept for other pages; the homepage uses QuickLinks. */
export const Tools = QuickLinks;

export function HowSelling() {
  return (
    <section className="rk-section rk-section--cream" aria-labelledby="how-title">
      <div className="rk-wrap rk-how">
        <div>
          <p className="rk-kicker">Sell</p>
          <h2 id="how-title" className="rk-h2">
            How selling works
          </h2>
          <a className="rk-btn rk-btn--ink" href={routes.sell}>
            List my plate <ArrowRight />
          </a>
        </div>
        <ol className="rk-steps">
          {sellSteps.map((s, i) => (
            <li key={s.title}>
              <span className="rk-steps__n">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.line}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PlateStyles() {
  return (
    <section className="rk-section" aria-labelledby="styles-title">
      <div className="rk-wrap">
        <div className="rk-section__head">
          <div>
            <p className="rk-kicker">Build</p>
            <h2 id="styles-title" className="rk-h2">
              Plates made while you wait
            </h2>
          </div>
          <a className="rk-btn rk-btn--ink" href={routes.build}>
            Make your plate <ArrowRight />
          </a>
        </div>
        <div className="rk-styles">
          {plateStyles.map((s) => (
            <figure key={s.key} className="rk-style">
              <span className={`rk-style__plate rk-style__plate--${s.key}`}>REG KING</span>
              <figcaption>
                <b>{s.name}</b> {s.line}
              </figcaption>
            </figure>
          ))}
        </div>
        <a className="rk-gallery-link" href={instagram.href}>
          <InstagramIcon /> See our latest work on Instagram <b>{instagram.handle}</b>
        </a>
      </div>
    </section>
  );
}

export function Finance() {
  return (
    <section className="rk-section rk-section--tight" aria-labelledby="finance-title">
      <div className="rk-wrap">
        <div className="rk-finance">
          <div>
            <p className="rk-kicker">Finance</p>
            <h2 id="finance-title" className="rk-h2">
              Spread the cost of your plate
            </h2>
            <p className="rk-finance__line">Payl8r finance at checkout, subject to status.</p>
          </div>
          <div className="rk-finance__example">
            <p className="rk-finance__label">Representative example</p>
            <p className="rk-finance__figure">
              £460.00 <span>over 12 months</span>
            </p>
            <p className="rk-finance__terms">2.50% fixed per month · Representative APR 65.5%</p>
            <a className="rk-btn rk-btn--ink" href={routes.financeApply}>
              Apply for finance <ArrowRight />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="rk-section" aria-labelledby="faq-title">
      <div className="rk-wrap rk-faq">
        <div>
          <p className="rk-kicker">FAQ</p>
          <h2 id="faq-title" className="rk-h2">
            Common questions
          </h2>
          <p className="rk-faq__more">
            Something else? Email <b>{supportEmail}</b> or message us on our socials.
          </p>
        </div>
        <div className="rk-faq__list">
          {faqs.map((f) => (
            <details key={f.q} className="rk-qa">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="rk-footer">
      <div className="rk-wrap">
        <div className="rk-footer__grid">
          <div>
            <a className="rk-footer__logo" href="/" aria-label="REG KING home">
              <BrandLogo />
            </a>
            <p>Need help? Email us or message us on our socials and one of the team will be in touch.</p>
            <p>
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
              <br />
              <a href={instagram.href}>{instagram.handle}</a>
            </p>
          </div>
          {SITEMAP.map((sec) => (
            <div key={sec.key}>
              <h4>
                <a href={linkFor(sec.key === "info" ? "info-about" : sec.hash)}>{sec.label}</a>
              </h4>
              <ul>
                {sec.items.map((it) => (
                  <li key={it.key}>
                    <a href={linkFor(it.hash)}>{it.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="rk-footer__small rk-footer__legal">{payl8rDisclaimer}</p>
        <div className="rk-footer__base">
          <span>
            © 2026 REG KING, a trading name of {COMPANY.legal} (company number {COMPANY.number}). DVLA registered number plate supplier, ref {COMPANY.dvlaRef}.
          </span>
          <span className="rk-pay" aria-label="Payment methods">
            {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", "PayPal", "Shop Pay", "Maestro"].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
