import "server-only";
import { AVAILABLE_NOW, findListing as findSeedListing } from "./available-now";
import { serverEnv } from "./env";
import { supabaseAdmin } from "./supabase";
import type { ListingPhoto, RetailListing } from "./types";

/**
 * Inventory, read from the database rather than from a hardcoded array.
 *
 * The same argument as `dealer-store.ts`, applied to cars. A listing's status
 * decides whether checkout is open on it, and its price decides what a member
 * is charged; both change on an ordinary weekday. Reading them from a compiled
 * constant means every price change is a deploy, and — worse — a car that has
 * been sold stays purchasable until somebody edits a file.
 *
 * `available-now.ts` is the seed and the no-database fallback, nothing more.
 */

const PHOTO_BUCKET = "listing-photos";

/** Column list for every listing read, so the mapper never gets a surprise. */
const LISTING_COLUMNS = `
  id, dealer_id, source, status, listing_url, seller_name,
  vin, year, make, model, trim, mileage, title_status, transmission,
  exterior_color, interior_color, body_style, fuel_type,
  asking_price_cents, acquisition_target_cents, estimated_recon_cents,
  retail_price_cents, acquired_price_cents, acquired_at,
  city, state, owner_count, seller_warranty_months, durability,
  notes, description, created_at, updated_at,
  listing_photos ( id, storage_path, alt, sort_order, width, height, content_type )
`;

/**
 * Public URL for a stored photo.
 *
 * The bucket is public (see migration 0003) because car photographs are the
 * advertisement and need to be CDN-cacheable and crawlable. Building the URL
 * here rather than storing it means the day that decision is revisited, this is
 * the only function that changes.
 */
export function photoUrl(path: string): string {
  return `${serverEnv.supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

export { PHOTO_BUCKET };

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPhoto(row: any): ListingPhoto {
  return {
    id: row.id,
    path: row.storage_path,
    url: photoUrl(row.storage_path),
    alt: row.alt ?? undefined,
    sortOrder: row.sort_order ?? 0,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    contentType: row.content_type,
  };
}

function toListing(row: any): RetailListing {
  const photos: ListingPhoto[] = (row.listing_photos ?? [])
    .map(toPhoto)
    // Postgres does not promise an order inside an embedded select, so the
    // gallery is ordered here. Ties break by id so the order is at least
    // stable between requests rather than merely arbitrary.
    .sort(
      (a: ListingPhoto, b: ListingPhoto) =>
        a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
    );

  return {
    id: row.id,
    source: row.source,
    status: row.status,
    listingUrl: row.listing_url ?? undefined,
    sellerName: row.seller_name ?? undefined,
    vin: row.vin ?? undefined,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim ?? "",
    mileage: row.mileage ?? undefined,
    titleStatus: row.title_status,
    transmission: row.transmission ?? "automatic",
    exteriorColor: row.exterior_color ?? "",
    interiorColor: row.interior_color ?? "",
    askingPriceCents: Number(row.asking_price_cents),
    acquisitionTargetCents: Number(row.acquisition_target_cents),
    estimatedReconCents: Number(row.estimated_recon_cents ?? 0),
    retailPriceCentsOverride:
      row.retail_price_cents === null || row.retail_price_cents === undefined
        ? undefined
        : Number(row.retail_price_cents),
    city: row.city,
    state: row.state,
    dealerId: row.dealer_id,
    ownerCount: row.owner_count ?? undefined,
    sellerWarrantyMonths: row.seller_warranty_months ?? undefined,
    notes: row.notes ?? [],
    description: row.description ?? undefined,
    bodyStyle: row.body_style ?? undefined,
    fuelType: row.fuel_type ?? undefined,
    photos,
    durability: Number(row.durability),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** One car, by id. Falls back to the seed when there is no database. */
export async function loadListing(
  id: string
): Promise<RetailListing | undefined> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return findSeedListing(id);
    return toListing(data);
  } catch {
    return findSeedListing(id);
  }
}

/**
 * The shop window: cars a member can actually act on.
 *
 * Deliberately excludes `sourced` — a car we have not bought has no title, and
 * listing it as available would be advertising a vehicle nobody holds. The
 * database says the same thing in `listing_acquired_has_record`; this is the
 * read side of that rule.
 */
export async function listDeliverable(): Promise<RetailListing[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("listings")
      .select(LISTING_COLUMNS)
      .in("status", ["available", "reserved"])
      .order("updated_at", { ascending: false });

    if (error || !data) {
      return AVAILABLE_NOW.filter(
        (l) => l.status === "available" || l.status === "reserved"
      );
    }
    return data.map(toListing);
  } catch {
    return AVAILABLE_NOW.filter(
      (l) => l.status === "available" || l.status === "reserved"
    );
  }
}

/**
 * Everything a member may see on the shop-window index: the lot, plus the cars
 * on their way to it. Excludes `sold`, which is history rather than inventory.
 *
 * Splitting "on the lot" from "on the way" is the caller's job, and it is not
 * cosmetic. A `sourced` car is one we have found and not bought; nobody holds
 * title to it, so it must never be presented as available or carry a purchase
 * affordance. Shown under its own heading and plainly labelled, it is a
 * statement about what is coming — which is what the per-car page already says
 * about the same row.
 */
export async function listShopWindow(): Promise<RetailListing[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("listings")
      .select(LISTING_COLUMNS)
      .neq("status", "sold")
      .order("updated_at", { ascending: false });

    if (error || !data) return AVAILABLE_NOW.filter((l) => l.status !== "sold");
    return data.map(toListing);
  } catch {
    return AVAILABLE_NOW.filter((l) => l.status !== "sold");
  }
}

/** True when this car can actually be bought today. */
export function isOnTheLot(listing: RetailListing): boolean {
  return listing.status === "available" || listing.status === "reserved";
}

/**
 * Everything, including cars still being sourced. Admin surfaces only — this is
 * the operator's view of the lot, and it exposes acquisition targets, which are
 * what we intend to pay and must never reach a member.
 */
export async function listAllForAdmin(): Promise<RetailListing[]> {
  const { data, error } = await supabaseAdmin()
    .from("listings")
    .select(LISTING_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toListing);
}
