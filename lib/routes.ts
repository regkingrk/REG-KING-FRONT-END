/**
 * Real web addresses for every part of the site (approved 12 Nov 2026, Task 7). Search engines don't
 * index # links, so each tab and page has its own address that the server renders on its own:
 * /number-plates, /sell-my-number-plate, /private-number-plates/exclusive...
 *
 * Inside the site the parts are still named by their # link (#make-plates); these helpers convert
 * between the two. Old # links keep working and are swapped for the real address in the browser.
 */
/** The homepage title (also used in app/layout.tsx). */
export const HOME_TITLE = "Number Plates Near Me | 3D, 4D & Legal Plates | REG KING";

export type RouteMeta = { path: string; hash: string; title: string; description: string; /** in the sitemap and open to search engines */ index: boolean };

export const ROUTES: RouteMeta[] = [
  // Buy: private registrations
  { hash: "buy", path: "/private-number-plates", index: true, title: "Private Number Plates for Sale | Private Registrations | REG KING", description: "Search private number plates from REG KING's own stock and our customers. We handle the DVLA transfer for you. Bilston, West Midlands, selling across the UK." },
  { hash: "buy-exclusive", path: "/private-number-plates/exclusive", index: true, title: "Exclusive Private Number Plates | REG KING", description: "REG KING's rarest private registrations: short, dateless and standout plates, with the DVLA transfer handled for you." },
  { hash: "buy-regking", path: "/private-number-plates/reg-king-stock", index: true, title: "Private Plates Owned by REG KING | Ready to Transfer", description: "Private registrations owned by REG KING, ready to transfer to your vehicle or onto a retention certificate." },
  { hash: "buy-customer", path: "/private-number-plates/customer-plates", index: true, title: "Customer Private Plates for Sale | REG KING", description: "Private registrations our customers are selling through REG KING. We look after the sale and the DVLA transfer." },
  { hash: "buy-sourcing", path: "/private-number-plates/sourcing", index: true, title: "Private Plate Sourcing: Find a Specific Registration | REG KING", description: "Tell us the registration you're after and REG KING will search for it on your behalf." },
  { hash: "buy-brokerage", path: "/private-number-plates/brokerage", index: true, title: "Private Plate Brokerage for Buyers | REG KING", description: "Agreed a private plate sale with someone else? REG KING can finalise the deal and the DVLA transfer for you." },
  // Sell
  { hash: "sell", path: "/sell-my-number-plate", index: true, title: "Sell My Private Number Plate | REG KING", description: "Sell your private registration through REG KING. List it with us and reach buyers across the UK, with the transfer handled for you." },
  { hash: "sell-valuation", path: "/sell-my-number-plate/valuation", index: true, title: "Value My Private Number Plate | REG KING", description: "Find out what your private registration could be worth. Send us your registration and the REG KING team will review it." },
  { hash: "sell-increased", path: "/sell-my-number-plate/increased-price", index: true, title: "Sell Your Plate for Your Asking Price | REG KING", description: "List your private registration with REG KING and receive the price you ask for." },
  { hash: "sell-commission", path: "/sell-my-number-plate/commission", index: true, title: "Sell Your Private Plate on Commission | REG KING", description: "Sell your private registration through REG KING on a commission basis." },
  { hash: "sell-brokerage", path: "/sell-my-number-plate/brokerage", index: true, title: "Private Plate Brokerage for Sellers | REG KING", description: "Found a buyer for your private plate? REG KING can finalise the sale and the DVLA transfer." },
  // Make: physical number plates
  { hash: "make", path: "/number-plates", index: true, title: "Number Plates Made in Bilston | Legal, 3D Gel & 4D Plates | REG KING", description: "Build your number plates online and see them live, or have them made while you wait at our Bilston shop near Wolverhampton and Walsall." },
  // Accessories
  { hash: "accessories", path: "/accessories", index: true, title: "Number Plate Accessories | REG KING", description: "Plate surrounds, logo plates, fitting kits and mounting kits from REG KING." },
  { hash: "accessories-surrounds", path: "/accessories/number-plate-surrounds", index: true, title: "Custom Number Plate Surrounds | REG KING", description: "Framed or frameless number plate surrounds in gloss or matt, with your own design. See it live before you order." },
  { hash: "accessories-logo", path: "/accessories/logo-plates", index: true, title: "Logo Plates: Printed or 4D Acrylic | REG KING", description: "Your own logo on a plate, printed flat or laser cut in raised 4D acrylic." },
  { hash: "accessories-fixings", path: "/accessories/fitting-and-fixings", index: true, title: "Number Plate Fitting Kits & Fixings | REG KING", description: "Number plate fitting kits, sticky pads and screws." },
  { hash: "accessories-mounting", path: "/accessories/mounting-kits", index: true, title: "Number Plate Mounting Kits | REG KING", description: "Number plate clips and magnet mounting kits." },
  // Information
  { hash: "info-about", path: "/about", index: true, title: "About REG KING | Number Plate Specialists Since 2017", description: "From two registrations bought with a first paycheque to a showroom in Bilston: the REG KING story." },
  { hash: "info-contact", path: "/contact", index: true, title: "Contact REG KING | 48a Willenhall Rd, Bilston", description: "Visit, call or message REG KING. Opening hours, directions and contact details for our Bilston showroom." },
  { hash: "info-faqs", path: "/faqs", index: true, title: "Number Plate & Private Registration FAQs | REG KING", description: "Answers to common questions about number plates, private registrations, transfers and ordering from REG KING." },
  { hash: "info-deposits", path: "/deposits", index: true, title: "Reserve a Private Plate with a Deposit | REG KING", description: "How plate deposits work at REG KING." },
  { hash: "info-finance", path: "/finance", index: true, title: "Spread the Cost with Payl8r | REG KING", description: "Finance options for private registrations at REG KING, through Payl8r." },
  { hash: "info-policies", path: "/policies", index: true, title: "Policies | REG KING", description: "REG KING's privacy, terms, refund and shipping policies." },
  { hash: "info-gallery", path: "/gallery", index: true, title: "Gallery: Plates We've Made | REG KING", description: "Number plates, surrounds and private registrations from the REG KING workshop." },
];

