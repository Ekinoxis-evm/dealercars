/**
 * Cars available now — the path that does not wait for Thursday's auction.
 *
 * The Monday drop prices a car the dealer has not bought yet. This file is the
 * other case: a specific car that exists, that a member can see this week, put
 * cash down on, and drive home once the paperwork clears.
 *
 * The structure is unchanged and non-negotiable. A private-party seller cannot
 * originate consumer credit — they hold no license, cannot perfect a lien, and
 * cannot hold the paper. So a "street" listing is always a two-step: the
 * partner dealer buys the car, takes title, recons it, and retails it. The
 * member's contract is with the dealer, exactly as with an auction car.
 */

import type { RetailListing } from "./types";

/**
 * Live sourcing list. Stands in for the `vehicles` table until dealers are
 * actually onboarded — same role `mock-lots.ts` plays for auction inventory.
 */
export const AVAILABLE_NOW: RetailListing[] = [
  {
    id: "listing_mazda3_orl_2014",
    source: "street",
    // Sourced, NOT acquired: the dealer has not bought this car yet, so it
    // cannot be delivered and no down payment may be collected against it.
    status: "sourced",
    listingUrl: "https://www.facebook.com/share/1DMN3HaUYh/",
    sellerName: "Luis Cavero",

    // No VIN in the listing. A VIN is required before acquisition — without it
    // there is no title check, no Carfax, and no lien search.
    vin: undefined,
    year: 2014,
    make: "Mazda",
    model: "Mazda3",
    trim: "i Touring (unconfirmed)",
    mileage: 69_000,
    // Seller-stated. Must be confirmed against the title before purchase.
    titleStatus: "clean",
    transmission: "automatic",
    exteriorColor: "Grey",
    interiorColor: "Black",

    askingPriceCents: 7900_00,
    /**
     * What the dealer should actually pay, not what the seller is asking.
     * A 2014 Mazda3 at 69k miles is a strong private-party car, but $7,900 is
     * a retail-shaped ask for a wholesale-shaped transaction. $7,200 leaves
     * the dealer's gross intact; above roughly $7,400 the deal stops working
     * at a $2,500-ish down payment.
     */
    acquisitionTargetCents: 7200_00,
    /**
     * Below the $900 state budget line: low miles for the year, one owner, and
     * a seller claiming cold AC. Tires, brakes, fluids, AC service, detail.
     * Revise the instant a pre-purchase inspection exists.
     */
    estimatedReconCents: 750_00,

    city: "Orlando",
    state: "FL",
    dealerId: "dealer_orl_001",

    ownerCount: 1,
    sellerWarrantyMonths: 3,
    notes: [
      "Seller states AC is ice-cold, one owner, 3-month engine and transmission warranty.",
      "That warranty is a private-party promise and does not survive the sale — it cannot be passed to the member, and it must not appear in the member's paperwork.",
      "69,000 miles on a 2014 is well under the 150,000 cap and unusually low for this price band.",
      "Unverified before purchase: VIN, title status, lien, accident history, and the actual AC and transmission condition.",
    ],
    /**
     * SkyActiv-G 2.0 with the conventional 6-speed automatic is one of the more
     * durable powertrains in this price band — no CVT, no turbo, no timing
     * belt. This is underwriting, not trivia.
     */
    durability: 0.86,
  },
];

export function findListing(id: string): RetailListing | undefined {
  return AVAILABLE_NOW.find((l) => l.id === id);
}

/** Only these can actually be delivered; the rest are still being sourced. */
export function deliverableListings(): RetailListing[] {
  return AVAILABLE_NOW.filter(
    (l) => l.status === "available" || l.status === "reserved"
  );
}
