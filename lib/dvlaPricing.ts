/**
 * How REG KING prices a DVLA registration: the DVLA's price plus REG KING's service fee.
 * Used on the server (lib/dvlaFeed.ts) and in the browser (plate pages), so both always agree.
 * CONFIRM with REG KING: the rate, and whether a minimum fee applies.
 */
export const DVLA_FEE_RATE = 0.1;

const pence = (n: number) => Math.round(n * 100) / 100;
export const dvlaFee = (dvlaPrice: number) => pence(dvlaPrice * DVLA_FEE_RATE);
export const dvlaTotal = (dvlaPrice: number) => pence(dvlaPrice + dvlaFee(dvlaPrice));

/** Why DVLA plates can't be reserved. Shown on DVLA plate pages, the deposit page and the FAQs. */
export const DVLA_NO_DEPOSIT =
  "DVLA plates are open-market plates. The DVLA sells them to anyone, first come, first served, so we can't hold one for you. To make sure it's yours, buy it outright or with finance.";
