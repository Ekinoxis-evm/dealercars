import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { serverEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Mint a fresh Stripe onboarding link for a dealer.
 *
 * Account links expire after a few minutes and are single-use, so this cannot
 * be a URL stored anywhere — it has to be generated on demand.
 *
 * The connected account is created with the dealer as merchant of record:
 * `losses.payments = 'stripe'` so the dealer bears refunds and chargebacks,
 * `fees.payer = 'account'` so the dealer pays Stripe's fees, and
 * `requirement_collection = 'stripe'` so Stripe — not us — collects the KYC.
 * That last one matters: we do not want to be in the business of holding a
 * dealer's identity documents.
 *
 * ⚠️ Admin-only, and it must stay that way. Stripe onboarding is where a
 * connected account's payout bank account is set, so anyone who can mint a link
 * for a dealer id can point that dealer's payouts at their own bank and collect
 * every down payment made to them. That is why this is behind `requireAdmin`
 * and not behind ordinary member auth.
 *
 * Today the only dealer is our own entity, so "admin" and "the dealer" are the
 * same people. If a third-party dealer is ever onboarded, this needs per-dealer
 * authorization — an admin of dealer A must not be able to mint a link for
 * dealer B — rather than the single flat admin role it uses now.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const dealerId = typeof body?.dealerId === "string" ? body.dealerId : null;
  if (!dealerId) {
    return NextResponse.json({ error: "dealerId is required" }, { status: 400 });
  }

  const { data: dealer, error } = await supabaseAdmin()
    .from("dealers")
    .select("id, stripe_account_id, legal_name")
    .eq("id", dealerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!dealer) return NextResponse.json({ error: "No such dealer" }, { status: 404 });
  if (!dealer.stripe_account_id) {
    return NextResponse.json(
      {
        error:
          "This dealer has no Stripe account yet. Create the connected account first.",
      },
      { status: 409 }
    );
  }

  const link = await stripe().accountLinks.create({
    account: dealer.stripe_account_id,
    type: "account_onboarding",
    refresh_url: `${serverEnv.siteUrl}/dealer/onboarding?dealerId=${dealer.id}&refresh=1`,
    return_url: `${serverEnv.siteUrl}/dealer/onboarding?dealerId=${dealer.id}&done=1`,
  });

  return NextResponse.json({ url: link.url, expiresAt: link.expires_at });
}
