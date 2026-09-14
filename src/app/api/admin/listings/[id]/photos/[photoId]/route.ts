import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PHOTO_BUCKET } from "@/lib/listing-store";
import { supabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string; photoId: string }> };

/**
 * Remove one photograph.
 *
 * The row is scoped by BOTH listing id and photo id. Scoping by photo id alone
 * would work and would also let a malformed client delete another car's
 * photograph by guessing a UUID; the extra predicate costs nothing.
 *
 * Storage is cleared first. If the file delete fails the row survives, which
 * leaves a photograph that is still visible and still deletable — the opposite
 * order leaves a row pointing at bytes that are gone, which renders as a broken
 * image on a public listing page.
 */
export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id: listingId, photoId } = await params;
  const db = supabaseAdmin();

  const { data: photo, error: readError } = await db
    .from("listing_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!photo) {
    return NextResponse.json({ error: "No such photograph" }, { status: 404 });
  }

  const { error: storageError } = await db.storage
    .from(PHOTO_BUCKET)
    .remove([photo.storage_path]);

  if (storageError) {
    return NextResponse.json(
      { error: `Could not delete the file: ${storageError.message}` },
      { status: 500 }
    );
  }

  const { error } = await db.from("listing_photos").delete().eq("id", photo.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
