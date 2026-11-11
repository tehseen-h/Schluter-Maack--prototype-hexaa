// Every figure on screen is worked out here, never typed by hand: net weights from
// gross, tare and dockage, pounds from kilograms, amounts from pounds and price, the
// running total against the contract, dates and their weekdays from the calendar.
// The only wrong values in the demo are the faults planted on purpose. Each one is
// listed under FAULTS below, so a reader can see what is wrong and why.

// ── Formatting ───────────────────────────────────────────────────────────────
const round = (x: number, dp = 0) => Math.round((x + Number.EPSILON) * 10 ** dp) / 10 ** dp
const grp = (x: number, dp = 0) =>
  x.toLocaleString('en-CA', { minimumFractionDigits: dp, maximumFractionDigits: dp })
export const kg = (x: number) => `${grp(x)} kg`
export const num = (x: number) => grp(x)
export const lbs = (x: number) => `${grp(x)} lb`
export const tonnes = (x: number) => `${grp(x / 1000, 3)} t`
export const cad = (x: number) => 'C$' + grp(x, 2)
export const cents = (x: number) => `${x.toFixed(2)} ¢/lb`

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`)
/** "22 Sep 2026" */
export const dmy = (iso: string) => {
  const d = toDate(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
/** "22 Sep" */
export const dmyShort = (iso: string) => dmy(iso).slice(0, 6)
/** "Tue 22 Sep" */
export const dayShort = (iso: string) => {
  const d = toDate(iso)
  return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`
}

// ── Units ────────────────────────────────────────────────────────────────────
// Receipts are weighed in kilograms. Contracts are priced in cents per pound.
// The tool normalises one to the other, so the conversion is written down once.
export const LB_PER_KG = 2.20462262
export const toLb = (kgs: number) => round(kgs * LB_PER_KG)
/** Dollars for a weight in lb at a price in cents per lb, to the cent. */
export const amount = (lb: number, cPerLb: number) => round((lb * cPerLb) / 100, 2)

// ── A receipt: one truck, one weighing ───────────────────────────────────────
export interface Receipt {
  /** Short id used in documents.ts, e.g. "er1". */
  id: string
  no: string
  date: string
  producer: string
  contractRef: string
  commodity: string
  grade: string
  gross: number
  tare: number
  /** gross minus tare */
  net: number
  dockagePct: number
  dockageKg: number
  /** net minus dockage: what the receipt SHOULD say */
  netClean: number
  /** What the receipt actually prints. Equals netClean unless a fault is planted. */
  printedNetClean: number
  weighmaster: string
}

function receipt(
  id: string,
  no: string,
  date: string,
  producer: string,
  contractRef: string,
  commodity: string,
  grade: string,
  gross: number,
  tare: number,
  dockagePct: number,
  weighmaster: string,
  printedNetClean?: number,
): Receipt {
  const net = gross - tare
  const dockageKg = round((net * dockagePct) / 100)
  const netClean = net - dockageKg
  return {
    id,
    no,
    date,
    producer,
    contractRef,
    commodity,
    grade,
    gross,
    tare,
    net,
    dockagePct,
    dockageKg,
    netClean,
    printedNetClean: printedNetClean ?? netClean,
    weighmaster,
  }
}

// ── A contract ───────────────────────────────────────────────────────────────
export interface Contract {
  no: string
  signed: string
  producer: string
  place: string
  commodity: string
  /** Grade the price is quoted on. */
  gradeBasis: string
  /** Grade discount for the next grade down, cents per lb. */
  gradeDown: string
  gradeDownCents: number
  qtyKg: number
  tolPct: number
  minKg: number
  maxKg: number
  cents: number
  periodFrom: string
  periodTo: string
}

