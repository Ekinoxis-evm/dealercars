import type { ListingStatus, Money, RetailListing } from "./types";
import { dealCostsFor, hasDealCostsFor } from "./deal-costs";
import { quoteListing } from "./finance";

/**
 * What a car looks like in the shop window.
 *
 * This exists for two reasons, and the second one is the important one.
 *
 * First, the grid is interactive — sorting and budget filtering happen in the
 * browser — so the cars have to cross the server/client boundary as plain
 * data. Pricing happens HERE, on the server, exactly once: the figure a member
 * sees on a card and the figure they are charged come from the same call to
 * `quoteListing`. A card that did its own arithmetic would eventually disagree
 * with the server by a cent, and a cent of disagreement in a disclosed price
 * is a Reg Z problem rather than a display bug.
 *
 * Second, `RetailListing` carries `acquisitionTargetCents` — what we intend to
 * pay a private seller. That figure reaching a member, or a seller, costs real
 * money on the next car. Mapping to a narrow shape at the boundary means no
 * member-facing component is ever handed a row that contains it, rather than
 * every component having to remember not to render it.
 *
 * Note what is NOT here: a monthly payment. A monthly figure is a Regulation Z
 * trigger term and would oblige the full credit disclosure on every card in
 * the grid (see `RegZDisclosure`). An out-the-door cash price is not a trigger
 * term, and the per-car page is where payments — and their disclosure — live.
 * If you add a payment figure to this type, add the disclosure with it.
 */
export interface CarCardData {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  city: string;
  state: string;
  status: ListingStatus;
  transmission: "automatic" | "manual";
  exteriorColor: string;
  bodyStyle?: string;
  fuelType?: string;
  durability: number;
  /**
   * The full out-the-door price, tax and fees included. Null when no tax,
   * title and fee profile exists for the state — we would rather show no
   * number than one that changes at signing.
   */
  outTheDoorCents: Money | null;
  photoUrl?: string;
  photoAlt?: string;
}

export function toCardData(listing: RetailListing): CarCardData {
  const priceable = hasDealCostsFor(listing.state);
  const lead = listing.photos[0];

  return {
    id: listing.id,
    year: listing.year,
    make: listing.make,
    model: listing.model,
    trim: listing.trim,
    mileage: listing.mileage,
    city: listing.city,
    state: listing.state,
    status: listing.status,
    transmission: listing.transmission,
    exteriorColor: listing.exteriorColor,
    bodyStyle: listing.bodyStyle,
    fuelType: listing.fuelType,
    durability: listing.durability,
    outTheDoorCents: priceable
      ? quoteListing(listing, dealCostsFor(listing.state), 0).outTheDoorCents
      : null,
    photoUrl: lead?.url,
    photoAlt:
      lead?.alt ?? `${listing.year} ${listing.make} ${listing.model}, exterior`,
  };
}

export function carTitle(car: CarCardData): string {
  return `${car.year} ${car.make} ${car.model}`;
}
