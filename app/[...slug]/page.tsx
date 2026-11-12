import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteApp } from "@/components/SiteApp";
import { ACC_PRODUCTS } from "@/lib/accessoryShop";
import { crumbsFor, hashForPath, routeForPath } from "@/lib/routes";
import { JsonLd, breadcrumbSchema } from "@/lib/schema";

/**
 * Every section's own address (/number-plates, /sell-my-number-plate, /about...), rendered on the
 * server opened at that part of the site, so search engines see each as its own page.
 * The list lives in lib/routes.ts. Anything else here is a 404.
 */
type Props = { params: Promise<{ slug: string[] }> };
const pathOf = (slug: string[]) => `/${slug.map((s) => s.toLowerCase()).join("/")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = pathOf((await params).slug);
  const r = routeForPath(path);
  if (r) return { title: r.title, description: r.description, alternates: { canonical: r.path }, openGraph: { title: r.title, description: r.description, url: r.path }, ...(r.index ? {} : { robots: { index: false } }) };
  const item = path.match(/^\/accessories\/products\/([a-z0-9-]+)$/);
  const p = item ? ACC_PRODUCTS.find((a) => a.key === item[1] && !a.builder) : null;
  if (p) {
    const title = `${p.name} | Number Plate Accessories | REG KING`;
    return { title, description: p.line, alternates: { canonical: path }, openGraph: { title, description: p.line, url: path } };
  }
  return {};
}

export default async function SectionPage({ params }: Props) {
  const path = pathOf((await params).slug);
  const hash = hashForPath(path);
  const item = path.match(/^\/accessories\/products\/([a-z0-9-]+)$/);
  if (!hash || (item && !ACC_PRODUCTS.some((a) => a.key === item[1] && !a.builder))) notFound();
  const product = item ? ACC_PRODUCTS.find((a) => a.key === item[1]) : null;
  const trail = product ? [...crumbsFor("/accessories"), [product.name, path] as [string, string]] : crumbsFor(path);
  return (
    <>
      {trail.length > 0 && <JsonLd data={breadcrumbSchema(trail)} />}
      <SiteApp initial={hash} />
    </>
  );
}
