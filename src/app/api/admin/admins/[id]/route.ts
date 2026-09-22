import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Remove an admin.
 *
 * Two refusals. You cannot remove yourself — locking the last person out is a
 * database visit, not a click. And the last admin cannot be removed at all,
 * for the same reason.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (id === admin.admin.id) {
    return NextResponse.json({ error: "You cannot remove yourself." }, { status: 409 });
  }

  const db = supabaseAdmin();
  const { count } = await db.from("admins").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "The last admin cannot be removed." }, { status: 409 });
  }

  const { error, count: removed } = await db
    .from("admins")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!removed) return NextResponse.json({ error: "No such admin." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
