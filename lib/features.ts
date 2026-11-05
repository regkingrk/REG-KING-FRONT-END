/**
 * Switches for features that depend on something not connected yet.
 *
 * DVLA_FEED: registrations the DVLA has never issued, sold through REG KING.
 *   Turns on the DVLA tab under Buy, DVLA plates in search and filters, DVLA plate pages
 *   (#plate-dvla-ab12cde) and DVLA checkout.
 *   Live data: lib/dvlaFeed.ts on the server, through /api/dvla-stock and /api/dvla-checkout.
 *   Until the feed is set up in the hosting settings, the live routes answer "not available yet"
 *   and no DVLA plates are shown. The preview shows SAMPLE DVLA plates, marked as samples.
 *   There is no public DVLA API for this stock: CONFIRM the source (dealer arrangement or licensed feed).
 */
export const DVLA_FEED = true;
