import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Who is an admin, and inviting another one.
 *
 * An invitation is an email address. It becomes a working admin the first
 * time a Privy session whose VERIFIED email matches signs in — see
 * `requireAdmin()`. Only an existing admin can add one, and the row records
 * who did, so a surprise admin is always traceable to the admin who added
 * them. That is the whole difference between this and the "become an admin"
 * route the original design refused to have.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+$/;
const COLUMNS = "id, email, privy_did, label, added_by, bound_at, created_at";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { data, error } = await supabaseAdmin()
    .from("admins")
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ admins: data ?? [], me: admin.admin.id });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  const errors: string[] = [];
  if (!EMAIL_RE.test(email)) errors.push("email must be an email address.");
  if (!label) errors.push("label is required — the name that will appear in the audit trail.");
  if (errors.length) {
    return NextResponse.json({ error: "That admin could not be added.", reasons: errors }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("admins")
    .insert({ email, label, added_by: admin.admin.id })
    .select(COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "That email is already an admin." : error.message;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ admin: data }, { status: 201 });
}
