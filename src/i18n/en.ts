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
    cars: "Cars",
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
    lede: "We buy the cars, we hold the title, and we carry the loan ourselves. Every car on the lot shows the full out-the-door price, and you can split that exact price over three years without paying a cent of interest on it.",
    specimenLabel: "What a car on our lot looks like",
    downToday: "Down today",
    perMonth: "Per month ×",
    outTheDoor: "out the door",
    financed: "financed",
    zeroInterest: "$0.00 interest",
    seeCars: "See the cars",
    whatCanIAfford: "What can I afford?",
    onTheLotNow: "On the lot right now",
    allCars: (n: number) => `All ${n} cars →`,
    onTheLotLede:
      "Cars we own, inspected and titled. The price on each card is the out-the-door price — tax, title, registration and doc fee included.",
    budgetTitle: "Start from your budget, not from a sticker.",
    budgetLede:
      "Set your down payment and your monthly ceiling. We solve them backwards — through tax, title and fees — into the cars on our lot that your money actually reaches.",
    howTitle: "How buying here works",
    howLede:
      "Six steps, and we are on the hook for four of them. That is the difference between a dealership and a marketplace.",
    waitlistTitle: "Tell us what you're looking for.",
    waitlistLede:
      "We buy cars one at a time and the lot turns over quickly. Leave your email and we'll tell you when something that fits your budget lands.",
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
    eyebrow: "Our inventory",
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
    financed: "Financed",
    interestRow: "Interest",
    youPayInTotal: "You pay in total",
    payDown: (amount: string) => `Pay ${amount} down`,
    payInFull: (amount: string) => `Pay ${amount} in full`,
    signIn: "Sign in to continue",
    opening: "Opening checkout…",
    refundNote:
      "Refundable in full until you sign at your visit. Apple Pay available.",
    comparisonLabel: "Not available here —",
    comparison: (rate: string, monthly: string, extra: string) =>
      `at a typical ${rate} BHPH rate this car would be ${monthly}/mo and cost ${extra} more in interest. That is the money you keep.`,
    checkoutError: "Something went wrong starting checkout.",
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

  budget: {
    worksheet: "Worksheet",
    noInterest: "0% APR — no interest",
    feesIncluded: "tax, title & fees included",
    cashDownToday: "Cash down today",
    monthlyCeiling: "Monthly ceiling",
    ceilingNote:
      "A ceiling, not a wish. We solve backwards from what you can keep paying — tax, title, registration and doc fee already counted. None of it goes to interest.",
    canShopUpTo: "You can shop up to",
    outTheDoorIn: (state: string) =>
      `Out the door, in ${state} — the whole price, not a sticker you add fees to later. That is a`,
    carOnce: "car once tax, title and the doc fee come out of it.",
    seeWhatsOnLot: "See what is on the lot →",
    nothingFits: "Nothing on the lot fits that budget today. The lot turns over every week —",
    seeEverything: "see everything we have",
    carsFit: (n: number) => `${n} ${n === 1 ? "car" : "cars"} on the lot fit`,
    seeWholeLot: "See the whole lot →",
  },

  waitlist: {
    onTheList: "You're on the list.",
    weWillEmail: "We'll email",
    whenSomethingLands: "when a car that fits lands on the lot. Nothing else, ever.",
  },

  contact: {
    button: "Contact us",
    buttonWithQuote: "Send this to us",
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
    repLabel: "Representative example",
    repBody: (parts: {
      otd: string;
      down: string;
      financed: string;
      apr: string;
      n: number;
      monthly: string;
      final: string;
      total: string;
      charge: string;
    }) =>
      `2014 Mazda3, 69,000 miles, Central Florida. Out-the-door price ${parts.otd} including tax, title, registration, and doc fee. ${parts.down} cash down; amount financed ${parts.financed}; annual percentage rate ${parts.apr}; ${parts.n} monthly payments of ${parts.monthly} and a final payment of ${parts.final}; total of payments ${parts.total}; finance charge ${parts.charge}. Your terms depend on your verified income, residence, and down payment.`,
    creditor:
      "MGM Auto is the seller and the creditor on every vehicle it lists: a licensed motor vehicle dealer and retail installment seller. We buy the cars, we hold the title, and we hold the contract. Nothing is sold on to a third-party lender.",
    reported:
      "Vehicle history, mileage, and condition are reported as received from the seller and from our own inspection. All prices in U.S. dollars.",
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
