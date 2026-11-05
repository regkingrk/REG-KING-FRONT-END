/**
 * Content for the Information pages: finance providers, the REG KING story, the team and the FAQs.
 *
 * Sources (checked 25 Oct 2026):
 * - DVLA rules: gov.uk/personalised-vehicle-registration-numbers (keep-or-assign, take-private-number-off)
 *   and gov.uk/displaying-number-plates (rules-number-plates, getting-number-plates-made-up).
 * - Finance: klarna.com/uk/payments/pay-in-3, clearpay.co.uk/en-GB/how-it-works,
 *   paypal.com/uk (Pay in 3), fca.org.uk/consumers/buy-now-pay-later, REG KING's Payl8r wording.
 * - Story and team: from REG KING. Show Plates Ltd incorporated 20 July 2020 (Companies House 12756249).
 * Anything marked CONFIRM is REG KING's to check before launch.
 */

export const phone = { display: "01922 333451", tel: "+441922333451" };
/** WhatsApp, from REG KING's WhatsApp Business catalogue link (wa.me/c/447838371339). */
export const whatsapp = { display: "07838 371339", href: "https://wa.me/447838371339" };

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */
export type ProviderKey = "klarna" | "clearpay" | "paypal" | "payl8r";
export type Provider = {
  key: ProviderKey;
  name: string;
  tag: string;
  /** How a price splits: number of payments and how far apart (null = a finance agreement, see the example). */
  split: { parts: number; every: string; first: string } | null;
  points: string[];
  small: string;
  colour: string;
  ink: string;
};

export const PROVIDERS: Provider[] = [
  {
    key: "klarna",
    name: "Klarna",
    tag: "Pay in 3",
    split: { parts: 3, every: "every 30 days", first: "when your order ships" },
    points: [
      "Three interest-free payments, taken automatically every 30 days",
      "The first payment is taken when your order ships",
      "A soft credit check that doesn't affect your credit score",
      "No fees if you pay on time. A late fee can apply if a payment can't be collected",
    ],
    small: "Klarna Pay in 3: credit subject to status, UK residents 18+. Ts&Cs and late fees apply. Borrowing more than you can afford or paying late may affect your ability to get credit.",
    colour: "#ffa8cd",
    ink: "#17120f",
  },
  {
    key: "clearpay",
    name: "Clearpay",
    tag: "Pay in 4",
    split: { parts: 4, every: "over six weeks", first: "at checkout" },
    points: [
      "Four interest-free payments over six weeks",
      "Taken automatically from your debit or credit card",
      "Pay early at any time in the Clearpay app",
      "Late fees apply if you miss a payment, capped at £24 per order",
    ],
    small: "Clearpay credit subject to status. UK residents 18+ with a UK Visa or Mastercard. Use responsibly as late fees up to £24 per order apply.",
    colour: "#b2fce4",
    ink: "#0b0b0a",
  },
  {
    key: "paypal",
    name: "PayPal",
    tag: "Pay in 3",
    split: { parts: 3, every: "a month apart", first: "at checkout" },
    points: [
      "Three interest-free payments: one today, then one each month",
      "No sign-up fees and no late fees",
      "Pay with a debit card or your bank account",
      "PayPal decides how much you can spend when you check out",
    ],
    small: "PayPal Pay in 3 is a credit agreement. UK residents 18+, subject to status. Make sure you can afford the repayments: missed payments may make it harder or more expensive to borrow.",
    colour: "#ffd140",
    ink: "#003087",
  },
  {
    key: "payl8r",
    name: "Payl8r",
    tag: "Monthly finance",
    split: null,
    points: [
      "Spread the cost of bigger plates over monthly payments",
      "Apply online before you buy, or choose it at checkout",
      "Subject to a credit and affordability check",
      "Representative example: £460.00 over 12 months at 2.50% fixed per month. Representative APR 65.5%",
    ],
    small: "",
    colour: "#ffffff",
    ink: "#0b0b0a",
  },
];

