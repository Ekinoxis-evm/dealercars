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
    seeAuctions: "Auction access",
    onTheLotNow: "On the lot right now",
    allCars: (n: number) => `All ${n} cars →`,
    onTheLotLede:
      "Cars we own, inspected and titled. The price on each card is the out-the-door price — tax, title, registration and doc fee included.",
    auctionsTitle: "We buy where the big dealers buy.",
    auctionsLede:
      "Wholesale auctions are closed to the public. Our dealer licence lets us bid at all three, which is where the prices on this lot come from.",
    auctionsOpen: "Open site",
    inPerson: "We do this in person",
    inPersonLede:
      "You book a time and come to the office. We go through what you actually need, what it should cost, and how you will pay for it — before anything is signed.",
    openInMaps: "Open in Google Maps →",
  },

  cars: {
    howTitle: "How buying here works",
    steps: [
      { title: "Pick a car", body: "Every price is out the door — tax, title, registration and doc fee already in it." },
      { title: "Build your payment", body: "Pay in full, or split the same price over the months you choose. 0% APR, to the cent." },
      { title: "Talk to an agent", body: "Pick a day and an hour; your plan and your visit go to us on WhatsApp." },
      { title: "Drive it and sign", body: "Come to the office, drive it, sign there. We are the seller and the creditor — nothing is sold to a bank." },
    ],
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

  signIn: {
    title: "Sign in",
    emailLabel: "Your email",
    send: "Send me a code",
    sending: "Sending…",
    note: "No password. We email you a link and a code; either one signs you in.",
    sentTo: "We sent it to",
    sentHow: "Open the link in the email, or type the code here.",
    codeLabel: "Code from the email",
    verify: "Sign in",
    verifying: "Checking…",
    again: "Use a different email",
    badEmail: "That doesn't look like a working email address.",
    couldNotSend: "We couldn't send the email just now. Wait a minute and try again.",
    badCode: "That code didn't match. Check the email and try again.",
  },

  account: {
    metaTitle: "Your account — MGM Auto",
    eyebrow: "Your account",
    title: "Your file",
    lede: "We never ask for a credit score. What matters is what you earn, what you can put down, and whether the payment leaves room for a bad month.",
    signInTitle: "Sign in to start",
    signInLede: "No credit pull to create an account, and no credit score anywhere in this process — we underwrite on capacity, not on a file this market usually does not have.",
    signIn: "Sign in",
    signOut: "Sign out",
    loading: "Loading…",
    yourDetails: "Your details",
    signedInAs: "Signed in as",
    fullName: "Full name",
    street: "Street address",
    city: "City",
    state: "State",
    zip: "ZIP",
    notOpenIn: (state: string, open: string) =>
      `We are not open in ${state} yet. Tax, title and the contract form all differ by state, so we would rather say so than quote a number that changes at signing. Currently: ${open}.`,
    howPaid: "How you're paid",
    select: "Select…",
    employment: {
      w2_fulltime: "W-2, full time",
      w2_parttime: "W-2, part time",
      "1099": "1099 / contract",
      cash: "Paid in cash",
      benefits: "Benefits or fixed income",
      self_employed: "Self-employed",
    } as Record<string, string>,
    employer: "Employer",
    monthsAtJob: "Months at this job",
    grossIncome: "Gross monthly income ($)",
    grossIncomeHint: "Before deductions, not take-home.",
    cashDown: "Cash you can put down ($)",
    verification: "Verification",
    identity: "Identity",
    income: "Income",
    residence: "Residence",
    verificationNote: "Typing a figure here is an application, not proof. A financed deal needs identity and income actually verified first — paying in full does not.",
    capNote: (income: string, cap: string) =>
      `At ${income} a month, the most you could be approved for is ${cap} a month — a hard 20% cap on payment to income.`,
    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
    badIncome: "Gross monthly income must be a plain dollar amount, like 2400 or 2400.50.",
    badDown: "Cash available must be a plain dollar amount.",
    couldNotLoad: "Could not load your profile.",
    couldNotSave: "Could not save your profile.",
  },

  gallery: {
    viewLarger: "View larger",
    close: "Close",
    previous: "Previous photo",
    next: "Next photo",
    photo: (n: number, total: number) => `photo ${n} of ${total}`,
    more: (label: string) => `Photographs of the ${label}`,
  },

  price: {
    heading: "What is in the price",
    lede: "The whole number, not a sticker you add fees to later. Tap ? on any line to see what it is based on.",
    why: "What is this based on?",
    source: "See the source",
    vehicleWhy: "The price of the car itself, set by MGM Auto. It is the figure on the card and it does not change at the desk.",
    taxWhy: (stateRate: string, surtaxRate: string | null, cap: string | null) =>
      surtaxRate
        ? `Florida sales tax at ${stateRate}, plus the county discretionary surtax at ${surtaxRate}, which applies only to the first ${cap} of the price. The surtax follows the county where you register the car, so it is confirmed with your address at signing.`
        : `State motor vehicle sales tax at ${stateRate} of the vehicle price.`,
    docWhy: "The dealer's document (pre-delivery service) fee. Florida does not cap it but requires it to be disclosed and charged to every customer alike — this is the same fee for everyone.",
    titleWhy: "Title, plate and first registration with the state, from the DMV fee schedule. An estimate: the exact amount depends on your registration and is settled at signing.",
    nothingElse: "That is everything. There is no other charge.",
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
    sheetTitle: "When would you like to come and see it?",
    sheetLede: "Pick a day and an hour. An agent confirms it on WhatsApp.",
    pickDay: "Pick a day",
    pickTime: "Pick an hour",
    chosen: "Your visit:",
    sendWith: "Send my plan and this visit on WhatsApp",
    sendWithout: "Send without a visit",
    none: "No times are open in the next two weeks. Send without a visit and we will find one on WhatsApp.",
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
    howTitle: "How the service works",
    steps: [
      { title: "Pay the access fee", body: "One-off, per search. It pays for the work whether or not a car is won." },
      { title: "Sit down with us", body: "Book a time at the office. We agree what to look for, what it should cost, and where we stop." },
      { title: "We bid for you", body: "Condition report and inspection first. We stop where we agreed to stop." },
      { title: "Title and paperwork", body: "After the hammer we handle title, transport and the paperwork. Pay cash or finance it with us at 0%." },
    ],
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
      "Pick a day and an hour to come and see it. Your plan and your visit go into the message as you built them; an agent confirms both on WhatsApp — nothing is charged from this page.",
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
    visit: "Preferred visit",
    auctionIntro: "I'd like Auction Access.",
    auctionFee: "Access fee",
    auctionFor: "The car is for",
    auctionBudget: "Total budget for the car",
    auctionWanted: "Looking for",
    auctionPayment: "How I'd pay",
    auctionWhen: "When",
    auctionName: "Name",
  },

  enquiry: {
    title: "Tell us what you're after",
    lede: "Five quick answers so the agent can start on the right car. It all goes into one WhatsApp message.",
    note: "An agent answers on WhatsApp and books your time at the office. Nothing is charged from this page.",
    forWhomQ: "Who is the car for?",
    forMe: "For me",
    forDealer: "I'm a dealer / reseller",
    budgetQ: "Total budget for the car",
    budgetHint: "Out the door — car, fees and tax. A ceiling, not a wish.",
    wantedQ: "What are you looking for?",
    wantedHint: "e.g. 2016–2019 Toyota Corolla, under 90k miles",
    paymentQ: "How would you pay?",
    payCash: "In full",
    payPlan: "Financed with MGM at 0%",
    whenQ: "When do you want to start?",
    whenWeek: "This week",
    whenMonth: "This month",
    whenLooking: "Just looking",
    nameQ: "Your name (optional)",
    feeLine: (fee: string) => `Access fee ${fee} · one-off, per search · paid at the office`,
    send: "Send on WhatsApp",
    incomplete: "Answer the four questions above and the button lights up.",
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
