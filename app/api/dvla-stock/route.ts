/**
 * GET /api/dvla-stock?q=KING          DVLA registrations containing KING (Buy > DVLA, search)
 * GET /api/dvla-stock?reg=AB12CDE     one plate, for its plate page (404 when it's gone)
 * GET /api/dvla-stock?reg=AB12CDE&fresh=1   the same, asked of the feed right now
 *
 * Only answers when DVLA_FEED is on and the feed is set up (lib/dvlaFeed.ts). Otherwise 503,
 * and the site simply doesn't show DVLA plates.
 */
import { NextResponse } from "next/server";
import { dvlaConfigured, findDvla, searchDvla } from "@/lib/dvlaFeed";
import { dvlaHandle } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!dvlaConfigured()) return NextResponse.json({ error: "DVLA registrations aren't available yet." }, { status: 503 });
  const p = new URL(req.url).searchParams;
  try {
    const reg = p.get("reg");
    if (reg) {
      const row = await findDvla(reg, p.get("fresh") === "1");
      if (!row) return NextResponse.json({ error: "This registration is no longer available from the DVLA." }, { status: 404 });
      return NextResponse.json({ reg: row.reg, price: row.price, dvlaPrice: row.dvlaPrice, handle: dvlaHandle(row.reg) }, { headers: { "Cache-Control": "no-store" } });
    }
    const rows = await searchDvla(p.get("q") ?? "");
    return NextResponse.json(
      rows.map((r) => ({ reg: r.reg, price: r.price, dvlaPrice: r.dvlaPrice, handle: dvlaHandle(r.reg) })),
      { headers: { "Cache-Control": "public, s-maxage=600" } },
    );
  } catch {
    return NextResponse.json({ error: "DVLA registrations aren't available right now." }, { status: 502 });
  }
}
