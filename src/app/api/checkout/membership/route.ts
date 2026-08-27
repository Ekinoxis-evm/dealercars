import { NextResponse } from "next/server";
import { requireMember, Unauthorized, unauthorizedResponse } from "@/lib/auth";
import { createMembershipCheckout } from "@/lib/stripe";

/**
 * Start the membership subscription. PLATFORM account — this is our own
 * software revenue and is the one payment in the system that is not the
 * dealer's. It buys access to the Monday auction drop; it is not part of the
 * price of any car and must never be presented as one.
 */
export async function POST(request: Request) {
  let member;
  try {
    member = await requireMember(request);
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }

  if (member.membershipStatus === "active" || member.membershipStatus === "trialing") {
    return NextResponse.json(
      { error: "This membership is already active." },
      { status: 409 }
    );
  }

  const session = await createMembershipCheckout({
    profileId: member.id,
    privyDid: member.privyDid,
    email: member.email,
    stripeCustomerId: member.stripeCustomerId,
  });

  return NextResponse.json({ url: session.url });
}
