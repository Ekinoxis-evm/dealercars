import { describe, it, expect } from "vitest";
import { contactMessage, whatsappUrl, type ContactStrings } from "./whatsapp";
import { es } from "../i18n/es";
import { en } from "../i18n/en";

const OTD = 12_831_70;
const DOWN = 4_000_00;
const MONTHLY = 245_32;

function msg(t: ContactStrings) {
  return contactMessage(
    {
      kind: "plan",
      plan: {
        url: "https://dealercars.vercel.app/es/marketplace/listing_mazda3_orl_2014",
        vehicle: "2014 Mazda3",
        downCents: DOWN,
        monthlyPaymentCents: MONTHLY,
        termMonths: 36,
        outTheDoorCents: OTD,
      },
    },
    t
  );
}

describe("the contact message carries the quote", () => {
  it("states the car, the figures and the term", () => {
    const m = msg(es.contact);
    expect(m).toContain("2014 Mazda3");
    expect(m).toContain("listing_mazda3_orl_2014");
    expect(m).toContain("$4,000.00");
    expect(m).toContain("$245.32");
    expect(m).toContain("36 meses");
    expect(m).toContain("$12,831.70");
  });

  it("never sends a payment without the rate beside it", () => {
    // A down payment and a monthly with no rate and no route back to the terms
    // is the shape of a misleading credit advertisement, even when the person
    // sending it is the customer. The rate rides along, and so does the URL of
    // the page carrying the full disclosure.
    for (const t of [es.contact, en.contact]) {
      const m = msg(t);
      expect(m).toMatch(/0% APR/);
      expect(m).toContain("https://");
    }
  });

  it("carries the visit the member asked for, when there is one", () => {
    const withVisit = contactMessage(
      {
        kind: "plan",
        plan: {
          url: "https://mgmautobroker.vercel.app/es/marketplace/listing_mazda_cx5_2016",
          vehicle: "2016 Mazda CX-5",
          downCents: 3_000_00,
          monthlyPaymentCents: 237_800,
          termMonths: 3,
          outTheDoorCents: 10_134_00,
          visit: "jueves, 24 de septiembre, 10:00 AM EDT",
        },
      },
      es.contact
    );
    expect(withVisit).toContain("Cita que prefiero: jueves, 24 de septiembre, 10:00 AM EDT");
    expect(msg(es.contact)).not.toContain("Cita que prefiero");
  });

  it("speaks the reader's language", () => {
    expect(msg(es.contact)).toContain("Entrada");
    expect(msg(en.contact)).toContain("Down payment");
  });

  it("falls back to a budget, then to a plain enquiry", () => {
    const budget = contactMessage(
      {
        kind: "budget",
        budget: {
          url: "https://dealercars.vercel.app/es",
          downCents: 2_500_00,
          monthlyCents: 400_00,
          maxOutTheDoorCents: 16_900_00,
        },
      },
      es.contact
    );
    expect(budget).toContain("$2,500.00");
    expect(budget).toContain("$16,900.00");

    const general = contactMessage(
      { kind: "general", url: "https://dealercars.vercel.app/es" },
      es.contact
    );
    // No figures at all — nothing was quoted, so nothing is claimed.
    expect(general).not.toMatch(/\$/);
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link with the message encoded", () => {
    const url = whatsappUrl("17868671441", "hola mundo");
    expect(url).toBe("https://wa.me/17868671441?text=hola%20mundo");
  });

  it("tolerates a number typed the way a human writes it", () => {
    expect(whatsappUrl("(786) 867-1441", "x")).toBe(
      "https://wa.me/7868671441?text=x"
    );
  });

  it("returns null rather than a broken link", () => {
    // A contact button that opens an empty chat is worse than no button: it
    // looks like the business answered and then did not.
    expect(whatsappUrl(undefined, "x")).toBeNull();
    expect(whatsappUrl("123", "x")).toBeNull();
  });
});