function contract(
  no: string,
  signed: string,
  producer: string,
  place: string,
  commodity: string,
  gradeBasis: string,
  gradeDown: string,
  gradeDownCents: number,
  qtyKg: number,
  tolPct: number,
  centsPerLb: number,
  periodFrom: string,
  periodTo: string,
): Contract {
  return {
    no,
    signed,
    producer,
    place,
    commodity,
    gradeBasis,
    gradeDown,
    gradeDownCents,
    qtyKg,
    tolPct,
    minKg: round(qtyKg * (1 - tolPct / 100)),
    maxKg: round(qtyKg * (1 + tolPct / 100)),
    cents: centsPerLb,
    periodFrom,
    periodTo,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  THE MAIN SET: one contract, four loads, planted faults
// ═════════════════════════════════════════════════════════════════════════════
export const MAIN: Contract = contract(
  'SM-CA-26-0417',
  '2026-03-12',
  'Kozak Prairie Farms Ltd.',
  'Edenwold, SK',
  'Yellow Mustard',
  'No. 1 Canada',
  'No. 2 Canada',
  1.5,
  60000,
  5,
  47.5,
  '2026-09-15',
  '2026-10-31',
)

export const mainLoads: Receipt[] = [
  receipt('er1', 'ER-204871', '2026-09-22', MAIN.producer, MAIN.no, MAIN.commodity, 'No. 1 Canada', 31280, 14820, 1.2, 'T. Ledoux'),
  // FAULT 2 (grade): this load graded No. 2 Canada, the contract price assumes No. 1.
  receipt('er2', 'ER-205310', '2026-10-02', MAIN.producer, MAIN.no, MAIN.commodity, 'No. 2 Canada', 31540, 14960, 1.8, 'T. Ledoux'),
  // FAULT 3 (weight arithmetic): net clean printed 300 kg too high (see printed below).
  receipt('er3', 'ER-205774', '2026-10-16', MAIN.producer, MAIN.no, MAIN.commodity, 'No. 1 Canada', 31020, 14880, 1.0, 'M. Fontaine', undefined),
  receipt('er4', 'ER-206192', '2026-10-29', MAIN.producer, MAIN.no, MAIN.commodity, 'No. 1 Canada', 31760, 14900, 1.5, 'T. Ledoux'),
]
// Plant fault 3 on the third receipt: the printed net clean is 300 kg above the worked-out one.
mainLoads[2].printedNetClean = mainLoads[2].netClean + 300

/** Running total of net clean kg after each load, using the WORKED OUT weights. */
export const running: number[] = []
mainLoads.reduce((acc, r) => {
  const t = acc + r.netClean
  running.push(t)
  return t
}, 0)
export const mainTotalKg = running[running.length - 1]
/** FAULT 1 (quantity): the loads add up to more than the contract maximum. */
export const overKg = mainTotalKg - MAIN.maxKg
/** Where the last load crosses the maximum: kg of it still inside the maximum, and kg above. */
export const l4Inside = MAIN.maxKg - running[2]
export const l4Over = mainLoads[3].netClean - l4Inside

// FAULT 4 (price in NAV): the contract as recorded in NAV carries a price keyed 1.75 ¢/lb low.
export const NAV_CENTS = 45.75
export const navGapCents = round(MAIN.cents - NAV_CENTS, 2)
export const navGapDollars = amount(toLb(mainTotalKg), navGapCents)

// ── The settlement, worked out line by line ──────────────────────────────────
export interface SettleLine {
  /** Stable id. */
  id: string
  receiptNo: string
  /** What this line covers, in plain words. */
  what: string
  kg: number
  lb: number
  cents: number
  /** The working, e.g. "35,853 lb x 47.50 ¢/lb". */
  working: string
  amount: number
  state: 'ready' | 'held'
  /** Why it is held, for a held line. */
  why?: string
}

const l = mainLoads
const line = (
  id: string,
  r: Receipt,
  what: string,
  kgs: number,
  c: number,
  state: 'ready' | 'held',
  why?: string,
): SettleLine => {
  const lb = toLb(kgs)
  return {
    id,
    receiptNo: r.no,
    what,
    kg: kgs,
    lb,
    cents: c,
    working: `${lbs(lb)} x ${c.toFixed(2)} ¢/lb`,
    amount: amount(lb, c),
    state,
    why,
  }
}

export const mainSettlement: SettleLine[] = [
  line('s1', l[0], 'Whole load, No. 1 Canada', l[0].netClean, MAIN.cents, 'ready'),
  line(
    's2',
    l[1],
    'Whole load, No. 2 Canada, less the grade discount',
    l[1].netClean,
    round(MAIN.cents - MAIN.gradeDownCents, 2),
    'held',
    'Needs the merchandiser to accept the lower grade',
  ),
  line('s3', l[2], 'Whole load, on the worked-out weight', l[2].netClean, MAIN.cents, 'ready'),
  line('s4', l[3], 'First part, up to the contract maximum', l4Inside, MAIN.cents, 'ready'),
  line(
    's5',
    l[3],
    'Last part, above the contract maximum',
    l4Over,
    MAIN.cents,
    'held',
    'No agreed price: amend the contract, agree a spot price or send it back',
  ),
]
export const readyTotal = round(mainSettlement.filter((s) => s.state === 'ready').reduce((a, s) => a + s.amount, 0), 2)
export const heldTotal = round(mainSettlement.filter((s) => s.state === 'held').reduce((a, s) => a + s.amount, 0), 2)
export const preparedTotal = round(readyTotal + heldTotal, 2)
/** What the grade discount takes off load 2, shown on its own for the finding. */
export const gradeDiscountDollars = amount(toLb(l[1].netClean), MAIN.gradeDownCents)
/** What the 300 kg arithmetic slip would have added at the contract price. */
export const weightSlipDollars = amount(toLb(300), MAIN.cents)
/** Value of the kilograms above the maximum at the contract price. */
export const overDollars = amount(toLb(overKg), MAIN.cents)

// ═════════════════════════════════════════════════════════════════════════════
//  THE CLEAN SET: a second producer, brown mustard, two loads, nothing wrong
// ═════════════════════════════════════════════════════════════════════════════
export const CLEAN: Contract = contract(
  'SM-CA-26-0388',
  '2026-02-19',
  'Brightwater Seed Co.',
  'Balgonie, SK',
  'Brown Mustard',
  'No. 1 Canada',
  'No. 2 Canada',
  1.25,
  32000,
  5,
  44.25,
  '2026-09-15',
  '2026-10-31',
)
export const cleanLoads: Receipt[] = [
  receipt('c-er1', 'ER-204990', '2026-09-28', CLEAN.producer, CLEAN.no, CLEAN.commodity, 'No. 1 Canada', 30460, 14720, 0.9, 'T. Ledoux'),
  receipt('c-er2', 'ER-205548', '2026-10-13', CLEAN.producer, CLEAN.no, CLEAN.commodity, 'No. 1 Canada', 30720, 14740, 1.1, 'M. Fontaine'),
]
export const cleanTotalKg = cleanLoads.reduce((a, r) => a + r.netClean, 0)
export const cleanSettlement: SettleLine[] = cleanLoads.map((r, i) =>
  line(`c${i + 1}`, r, 'Whole load, No. 1 Canada', r.netClean, CLEAN.cents, 'ready'),
)
export const cleanTotal = round(cleanSettlement.reduce((a, s) => a + s.amount, 0), 2)
export const cleanLb = toLb(cleanTotalKg)

// ═════════════════════════════════════════════════════════════════════════════
//  THE BLOCKED SET: two receipts that name a contract nobody has on file
// ═════════════════════════════════════════════════════════════════════════════
export const BLOCKED_REF = 'SM-CA-26-0452'
export const BLOCKED_PRODUCER = 'Redwood Acres Ltd.'
export const blockedLoads: Receipt[] = [
  receipt('b-er1', 'ER-206041', '2026-10-26', BLOCKED_PRODUCER, BLOCKED_REF, 'Yellow Mustard', 'No. 1 Canada', 30940, 14860, 1.3, 'T. Ledoux'),
  receipt('b-er2', 'ER-206233', '2026-11-02', BLOCKED_PRODUCER, BLOCKED_REF, 'Yellow Mustard', 'No. 1 Canada', 31180, 14880, 1.1, 'M. Fontaine'),
]
export const blockedTotalKg = blockedLoads.reduce((a, r) => a + r.netClean, 0)

// ═════════════════════════════════════════════════════════════════════════════
//  The contract sheet (Excel): every open contract, delivered so far against it
// ═════════════════════════════════════════════════════════════════════════════
export interface SheetRow {
  c: Contract
  deliveredKg: number
  /** Derived, not typed. */
  state: 'not-started' | 'filling' | 'filled' | 'over'
}
const sheetContract = (
  no: string,
  producer: string,
  place: string,
  commodity: string,
  qtyKg: number,
  centsPerLb: number,
  deliveredKg: number,
): SheetRow => {
  const c = contract(no, '2026-03-01', producer, place, commodity, 'No. 1 Canada', 'No. 2 Canada', 1.5, qtyKg, 5, centsPerLb, '2026-09-15', '2026-10-31')
  const state = deliveredKg === 0 ? 'not-started' : deliveredKg > c.maxKg ? 'over' : deliveredKg >= c.minKg ? 'filled' : 'filling'
  return { c, deliveredKg, state }
}
export const sheet: SheetRow[] = [
  { c: MAIN, deliveredKg: mainTotalKg, state: mainTotalKg > MAIN.maxKg ? 'over' : 'filled' },
  { c: CLEAN, deliveredKg: cleanTotalKg, state: cleanTotalKg > CLEAN.maxKg ? 'over' : cleanTotalKg >= CLEAN.minKg ? 'filled' : 'filling' },
  sheetContract('SM-CA-26-0401', 'Lindqvist Farms Ltd.', 'Lumsden, SK', 'Yellow Mustard', 30000, 47.5, 30412),
  sheetContract('SM-CA-26-0409', 'Marchand Grain Ltd.', 'Qu’Appelle, SK', 'Brown Mustard', 25000, 44.25, 12480),
  sheetContract('SM-CA-26-0414', 'Tessier Farms Inc.', 'Indian Head, SK', 'Yellow Mustard', 45000, 47.5, 31150),
  sheetContract('SM-CA-26-0422', 'Sandhu Brothers Farms', 'Balgonie, SK', 'Yellow Mustard', 20000, 47.75, 0),
  sheetContract('SM-CA-26-0430', 'Hollis Ag Ltd.', 'Pilot Butte, SK', 'Brown Mustard', 35000, 44.25, 34860),
  sheetContract('SM-CA-26-0436', 'Fenwick Grain Co.', 'Regina, SK', 'Yellow Mustard', 40000, 47.5, 18240),
]
