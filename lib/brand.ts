/**
 * REG KING brand + homepage content.
 * Brand values extracted from the live theme at regking.co.uk (19 Oct 2026).
 * Redesign only: do not change the brand.
 *
 * Anything marked SAMPLE is placeholder content for the prototype and must be
 * replaced with live data (Shopify, Google reviews, auction backend) before launch.
 */

export const SHOP = "https://regking.co.uk";

export const colors = {
  black: "#000000", // --color-bg / --color-body
  yellow: "#FFC200", // --color-text, --color-btn-primary, meta theme-color
  yellowDeep: "#CC9B00", // --color-btn-primary-darker / focus
  white: "#FFFFFF", // --color-body-text
  ink: "#161514", // --color-text-field-text
  sale: "#F10C0C", // --color-sale-text
} as const;

export const slogan = "HELPING CROWN YOUR CAR";

/** Official artwork. Fetched into /public/brand by scripts/fetch-brand-assets.mjs */
export const assets = {
  wordmark: "/brand/regking-logo.png",
  roundel: "/brand/regking-roundel.png",
  /** Supply the official crown here (SVG or transparent PNG). */
  crown: "/brand/crown.png",
  /** Gold "R" occupies 0-212px of the supplied 540px wordmark. */
  markCrop: 212 / 540,
} as const;

/**
 * Site map. New pages are planned; until they exist, links point at the
 * matching homepage section or the current Shopify page.
 */
export const routes = {
  buy: `${SHOP}/collections/plates-for-sale`,
  sell: `${SHOP}/pages/se`,
  auctions: "#auctions",
  regHistory: "#tools",
  plateViewer: "#tools",
  build: `${SHOP}/products/build-your-own-number-plate`,
  accessories: `${SHOP}/collections/extras`,
  finance: `${SHOP}/pages/regking-finance`,
  financeApply: `${SHOP}/pages/apply-for-payl8r-finance`,
  faq: `${SHOP}/pages/contact-us`,
  trade: `${SHOP}/account/login`,
  wholesale: `${SHOP}/account/login`,
  ourWork: `${SHOP}/pages/standard-pagejiza6`,
  contact: `${SHOP}/pages/contact-us`,
  deposits: `${SHOP}/pages/plate-deposit5sjpk`,
  login: `${SHOP}/account/login`,
  cart: `${SHOP}/cart`,
} as const;

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const nav: NavItem[] = [
  { label: "Buy", href: "#buy" },
  { label: "Sell", href: "#sell" },
  { label: "Make", href: "#make" },
  { label: "Auctions", href: routes.auctions },
  {
    label: "More",
    href: "#",
    children: [
      { label: "Value a Plate", href: "#sell" },
      { label: "Reg History Check", href: routes.regHistory },
      { label: "Plate Viewer", href: routes.plateViewer },
      { label: "Accessories", href: routes.accessories },
      { label: "Finance", href: routes.finance },
      { label: "Our Work", href: routes.ourWork },
      { label: "FAQ", href: routes.faq },
      { label: "Deposits", href: routes.deposits },
      { label: "Contact Us", href: routes.contact },
    ],
  },
];

/**
 * Everything REG KING offers beyond Buy / Sell / Make, shown in the header's
 * "All features" panel so customers can see there's much more. Add new features here.
 */
export const features = [
  { key: "auctions", label: "Auctions", line: "REG KING plate auctions", href: routes.auctions, icon: "gavel" },
  { key: "value", label: "Value a plate", line: "Free guide price for your reg", href: "#sell", icon: "tag" },
  { key: "history", label: "Reg history check", line: "When it was issued and past prices", href: routes.regHistory, icon: "history" },
  { key: "viewer", label: "Plate viewer", line: "See a plate on your own car", href: routes.plateViewer, icon: "camera" },
  { key: "finance", label: "Finance", line: "Spread the cost with Payl8r", href: routes.finance, icon: "pound" },
  { key: "trade", label: "Trade & wholesale", line: "Accounts for dealers and traders", href: routes.trade, icon: "briefcase" },
  { key: "accessories", label: "Accessories", line: "Fixings, surrounds and extras", href: routes.accessories, icon: "wrench" },
  { key: "work", label: "Our work", line: "Plates we've made for customers", href: routes.ourWork, icon: "star" },
  { key: "deposits", label: "Deposits", line: "Reserve a plate with a deposit", href: routes.deposits, icon: "crown" },
  { key: "help", label: "FAQ & contact", line: "Questions? Talk to the team", href: routes.contact, icon: "user" },
] as const;

