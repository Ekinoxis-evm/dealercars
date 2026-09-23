import "server-only";
import { supabaseAdmin } from "./supabase";
import { sessionEmail, sessionUser } from "./session";

/**
 * Who may write inventory, edit the dealer, and add other admins.
 *
 * Admin access is a row in `admins`. At request time the identity that is
 * trusted is the Supabase Auth user on the session — the same verified
 * identity the member routes use. A row may also be created ahead of time
 * with only an EMAIL (an invitation, added from the admin screen); the first
 * time a session whose verified email matches signs in, the user id is bound
 * to that row here and it behaves like any other admin from then on. The
 * email is honoured only because Supabase verified it at sign-in — a
 * client-supplied email would be attacker input.
 *
 * What this protects is not cosmetic. These routes set the retail price of a
 * car and flip a listing to `available`, which is the state in which the
 * down-payment route will take a member's money against it.
 */
export interface AdminIdentity {
  id: string;
  userId: string;
  label: string;
}

export type AdminCheck =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; response: Response };

const forbidden = () =>
  ({ ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) }) as const;

export async function requireAdmin(request: Request): Promise<AdminCheck> {
  const user = await sessionUser(request);
  if (!user) {
    return { ok: false, response: Response.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admins")
    .select("id, user_id, label")
    .eq("user_id", user.id)
    .maybeSingle();

  // A database error here must not read as "authorized". Fail closed and say
  // as little as possible about why.
  if (error) return forbidden();
  if (data) return { ok: true, admin: { id: data.id, userId: data.user_id, label: data.label } };

  // No row for this user. Is there an invitation for the verified email?
  const email = sessionEmail(user);
  if (!email) return forbidden();

  const { data: bound, error: bindError } = await db
    .from("admins")
    .update({ user_id: user.id, bound_at: new Date().toISOString() })
    .eq("email", email)
    .is("user_id", null)
    .select("id, user_id, label")
    .maybeSingle();

  if (bindError || !bound) return forbidden();
  return { ok: true, admin: { id: bound.id, userId: bound.user_id, label: bound.label } };
}
