# REG KING: homepage prototype

Redesign of regking.co.uk's homepage with a cinematic 3D intro. **Redesign, not a rebrand:** colours, typeface, slogan, navigation and logo are taken from the live site unchanged.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  (add ?intro to replay the intro)
```

`npm run dev` and `npm run build` first run `scripts/fetch-brand-assets.mjs`, which downloads the official artwork from regking.co.uk into `public/brand/` if it is not already there. The supplied `regking-logo.png` is kept as-is.

## Brand (extracted from the live Shopify theme)

| Token | Value | Theme source |
|---|---|---|
| Background | `#000000` | `--color-bg` |
| REG KING yellow | `#FFC200` | `--color-text`, `--color-btn-primary`, theme-color |
| Yellow, darker | `#CC9B00` | `--color-btn-primary-darker` |
| Body text | `#FFFFFF` | `--color-body-text` |
| Field text | `#161514` | `--color-text-field-text` |
| Sale | `#F10C0C` | `--color-sale-text` |
| Typeface | Oswald 400/500/600/700 | `--font-stack-body/header` |

## Intro (≈3.9s, skippable)

1. Black. A gold light streak cuts across; the gold **R** from the official wordmark dissolves in under moving light, extruded in 3D, over a reflective floor. If `public/brand/crown.png` (or `.svg`) exists, the crown is used here.
2. The full wordmark completes with a metallic sheen, with HELPING CROWN YOUR CAR beneath it.
3. The logo flies into the black header's logo slot while the black lifts like a curtain onto the yellow hero. The 3D logo hands off to the real header image pixel-for-pixel and the WebGL layer is released.
4. The white plate search tilts up and S-E-A-R-C-H is pressed onto it one letter at a time.
5. The letters lift away, leaving SEARCH as the plate's placeholder, ready to type (focused on desktop); the search bar, suggestions and trust cards rise in.

Skip with the button, Esc, Enter, a click, scroll or swipe. Plays once per session (`sessionStorage`; add `?intro` to replay), never plays with *reduced motion*, and falls back to the normal page if WebGL is unavailable. A tiny inline script decides before first paint, so the hero never flashes before the intro.

## Homepage