/** Hero search modes. */
export const searchModes = [
  {
    key: "buy",
    label: "Buy",
    placeholder: "SEARCH",
    lead: "Type a name, word or phrase and see what's available.",
    button: "Search plates",
    help: "Search for words, names and phrases.",
  },
  {
    key: "sell",
    label: "Sell",
    placeholder: "YOUR REG",
    lead: "Enter your plate below to start the selling process.",
    button: "List my plate",
    help: "We'll advertise it for you and manage the sale and transfer.",
  },
  {
    key: "build",
    label: "Make",
    placeholder: "YOUR REG",
    lead: "Enter your reg to start building your plates.",
    button: "Make my plate",
    help: "Road-legal and show plates, made to order and delivered to your door.",
  },
] as const;
export type SearchMode = (typeof searchModes)[number]["key"];

export const searchUrl = (reg: string) => `${SHOP}/search?type=product&q=${encodeURIComponent(reg.trim())}`;

/** Where each hero mode sends the visitor. */
export const modeUrl = (mode: SearchMode, reg: string, opts: { spec?: string } = {}) => {
  const q = encodeURIComponent(reg.trim());
  if (mode === "buy") return searchUrl(reg);
  if (mode === "build") return `${routes.build}?reg=${q}${opts.spec ? `&spec=${encodeURIComponent(opts.spec)}` : ""}`;
  return `${routes.sell}?reg=${q}&intent=${mode}`;
};

/** Trust points shown under the hero search (supplied by REG KING). */
export const trust = {
  reviews: "1000+",
  established: "2017",
};

export const suggestions = ["ARMAN", "KING", "786", "AR12 MXN"];

/** Snapshot of /collections/plates-for-sale. Wire to the Storefront API for production. */
export const platesForSale = [
  { reg: "AM12 RRA", price: 3999.96, handle: "am12-rra" },
  { reg: "AD12 RES", price: 3499.0, handle: "ad12-res" },
  { reg: "AM12 RXH", price: 3999.0, handle: "am12-rxh" },
  { reg: "A33 BDU", price: 2499.0, handle: "a33-bdu" },
  { reg: "B33 OYY", price: 2499.0, handle: "b33-oyy" },
  { reg: "C33 EOO", price: 2499.0, handle: "c33-eoo" },
  { reg: "D33 EBT", price: 2499.0, handle: "d33-ebt" },
  { reg: "E31 NVY", price: 2499.0, handle: "e31-nvy" },
] as const;

/**
 * Exclusive plates: the showroom at the top of Buy. Pick the regs from platesForSale that
 * REG KING wants to show off; the first is the one in the spotlight when the page opens.
 */
export const exclusivePlates: string[] = ["AM12 RRA", "AM12 RXH", "AD12 RES", "A33 BDU", "B33 OYY", "C33 EOO"];

/**
 * Customer reviews from REG KING's Trustpilot and Google profiles.
 *
 * At launch these load live from the official feeds (Trustpilot's TrustBox / Business API and
 * Google's Places API), which also show each review's full text with the required attribution.
 * The prototype lists real reviews (name, stars, date, where it was left) and links to each one;
 * review text is left empty here rather than copied, and fills in from the feed.
 * Never write or edit reviews by hand.
 */
export type ReviewSource = "Trustpilot" | "Google";
export type Review = { name: string; rating: 1 | 2 | 3 | 4 | 5; date: string; source: ReviewSource; url: string; text?: string };

export const TRUSTPILOT_URL = "https://www.trustpilot.com/review/regking.co.uk";
/** REG KING's Google Business Profile (from the owner's Maps share link, 12 Nov 2026; place 0xd35dbcc60d361ce1). */
export const GOOGLE_REVIEWS_URL: string | null = "https://maps.google.com/?cid=15230537073648082145";

/** Profile scores, checked 22 Oct 2026. Google's loads from the Places API at launch. */
export const reviewScores = {
  trustpilot: { score: 4.9, count: 71, label: "Excellent", url: TRUSTPILOT_URL },
  google: null as null | { score: number; count: number; url: string },
};

