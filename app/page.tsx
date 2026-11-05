import { HeroIntro } from "@/components/HeroIntro";
import { SiteFooter } from "@/components/HomeSections";
import { MakeProvider } from "@/components/MakeProvider";
import { AccountProvider } from "@/components/AccountProvider";
import { ModeProvider } from "@/components/ModeProvider";
import { ScrollMotion } from "@/components/ScrollMotion";
import { SiteHeader } from "@/components/SiteHeader";
import { TabViews } from "@/components/TabViews";
import { PlateFilters } from "@/components/PlateFilters";

/**
 * Homepage: the Buy / Sell / Make tabs in the hero decide what shows below.
 * Buy → plates for sale, auctions, buying tools. Sell → value a plate, how
 * selling works. Make → the plate builder, finishes, delivery or collection.
 * Each tab has its own link: #buy, #sell, #make.
 */
export default function Home() {
  return (
    <ModeProvider>
      <AccountProvider>
      <MakeProvider>
      <SiteHeader />
      <main>
        <HeroIntro />
        <TabViews />
      </main>
      <SiteFooter />
      <ScrollMotion />
      <PlateFilters />
      </MakeProvider>
      </AccountProvider>
    </ModeProvider>
  );
}
