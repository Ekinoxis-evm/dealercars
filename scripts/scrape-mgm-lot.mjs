#!/usr/bin/env node
/**
 * Scrape the dealer's own site for the cars on the lot.
 *
 * mgmautobroker.com is a Wix Stores site: every car is a "product" with a
 * name, a price, a free-text description and a gallery. Wix embeds a
 * schema.org Product block in each product page, which is the only structured
 * data on the site, so that is what this reads. It does NOT guess at anything
 * the site does not state — year, mileage, transmission and the like come from
 * the curated file (`scripts/data/mgm-lot.json`), by hand.
 *
 * Output: scripts/data/mgm-lot.scraped.json. Re-run when the lot changes; the
 * seed diffs the two files and says what is new and what has gone.
 *
 *   node scripts/scrape-mgm-lot.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SITE = "https://www.mgmautobroker.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const OUT = path.join(process.cwd(), "scripts/data/mgm-lot.scraped.json");

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** Product-page URLs across the paginated home. Stops when a page adds nothing. */
async function productUrls() {
  const seen = new Set();
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? `${SITE}/` : `${SITE}/?page=${page}`;
    const html = await fetchHtml(url);
    const before = seen.size;
    for (const m of html.matchAll(
      /href="(https:\/\/www\.mgmautobroker\.com\/product-page\/[^"?#]+)"/g
    )) {
      seen.add(m[1]);
    }
    if (seen.size === before) break;
  }
  return [...seen].sort();
}

/** The schema.org Product block, or null when the page has none. */
function productJsonLd(html) {
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs
  )) {
    try {
      const d = JSON.parse(m[1]);
      if (d && d["@type"] === "Product") return d;
    } catch {
      // Not every ld+json block on a Wix page is valid JSON. Skip it.
    }
  }
  return null;
}

/**
 * A bounded JPEG of the photo, via Wix's own image transform.
 *
 * The raw upload behind a Wix product photo can be a multi-megabyte PNG, over
 * the storage bucket's size limit and far larger than a car card needs. Asking
 * Wix to fit it inside 1600px as a JPEG gives a few hundred kilobytes, which
 * is what a gallery on a phone should be loading anyway.
 */
function deliveryImage(url) {
  const base = url.replace(/\/v1\/(fit|fill)\/.*$/, "");
  return `${base}/v1/fit/w_1600,h_1600,q_85/file.jpg`;
}

async function scrapeProduct(url) {
  const html = await fetchHtml(url);
  const d = productJsonLd(html);
  if (!d) return { slug: path.basename(url), url, error: "no Product JSON-LD" };

  const offers = Array.isArray(d.offers) ? d.offers[0] : d.offers ?? {};
  const price = Number(offers.price);
  const images = (Array.isArray(d.image) ? d.image : [d.image])
    .filter((i) => i && typeof i === "object" && i.contentUrl)
    .map((i) => ({
      url: deliveryImage(i.contentUrl),
      // Dimensions of the ORIGINAL, as Wix states them. The delivered file is
      // fitted inside 1600px, so these are an aspect ratio, not a pixel size.
      width: i.width ? Number(i.width) : undefined,
      height: i.height ? Number(i.height) : undefined,
    }));

  return {
    slug: path.basename(url),
    url,
    name: d.name ?? "",
    description: d.description ?? "",
    // Integer cents, from the site's whole-dollar price. Never a float.
    priceCents: Number.isFinite(price) ? Math.round(price * 100) : null,
    currency: offers.priceCurrency ?? null,
    inStock: /InStock/.test(String(offers.availability ?? "")),
    images,
  };
}

const urls = await productUrls();
console.log(`${urls.length} product pages`);
const cars = [];
for (const url of urls) {
  const car = await scrapeProduct(url);
  cars.push(car);
  console.log(
    ` ${car.slug.padEnd(28)} ${car.error ?? `${car.name} · $${(car.priceCents ?? 0) / 100} · ${car.images.length} photos`}`
  );
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify({ scrapedAt: new Date().toISOString(), site: SITE, cars }, null, 2) + "\n"
);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
