import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ContentPage";
import { isContentPage } from "@/lib/oldUrls";
import { getPage, shopifyConfigured } from "@/lib/shopify";

/**
 * REG KING's own pages from the old Shopify site, at the same address (/pages/plates-near-me).
 * Only the pages listed in lib/oldUrls.ts show here; the rest are redirected in next.config.ts.
 */
export const revalidate = 3600;

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (!isContentPage(handle)) return {};
  const page = await getPage(handle).catch(() => null);
  if (!page) return { title: "REG KING", robots: { index: false } };
  return {
    title: page.seoTitle || `${page.title} | REG KING`,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: `/pages/${handle}` },
  };
}

export default async function Page({ params }: Props) {
  const { handle } = await params;
  if (!isContentPage(handle)) notFound();
  // a live site must not show an empty page in place of one Google knows
  if (process.env.NODE_ENV === "production" && shopifyConfigured() && !(await getPage(handle).catch(() => null))) notFound();
  return <ContentPage handle={handle} />;
}
