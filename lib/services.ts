/**
 * Paid services REG KING offers alongside a plate.
 */

/**
 * Plate Assignment Management: REG KING handles the whole process from start to finish,
 * including assigning the plate onto the customer's vehicle.
 * Offered on DVLA plates and customer plates (REG KING's own plates already include the transfer).
 * CONFIRM: a Shopify product for it, so it can go through checkout as its own line.
 */
export const ASSIGN = {
  name: "Plate Assignment Management",
  price: 29.99,
  line: "We handle the whole process from start to finish, including assigning the plate onto your vehicle.",
  without: "Without it, you assign the plate to your vehicle yourself on GOV.UK.",
};

/** What the 10% service fee on a DVLA plate covers. CONFIRM with REG KING. */
export const DVLA_FEE_COVERS = [
  "We buy the registration from the DVLA for you.",
  "We buy it in your name, so the DVLA posts the V750 certificate straight to you.",
  "You can pay in full or spread the cost with finance.",
  "Help from our team by phone, WhatsApp or email at every step.",
];

/**
 * Plate sourcing: the existing Shopify product "Plate source request" (handle source-request), £9.99.
 * Terms are copied from that product's description on regking.co.uk.
 */
export const SOURCING = {
  handle: "source-request",
  price: 9.99,
  terms: [
    "One name, word or phrase per request.",
    "We can't promise every request will turn up a plate.",
    "If we can't find anything suitable, we refund the sourcing fee in full.",
    "There's no refund if we find options but you don't like them.",
  ],
};

/**
 * Brokerage: for a sale that's already agreed, where the buyer, the seller or both want a
 * reputable company to finalise it. £149.99, told to the customer only after they send the details,
 * not shown on the page.
 * CONFIRM with REG KING: who pays (buyer, seller or split) and whether REG KING holds the money.
 */
export const BROKERAGE = {
  price: 149.99,
  terms: [
    "For a sale you've already agreed. If you're still looking for a buyer, list your plate with us instead.",
    "Send us the details and we'll tell you our fee. Nothing to pay until we've spoken.",
    "Either the buyer or the seller can ask us, or both of you together.",
  ],
};