export const reviews: Review[] = [
  { name: "Saber", rating: 5, date: "11 Oct 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "Mustafa Ali", rating: 5, date: "9 Oct 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "Kardo Rawanduzy", rating: 5, date: "9 Oct 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "Ahmed Al-Hajaj", rating: 5, date: "25 Sep 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "Danyal Chapman", rating: 5, date: "25 Aug 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "LA", rating: 5, date: "30 Jul 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "Samara", rating: 5, date: "30 Jul 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
  { name: "Jasbinder Kaur", rating: 5, date: "29 Jul 2026", source: "Trustpilot", url: TRUSTPILOT_URL },
];
/** Where customers can read every review. */
export const reviewsLink: string | null = TRUSTPILOT_URL;

/**
 * Auction lots. Fill this from the auction system (real lots, real bids, real end times).
 * Never put made-up lots here: when it's empty the site says no auctions are running.
 */
export type AuctionLot = { reg: string; bid: number; bids: number; endsAt: string };
export const auctionLots: AuctionLot[] = [];

export const tools = [
  {
    key: "history",
    title: "Reg history check",
    line: "When the plate was issued, past sale prices and whether it's for sale.",
    cta: "Check a reg",
    href: routes.regHistory,
  },
  {
    key: "viewer",
    title: "Plate viewer",
    line: "See a plate on your own car before you buy. Upload a photo and try it.",
    cta: "Try it on your car",
    href: routes.plateViewer,
  },
  {
    key: "build",
    title: "Build a plate",
    line: "Legal, 3D gel, 4D and bevel show plates, made while you wait.",
    cta: "Start building",
    href: routes.build,
  },
] as const;

/** How selling works: REG KING advertises customers' plates for them (it doesn't buy them). */
export const sellSteps = [
  { title: "Enter your reg", line: "Type your plate on the Sell tab and tell us whether it's on a vehicle or a retention certificate." },
  { title: "Set your price", line: "Enter the price you want, or ask us to value it first. Valuations are free." },
  { title: "Choose how you sell", line: "An increased price sale or a commission sale. Pick what suits you." },
  { title: "Create your account", line: "Your account is where you manage your listings, add more plates and keep a wishlist." },
  { title: "We list it", line: "We check the details, then advertise your plate on REG KING." },
  { title: "It sells, you get paid", line: "When a buyer is found, we take you through the transfer and you get paid." },
] as const;

/** The two ways to sell. */
export const sellOptions = [
  {
    key: "uplift",
    title: "Increased price sale",
    line: "Agree the amount you want to receive, and we handle the sale.",
    fee: "You receive your agreed amount",
    details: {
      body: [
        "We agree your return with you, then advertise your registration at a higher price. Once the sale completes, you receive the agreed amount and REG KING keeps the difference.",
      ],
      example: "You want £1,000. We sell your registration for £1,200. You receive £1,000 and REG KING receives £200.",
      ideal: "Ideal if you want a clear, agreed return without a separate commission deduction.",
    },
  },
  {
    key: "commission",
    title: "Commission based, 10%",
    line: "Pay a commission when your registration sells.",
    fee: "10% when it sells",
    details: {
      body: ["We advertise your registration at an agreed price. When the sale completes, REG KING deducts a 10% commission and pays you the remaining 90%."],
      example: "Your registration sells for £1,000. Our commission is £100 and you receive £900.",
      ideal: "Ideal if you prefer our fee to be linked to the final selling price.",
    },
  },
] as const;
export type SellOption = (typeof sellOptions)[number]["key"];
/** Shown under the ways to sell. */
export const sellSmallPrint = "Figures are illustrative. Any transfer or assignment charges will be agreed separately. Advertising does not guarantee a sale.";

/** Plate finishes REG KING makes (from the current site's product range). */
export const plateStyles = [
  { key: "legal", name: "Legal", line: "Standard printed" },
  { key: "gel", name: "3D Gel", line: "Domed resin letters" },
  { key: "raised", name: "4D Raised", line: "Laser-cut acrylic" },
  { key: "bevel", name: "4D Bevel", line: "Chamfered edges" },
] as const;


/** FAQ: general answers. Have the team confirm the wording before launch. */
export const faqs = [
  {
    q: "Can I put any private plate on my car?",
    a: "Almost any, as long as it doesn't make the car look newer than it is. For example, a plate with a 12 age identifier can't go on a car first registered before March 2012. Dateless plates can go on any vehicle.",
  },
  {
    q: "What do I need to get road-legal plates made?",
    a: "By law we need to see proof you're entitled to the registration, such as the V5C logbook or a retention certificate, plus photo ID with your name and address.",
  },
  {
    q: "How do I sell my plate with REG KING?",
    a: "Choose Sell at the top of the page, enter your registration, set your price and pick how you'd like to sell. We advertise the plate for you, and when it sells we take you through the transfer.",
  },
  {
    q: "Can I pay for a plate with finance?",
    a: "Yes. Payl8r finance is available at checkout, subject to status. See the finance section for a representative example.",
  },
  {
    q: "Do you make plates while I wait?",
    a: "Yes. Legal, 3D, 4D, bevel and replacement plates are made while you wait at our Bilston, Wolverhampton site.",
  },
] as const;

export const quickLinks = [
  { label: "Contact us", href: `${SHOP}/pages/contact-us` },
  { label: "Refund Policy", href: `${SHOP}/policies/refund-policy` },
  { label: "Plate deposit", href: `${SHOP}/pages/plate-deposit5sjpk` },
  { label: "DVLA Legal Information", href: `${SHOP}/pages/legal-notice` },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Payl8r powered by Dopple", href: `${SHOP}/pages/payl8r-powered-by-dopple` },
];

export const supportEmail = "support@regking.co.uk";
/** Deposits (from regking.co.uk/pages/plate-deposit5sjpk): 10% of the plate's price, non-refundable, taken off the price. */
export const DEPOSIT_RATE = 0.1;
export const depositFor = (price: number) => Math.round(price * DEPOSIT_RATE * 100) / 100;

/** Account holders get this much off physical plates made by REG KING (plates, surrounds, logo plates). */
export const MEMBER_DISCOUNT = 0.05;
export const instagram = { handle: "@regking_", href: "https://www.instagram.com/regking_/" };
/** REG KING's TikTok (confirmed by REG KING, 12 Nov 2026). */
export const tiktok: { handle: string | null; href: string | null } = { handle: "@regking_", href: "https://www.tiktok.com/@regking_" };
/** The company behind REG KING, and its DVLA number plate supplier registration (both from REG KING, 12 Nov 2026). */
export const COMPANY = { legal: "SHOW PLATES LTD", number: "12756249", dvlaRef: "62709" };

export const payl8rDisclaimer =
  "Show Plates LTD is an Introducer Appointed Representative of Social Money Limited trading as Payl8r (Lender) and Dopple (Broker) who is authorised by the FCA under Ref. Number 675283. Credit is subject to creditworthiness and affordability assessments. Missed payments may affect your credit file, future borrowing and incur fees. Representative Example: £460.00 over 12 months at 2.50% fixed per month. Rep APR: 65.5%.";

export const formatGBP = (n: number, whole = false) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: whole ? 0 : 2,
    minimumFractionDigits: whole ? 0 : 2,
  }).format(n);

