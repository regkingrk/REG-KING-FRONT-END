import { getPage } from "@/lib/shopify";
import { safeHtml } from "@/lib/safeHtml";
import { SiteFooter } from "./HomeSections";
import { MakeProvider } from "./MakeProvider";
import { ModeProvider } from "./ModeProvider";
import { SiteHeader } from "./SiteHeader";

/**
 * One of REG KING's own pages from Shopify (local search pages, guides, policies) in the site's
 * design. The text is the shop's own, loaded live; nothing here is written for it.
 */
export async function ContentPage({ handle }: { handle: string }) {
  const page = await getPage(handle);
  return (
    <ModeProvider standalone>
      <MakeProvider>
        <SiteHeader />
        <main className="rk-policy" data-content-page={handle}>
          <div className="rk-wrap rk-policy__in">
            {page ? (
              <>
                <h1 className="rk-policy__t">{page.title}</h1>
                <div className="rk-policy__body" dangerouslySetInnerHTML={{ __html: safeHtml(page.body) }} />
              </>
            ) : (
              <>
                <h1 className="rk-policy__t">Page not available</h1>
                <p className="rk-policy__missing">This page shows once the site is connected to Shopify.</p>
              </>
            )}
          </div>
        </main>
        <SiteFooter />
      </MakeProvider>
    </ModeProvider>
  );
}
