/**
 * English copy. The SHAPE of the dictionary is defined here and every other
 * language is typed against it, so a missing key is a compile error rather
 * than a blank space on a page somebody is being asked to pay money on.
 *
 * Money and dates are never in here. They are formatted by `formatMoney` and
 * by Intl from the real figures, so a translation can never restate a price.
 */
export const en = {
  nav: {
    cars: "Marketplace",
    auctionAccess: "Auction access",
    account: "Account",
    home: "MGM Auto — home",
  },

  regZ: {
    label: "Credit terms",
    /** "$4,000 cash down; annual percentage rate 0.0%; …" */
    cashDown: "cash down",
    apr: "annual percentage rate",
    monthlyPaymentsOf: (n: number) => `${n} monthly payments of`,
    andFinalPayment: "and a final payment of",
    totalOfPayments: "total of payments",
    noFinanceCharge: "no finance charge",
    financeCharge: "finance charge",
    creditor:
      "Credit extended by MGM Auto, a licensed motor vehicle dealer and retail installment seller. Subject to verification of income, residence, and down payment.",
  },

  home: {
    eyebrow: "Used cars, financed by the people who sell them",
    title1: "Our cars. One price.",
    title2: "No interest, ever.",
    // No period of repayment stated here on purpose: "over three years" is a
    // Regulation Z trigger term, and the hero no longer carries a disclosure.
    lede: "We buy the cars, we hold the title, and we carry the payments ourselves. Every car in the marketplace shows its full out-the-door price, and you can split that exact price into monthly payments without paying a cent of interest.",
    seeCars: "See the marketplace",
    howItWorksLink: "How it works",
    onTheLotNow: "On the lot right now",
    allCars: (n: number) => `All ${n} cars →`,
    onTheLotLede:
      "Cars we own, inspected and titled. The price on each card is the out-the-door price — tax, title, registration and doc fee included.",
    howTitle: "How buying here works",
    howLede:
      "Six steps, and we are on the hook for four of them. That is the difference between a dealership and a classified ad.",
    inPerson: "We do this in person",
    inPersonLede:
      "You book a time and come to the office. We go through what you actually need, what it should cost, and how you will pay for it — before anything is signed.",
    openInMaps: "Open in Google Maps →",
  },

  steps: [
    {
      actor: "MGM Auto",
      title: "We buy the car",
      body: "We hold the dealer licence and the auction access, so we buy, inspect and recondition every car ourselves. Nothing is listed until we have the title in hand.",
    },
    {
      actor: "You",
      title: "Pick one and see the real price",
      body: "Every car shows one number: out the door, tax and title and doc fee already in it. No fees appear later, because there are none left to appear.",
    },
    {
      actor: "You",
      title: "Choose how to pay",
      body: "Pay in full, or split the same price over the months you choose. Interest-free means interest-free: the payments add up to the cash price to the cent.",
    },
    {
      actor: "MGM Auto",
      title: "Ability-to-pay check",
      body: "We look at what you earn and what the payment leaves you, not at a credit score. Thin or damaged files are the market, not a disqualification.",
    },
    {
      actor: "You",
      title: "Come drive it",
      body: "Book a visit, drive the car, and sign there. A deposit holds it for your appointment and is refundable in full until you sign.",
    },
    {
      actor: "MGM Auto",
      title: "We hold the paper",
      body: "We are the seller and the creditor on your contract. Nothing is sold on to a third-party lender, so the people you pay are the people you bought from.",
    },
  ],

  cars: {
    eyebrow: "Marketplace",
    title: "Every car we own.",
    lede: "One price per car, and it is the price you actually pay: tax, title, registration and doc fee already in it. Pay it in full or split it over the months you choose with no interest — the payment plan costs the same as the cash price, to the cent.",
    empty:
      "Nothing is on the lot this minute. We buy cars one at a time and put them up the day the title clears, so this page is worth checking again in a few days.",
    onTheWay: "On the way",
    onTheWayLede:
      "Cars we have found and are buying. We are not the owner yet, so none of these can be reserved or paid for — nobody should take money for a car nobody holds title to. The prices are what they will cost once they are on the lot.",
    budget: "Budget",
    sort: "Sort",
    anyPrice: "Any price",
    under: (amount: string) => `Under ${amount}`,
    priceAsc: "Price ↑",
    priceDesc: "Price ↓",
    fewestMiles: "Fewest miles",
    newest: "Newest",
    countOne: "car",
    countMany: "cars",
    underOutTheDoor: (amount: string) => ` under ${amount} out the door`,
    noneFit:
      "Nothing on the lot fits that budget today. Cars come in every week — the lot turns over faster than the filter suggests.",
  },

  card: {
    photosComing: "Photographs being taken",
    mileageUnknown: "Mileage to be confirmed",
    outTheDoor: "Out the door",
    zeroApr: "0% APR plans",
    notForSale: "not for sale yet",
    notPriced: (state: string) => `Not priced for ${state} yet`,
    durability: "durability",
    status: {
      sourced: "On the way",
      acquired: "In recon",
      available: "Available",
      reserved: "Reserved",
      sold: "Sold",
    },
  },

  car: {
    sourcedPrivately: "Sourced privately",
    dealerLot: "Dealer lot",
    miles: "miles",
    mileageUnknown: "mileage to be confirmed",
    outTheDoorTail: "out the door — tax, title and fees in.",
    notForSaleTitle: "Not for sale yet — we are still buying it.",
    notForSaleBody:
      "Nobody can take payment on a car nobody holds title to, so checkout is closed until it is ours and inspected. These are the figures for when it lands.",
    notPricedTitle: (state: string) => `Not priced for ${state} yet.`,
    notPricedBody:
      "No tax and fee profile for that state, so any out-the-door figure would be a guess. Better none than one that changes at signing.",
    theCar: "The car",
    about: "About",
    notes: "Notes",
    thePrice: "The price",
    mileage: "Mileage",
    durabilityLabel: "Durability",
    title: "Title",
    titleCleanToVerify: "Clean · to verify",
    owners: "Owners",
    unknown: "Unknown",
    transmission: "Transmission",
    transmissions: { automatic: "automatic", manual: "manual" } as Record<"automatic" | "manual", string>,
    vin: "VIN",
    vinNotPublished: "Not published",
    vehicle: "Vehicle",
    tax: "tax",
    docFee: "Doc fee",
    titleReg: "Title & reg",
    outTheDoorRow: "Out the door",
    creditorNote:
      "We are the seller and the creditor. Nothing is sold on to a third-party lender.",
  },

  plan: {
    heading: "Build your payment",
    outTheDoorSuffix: "out the door",
    workOutMy: "Work out my",
    payment: "Payment",
    months: "Months",
    down: "Down",
    monthsUnit: "months",
    downUnit: "down",
    perMonthTimes: (n: number) => `/mo × ${n}`,
    downLabel: "Cash down",
    termLabel: "Months to pay",
    monthlyLabel: "Payment I can make",
    monthsShort: "mo",
    lastPayment: "last payment",
    interest: "interest",
    monthsWord: "months",
    belowFloor: (amount: string) => `This car needs at least ${amount} down.`,
    /** Still used by the Auction Access checkout, not by the plan builder. */
    opening: "Opening checkout…",
    signIn: "Sign in to continue",
    financed: "Financed",
    interestRow: "Interest",
    youPayInTotal: "You pay in total",
    comparisonLabel: "Not available here —",
    comparison: (rate: string, monthly: string, extra: string) =>
      `at a typical ${rate} BHPH rate this car would be ${monthly}/mo and cost ${extra} more in interest. That is the money you keep.`,
  },

  visit: {
    bookTitle: "Book your appointment",
    driveTitle: "Come and drive it",
    timesIn: (zone: string) => `Times are the office's local clock (${zone}).`,
    loading: "Loading available times…",
    booked: "You're booked in.",
    bringAuction:
      "Bring your driver's licence and a rough idea of what you are after. We will agree a shortlist and a ceiling before anything is bid on.",
    bringTestDrive:
      "Bring your driver's licence, proof of income, and proof of address. Nothing is committed until you sign at the lot.",
    weAreAt: "We are at",
    couldNotLoad: "Could not load times.",
    couldNotBook: "Could not book that time.",
  },

  auction: {
    metaTitle: "Auction Access — bid at dealer-only auctions",
    metaDescription:
      "You can't register to bid at Copart or ADESA. We can. A flat fee puts our dealer licence and our judgement behind your next car, and we bid for you.",
    eyebrow: "Auction Access",
    title1: "You can't bid at the auction.",
    title2: "We hold the licence that can.",
    lede: (fee: string) =>
      `Wholesale auctions are closed to the public. For a flat ${fee} we put our dealer licence and our judgement behind your next car: more than 10,000 vehicles a week, at prices well below what a retail lot can offer.`,
    licensedToBid: "Licensed to bid at",
    oneOff: "One-off · per car hunt · non-refundable",
    blockedTail: "Auction Access can't be bought until that is sorted.",
    covers: "What the fee covers",
    doesnt: "What it doesn't",
    eitherWay:
      "Said here rather than in a receipt afterwards. You can pay cash for whatever we win or finance it with us at 0% — the fee is the same either way, and buying it obliges you to neither.",
    inPerson: "We do this in person",
    inPersonLede:
      "Once you're in, you book a time and come to the office. We go through what you actually need, what it should cost, and the number we stop at — before anything is bid on.",
    openInMaps: "Open in Google Maps →",
    active: "Auction Access is active on your account.",
    activeLede: "Pick a time and we'll go through what you're after.",
    buy: (fee: string) => `Pay ${fee} — get access`,
    buyNote:
      "One-off fee, non-refundable — it pays for the work, which happens whether or not a lot is won. Apple Pay available at checkout.",
    pending:
      "Payment received — we're confirming it with Stripe. Your booking options appear here as soon as it clears.",
    couldNotStart: "Could not start checkout.",
    includes: [
      "Access to dealer-only wholesale auctions, bid under our licence",
      "We shortlist lots against what you actually want and can carry",
      "Condition report and inspection review before any bid is placed",
      "We bid for you, and stop where we agreed to stop",
      "Title, transport and paperwork handled after the hammer",
    ],
    excludes: [
      "The price of the car itself, and the auction's own buyer fees",
      "Tax, title and registration, which are quoted once a car is won",
      "Any guarantee that a specific car will be won at a specific price",
    ],
  },

  contact: {
    /** The one call to action on a built plan. Not "pay" — the conversation comes first. */
    talkToAgent: "Talk to an agent on WhatsApp",
    talkToAgentNote:
      "Your plan goes into the message as you built it. An agent confirms the car, the figures and your appointment — nothing is charged from this page.",
    whatsapp: "WhatsApp",
    greeting: "Hello MGM Auto 👋",
    interestedIn: "I'm interested in this car:",
    myPlan: "The plan I built:",
    down: "Down payment",
    monthly: "Monthly",
    term: "Term",
    outTheDoor: "Out the door",
    months: "months",
    zeroApr: "0% APR, no finance charge",
    lookingWithBudget: "I'm looking for a car with this budget:",
    maxMonthly: "Most I can pay monthly",
    reaches: "That reaches",
    general: "I'd like information about a car.",
  },

  footer: {
    follow: "Follow us",
    /** One sentence, kept: every consumer-facing surface names the creditor. */
    creditor:
      "MGM Auto is the seller and the creditor on every vehicle it lists — a licensed motor vehicle dealer and retail installment seller.",
  },
};

/**
 * The shape every language must satisfy.
 *
 * Note there is no `as const` on the object above, and that is deliberate: it
 * would make each English string its own literal type, and no Spanish string
 * could then be assigned to it. The dictionary is a contract about which KEYS
 * exist and what arguments their functions take — never about what they say.
 */
export type Dictionary = typeof en;
