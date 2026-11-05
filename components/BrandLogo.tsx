"use client";

import { useState } from "react";
import { assets } from "@/lib/brand";

/**
 * Official REG KING wordmark. Never redrawn: if the brand file is missing
 * (run `npm run brand:fetch` or drop it into /public/brand) a neutral
 * placeholder frame is shown instead.
 */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <span className={`rk-logo-pending ${className ?? ""}`} role="img" aria-label="REG KING">
        Logo file
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={assets.wordmark}
      alt="REG KING"
      width={540}
      height={190}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={() => setMissing(true)}
    />
  );
}
