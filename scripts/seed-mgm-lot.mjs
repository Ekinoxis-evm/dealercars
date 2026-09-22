#!/usr/bin/env node
/**
 * Seed the lot from the dealer's own site.
 *
 * Joins two files by Wix product slug:
 *
 *   scripts/data/mgm-lot.scraped.json  what the site states — price, copy, photos
 *   scripts/data/mgm-lot.json          what it does not — year, make, mileage, durability
 *
 * and upserts one `listings` row per car, then uploads the photos into the
 * public bucket and records them as `listing_photos`. A car in the scrape with
 * no curated entry is reported and skipped, never guessed at; a curated car no
 * longer on the site is reported and left alone, because "gone from the site"
 * and "sold" are different facts and only the operator knows which.
 *
 * What it assumes, and says so in the notes it writes:
 *
 *  - The site's price is the vehicle's retail price. It is written to
 *    `retail_price_cents`, so the member sees that figure plus Florida tax,
 *    title and the doc fee — never a derived price off a made-up cost.
 *  - The cars are on the lot and for sale, so `status` is "available". The
 *    database refuses that without an acquisition record, and the site does
 *    not say what was paid, so `acquired_price_cents` is set to the list price
 *    AS A PLACEHOLDER. It is admin-only and must be corrected in the editor.
 *
 * Idempotent on listings (upsert by id). Photos are only uploaded for a car
 * that has none yet, so re-running does not duplicate a gallery.
 *
 *   npm run lot:scrape && npm run lot:seed
 *   node scripts/seed-mgm-lot.mjs --dry-run
 *   node scripts/seed-mgm-lot.mjs --reset-photos   # re-upload every gallery
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
/** Delete each seeded car's photos first and upload the gallery afresh. */
const RESET_PHOTOS = process.argv.includes("--reset-photos");
const DEALER_ID = "dealer_orl_001";
const CITY = "Intercession City";
const STATE = "FL";
const BUCKET = "listing-photos";

