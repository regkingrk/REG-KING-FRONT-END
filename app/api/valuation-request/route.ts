/**
 * POST /api/valuation-request  { reg, name, email, phone, held?, note?, source?, website? }
 * "Value my plate": saves the request for the REG KING team (Supabase table valuation_requests,
 * see supabase/01_valuation_requests.sql). The team values the plate and contacts the customer.
 * Nothing is valued automatically. If saving fails the customer is told, never shown a false success.
 */
import { NextResponse } from "next/server";
import { insertRow, supabaseConfigured } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const clip = (x: unknown, max: number) => (typeof x === "string" ? x.trim().replace(/\s+/g, " ").slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFLINE = "We can't take valuation requests online just now. Call 01922 333451 or WhatsApp 07838 371339 with your reg and we'll value it for you.";

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
  }
  // Hidden field that people never see: if it's filled in, it's a bot. Answer as normal, save nothing.
  if (clip(b.website, 100)) return NextResponse.json({ ok: true, ref: "RK-V" });

  const reg = clip(b.reg, 10).toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  const name = clip(b.name, 80);
  const email = clip(b.email, 120).toLowerCase();
  const phone = clip(b.phone, 20);
  const held = ["vehicle", "retention", "unsure"].includes(String(b.held)) ? String(b.held) : null;
  const note = clip(b.note, 500) || null;
  const source = b.source === "account" ? "account" : "sell-page";

  if (reg.replace(/\s/g, "").length < 2 || reg.replace(/\s/g, "").length > 7) return NextResponse.json({ error: "Enter your registration." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Enter a phone number we can call." }, { status: 400 });

  if (!supabaseConfigured()) return NextResponse.json({ error: OFFLINE }, { status: 503 });
  const ref = `RK-V${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const saved = await insertRow("valuation_requests", { ref, reg, name, email, phone, held, note, source }).catch(() => false);
  if (!saved) return NextResponse.json({ error: OFFLINE }, { status: 502 });
  return NextResponse.json({ ok: true, ref });
}
