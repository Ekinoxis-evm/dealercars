import "server-only";
import { supabaseAdmin } from "./supabase";
import { accessTokenFrom, verifiedDid, verifiedEmail } from "./privy-server";

/**
 * Who may write inventory, edit the dealer, and add other admins.
 *
 * This used to be a shared bearer secret (DEALER_ADMIN_TOKEN), which was a
 * reasonable guard for a single curl-only endpoint and is not a reasonable
 * guard for a UI somebody signs into every day. A shared secret cannot be
 * revoked for one person, cannot say who changed a price, and ends up pasted
 * into a browser console because that is the only way to use it.
 *
 * So admin access is a row in `admins`. At request time the identity that is
 * trusted is the Privy DID — the same verified identity the member routes use.
 * A row may also be created ahead of time with only an EMAIL (an invitation,
 * added from the admin screen); the first time a Privy session whose verified
 * email matches signs in, the DID is bound to that row here and it behaves
 * like any other admin from then on. The email is honoured only because Privy
 * has verified it — a client-supplied email would be attacker input.
 *
 * What this protects is not cosmetic. These routes set the retail price of a
 * car and flip a listing to `available`, which is the state in which the
 * down-payment route will take a member's money against it.
 */
export interface AdminIdentity {
  id: string;
  privyDid: string;
  label: string;
}

export type AdminCheck =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; response: Response };

const forbidden = () =>
  ({ ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) }) as const;

export async function requireAdmin(request: Request): Promise<AdminCheck> {
  const did = await verifiedDid(accessTokenFrom(request));
  if (!did) {
    return { ok: false, response: Response.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admins")
    .select("id, privy_did, label")
    .eq("privy_did", did)
    .maybeSingle();

  // A database error here must not read as "authorized". Fail closed and say
  // as little as possible about why.
  if (error) return forbidden();
  if (data) return { ok: true, admin: { id: data.id, privyDid: data.privy_did, label: data.label } };

  // No row for this DID. Is there an invitation for the verified email?
  const email = await verifiedEmail(did);
  if (!email) return forbidden();

  const { data: bound, error: bindError } = await db
    .from("admins")
    .update({ privy_did: did, bound_at: new Date().toISOString() })
    .eq("email", email)
    .is("privy_did", null)
    .select("id, privy_did, label")
    .maybeSingle();

  if (bindError || !bound) return forbidden();
  return { ok: true, admin: { id: bound.id, privyDid: bound.privy_did, label: bound.label } };
}
