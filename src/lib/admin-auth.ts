import "server-only";
import { supabaseAdmin } from "./supabase";
import { accessTokenFrom, verifiedDid } from "./privy-server";

/**
 * Who may write inventory.
 *
 * This used to be a shared bearer secret (DEALER_ADMIN_TOKEN), which was a
 * reasonable guard for a single curl-only endpoint and is not a reasonable
 * guard for a UI somebody signs into every day. A shared secret cannot be
 * revoked for one person, cannot say who changed a price, and ends up pasted
 * into a browser console because that is the only way to use it.
 *
 * So admin access is a row in `admins`, keyed by Privy DID — the same verified
 * identity the member routes use. There is deliberately no route that grants
 * it: a self-service path to inventory write access is the thing we are
 * defending against. The first admin is inserted by hand (see 0003).
 *
 * What this protects is not cosmetic. These routes set the retail price of a
 * car and flip a listing to `available`, which is the state in which the
 * down-payment route will take a member's money against it.
 */
export interface AdminIdentity {
  privyDid: string;
  label: string;
}

export type AdminCheck =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; response: Response };

export async function requireAdmin(request: Request): Promise<AdminCheck> {
  const did = await verifiedDid(accessTokenFrom(request));
  if (!did) {
    return { ok: false, response: Response.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin()
    .from("admins")
    .select("privy_did, label")
    .eq("privy_did", did)
    .maybeSingle();

  // A database error here must not read as "authorized". Fail closed and say
  // as little as possible about why.
  if (error || !data) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, admin: { privyDid: data.privy_did, label: data.label } };
}