// ------------------------------------------------------------------ env
const env = { ...process.env };
try {
  const raw = await readFile(path.join(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {
  // No .env — rely on the process environment.
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// ----------------------------------------------------------------- data
const dataDir = path.join(process.cwd(), "scripts/data");
const scraped = JSON.parse(await readFile(path.join(dataDir, "mgm-lot.scraped.json"), "utf8"));
const curated = JSON.parse(await readFile(path.join(dataDir, "mgm-lot.json"), "utf8")).cars;

const importedOn = scraped.scrapedAt.slice(0, 10);
const siteBySlug = new Map(scraped.cars.map((c) => [c.slug, c]));

for (const slug of Object.keys(curated)) {
  if (!siteBySlug.has(slug)) {
    console.warn(`! ${slug}: in the curated file but not on the site any more. Left alone — mark it sold in the admin if it went.`);
  }
}

const rows = [];
for (const site of scraped.cars) {
  const hand = curated[site.slug];
  if (site.error) {
    console.warn(`! ${site.slug}: ${site.error}. Skipped.`);
    continue;
  }
  if (!hand) {
    console.warn(`! ${site.slug}: "${site.name}" is on the site but has no curated entry. Add one to scripts/data/mgm-lot.json — nothing is guessed.`);
    continue;
  }
  if (!Number.isInteger(site.priceCents) || site.priceCents <= 0) {
    console.warn(`! ${site.slug}: no usable price. Skipped.`);
    continue;
  }
  if (!Number.isInteger(hand.year) || !hand.make || !hand.model) {
    console.warn(`! ${site.slug}: curated entry needs year, make and model. Skipped.`);
    continue;
  }
  if (typeof hand.durability !== "number" || hand.durability < 0 || hand.durability > 1) {
    console.warn(`! ${site.slug}: durability must be 0..1. Skipped.`);
    continue;
  }

  rows.push({
    site,
    hand,
    row: {
      id: hand.id,
      dealer_id: DEALER_ID,
      source: "dealer-lot",
      status: site.inStock ? "available" : "sold",
      listing_url: site.url,
      seller_name: null,
      vin: null,
      year: hand.year,
      make: hand.make,
      model: hand.model,
      trim: hand.trim || null,
      mileage: Number.isInteger(hand.mileage) ? hand.mileage : null,
      title_status: "clean",
      transmission: hand.transmission ?? null,
      exterior_color: hand.exteriorColor ?? null,
      interior_color: hand.interiorColor ?? null,
      body_style: hand.bodyStyle ?? null,
      fuel_type: hand.fuelType ?? null,
      // All integer cents. The site's whole-dollar price ×100, never a float.
      asking_price_cents: site.priceCents,
      acquisition_target_cents: site.priceCents,
      estimated_recon_cents: 0,
      retail_price_cents: site.priceCents,
      // PLACEHOLDER — see the header. The interlock needs a figure to let the
      // car be "available"; the real one is for the operator to enter.
      acquired_price_cents: site.priceCents,
      acquired_at: scraped.scrapedAt,
      city: CITY,
      state: STATE,
      owner_count: null,
      seller_warranty_months: null,
      durability: hand.durability,
      description: hand.description || null,
      notes: [
        `Publicado en mgmautobroker.com; datos tomados de esa publicación el ${importedOn}.`,
        ...(site.description ? [`Texto original del lote: "${site.description.trim()}"`] : []),
        ...(hand.mileage == null ? ["Millaje por confirmar en la oficina."] : []),
        "VIN y estado del título por confirmar contra el certificado.",
      ],
    },
  });
}

console.log(`${rows.length} cars to seed${DRY_RUN ? " (dry run)" : ""}`);
for (const { row, site } of rows) {
  console.log(
    ` ${row.id.padEnd(40)} ${row.year} ${row.make} ${row.model} · $${row.retail_price_cents / 100} · ${row.mileage ?? "?"} mi · ${site.images.length} photos · ${row.status}`
  );
}
if (DRY_RUN) process.exit(0);

// -------------------------------------------------------------- listings
const { error: upsertError } = await db
  .from("listings")
  .upsert(rows.map((r) => r.row), { onConflict: "id" });
if (upsertError) {
  console.error("upsert failed:", upsertError.message);
  process.exit(1);
}
console.log("listings upserted");

// ---------------------------------------------------------------- photos
for (const { row, site } of rows) {
  if (RESET_PHOTOS) {
    const { data: existing } = await db
      .from("listing_photos")
      .select("storage_path")
      .eq("listing_id", row.id);
    if (existing?.length) {
      await db.storage.from(BUCKET).remove(existing.map((p) => p.storage_path));
      await db.from("listing_photos").delete().eq("listing_id", row.id);
      console.log(` ${row.id}: removed ${existing.length} photos`);
    }
  }
  const { count } = await db
    .from("listing_photos")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", row.id);
  if (count && count > 0) {
    console.log(` ${row.id}: ${count} photos already, skipping upload`);
    continue;
  }

  const label = `${row.year} ${row.make} ${row.model}`;
  const uploaded = [];
  for (let i = 0; i < site.images.length; i++) {
    const img = site.images[i];
    const res = await fetch(img.url);
    if (!res.ok) {
      console.warn(`   ! ${img.url}: HTTP ${res.status}, skipped`);
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const storagePath = `${row.id}/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await res.arrayBuffer());

    const { error } = await db.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.warn(`   ! upload ${storagePath}: ${error.message}`);
      continue;
    }
    uploaded.push({
      listing_id: row.id,
      storage_path: storagePath,
      alt: `${label}, foto ${i + 1}`,
      sort_order: i,
      width: img.width ?? null,
      height: img.height ?? null,
      content_type: contentType,
    });
  }

  if (uploaded.length) {
    const { error } = await db.from("listing_photos").insert(uploaded);
    if (error) {
      console.error(` ${row.id}: photo rows failed: ${error.message}`);
      await db.storage.from(BUCKET).remove(uploaded.map((u) => u.storage_path));
      continue;
    }
  }
  console.log(` ${row.id}: ${uploaded.length}/${site.images.length} photos`);
}
console.log("done");
