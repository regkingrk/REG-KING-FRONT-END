import { getPolicy, type PolicyKey } from "@/lib/shopify";
import { SiteFooter } from "./HomeSections";
import { ModeProvider } from "./ModeProvider";
import { SiteHeader } from "./SiteHeader";

/**
 * Privacy policy / terms page. The text comes from the shop's own policies in Shopify,
 * so the legal wording is REG KING's, never written here.
 * A production build stops if the policy can't be loaded: the site must not launch without it.
 */
export async function PolicyPage({ policy, title }: { policy: PolicyKey; title: string }) {
  const p = await getPolicy(policy);
  if (!p && process.env.NODE_ENV === "production") {
    throw new Error(`${title} is missing. Connect Shopify (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN) and fill it in under Settings > Policies before launch.`);
  }
  return (
    <ModeProvider>
      <SiteHeader />
      <main className="rk-policy">
        <div className="rk-wrap rk-policy__in">
          <h1 className="rk-policy__t">{p?.title ?? title}</h1>
          {p ? (
            // Policy HTML is written by the shop owner in Shopify admin.
            <div className="rk-policy__body" dangerouslySetInnerHTML={{ __html: p.body }} />
          ) : (
            <p className="rk-policy__missing">
              Development only: this page shows the {title.toLowerCase()} from Shopify once the store is connected.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </ModeProvider>
  );
}