/* ------------------------------------------------------------------ */
/* The REG KING story                                                  */
/* ------------------------------------------------------------------ */
export const STORY = [
  { year: "2017", title: "The side hustle", line: "REG KING started as a side hustle, dealing private plates around everything else." },
  { year: "2020", title: "Made it official", line: "REG KING became a registered business, and we started making plates ourselves." },
  {
    year: "2023",
    title: "Took regs to TikTok",
    line: "We went all in on social media and were one of the first, if not the first, to sell regs on TikTok, with a very different approach.",
  },
  { year: "2025", title: "Opened the doors", line: "August 2025: our first physical store opened, so customers could walk in and see their plates made." },
  {
    year: "2026",
    title: "The HQ",
    line: "One year in, we expanded further into the unit and made it our official HQ: office and admin, physical plates and wholesale, all under one roof.",
  },
] as const;

/** The HQ. Address from REG KING (28 Oct 2026). Opening hours: CONFIRM with REG KING before launch. */
export const HQ = {
  area: "Bilston, Wolverhampton",
  address: "48A Willenhall Road, Bilston, WV14 6NW" as string | null,
  lines: ["48A Willenhall Road", "Bilston", "WV14 6NW"],
  hours: null as { days: string; time: string }[] | null,
  does: ["Plates made while you wait", "Collect and fit", "Office and admin", "Wholesale and trade"],
  maps: "https://www.google.com/maps/search/?api=1&query=REG+KING+48A+Willenhall+Road+Bilston+WV14+6NW",
  directions: "https://www.google.com/maps/dir/?api=1&destination=48A+Willenhall+Road+Bilston+WV14+6NW",
  /** Google Maps embed, no key needed. */
  embed: "https://www.google.com/maps?q=48A+Willenhall+Road,+Bilston,+WV14+6NW&output=embed",
};

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */
export const TEAM = [
  { name: "Neyman", plate: "NEYMAN", role: "CEO and founder", line: "The guy who turned a hobby into a business." },
  { name: "Zubby", plate: "ZUBBY", role: "Social media face", line: "As seen across TikTok." },
  { name: "Nim", plate: "NIM", role: "The Admin", line: "Single-handedly runs the day-to-day back end of the business." },
  { name: "Shaz", plate: "SHAZ", role: "Physical plates specialist", line: "The first person you see when you walk in. Hopefully you won't want to walk back out." },
  { name: "Faizan", plate: "FAIZAN", role: "The new kid on the block", line: "The newest face at the HQ." },
] as const;

/* ------------------------------------------------------------------ */
/* FAQs                                                                */
/* ------------------------------------------------------------------ */
export type FaqTab = "buy" | "sell" | "dvla" | "docs" | "pay" | "plates" | "delivery" | "help";
export type Faq = { q: string; a: string };

/**
 * FAQs, by topic. Everything here is either how REG KING already works (as written elsewhere on the
 * site) or DVLA's published rules (GOV.UK and DVLA leaflet INF46, checked 28 Oct 2026).
 * Not included until REG KING confirms it: warranties or guarantees on plates, returns on made-to-order
 * plates beyond the refund policy, and opening hours.
 */
