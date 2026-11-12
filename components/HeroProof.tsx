"use client";

import type { ReactNode } from "react";
import { GOOGLE_REVIEWS_URL, instagram, reviewScores, tiktok } from "@/lib/brand";
import { HQ } from "@/lib/infoContent";
import { StarIcon } from "./Icons";

/**
 * One slim line along the bottom of the hero: Google and Trustpilot, then where we're seen online.
 * Real scores only. Google's score shows once its profile is added (lib/brand.ts).
 */
export function HeroProof() {
  const tp = reviewScores.trustpilot;
  const g = reviewScores.google;
  return (
    <div className="rk-proof" id="rk-trust" data-after>
      <ProofLink className="rk-proof__item" href={g?.url ?? GOOGLE_REVIEWS_URL} label={g ? `${g.score} out of 5 from ${g.count} Google reviews` : "Our Google reviews"}>
        <GoogleG />
        <span className="rk-proof__text">
          {g ? (
            <>
              <b>{g.score.toFixed(1)}</b> <span className="rk-proof__wide">Google</span>
            </>
          ) : (
            <b>Google reviews</b>
          )}
        </span>
      </ProofLink>
      <ProofLink className="rk-proof__item" href={tp.url} label={`${tp.label}, ${tp.score} out of 5 from ${tp.count} reviews on Trustpilot`}>
        <span className="rk-proof__tpstars" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i}>
              <StarIcon />
            </i>
          ))}
        </span>
        <span className="rk-proof__text" aria-hidden>
          <b>{tp.score}</b> <span className="rk-proof__wide">Trustpilot · {tp.count} reviews</span>
        </span>
      </ProofLink>
      <ProofLink className="rk-proof__item rk-proof__where" href={HQ.directions} label={`Our showroom: ${HQ.address}. Get directions.`}>
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden fill="currentColor">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
        <span className="rk-proof__text">
          <b>Bilston</b> <span className="rk-proof__wide">showroom</span>
        </span>
      </ProofLink>
      <span className="rk-proof__rule" aria-hidden />
      <span className="rk-proof__label">As seen online</span>
      <ProofLink className="rk-proof__social" href={tiktok.href} label={`TikTok${tiktok.handle ? ` ${tiktok.handle}` : ""}`}>
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
          <path
            fill="currentColor"
            d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          />
        </svg>
      </ProofLink>
      <ProofLink className="rk-proof__social" href={instagram.href} label={`Instagram ${instagram.handle}`}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </ProofLink>
    </div>
  );
}

/** A link when we have the address, plain (non-clickable) when we don't yet, so nothing points nowhere. */
function ProofLink({ href, className, label, children }: { href: string | null | undefined; className: string; label: string; children: ReactNode }) {
  return href ? (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  ) : (
    <span className={className} role="img" aria-label={label}>
      {children}
    </span>
  );
}

export function GoogleG({ className = "rk-proof__g" }: { className?: string } = {}) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="20" height="20" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