/** Normalise user input to DVLA-style characters: A-Z, 0-9, single spaces. */
export const normaliseReg = (v: string) =>
  v.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s{2,}/g, " ").slice(0, 8);

/**
 * Put the gap where a real plate has it, as the customer types (AX55HAA → AX55 HAA, K1NGS → K1 NGS).
 * Words and names with no numbers are left as typed.
 */
export function spaceReg(v: string): string {
  // a reg has at most 7 characters (the space doesn't count)
  let n = 0;
  let raw = "";
  for (const ch of normaliseReg(v)) {
    if (ch !== " ") n++;
    if (n > 7) break;
    raw += ch;
  }
  const c = raw.replace(/\s/g, "");
  let m;
  if ((m = c.match(/^([A-Z]{2}\d{2})([A-Z]{1,3})$/))) return `${m[1]} ${m[2]}`; // current: AX55 HAA
  if ((m = c.match(/^([A-Z]\d{1,3})([A-Z]{3})$/))) return `${m[1]} ${m[2]}`; // prefix: K1 NGS
  if ((m = c.match(/^([A-Z]{3})(\d{1,3}[A-Z])$/))) return `${m[1]} ${m[2]}`; // suffix: ABC 123D
  if ((m = c.match(/^([A-Z]{1,3})(\d{1,4})$/))) return `${m[1]} ${m[2]}`; // dateless: ABC 123
  if ((m = c.match(/^(\d{1,4})([A-Z]{1,3})$/))) return `${m[1]} ${m[2]}`; // dateless: 1 AB
  return raw;
}
