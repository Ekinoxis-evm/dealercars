import type { Dictionary } from "./en";

/**
 * Spanish copy — the default language of this site.
 *
 * Written, not translated. The English was drafted first because the code was,
 * but the buyer this lot sells to reads this version, so it says things the way
 * they are actually said: "de entrada" rather than a literal rendering of "down
 * payment", "cuota" for the monthly, "el lote" for the inventory.
 *
 * The credit terms block is the one place where fidelity beats fluency. It is a
 * Regulation Z disclosure, and the reader is entitled to the same APR, terms of
 * repayment and total of payments the English states — so it is close, plain,
 * and carries no phrasing that softens an obligation.
 *
 * Typed as `Dictionary`, so a key missing here is a build error rather than a
 * blank space on a page where somebody is being asked for money.
 */
export const es: Dictionary = {
  nav: {
    cars: "Autos",
    auctionAccess: "Subastas",
    account: "Mi cuenta",
    home: "MGM Auto — inicio",
  },

  regZ: {
    label: "Condiciones de crédito",
    cashDown: "de entrada",
    apr: "tasa de porcentaje anual",
    monthlyPaymentsOf: (n: number) => `${n} pagos mensuales de`,
    andFinalPayment: "y un pago final de",
    totalOfPayments: "total de pagos",
    noFinanceCharge: "sin cargo por financiamiento",
    financeCharge: "cargo por financiamiento",
    creditor:
      "Crédito otorgado por MGM Auto, concesionario de vehículos con licencia y vendedor a plazos autorizado. Sujeto a verificación de ingresos, domicilio y pago inicial.",
  },

  home: {
    eyebrow: "Autos usados, financiados por quienes los venden",
    title1: "Nuestros autos. Un solo precio.",
    title2: "Sin intereses, nunca.",
    lede: "Compramos los autos, tenemos el título y llevamos el financiamiento nosotros mismos. Cada auto del lote muestra el precio final completo, y puedes dividir ese mismo precio hasta en tres años sin pagar un centavo de interés.",
    specimenLabel: "Así se ve un auto de nuestro lote",
    downToday: "De entrada hoy",
    perMonth: "Al mes ×",
    outTheDoor: "precio final",
    financed: "financiado",
    zeroInterest: "$0.00 de interés",
    seeCars: "Ver los autos",
    whatCanIAfford: "¿Cuánto me alcanza?",
    onTheLotNow: "En el lote ahora",
    allCars: (n: number) => `Ver los ${n} autos →`,
    onTheLotLede:
      "Autos nuestros, inspeccionados y con título. El precio de cada uno es el precio final — impuesto, título, placas y doc fee incluidos.",
    budgetTitle: "Empieza por tu presupuesto, no por el precio de lista.",
    budgetLede:
      "Pon tu entrada y tu tope mensual. Lo resolvemos al revés — pasando por impuesto, título y cargos — hasta los autos del lote a los que tu dinero de verdad alcanza.",
    howTitle: "Cómo se compra aquí",
    howLede:
      "Seis pasos, y cuatro son responsabilidad nuestra. Ésa es la diferencia entre un concesionario y un clasificado.",
    waitlistTitle: "Dinos qué estás buscando.",
    waitlistLede:
      "Compramos los autos uno por uno y el lote se mueve rápido. Déjanos tu correo y te avisamos cuando llegue algo que entre en tu presupuesto.",
  },

  steps: [
    {
      actor: "MGM Auto",
      title: "Compramos el auto",
      body: "Tenemos la licencia de dealer y el acceso a las subastas, así que compramos, inspeccionamos y acondicionamos cada auto nosotros. Nada se publica hasta tener el título en la mano.",
    },
    {
      actor: "Tú",
      title: "Eliges uno y ves el precio real",
      body: "Cada auto muestra un solo número: precio final, con impuesto, título y doc fee ya incluidos. No aparecen cargos después, porque ya no queda ninguno por aparecer.",
    },
    {
      actor: "Tú",
      title: "Eliges cómo pagar",
      body: "Págalo completo, o divide ese mismo precio en los meses que elijas. Sin intereses quiere decir sin intereses: los pagos suman exactamente el precio de contado.",
    },
    {
      actor: "MGM Auto",
      title: "Revisión de capacidad de pago",
      body: "Vemos lo que ganas y lo que te deja libre la cuota, no un puntaje de crédito. Un historial corto o dañado es el mercado, no una descalificación.",
    },
    {
      actor: "Tú",
      title: "Vienes a manejarlo",
      body: "Agendas una cita, manejas el auto y firmas ahí mismo. El depósito lo aparta para tu cita y es reembolsable por completo hasta que firmes.",
    },
    {
      actor: "MGM Auto",
      title: "El contrato es con nosotros",
      body: "Somos el vendedor y el acreedor de tu contrato. No se lo vendemos a un banco, así que a quien le pagas es a quien le compraste.",
    },
  ],

  cars: {
    eyebrow: "Nuestro inventario",
    title: "Todos los autos que tenemos.",
    lede: "Un precio por auto, y es el precio que de verdad pagas: impuesto, título, placas y doc fee ya incluidos. Págalo completo o divídelo en los meses que elijas, sin intereses — el plan de pagos cuesta exactamente lo mismo que el contado.",
    empty:
      "Ahora mismo no hay autos en el lote. Compramos uno por uno y los publicamos el día que sale el título, así que vale la pena volver en unos días.",
    onTheWay: "En camino",
    onTheWayLede:
      "Autos que ya encontramos y estamos comprando. Todavía no son nuestros, así que ninguno se puede apartar ni pagar — nadie debería cobrar por un auto cuyo título no tiene. Los precios son lo que costarán cuando lleguen al lote.",
    budget: "Presupuesto",
    sort: "Orden",
    anyPrice: "Cualquier precio",
    under: (amount: string) => `Menos de ${amount}`,
    priceAsc: "Precio ↑",
    priceDesc: "Precio ↓",
    fewestMiles: "Menos millas",
    newest: "Más nuevo",
    countOne: "auto",
    countMany: "autos",
    underOutTheDoor: (amount: string) => ` bajo ${amount} precio final`,
    noneFit:
      "Hoy no hay nada en el lote que entre en ese presupuesto. Llegan autos cada semana — el lote se mueve más rápido de lo que sugiere el filtro.",
  },

  card: {
    photosComing: "Fotos en camino",
    outTheDoor: "Precio final",
    zeroApr: "Planes 0% APR",
    notForSale: "aún no está a la venta",
    notPriced: (state: string) => `Aún sin precio para ${state}`,
    durability: "de durabilidad",
    status: {
      sourced: "En camino",
      acquired: "En taller",
      available: "Disponible",
      reserved: "Apartado",
      sold: "Vendido",
    },
  },

  car: {
    sourcedPrivately: "Compra particular",
    dealerLot: "Lote propio",
    miles: "millas",
    outTheDoorTail: "precio final — impuesto, título y cargos incluidos.",
    notForSaleTitle: "Todavía no está a la venta — lo estamos comprando.",
    notForSaleBody:
      "Nadie puede cobrar por un auto cuyo título no tiene, así que el pago está cerrado hasta que sea nuestro y esté inspeccionado. Éstas son las cifras para cuando llegue.",
    notPricedTitle: (state: string) => `Aún sin precio para ${state}.`,
    notPricedBody:
      "No tenemos el perfil de impuestos y cargos de ese estado, así que cualquier precio final sería una suposición. Mejor ninguno que uno que cambie al firmar.",
    theCar: "El auto",
    about: "Descripción",
    notes: "Notas",
    thePrice: "El precio",
    mileage: "Millaje",
    durabilityLabel: "Durabilidad",
    title: "Título",
    titleCleanToVerify: "Limpio · por verificar",
    owners: "Dueños",
    unknown: "Sin datos",
    transmission: "Transmisión",
    vin: "VIN",
    vinNotPublished: "No publicado",
    vehicle: "Vehículo",
    tax: "impuesto",
    docFee: "Doc fee",
    titleReg: "Título y placas",
    outTheDoorRow: "Precio final",
    creditorNote:
      "Somos el vendedor y el acreedor. No le vendemos el contrato a ningún banco.",
  },

  plan: {
    heading: "Arma tu pago",
    outTheDoorSuffix: "precio final",
    workOutMy: "Calcúlame",
    payment: "La cuota",
    months: "Los meses",
    down: "La entrada",
    monthsUnit: "meses",
    downUnit: "de entrada",
    perMonthTimes: (n: number) => `/mes × ${n}`,
    downLabel: "Entrada",
    termLabel: "Meses para pagar",
    monthlyLabel: "Cuota que puedo pagar",
    monthsShort: "mes",
    lastPayment: "último pago",
    interest: "de interés",
    monthsWord: "meses",
    belowFloor: (amount: string) =>
      `Este auto necesita al menos ${amount} de entrada.`,
    financed: "Financiado",
    interestRow: "Interés",
    youPayInTotal: "Pagas en total",
    payDown: (amount: string) => `Pagar ${amount} de entrada`,
    payInFull: (amount: string) => `Pagar ${amount} completo`,
    signIn: "Inicia sesión para continuar",
    opening: "Abriendo el pago…",
    refundNote:
      "Reembolsable por completo hasta que firmes en tu cita. Apple Pay disponible.",
    comparisonLabel: "No lo ofrecemos aquí —",
    comparison: (rate: string, monthly: string, extra: string) =>
      `con una tasa típica de ${rate} en un lote buy-here-pay-here, este auto saldría en ${monthly}/mes y costaría ${extra} más en intereses. Ése es el dinero que te quedas.`,
    checkoutError: "Algo salió mal al abrir el pago.",
  },

  visit: {
    bookTitle: "Agenda tu cita",
    driveTitle: "Ven a manejarlo",
    timesIn: (zone: string) => `Los horarios son la hora de la oficina (${zone}).`,
    loading: "Cargando horarios disponibles…",
    booked: "Tu cita quedó agendada.",
    bringAuction:
      "Trae tu licencia de conducir y una idea de lo que buscas. Acordamos una lista corta y un tope antes de pujar por nada.",
    bringTestDrive:
      "Trae tu licencia de conducir, comprobante de ingresos y comprobante de domicilio. No te comprometes a nada hasta que firmes en el lote.",
    weAreAt: "Estamos en",
    couldNotLoad: "No se pudieron cargar los horarios.",
    couldNotBook: "No se pudo agendar ese horario.",
  },

  auction: {
    metaTitle: "Acceso a Subastas — compra con nuestra licencia de dealer",
    metaDescription:
      "Tú no puedes registrarte para pujar en Copart ni ADESA. Nosotros sí. Una tarifa fija pone nuestra licencia de dealer y nuestro criterio detrás de tu próximo auto.",
    eyebrow: "Acceso a Subastas",
    title1: "Tú no puedes pujar en la subasta.",
    title2: "Nosotros tenemos la licencia que sí.",
    lede: (fee: string) =>
      `Las subastas mayoristas están cerradas al público. Por ${fee} fijos ponemos nuestra licencia de dealer y nuestro criterio detrás de tu próximo auto: más de 10,000 vehículos por semana, a precios muy por debajo de lo que puede ofrecer un lote al público.`,
    licensedToBid: "Con licencia para pujar en",
    oneOff: "Pago único · por búsqueda · no reembolsable",
    blockedTail: "El Acceso a Subastas no se puede comprar hasta resolver eso.",
    covers: "Qué incluye la tarifa",
    doesnt: "Qué no incluye",
    eitherWay:
      "Te lo decimos aquí y no en un recibo después. Puedes pagar de contado lo que ganemos o financiarlo con nosotros al 0% — la tarifa es la misma en ambos casos, y comprarla no te obliga a ninguno.",
    inPerson: "Esto lo hacemos en persona",
    inPersonLede:
      "Una vez adentro, agendas una hora y vienes a la oficina. Repasamos qué necesitas de verdad, cuánto debería costar y en qué número nos detenemos — antes de pujar por nada.",
    openInMaps: "Abrir en Google Maps →",
    active: "El Acceso a Subastas está activo en tu cuenta.",
    activeLede: "Elige una hora y repasamos lo que andas buscando.",
    buy: (fee: string) => `Pagar ${fee} — obtener acceso`,
    buyNote:
      "Tarifa única, no reembolsable — paga el trabajo, que se hace se gane o no un auto. Apple Pay disponible al pagar.",
    pending:
      "Recibimos tu pago — lo estamos confirmando con Stripe. Tus opciones para agendar aparecen aquí en cuanto se confirme.",
    couldNotStart: "No se pudo abrir el pago.",
    includes: [
      "Acceso a subastas mayoristas de dealers, pujando con nuestra licencia",
      "Preseleccionamos autos según lo que realmente quieres y puedes pagar",
      "Revisión del reporte de condición e inspección antes de cualquier puja",
      "Pujamos por ti, y paramos donde acordamos parar",
      "Título, transporte y papeleo resueltos después del martillo",
    ],
    excludes: [
      "El precio del auto y los cargos del comprador de la subasta",
      "Impuesto, título y placas, que se cotizan cuando se gana un auto",
      "Cualquier garantía de ganar un auto específico a un precio específico",
    ],
  },

  budget: {
    worksheet: "Calculadora",
    noInterest: "0% APR — sin intereses",
    feesIncluded: "impuesto, título y cargos incluidos",
    cashDownToday: "Entrada hoy",
    monthlyCeiling: "Tope mensual",
    ceilingNote:
      "Un tope, no un deseo. Partimos de lo que puedes seguir pagando — impuesto, título, placas y doc fee ya contados. Nada se va en intereses.",
    canShopUpTo: "Te alcanza hasta",
    outTheDoorIn: (state: string) =>
      `Precio final, en ${state} — el precio completo, no uno al que después le suman cargos. Es un auto de`,
    carOnce: "una vez que salen impuesto, título y doc fee.",
    seeWhatsOnLot: "Ver qué hay en el lote →",
    nothingFits:
      "Hoy no hay nada en el lote que entre en ese presupuesto. El lote se mueve cada semana —",
    seeEverything: "mira todo lo que tenemos",
    carsFit: (n: number) =>
      `${n} ${n === 1 ? "auto entra" : "autos entran"} en el lote`,
    seeWholeLot: "Ver todo el lote →",
  },

  waitlist: {
    onTheList: "Ya estás en la lista.",
    weWillEmail: "Le escribimos a",
    whenSomethingLands:
      "cuando llegue al lote un auto que te sirva. Nada más, nunca.",
  },

  contact: {
    button: "Contáctanos",
    buttonWithQuote: "Enviar esto por WhatsApp",
    greeting: "Hola MGM Auto 👋",
    interestedIn: "Me interesa este auto:",
    myPlan: "El plan que armé:",
    down: "Entrada",
    monthly: "Cuota mensual",
    term: "Plazo",
    outTheDoor: "Precio final",
    months: "meses",
    zeroApr: "0% APR, sin cargo por financiamiento",
    lookingWithBudget: "Busco un auto con este presupuesto:",
    maxMonthly: "Cuota máxima que puedo pagar",
    reaches: "Me alcanza hasta",
    general: "Quiero información sobre un auto.",
  },

  footer: {
    repLabel: "Ejemplo representativo",
    repBody: (parts) =>
      `Mazda3 2014, 69,000 millas, Florida Central. Precio final ${parts.otd} incluyendo impuesto, título, placas y doc fee. ${parts.down} de entrada; monto financiado ${parts.financed}; tasa de porcentaje anual ${parts.apr}; ${parts.n} pagos mensuales de ${parts.monthly} y un pago final de ${parts.final}; total de pagos ${parts.total}; cargo por financiamiento ${parts.charge}. Tus condiciones dependen de la verificación de tus ingresos, domicilio y pago inicial.`,
    creditor:
      "MGM Auto es el vendedor y el acreedor de cada vehículo que publica: concesionario de vehículos con licencia y vendedor a plazos autorizado. Compramos los autos, tenemos el título y tenemos el contrato. No se lo vendemos a ningún banco.",
    reported:
      "El historial, el millaje y la condición del vehículo se reportan tal como los recibimos del vendedor y de nuestra propia inspección. Todos los precios en dólares estadounidenses.",
  },
};
