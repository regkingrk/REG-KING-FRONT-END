"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { examplesFor } from "@/lib/examples";

/**
 * "See real ones": a small button that opens photos of plates REG KING has actually made.
 * Renders nothing when there are no photos for this product yet.
 */
export function RealPhotos({ k, label, className = "", compact = false }: { k: string; label: string; className?: string; compact?: boolean }) {
  const photos = examplesFor(k);
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <button
        type="button"
        className={`rk-real${compact ? " rk-real--icon" : ""} ${className}`}
        onClick={() => setOpen(0)}
        aria-haspopup="dialog"
        aria-label={compact ? `${label} (${photos.length} photos)` : undefined}
        title={compact ? label : undefined}
        data-real={k}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M21 16l-5-5-8 8" />
        </svg>
        {!compact && label}
        <span className="rk-real__n">{photos.length}</span>
      </button>
      {/* rendered on the page body, so no transformed parent can trap the full-screen viewer */}
      {open !== null && createPortal(<Viewer photos={photos} start={open} title={label} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}

function Viewer({ photos, start, title, onClose }: { photos: { src: string; alt: string }[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const close = useRef<HTMLButtonElement>(null);
  const n = photos.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
      back?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const p = photos[i];
  return (
    <div className="rk-realv" role="dialog" aria-modal="true" aria-label={title} onClick={onClose} data-real-viewer>
      <div className="rk-realv__in" onClick={(e) => e.stopPropagation()}>
        <div className="rk-realv__bar">
          <span>
            Made by REG KING{n > 1 ? ` (${i + 1} of ${n})` : ""}
          </span>
          <button ref={close} type="button" className="rk-realv__x" onClick={onClose} aria-label="Close photos" data-real-close>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <figure className="rk-realv__fig">
          <img src={p.src} alt={p.alt} />
          <figcaption>{p.alt}</figcaption>
        </figure>
        {n > 1 && (
          <div className="rk-realv__nav">
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" data-real-prev>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <div className="rk-realv__thumbs">
              {photos.map((t, j) => (
                <button key={t.src} type="button" aria-label={`Photo ${j + 1}`} aria-current={j === i} onClick={() => setI(j)}>
                  <img src={t.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" data-real-next>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