export const FAQS: Record<FaqTab, { label: string; line: string; items: Faq[] }> = {
  buy: {
    label: "Buying",
    line: "Choosing a registration and buying it from us.",
    items: [
      {
        q: "How do I buy a plate from REG KING?",
        a: "Find the plate, check it fits your vehicle's age, then pay in full, use finance, or reserve it with a 10% deposit. For plates we own, one of the team then calls you to set up your plates and documents, and we aim to have your order prepared within 24 hours.",
      },
      {
        q: "What's the difference between a REG KING plate and a customer plate?",
        a: "REG KING plates are our own stock, so it's a straight sale and physical plates are included. Customer plates belong to private sellers who list them through us. We act as the middleman, check the paperwork and hold the payment until the sale is complete.",
      },
      {
        q: "What if a customer plate has already sold?",
        a: "Customer plates are subject to the seller confirming. If one has already sold without the seller telling us, we let you know straight away and refund you in full.",
      },
      {
        q: "Why do I need to assign a customer plate within 48 hours?",
        a: "Registration scams and forged documents do exist. Assigning it to your vehicle within 48 hours of getting the documents proves it's genuine, and the seller's money stays with us until you confirm it's done.",
      },
      {
        q: "What is a dateless plate?",
        a: "A plate with no year identifier, like JCK 1. Because it doesn't show an age, it can go on a vehicle of any age.",
      },
      {
        q: "I don't have a car yet. Can I still buy a plate?",
        a: "Yes. We can put it onto a certificate of entitlement (V750) in your name, ready to go on a vehicle later. The certificate lasts 10 years and can be renewed.",
      },
      {
        q: "Can I buy a plate as a gift?",
        a: "Yes. Tell us who it's for and we'll put it in the right name. If it's going onto someone else's vehicle, they can be added as the nominee on the certificate.",
      },
      {
        q: "Can I make an offer?",
        a: "On customer plates, yes: send an offer from the plate's page and we pass it to the seller. Our own plates and DVLA plates have fixed prices, so offers aren't taken on those.",
      },
      {
        q: "Do I get physical plates with my registration?",
        a: "With registrations owned by REG KING, yes: physical plates are included at no extra cost, in standard, 3D, 4D or another style. With customer plates they aren't included, but you get our exclusive trade pricing on them.",
      },
      {
        q: "Can you help me find a plate that isn't on the site?",
        a: "Yes. Our plate sourcing service costs £9.99 for one name, word or phrase. We work on every request within 7 days and share what we find. If we can't find anything suitable, we refund the fee in full. Find it under Buy, in Plate sourcing.",
      },
      {
        q: "I've already agreed a sale. Can you finalise it for us?",
        a: "Yes. Our brokerage service is for buyers and sellers who've agreed a deal and want a reputable company to finalise it. Send us the details under Buy or Sell, in Brokerage, and we'll tell you our fee before anything is paid.",
      },
    ],
  },
  sell: {
    label: "Selling",
    line: "Listing your plate with us and getting it sold.",
    items: [
      {
        q: "How does selling with REG KING work?",
        a: "Enter your reg on the Sell tab, set a price (or ask for a valuation), and choose how you'd like to sell. We advertise the plate, handle the enquiries and take you through the transfer when it sells. We don't buy your plate; we sell it for you.",
      },
      {
        q: "What are the ways to sell?",
        a: "Increased price sale: you agree the amount you want to receive and we handle the sale. Commission sale: we take 10% when it sells.",
      },
      {
        q: "How much is my plate worth?",
        a: "Try the valuation tool on the Sell tab for a free guide price. It's a guide only, and a valuation from our team may differ.",
      },
      {
        q: "What paperwork do I need to sell?",
        a: "Proof you own the plate: the V5C logbook if it's on a vehicle, or the V750 or V778 if it's on a certificate. Plus photo ID. You can upload them from your account.",
      },
      {
        q: "Can I sell a plate that's on my car?",
        a: "Yes. It can be transferred straight from your car when it sells. If you're selling or scrapping the car first, take the plate off it (DVLA charges £80) and keep the V778 and new logbook, or you could lose the right to the number.",
      },
      {
        q: "The plate isn't in my name. Can I still sell it?",
        a: "You need to be the registered keeper of the vehicle or the person named on the certificate. If it's in someone else's name, they need to list it.",
      },
      { q: "Can I change my price or take my plate off sale?", a: "Yes, at any time from My listings in your account. You can also pause a listing." },
      {
        q: "How do offers work?",
        a: "When a buyer makes an offer, it appears in your account. You can accept, decline or send a counter offer, and we handle the rest.",
      },
      {
        q: "When do I get paid?",
        a: "We hold the buyer's payment while the sale goes through. Once the buyer has assigned the registration to their vehicle and we've checked it, the sale is complete and we release your payment.",
      },
      {
        q: "What happens when my plate sells?",
        a: "We contact you to confirm it's still available and arrange the documents. If the plate is on your vehicle, you'll need to take it off through DVLA first. Please tell us straight away if you sell it elsewhere, so we can take it off the site.",
      },
      { q: "How long will it take to sell?", a: "It depends on the plate and the price. Plates priced in line with the market sell faster, which is where a valuation helps." },
      { q: "Can I sell more than one plate?", a: "Yes. Add as many as you like from your account and manage them all in one place." },
    ],
  },
  dvla: {
    label: "DVLA",
    line: "New DVLA registrations, and moving a registration onto or off a vehicle.",
    items: [
      {
        q: "What is a DVLA registration?",
        a: "A registration the DVLA has never issued, so you'll be the first to own it. They show in our search results alongside our own plates.",
      },
      {
        q: "What do I get when I buy a DVLA registration?",
        a: "The DVLA issues a V750 certificate of entitlement. It shows the registration, the purchaser and any nominee, and when it needs renewing. It lasts 10 years and can be renewed for another 10. You can renew up to 28 days before it expires, and it must be renewed by the expiry date or the right to the registration is lost.",
      },
      {
        q: "Can I reserve a DVLA registration with a deposit?",
        a: "No. DVLA plates are open-market plates. The DVLA sells them to anyone, first come, first served, so we can't hold one for you. To make sure it's yours, buy it outright or with finance.",
      },
      {
        q: "How is a DVLA registration priced?",
        a: "It's the DVLA's own price plus our 10% service fee for buying it and handling the paperwork for you. Every DVLA plate page shows both, and the DVLA posts the V750 certificate in your name straight to you.",
      },
      {
        q: "Can I buy a DVLA registration as a gift?",
        a: "Yes. The certificate can name someone else as the nominee, and the registration can then be put on their vehicle. You can add or change the nominee until it's on a vehicle.",
      },
      {
        q: "Can I put any private plate on my car?",
        a: "Almost any, as long as it doesn't make the vehicle look newer than it is. For example, a plate with a 12 age identifier can't go on a car first registered before March 2012. Every plate page has a 'Will it fit my vehicle?' check.",
      },
      {
        q: "What does my vehicle need for a transfer?",
        a: "DVLA's rules: it must be registered in the UK, able to move under its own power, a type that needs an MOT or HGV test, available for inspection if DVLA asks, and taxed or SORN continuously for the past 5 years.",
      },
      {
        q: "How long does a transfer take?",
        a: "If DVLA doesn't need to inspect the vehicle, an online transfer is usually done straight away. The new V5C logbook showing the new number is posted to you and can take 4 to 6 weeks to arrive.",
      },
      {
        q: "What does DVLA charge?",
        a: "DVLA charges £80 to take a private number off a vehicle and keep it on a retention document. We'll tell you about any DVLA fee that applies to your order before you pay.",
      },
      {
        q: "What happens to my car's current number?",
        a: "Nothing is lost. When a private number comes off, DVLA usually puts the vehicle's original number back on it automatically.",
      },
      {
        q: "I'm selling my car. How do I keep my private plate?",
        a: "Take the number off the car before you sell or scrap it, and make sure you have the V778 retention document and the new logbook first. If the car goes before that, the number passes to the new keeper.",
      },
      {
        q: "Do I need to tell my insurer?",
        a: "Yes. Once the transfer is done, tell your insurer the new registration and send them the new logbook when it arrives.",
      },
      { q: "Can I put a private plate on a Q-plate vehicle?", a: "No. Numbers starting with Q or QNI can't be transferred and must stay on the vehicle, and DVLA doesn't allow private numbers on Q-plated vehicles." },
    ],
  },
  docs: {
    label: "Documents",
    line: "V5C, V750 and V778, and what we need from you.",
    items: [
      {
        q: "What's the difference between a V5C, V750 and V778?",
        a: "The V5C is your vehicle's logbook. A V750 is a certificate of entitlement for a number that has never been on a vehicle. A V778 is a retention document for a number that's been taken off a vehicle. The V750 and V778 both prove you have the right to use the number.",
      },
      {
        q: "How long do a V750 and V778 last?",
        a: "10 years. You can renew for another 10 years, applying up to 28 days before it runs out. If it expires, you lose the right to use the number, so keep an eye on the date.",
      },
      {
        q: "What is a nominee?",
        a: "The person whose vehicle the number will go on, if that's not you. They have no right to the number until it's assigned to their vehicle. You can add or change a nominee while the certificate is valid.",
      },
      {
        q: "What documents will I need when I buy?",
        a: "Your V5C logbook if the plate is going on a vehicle now, or just your name and address if it's going onto a certificate. For road legal number plates you'll also need photo ID.",
      },
      {
        q: "How will I get my documents?",
        a: "For plates we own, you choose: a scanned copy, the physical original, both, a new DVLA document with you as the nominee, or we help assign it straight to your vehicle.",
      },
      {
        q: "What do I need to get road legal plates made?",
        a: "By law we have to see proof of your name and address (a driving licence, a recent utility or council tax bill, or a bank statement) and proof you're entitled to the reg (V5C, the green new keeper slip, V750, V778 or a V11 reminder).",
      },
      {
        q: "Can I send my documents after I order?",
        a: "Yes. Upload them in the builder, or choose to send them after checkout. We make road legal plates once your documents are checked.",
      },
    ],
  },
  pay: {
    label: "Deposits & finance",
    line: "Reserving a plate and spreading the cost.",
    items: [
      {
        q: "Can I reserve a plate?",
        a: "Yes. Pay a 10% deposit and we hold the plate for an agreed period so nobody else can buy it. The deposit comes off the price, and you pay the balance within the agreed time. DVLA plates can't be reserved: they're open-market plates the DVLA sells first come, first served.",
      },
      {
        q: "Can I get my deposit back?",
        a: "No. Deposits are non-refundable, so if you decide not to go ahead, the deposit is kept. Please be sure before you reserve.",
      },
      {
        q: "Can I spread the cost?",
        a: "Yes. Klarna, Clearpay and PayPal let you split smaller amounts into interest-free payments, and Payl8r offers monthly finance on bigger plates. All are subject to status.",
      },
      {
        q: "Will applying for finance affect my credit score?",
        a: "Each provider runs its own checks, and their terms explain how. See the Finance page for the details and a representative example.",
      },
      {
        q: "Can I use finance on a customer plate?",
        a: "Ask the team before you buy and we'll tell you what's available for that plate.",
      },
    ],
  },
  plates: {
    label: "Physical plates",
    line: "Number plates, surrounds and logo plates made in Bilston.",
    items: [
      {
        q: "What's the difference between road legal and show plates?",
        a: "Road legal plates follow the BS AU 145e standard. Show plates have looks that aren't allowed on the road and are for display only. Fitting one on the road could get you fined up to £1,000 and your vehicle will fail its MOT.",
      },
      {
        q: "Are 3D and 4D plates legal?",
        a: "Yes. Raised (3D and 4D) characters are allowed on road legal plates, as long as the plate meets BS AU 145e and the characters are a single shade of black.",
      },
      {
        q: "Can I have a flag on my plate?",
        a: "On road legal plates you can have the Union flag, Cross of St George, Saltire or Red Dragon of Wales with the matching letters, and a green flash on zero-emission vehicles.",
      },
      { q: "What sizes do you make?", a: "Standard, hex, oversized, square and 4x4, Japanese and American import sizes, and motorbike plates. Smaller sizes only fit shorter regs." },
      { q: "Do you make motorbike plates?", a: "Yes. Motorbikes registered on or after 1 September 2001 show a plate at the rear only, with the number on two lines." },
      { q: "Do you make plates while I wait?", a: "Yes. Road legal, 3D, 4D and replacement plates are made while you wait at our Bilston HQ." },
      { q: "I need a replacement plate. What do I do?", a: "Order it like any other plate. The same documents are needed for road legal replacements." },
      { q: "Can you make plate surrounds?", a: "Yes. Standard black, or personalised framed and frameless surrounds in your colours, with your text or logo." },
      {
        q: "How do logo plates work?",
        a: "Choose printed or 4D, how many, upload your logo and pick delivery. We check every logo and send you a proof to approve before we make anything.",
      },
      { q: "Do account holders get a discount?", a: "Yes. Account holders get 5% off number plates, surrounds and logo plates." },
    ],
  },
  delivery: {
    label: "Delivery & fitting",
    line: "Getting your plates and documents to you.",
    items: [
      {
        q: "How quickly will my order be ready?",
        a: "We aim to prepare your order within 24 hours. If a new document is needed from DVLA, that can take up to 2 weeks, as DVLA advises.",
      },
      {
        q: "How is it delivered?",
        a: "We send you a photo of your finished plates first, then post your plates and documents by Royal Mail Special Delivery with tracking.",
      },
      { q: "Can I collect instead?", a: "Yes. Choose collection, or collect and fit, in the builder and pick them up from our Bilston HQ." },
      { q: "How much is delivery?", a: "The delivery cost is shown at checkout before you pay." },
      { q: "How do I fit my plates?", a: "Every order can include a free sticky pad kit or screw kit (usually £2.99). Or choose collect and fit, and we fit them for you." },
    ],
  },
  help: {
    label: "Help",
    line: "Getting hold of us and keeping track of things.",
    items: [
      {
        q: "How can I contact you?",
        a: "Call 01922 333451, email support@regking.co.uk, message us on WhatsApp, or use the contact form. You can also visit us at 48A Willenhall Road, Bilston, WV14 6NW.",
      },
      {
        q: "Where can I see my orders and listings?",
        a: "Sign in to your account to see your orders, documents, listings and offers in one place.",
      },
      {
        q: "Where are your policies?",
        a: "Our privacy policy, terms of service, refund policy and DVLA legal information are all on the Policies page.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */
export type ContactTopic = "buy" | "sell" | "make" | "other";
export const CONTACT_TOPICS: { key: ContactTopic; label: string; line: string; subs: { key: string; label: string; asks?: ("reg" | "order")[] }[] }[] = [
  {
    key: "buy",
    label: "Buying",
    line: "A plate on our site, or help finding one",
    subs: [
      { key: "plate", label: "A plate on your site", asks: ["reg"] },
      { key: "find", label: "Plate sourcing" },
      { key: "broker", label: "Brokerage", asks: ["reg"] },
      { key: "deposit", label: "Reserving with a deposit", asks: ["reg"] },
      { key: "finance", label: "Finance" },
      { key: "transfer", label: "My transfer", asks: ["reg", "order"] },
    ],
  },
  {
    key: "sell",
    label: "Selling",
    line: "Listing your plate, valuations and offers",
    subs: [
      { key: "list", label: "Listing my plate", asks: ["reg"] },
      { key: "value", label: "A valuation", asks: ["reg"] },
      { key: "offer", label: "An offer", asks: ["reg"] },
      { key: "listing", label: "My listing or payment", asks: ["reg"] },
      { key: "broker", label: "Brokerage", asks: ["reg"] },
    ],
  },
  {
    key: "make",
    label: "Making",
    line: "Plates, surrounds, logo plates and fitting",
    subs: [
      { key: "order", label: "An order I've placed", asks: ["order"] },
      { key: "docs", label: "Road legal documents", asks: ["order"] },
      { key: "custom", label: "A custom design or logo" },
      { key: "fit", label: "Fitting or collection" },
      { key: "trade", label: "Trade or wholesale" },
    ],
  },
  {
    key: "other",
    label: "Something else",
    line: "Feedback, partnerships or anything else",
    subs: [
      { key: "feedback", label: "Feedback" },
      { key: "partner", label: "Partnerships or press" },
      { key: "other", label: "Something else" },
    ],
  },
];