The Buy · Sell · Make tabs in the hero decide what shows below it (`components/ModeProvider.tsx`, `components/TabViews.tsx`). Each tab has its own colour, wiping out from the plate when you switch (Buy yellow, Sell white, Make black), and its own link, so it can be shared: `#buy`, `#sell`, `#make` (the header's Buy / Sell / Make links switch tabs and show which is active).

- **Buy** (default): plates for sale carousel, auctions (real lots from `auctionLots` in `lib/brand.ts`; when empty it says no auctions are running), quick links (Reg history check, Plate viewer, Finance, Trade & wholesale)
- **Sell**: Value a plate (guide price form), how selling works in three steps, "Looking to buy a plate instead?"
- **Make**: the plate builder opens in the hero; below it, what we make (finishes) and delivery or collection, "Looking for a private plate instead?"

Both carousels (`components/Carousel.tsx`) swipe natively, move on one card every few seconds, loop, and pause while hovered, touched, focused or off-screen (and never auto-move with reduced motion).

The trust cards (1000+ 5-star reviews, As seen online, Est. 2017) sit in the hero on Buy and Sell. Other sections (reviews, finance, trade portals, FAQ) are kept in `components/HomeSections.tsx` for their own pages.

## v2: motion version

This folder is a copy of the v24 site with two additions. The v24 site is kept unchanged in `regking-web-v24-final`.

- **Background (`components/PlateField.tsx`)**: registrations drift slowly upward in three layers of depth behind the hero. Every few seconds one plate shuffles its characters and settles on a real REG KING plate. Colours follow the tab (ink on yellow for Buy, light on white for Sell, gold on black for Make). Plates are spaced so they don't pile up and fade towards the middle so the search stays clear. No mouse tracking; it pauses off screen and in hidden tabs, and shows one still frame with reduced motion.
- **Scroll (`components/ScrollMotion.tsx`)**: on the home view the hero content drifts up and shrinks slightly as you scroll away, with a light fade near the end; the background plates move at different speeds for depth. Sections below rise in as they arrive, their parts one after another, once. Search results, the sell form, the find-it form and the refine panel never move. Content is only hidden once the script runs, and everything is off with reduced motion.

## House rules (never break these)

The site must not look vibe-coded. Never use:

- purple gradients, pill-shaped buttons (corners are 6 to 12px; only number plates keep their real rounded corners), emoji icons (icons are drawn SVGs), em dashes
- fake reviews, fake metrics, fake customer counters, made-up discounts or made-up auction lots
- vague hero text, AI slop copy, AI slop photos, cursor animations, over-the-top scroll or looping animations

Copy says plainly what a thing does. If a claim can't be backed up, it doesn't go on the site.

`npm run prelaunch` checks the code for these (plus broken CSS, which makes browsers drop the rest of the stylesheet).

## Launch checklist (we do not launch until all of these are done)

`LAUNCH=1 npm run build` runs `npm run prelaunch` first and stops the build if anything here is missing.

1. **Custom domain** connected (regking.co.uk points at the new site). Set `SITE_URL=https://regking.co.uk` in the hosting environment.
2. **Favicon**: done. `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, built from the official logo file by `npm run favicons`.
3. **No "Made with AI" tag**: none in the code. Check the hosting plan doesn't add a badge (some builders and free tiers do) and remove it in the host's settings.
4. **Privacy policy page** at `/privacy-policy` and **terms and conditions page** at `/terms-of-service`. The text is REG KING's own, loaded from Shopify (Settings > Policies) through the Storefront API, so set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_TOKEN`. A production build fails if either policy is empty. The footer links to both.
5. **No sample content**: remove the sample search plates (see Before launch) and the "Prototype" note.

## Moving regking.co.uk to this site (headless Shopify)

Shopify keeps running the shop (products, stock, checkout, payments, orders). This site is the shop front, hosted on Vercel. Nothing goes live until the domain is switched.

**Settings in Vercel** (Project > Settings > Environment Variables, never in the code):

| Name | What it is |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | `reg-king.myshopify.com` |
| `SHOPIFY_STOREFRONT_TOKEN` | From the Headless sales channel in Shopify admin |
| `SHOPIFY_ADMIN_TOKEN` | From a custom app (Settings > Apps > Develop apps), for orders and sold prices |
| `SITE_URL` | `https://regking.co.uk` |

**Products** must be published to the **Headless** sales channel, or the site can't see them (Products > select all > Include in sales channels > Headless).

**Plates are read from Shopify at every build** (`scripts/sync-shop.mjs`, run by `npm run build`): Exclusive (£15,000 and over), REG KING stock (tag `regking-stock`), customer plates, New this week (added in the last 7 days), search and valuations. Sold plates drop out. Listings held back until fixed are in `lib/data/shop-rules.json`. If Shopify can't be read, the build stops and the live site stays as it is. Without the Shopify settings (the preview) the saved October copy is used. To refresh the lists, rebuild: set a Vercel deploy hook and call it from Shopify Flow when a product changes, or on a schedule. The checkout always checks a plate is still for sale, live, before taking payment.

**Old addresses keep working** (`lib/oldUrls.ts`): plates stay at `/products/<handle>`, REG KING's written pages stay at `/pages/<handle>` (wording loaded live from Shopify), everything else has a permanent redirect. Re-check the list against the store before launch.

## Header (one bar, fixed to the top)

The header never moves when the page scrolls (`position: fixed`; the body is padded by `--rk-top-h`). It holds only:

- the logo,
- **Buy / Sell / Make**, each in its own colour when selected (Buy yellow, Sell white, Make black), which is the only set of tabs on the page,
- **More**, which opens a panel with Search plates, Account, Basket and Trade login, then every feature from `features` in `lib/brand.ts` (Auctions, Value a plate, Reg history check, Plate viewer, Finance, Trade & wholesale, Accessories, Our work, Deposits, FAQ & contact). Add new features there.

Desktop: one row. Phones: logo and More on top, Buy / Sell / Make full width underneath, still one bar.

## Focused mode (after a customer commits)

Once a customer searches (Buy), enters their reg (Sell) or opens the builder (Make), the big hero steps aside.

What each tab shows:

- **Buy**: the results, with a bar under the header holding a search field for a new search, sort, saved, refine and clear. Clearing brings the hero back.
- **Sell**: an on-page sell form: get an offer or value it first, where the plate is now (on a vehicle / V5C, on a retention certificate V750 or V778, not sure), optional asking price, name and phone or email. It hands off to the sell page with everything filled in.
- **Make**: only the plate (live preview) and the builder.
- Switching tabs keeps each tab's progress. A shared `?q=` link opens straight into the results and skips the intro.

`focused` lives in `components/ModeProvider.tsx`; the header switch is in `components/SiteHeader.tsx` (with `ModeSwitch` from `components/ModeDock.tsx`). Anything that sticks under the header offsets by `--rk-top-h`.

## Search results (Buy tab)

Searching on the Buy tab opens the results right under the hero (`components/SearchResults.tsx`, `lib/search.ts`), laid out like the DVLA and Regtransfers lists but in REG KING's style. The link updates to `?q=JACK#buy`, so a search can be shared.

- **Sticky bar**: the search as a plate, number of plates, order by (best match / price), Saved (hearted plates), Refine, clear
- **Refine** (sidebar on desktop, bottom sheet on phones): *Fits my vehicle* (year registered: hides plates that would make the vehicle look newer), style (Dateless, Current, Prefix, Suffix with counts), price, and show plates as rear (yellow) or front (white)
- **Three sources, merged**: REG KING stock, customer plates (sold through REG KING) and DVLA plates. **REG KING stock always comes first**, in its own gold-edged section at the top, whatever order or filter is chosen. Customer and DVLA plates follow in the style groups. Every row is tagged with its source, and Refine has a "From" filter.
- **Top picks**: the three closest matches (shown only when REG KING has no matching stock)
- **Grouped by style**, best-matching style first, 4 per style then "View 8 more in this style". Jump chips scroll to each style.
- **Each row**: plate, price (sale price with was-price and % off), a five-bar match meter (Exact / Close / Similar), the oldest vehicle it fits, save, Buy, and More: make an offer, text me the details, enquire
- **Not listed, but worth asking about**: valid spellings not in the list, one tap to ask us to check
- **Can't see the one you want?**: reg plus phone number, "Find it for me"

## Plate builder (Make tab)

The site's job is to sell physical plates online, delivered, with collection from the shop as an option. Road-legal orders need the customer's ID and proof of entitlement (GOV.UK says the supplier must see originals; confirm the online process before launch).

Tapping **Make** flips the hero plate to its rear and opens a step-by-step builder modelled on the REG KING workshop tool, one step open at a time (finished steps fold to a line with "Change"):

1. **Vehicle**: "Car or van" or "Motorbike". Car or van offers car plate and metal press styles and car sizes; Motorbike offers bike & specialty styles and bike sizes, is a single two-line rear plate (no set/side steps) and drops the surround extra.
2. **Plate type**: "Road legal plate" (with an info panel: what makes a plate road legal and the ID / entitlement documents we need, from GOV.UK) or "Show sign" (warning triangle; not for road use, up to £1,000 fine and MOT fail). Road legal hides extras that break the rules (tinted, faded, badges).
3. Set or single, then front or rear (Car/Van only)
4. Style: tiles showing the customer's reg in each finish, with retail price
5. Size: common sizes first, the rest under "More sizes"
6. Extras (optional), then "Continue"
7. Delivery: deliver to me, collect from the Bilston shop, or collect & fit (fitting price from the workshop list); delivery cost is added at checkout

Plates are drawn flat and clean like REG KING's own artwork (white front, glossy yellow rear, Barlow Condensed characters); 3D/4D styles add depth. Once a vehicle is picked, a live preview of the plate(s) and running price pins to the top of the builder while the customer works through the steps; a finished set also shows both plates. The total uses **retail** prices from `lib/builder.ts` (trade prices are never shown; anything unpriced says "Price on request"). "Continue" hands off to the current Build Your Plate page with the reg and a summary of the spec.

## Files

- `lib/intro/createIntro.ts`: framework-agnostic intro engine (Three.js + GSAP injected)
- `lib/brand.ts`: tokens, routes, nav, search modes, trust points, plates snapshot, auction lots (empty until real ones exist), features list, FAQ, Payl8r disclaimer
- `lib/search.ts`: stock matching, ways-to-spell-it ideas, price bands. STOCK mixes real plates with entries marked `sample: true`; `searchAll` adds generated SAMPLE plates so any search fills the page, plus style detection and vehicle-age rules
- `lib/builder.ts`: plate builder options, vehicle filtering, retail prices and pricing logic
- `components/`: header, hero + plate search, plate builder, homepage sections, client widgets
- `app/globals.css`: all styling
- `preview/`: builds the single-file live preview (server-rendered first paint, then the real React components mounted in the page): `node preview/build.mjs`

## Before launch

- Have the team confirm the FAQ answers. Fill `auctionLots` in `lib/brand.ts` from the auction system once auctions run (never with made-up lots).
- The trust points (1000+ 5-star reviews, Est. 2017) must match what customers can check, so link the review count to its source (for example your Google reviews).
- Value, Auctions, Reg history, Plate viewer, Trade and Wholesale link to homepage sections until their pages are built (`routes` in `lib/brand.ts`).

- Swap the `platesForSale` snapshot for Shopify Storefront API data.
- Search sources (`Source` in `lib/search.ts`): connect REG KING stock (Shopify Storefront API), customer plates (wherever customer listings are kept) and the DVLA feed, each mapped to `{ reg, price, handle?, source }`. Call the DVLA server-side so keys stay private, and cache results. Keep `rankResults` so REG KING stays first. Confirm what DVLA access and terms you have before relying on it.
- Search results: in `lib/search.ts`, remove the `sample: true` plates, the `samplePlates()` generator and the prototype step that labels two samples as REG KING stock, and load the full Shopify stock (Storefront API) so every plate is searchable. Buy opens the Shopify product page. Saved plates live in the browser for now; tie them to customer accounts.
- Make an offer, Text me details, Enquire, "Find it for me" and the ask-about plates go to the contact page with `?enquiry=offer|text|question|find&reg=…` (plus `offer` or `phone`); wire these into the enquiry form or inbox.
- A larger or SVG master of the wordmark will look sharper on high-DPI screens (the supplied PNG is 540px wide).
