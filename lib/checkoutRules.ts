import { HQ } from "./infoContent";

/**
 * Delivery, from REG KING's current shipping policy on Shopify (standard £3.99, express £5.99,
 * free standard delivery over £50). Used by the checkout page and the checkout server, so the price
 * shown is the price charged. CONFIRM with REG KING before launch: that policy is from 2021.
 */
export const DELIVERY = [
  { key: "standard", name: "Standard delivery", line: "3 to 5 working days", price: 3.99 },
  { key: "express", name: "Express delivery", line: "1 to 3 working days", price: 5.99 },
  { key: "collect", name: "Collect from the HQ", line: HQ.lines.join(", "), price: 0 },
] as const;
export type DeliveryKey = (typeof DELIVERY)[number]["key"];
export const FREE_STANDARD_OVER = 50;