const byHash = new Map(ROUTES.map((r) => [r.hash, r]));
const byPath = new Map(ROUTES.map((r) => [r.path, r]));
/** Section names that are the same page as another (the Information section opens About). */
const ALIAS: Record<string, string> = { info: "info-about", "make-plates": "make", "make-surrounds": "accessories-surrounds", "make-logo": "accessories-logo", value: "sell-valuation" };

/** A single accessory's page: #accessories-item-screws ⇄ /accessories/products/screws */
const ITEM_HASH = /^accessories-item-([a-z0-9-]+)$/;
const ITEM_PATH = /^\/accessories\/products\/([a-z0-9-]+)$/;

/** The real address for a # link (null: it has none, e.g. checkout or the account area). */
export function pathForHash(hash: string): string | null {
  const h = ALIAS[hash.replace(/^#/, "").toLowerCase()] ?? hash.replace(/^#/, "").toLowerCase();
  const item = h.match(ITEM_HASH);
  if (item) return `/accessories/products/${item[1]}`;
  return byHash.get(h)?.path ?? null;
}

/** The # link for a real address (null: not one of these). */
export function hashForPath(path: string): string | null {
  const p = path.replace(/\/+$/, "").toLowerCase() || "/";
  const item = p.match(ITEM_PATH);
  if (item) return `accessories-item-${item[1]}`;
  return byPath.get(p)?.hash ?? null;
}

export const routeForPath = (path: string) => byPath.get(path.replace(/\/+$/, "").toLowerCase());
export const SITE_URL = "https://regking.co.uk";

/**
 * The href for a link to part of the site: its real address, so search engines can follow it
 * (the site still opens it in place). The single-file preview has no addresses, so it keeps # links.
 */
export function linkFor(hash: string): string {
  const h = hash.replace(/^#/, "");
  if (typeof window !== "undefined" && (window as { __RK_PREVIEW?: boolean }).__RK_PREVIEW) return `#${h}`;
  return pathForHash(h) ?? `/#${h}`;
}

/** Short page names, for breadcrumbs. */
const NAMES: Record<string, string> = {
  buy: "Private number plates", "buy-exclusive": "Exclusive", "buy-regking": "REG KING stock", "buy-customer": "Customer plates",
  "buy-sourcing": "Sourcing", "buy-brokerage": "Brokerage", sell: "Sell my number plate", "sell-valuation": "Valuation",
  "sell-increased": "Increased price", "sell-commission": "Commission", "sell-brokerage": "Brokerage", make: "Number plates",
  accessories: "Accessories", "accessories-surrounds": "Number plate surrounds", "accessories-logo": "Logo plates",
  "accessories-fixings": "Fitting and fixings", "accessories-mounting": "Mounting kits", "info-about": "About", "info-contact": "Contact",
  "info-faqs": "FAQs", "info-deposits": "Deposits", "info-finance": "Finance", "info-policies": "Policies", "info-gallery": "Gallery",
};

/** The breadcrumb trail [name, path] for a section address, from its top section down. */
export function crumbsFor(path: string): [string, string][] {
  const parts = path.split("/").filter(Boolean);
  const out: [string, string][] = [];
  for (let i = 1; i <= parts.length; i++) {
    const r = routeForPath(`/${parts.slice(0, i).join("/")}`);
    if (r && NAMES[r.hash]) out.push([NAMES[r.hash], r.path]);
  }
  return out;
}
