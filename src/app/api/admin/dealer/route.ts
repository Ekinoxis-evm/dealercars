import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadDealer } from "@/lib/dealer-store";
import { OPERATING_DEALER_ID } from "@/lib/dealers";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * The dealer as the member sees it: trading name, address, WhatsApp, socials.
 *
 * Everything the public site shows about the business is a column on the
 * dealer row, and this is where the operator edits it. What is NOT editable
 * here, on purpose: the licence numbers and their verification dates, and the
 * Stripe flags. Those gate whether money may be taken; they are set by the
 * verification process and the `account.updated` webhook, not typed in.
 *
 * Today the only dealer is our own entity, so this reads and writes
 * OPERATING_DEALER_ID and nothing else. A second dealer needs per-dealer
 * authorization before this route takes an id.
 */

const WHATSAPP_RE = /^[1-9][0-9]{7,14}$/;
const URL_RE = /^https:\/\/[^\s]+$/;

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const dealer = await loadDealer(OPERATING_DEALER_ID);
  if (!dealer) return NextResponse.json({ error: "No dealer is configured." }, { status: 404 });
  return NextResponse.json({ dealer });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  }

  const errors: string[] = [];
  const patch: Record<string, string | null> = {};
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

  // Required text: present in the body means "set it", and it may not be blank.
  for (const [key, column] of [
    ["legalName", "legal_name"],
    ["city", "city"],
  ] as const) {
    const v = text(body[key]);
    if (v === undefined) continue;
    if (!v) errors.push(`${key} may not be blank.`);
    else patch[column] = v;
  }

  // Optional text: blank clears it.
  for (const [key, column] of [
    ["dbaName", "dba_name"],
    ["streetAddress", "street_address"],
    ["postalCode", "postal_code"],
  ] as const) {
    const v = text(body[key]);
    if (v === undefined) continue;
    patch[column] = v || null;
  }

  const state = text(body.state);
  if (state !== undefined) {
    if (!/^[A-Za-z]{2}$/.test(state)) errors.push("state must be a two-letter code.");
    else patch.state = state.toUpperCase();
  }

  // WhatsApp arrives however a human typed it and is stored the way wa.me
  // needs it — digits only, country code first. See migration 0006.
  const whatsapp = text(body.whatsapp);
  if (whatsapp !== undefined) {
    const digits = whatsapp.replace(/\D/g, "");
    if (!digits) patch.whatsapp = null;
    else if (!WHATSAPP_RE.test(digits)) {
      errors.push("whatsapp must be a full number with country code, e.g. 1 407 555 1234.");
    } else patch.whatsapp = digits;
  }

  for (const [key, column] of [
    ["instagramUrl", "instagram_url"],
    ["facebookUrl", "facebook_url"],
    ["tiktokUrl", "tiktok_url"],
  ] as const) {
    const v = text(body[key]);
    if (v === undefined) continue;
    if (!v) patch[column] = null;
    else if (!URL_RE.test(v)) errors.push(`${key} must be a full https:// link.`);
    else patch[column] = v;
  }

  const timeZone = text(body.timeZone);
  if (timeZone !== undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
      patch.time_zone = timeZone;
    } catch {
      errors.push("timeZone must be an IANA zone, e.g. America/New_York.");
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: "Those details could not be saved.", reasons: errors }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("dealers")
    .update(patch)
    .eq("id", OPERATING_DEALER_ID);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dealer = await loadDealer(OPERATING_DEALER_ID);
  return NextResponse.json({ dealer });
}
