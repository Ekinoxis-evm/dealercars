import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { PHOTO_BUCKET } from "@/lib/listing-store";
import { supabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

/**
 * Photographs for one car.
 *
 * The allow-list below is the whole content-type check, and it is deliberately
 * a list of what is permitted rather than a list of what is forbidden. The
 * bucket is public, so anything accepted here is served from our origin to
 * anyone who asks — an SVG would be an XSS vector, and the client-supplied MIME
 * string is not evidence of anything. Extension comes from our own map, never
 * from the uploaded filename.
 */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_BYTES = 10 * 1024 * 1024; // Matches the bucket's own limit.
const MAX_PHOTOS = 24;

export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const listingId = (await params).id;
  const db = supabaseAdmin();

  const { data: listing } = await db
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "No such car" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart upload." },
      { status: 400 }
    );
  }

  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "No photographs were sent." }, { status: 400 });
  }

  const { count } = await db
    .from("listing_photos")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if ((count ?? 0) + files.length > MAX_PHOTOS) {
    return NextResponse.json(
      {
        error: `A car can carry ${MAX_PHOTOS} photographs; this would make ${(count ?? 0) + files.length}.`,
      },
      { status: 400 }
    );
  }

  // New photos land after the existing ones rather than interleaving.
  const { data: last } = await db
    .from("listing_photos")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextOrder = (last?.sort_order ?? -1) + 1;
  const uploaded: string[] = [];
  const rows: Record<string, unknown>[] = [];

  for (const file of files) {
    const extension = ALLOWED[file.type];
    if (!extension) {
      await cleanUp(uploaded);
      return NextResponse.json(
        {
          error: `${file.name || "That file"} is a ${file.type || "unknown"} file. Photographs must be JPEG, PNG, WebP or AVIF.`,
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      await cleanUp(uploaded);
      return NextResponse.json(
        {
          error: `${file.name || "That file"} is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`,
        },
        { status: 400 }
      );
    }

    const path = `${listingId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        // A year, immutable: the path contains a UUID, so the bytes at a given
        // path never change. Re-uploading produces a new path.
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      await cleanUp(uploaded);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    uploaded.push(path);
    rows.push({
      listing_id: listingId,
      storage_path: path,
      content_type: file.type,
      bytes: file.size,
      sort_order: nextOrder++,
    });
  }

  const { data: inserted, error } = await db
    .from("listing_photos")
    .insert(rows)
    .select("id, storage_path, alt, sort_order, width, height, content_type");

  if (error) {
    // The bytes are in the bucket but no row points at them. Remove them —
    // an orphaned public file is one nobody can find and nobody can delete.
    await cleanUp(uploaded);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photos: inserted }, { status: 201 });

  async function cleanUp(paths: string[]) {
    if (paths.length) await db.storage.from(PHOTO_BUCKET).remove(paths);
  }
}

/**
 * Reorder the gallery, and edit alt text.
 *
 * Order is sent whole rather than as a move instruction: the client knows the
 * arrangement it is showing, and sending that arrangement is idempotent, where
 * "move photo 3 to position 1" applied twice is not.
 */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const listingId = (await params).id;
  const body = await request.json().catch(() => null);
  const photos = body?.photos;

  if (!Array.isArray(photos) || photos.some((p) => typeof p?.id !== "string")) {
    return NextResponse.json(
      { error: "Expected { photos: [{ id, sortOrder?, alt? }] }." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Every id must already belong to this car. Without this check an admin
  // could reorder — or retitle — another car's photographs by id.
  const { data: owned, error: readError } = await db
    .from("listing_photos")
    .select("id")
    .eq("listing_id", listingId);

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const ownedIds = new Set((owned ?? []).map((p) => p.id));
  const foreign = photos.filter((p) => !ownedIds.has(p.id));
  if (foreign.length) {
    return NextResponse.json(
      { error: "One of those photographs does not belong to this car." },
      { status: 403 }
    );
  }

  for (const [index, photo] of photos.entries()) {
    const update: Record<string, unknown> = {
      sort_order: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
    };
    if (photo.alt !== undefined) {
      update.alt = typeof photo.alt === "string" && photo.alt.trim() !== ""
        ? photo.alt.trim()
        : null;
    }

    const { error } = await db
      .from("listing_photos")
      .update(update)
      .eq("id", photo.id)
      .eq("listing_id", listingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
