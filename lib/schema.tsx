import { COMPANY, GOOGLE_REVIEWS_URL, TRUSTPILOT_URL, instagram, supportEmail, tiktok } from "./brand";
import { HQ, phone } from "./infoContent";
import { SITE_URL } from "./routes";

/**
 * Structured data (schema.org JSON-LD) so search engines and AI search read REG KING's facts
 * correctly. Only facts REG KING has given us go here: no ratings or reviews (Google ignores
 * self-written review stars on a business's own site, and marking them up can count against it),
 * no stock levels we can't vouch for.
 */
const ORG_ID = `${SITE_URL}/#organization`;
const STORE_ID = `${SITE_URL}/#store`;

export function siteSchema() {
  const sameAs = [instagram.href, tiktok.href, TRUSTPILOT_URL, GOOGLE_REVIEWS_URL].filter((u): u is string => !!u);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "REG KING",
        legalName: COMPANY.legal,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/brand/regking-logo.png`,
        email: supportEmail,
        telephone: phone.tel,
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "REG KING",
        url: `${SITE_URL}/`,
        publisher: { "@id": ORG_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/private-number-plates?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "AutoPartsStore",
        "@id": STORE_ID,
        name: "REG KING",
        parentOrganization: { "@id": ORG_ID },
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/brand/regking-logo.png`,
        telephone: phone.tel,
        email: supportEmail,
        address: {
          "@type": "PostalAddress",
          streetAddress: "48a Willenhall Rd, Willenhall",
          addressLocality: "Bilston",
          postalCode: "WV14 6NW",
          addressCountry: "GB",
        },
        geo: { "@type": "GeoCoordinates", latitude: HQ.geo.lat, longitude: HQ.geo.lon },
        hasMap: HQ.maps,
        openingHoursSpecification: HQ.hoursSpec.map((h) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: h.days.map((d) => `https://schema.org/${d}`),
          opens: h.opens,
          closes: h.closes,
        })),
        sameAs,
      },
    ],
  };
}

/** Breadcrumbs for a page: [name, path] from the homepage down. */
export function breadcrumbSchema(trail: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as [string, string], ...trail].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}

/** A registration for sale. No availability claim: a plate can sell between page builds. */
export function plateSchema(reg: string, handle: string, price: number) {
  const url = `${SITE_URL}/products/${handle}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${reg} private number plate`,
    description: `The registration ${reg}, for sale from REG KING. We handle the DVLA transfer for you.`,
    url,
    category: "Private number plates",
    offers: {
      "@type": "Offer",
      url,
      price: price.toFixed(2),
      priceCurrency: "GBP",
      seller: { "@id": ORG_ID },
    },
  };
}

/** Puts JSON-LD into the page. `<` is escaped so no text in the data can close the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
