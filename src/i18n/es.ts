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
    cars: "Marketplace",
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
    // Sin plazo aquí a propósito: "hasta en tres años" es un término
    // disparador de Reg Z, y el encabezado ya no lleva la divulgación.
    lede: "Compramos los autos, tenemos el título y llevamos el financiamiento nosotros mismos. Cada auto del marketplace muestra su precio final completo, y puedes dividir ese mismo precio en cuotas mensuales sin pagar un centavo de interés.",
    seeCars: "Ver el marketplace",
    seeAuctions: "Acceso a subastas",
    onTheLotNow: "En el lote ahora",
    allCars: (n: number) => `Ver los ${n} autos →`,
    onTheLotLede:
      "Autos nuestros, inspeccionados y con título. El precio de cada uno es el precio final — impuesto, título, placas y doc fee incluidos.",
    auctionsTitle: "Compramos donde compran los grandes.",
    auctionsLede:
      "Las subastas mayoristas están cerradas al público. Nuestra licencia de dealer nos deja pujar en las tres, y de ahí salen los precios de este lote.",
    auctionsOpen: "Abrir sitio",
    inPerson: "Esto lo hacemos en persona",
    inPersonLede:
      "Agendas una hora y vienes a la oficina. Repasamos qué necesitas de verdad, cuánto debería costar y cómo lo vas a pagar — antes de firmar nada.",
    openInMaps: "Abrir en Google Maps →",
  },

  cars: {
    howTitle: "Cómo se compra aquí",
    steps: [
      { title: "Eliges un auto", body: "Cada precio es el precio final: impuesto, título, placas y doc fee ya incluidos." },
      { title: "Armas tu pago", body: "Lo pagas completo o divides ese mismo precio en los meses que elijas. 0% APR, al centavo." },
      { title: "Hablas con un asesor", body: "Eliges día y hora; tu plan y tu cita nos llegan por WhatsApp." },
      { title: "Lo manejas y firmas", body: "Vienes a la oficina, lo manejas y firmas ahí mismo. Somos el vendedor y el acreedor — no se lo vendemos a ningún banco." },
    ],
    eyebrow: "Marketplace",
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
    mileageUnknown: "Millaje por confirmar",
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
    mileageUnknown: "millaje por confirmar",
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
    transmissions: { automatic: "automática", manual: "manual" },
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

  account: {
    metaTitle: "Mi cuenta — MGM Auto",
    eyebrow: "Mi cuenta",
    title: "Tu expediente",
    lede: "Nunca pedimos un puntaje de crédito. Lo que importa es lo que ganas, lo que puedes dar de entrada y si la cuota te deja espacio para un mes malo.",
    signInTitle: "Inicia sesión para empezar",
    signInLede: "Tu correo y un código, o tu passkey. Sin consulta de crédito para crear la cuenta y sin puntaje de crédito en ningún paso — evaluamos capacidad de pago, no un historial que este mercado casi nunca tiene.",
    signIn: "Iniciar sesión",
    loading: "Cargando…",
    yourDetails: "Tus datos",
    signedInAs: "Sesión iniciada como",
    fullName: "Nombre completo",
    street: "Dirección",
    city: "Ciudad",
    state: "Estado",
    zip: "Código postal",
    notOpenIn: (state: string, open: string) =>
      `Todavía no operamos en ${state}. Impuesto, título y el formato del contrato cambian por estado, así que preferimos decirlo a cotizar un número que cambia al firmar. Por ahora: ${open}.`,
    howPaid: "Cómo te pagan",
    select: "Elige…",
    employment: {
      w2_fulltime: "W-2, tiempo completo",
      w2_parttime: "W-2, medio tiempo",
      "1099": "1099 / contratista",
      cash: "En efectivo",
      benefits: "Beneficios o ingreso fijo",
      self_employed: "Independiente",
    },
    employer: "Empleador",
    monthsAtJob: "Meses en este trabajo",
    grossIncome: "Ingreso mensual bruto ($)",
    grossIncomeHint: "Antes de deducciones, no lo que te llega.",
    cashDown: "Efectivo que puedes dar de entrada ($)",
    verification: "Verificación",
    identity: "Identidad",
    income: "Ingresos",
    residence: "Domicilio",
    verificationNote: "Escribir una cifra aquí es una solicitud, no una prueba. Un plan financiado necesita identidad e ingresos verificados antes — pagar completo no.",
    capNote: (income: string, cap: string) =>
      `Con ${income} al mes, lo máximo que podrías aprobar es ${cap} al mes — un tope firme del 20% de cuota sobre ingreso.`,
    save: "Guardar",
    saving: "Guardando…",
    saved: "Guardado.",
    badIncome: "El ingreso mensual bruto debe ser una cifra en dólares, como 2400 o 2400.50.",
    badDown: "El efectivo disponible debe ser una cifra en dólares.",
    couldNotLoad: "No se pudo cargar tu perfil.",
    couldNotSave: "No se pudo guardar tu perfil.",
  },

  gallery: {
    viewLarger: "Ver más grande",
    close: "Cerrar",
    previous: "Foto anterior",
    next: "Foto siguiente",
    photo: (n: number, total: number) => `foto ${n} de ${total}`,
    more: (label: string) => `Fotos del ${label}`,
  },

  price: {
    heading: "Qué incluye el precio",
    lede: "El número completo, no un precio al que después le suman cargos. Toca ? en cualquier línea para ver en qué se basa.",
    why: "¿En qué se basa?",
    source: "Ver la fuente",
    vehicleWhy: "El precio del auto en sí, fijado por MGM Auto. Es la cifra de la tarjeta y no cambia en el escritorio.",
    taxWhy: (stateRate: string, surtaxRate: string | null, cap: string | null) =>
      surtaxRate
        ? `Impuesto de ventas de Florida del ${stateRate}, más el surtax discrecional del condado del ${surtaxRate}, que aplica solo a los primeros ${cap} del precio. El surtax sigue al condado donde registres el auto, así que se confirma con tu dirección al firmar.`
        : `Impuesto estatal de ventas de vehículos del ${stateRate} sobre el precio del auto.`,
    docWhy: "El cargo por documentación (pre-delivery service fee) del concesionario. Florida no lo limita, pero exige divulgarlo y cobrarlo igual a todos los clientes — es el mismo para todos.",
    titleWhy: "Título, placa y primer registro con el estado, según la tabla de tarifas del DMV. Es un estimado: el monto exacto depende de tu registro y se ajusta al firmar.",
    nothingElse: "Eso es todo. No hay ningún otro cargo.",
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
    /** Still used by the Auction Access checkout, not by the plan builder. */
    opening: "Abriendo el pago…",
    signIn: "Inicia sesión para continuar",
    financed: "Financiado",
    interestRow: "Interés",
    youPayInTotal: "Pagas en total",
    comparisonLabel: "No lo ofrecemos aquí —",
    comparison: (rate: string, monthly: string, extra: string) =>
      `con una tasa típica de ${rate} en un lote buy-here-pay-here, este auto saldría en ${monthly}/mes y costaría ${extra} más en intereses. Ése es el dinero que te quedas.`,
  },

  visit: {
    sheetTitle: "¿Cuándo quieres venir a verlo?",
    sheetLede: "Elige un día y una hora. Un asesor lo confirma por WhatsApp.",
    pickDay: "Elige el día",
    pickTime: "Elige la hora",
    chosen: "Tu cita:",
    sendWith: "Enviar mi plan y esta cita por WhatsApp",
    sendWithout: "Enviar sin cita",
    none: "No hay horarios en las próximas dos semanas. Envía sin cita y lo cuadramos por WhatsApp.",
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
    howTitle: "Cómo funciona el servicio",
    steps: [
      { title: "Pagas el acceso", body: "Un pago único, por búsqueda. Paga el trabajo, se gane o no un auto." },
      { title: "Nos sentamos contigo", body: "Agendas una hora en la oficina. Acordamos qué buscar, cuánto debería costar y dónde nos detenemos." },
      { title: "Pujamos por ti", body: "Primero el reporte de condición y la inspección. Paramos donde acordamos parar." },
      { title: "Título y papeleo", body: "Después del martillo nos encargamos del título, el transporte y los papeles. Lo pagas de contado o lo financias con nosotros al 0%." },
    ],
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

  contact: {
    talkToAgent: "Hablar con un asesor por WhatsApp",
    talkToAgentNote:
      "Elige día y hora para venir a verlo. Tu plan y tu cita van en el mensaje tal como los armaste; un asesor confirma ambos por WhatsApp — desde esta página no se cobra nada.",
    whatsapp: "WhatsApp",
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
    visit: "Cita que prefiero",
    auctionIntro: "Quiero Acceso a Subastas.",
    auctionFee: "Tarifa de acceso",
    auctionFor: "El auto es para",
    auctionBudget: "Presupuesto total para el auto",
    auctionWanted: "Busco",
    auctionPayment: "Cómo lo pagaría",
    auctionWhen: "Cuándo",
    auctionName: "Nombre",
  },

  enquiry: {
    title: "Cuéntanos qué buscas",
    lede: "Cinco respuestas rápidas para que el asesor arranque con el auto correcto. Todo va en un solo mensaje de WhatsApp.",
    note: "Un asesor te responde por WhatsApp y agenda tu hora en la oficina. Desde esta página no se cobra nada.",
    forWhomQ: "¿Para quién es el auto?",
    forMe: "Para mí",
    forDealer: "Soy dealer / revendedor",
    budgetQ: "Presupuesto total para el auto",
    budgetHint: "Precio final — auto, cargos e impuesto. Un tope, no un deseo.",
    wantedQ: "¿Qué buscas?",
    wantedHint: "p. ej. Toyota Corolla 2016–2019, menos de 90k millas",
    paymentQ: "¿Cómo lo pagarías?",
    payCash: "De contado",
    payPlan: "Financiado con MGM al 0%",
    whenQ: "¿Cuándo quieres empezar?",
    whenWeek: "Esta semana",
    whenMonth: "Este mes",
    whenLooking: "Solo estoy mirando",
    nameQ: "Tu nombre (opcional)",
    feeLine: (fee: string) => `Tarifa de acceso ${fee} · pago único, por búsqueda · se paga en la oficina`,
    send: "Enviar por WhatsApp",
    incomplete: "Responde las cuatro preguntas de arriba y el botón se activa.",
  },

  footer: {
    follow: "Síguenos",
    creditor:
      "MGM Auto es el vendedor y el acreedor de cada vehículo que publica — concesionario de vehículos con licencia y vendedor a plazos autorizado.",
  },
};
