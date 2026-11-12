import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteApp } from "@/components/SiteApp";
import { formatGBP } from "@/lib/brand";
import { plateByHandle } from "@/lib/plateLookup";
import { JsonLd, breadcrumbSchema, plateSchema } from "@/lib/schema";

/**
 * A plate's own page at the same address it had on the old Shopify site (/products/am12-aah),
 * so saved links and Google results keep working. It opens the site on that plate's page.
 * Products that aren't plates (Build Your Plate, accessories) are redirected in next.config.ts.
 */
export const revalidate = 3600;

type Props = { params: Promise<{ handle: string }> };
const valid = (h: string) => /^[a-z0-9-]{1,80}$/.test(h);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (!valid(handle)) return {};
  const plate = await plateByHandle(handle);
  if (!plate) return { title: "Plate not found | REG KING", robots: { index: false } };
  return {
    title: `${plate.reg} private number plate for sale | REG KING`,
    description: `${plate.reg} for sale at ${formatGBP(plate.price, Number.isInteger(plate.price))} from REG KING, DVLA registered. We handle the transfer for you.`,
    alternates: { canonical: `/products/${handle}` },
  };
}

export default async function PlatePage({ params }: Props) {
  const { handle } = await params;
  if (!valid(handle)) notFound();
  const plate = await plateByHandle(handle);
  return (
    <>
      {plate && <JsonLd data={plateSchema(plate.reg, handle, plate.price)} />}
      {plate && <JsonLd data={breadcrumbSchema([["Private number plates", "/private-number-plates"], [plate.reg, `/products/${handle}`]])} />}
      <SiteApp initial={`plate-${handle}`} />
    </>
  );
}
