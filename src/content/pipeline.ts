import type { Stage } from '../lib/simulate'
import {
  BLOCKED_REF,
  CLEAN,
  MAIN,
  NAV_CENTS,
  blockedLoads,
  cents,
  cleanLoads,
  cleanTotalKg,
  dmy,
  kg,
  l4Over,
  mainLoads,
  mainTotalKg,
  num,
  overKg,
} from './figures'

// The run, in S&M's own words. Each stage says what is on screen while it runs: a paper being
// read field by field, the loads being added against the contract, the settlement being
// written out. The check results ("notes") appear one by one as the stage runs. There is no
// real logic: we wrote these papers, so we know what is in them.

/** The fields read off a receipt, in the order a person would read them. */
const receiptKeys = (id: string) => [
  `${id}_no`,
  `${id}_contract`,
  `${id}_grade`,
  `${id}_gross`,
  `${id}_tare`,
  `${id}_dockage`,
  `${id}_net_clean`,
]

/** The generic list, used only if a case has no stages of its own. */
export const pipeline: Stage[] = [
  { id: 'received', label: 'Contract and receipts received', ms: 500 },
  { id: 'read', label: 'Reading every paper', ms: 1200 },
  { id: 'match', label: 'Matching each receipt to its contract', ms: 900 },
  { id: 'weights', label: 'Checking weights, grade and price', ms: 1200 },
  { id: 'settle', label: 'Working out the settlement', ms: 900 },
  { id: 'raise', label: 'Raising what disagrees', ms: 600 },
]

const [e1, e2, e3, e4] = mainLoads

export const mainStages: Stage[] = [
  {
    id: 'm-contract',
    label: `Reading the executed contract ${MAIN.no}`,
    ms: 600,
    show: { read: 'contract', keys: ['c_no', 'c_signed', 'c_producer', 'c_commodity', 'c_grade', 'c_qty', 'c_price', 'c_period'] },
    notes: [
      { text: `Contract ${MAIN.no} with ${MAIN.producer}, signed ${dmy(MAIN.signed)}`, tone: 'ok' },
      { text: `Allowed: ${kg(MAIN.minKg)} to ${kg(MAIN.maxKg)} (${kg(MAIN.qtyKg)}, ${MAIN.tolPct}% either way)`, tone: 'ok' },
    ],
  },
  {
    id: 'm-er1',
    label: `Reading Elevator Receipt ${e1.no}`,
    ms: 600,
    show: { read: 'er1', keys: receiptKeys('er1') },
    notes: [
      { text: `${e1.no} names ${MAIN.no} and the same producer`, tone: 'ok' },
      { text: `Weights add up: ${num(e1.gross)} less ${num(e1.tare)} less ${num(e1.dockageKg)} is ${num(e1.netClean)} kg`, tone: 'ok' },
    ],
  },
  {
    id: 'm-er2',
    label: `Reading Elevator Receipt ${e2.no}`,
    ms: 600,
    show: { read: 'er2', keys: receiptKeys('er2') },
    notes: [
      { text: `${e2.no} names ${MAIN.no} and the same producer`, tone: 'ok' },
      { text: `${e2.no} is graded ${e2.grade}. The contract price is on ${MAIN.gradeBasis}`, tone: 'flag' },
    ],
  },
  {
    id: 'm-er3',
    label: `Reading Elevator Receipt ${e3.no}`,
    ms: 600,
    show: { read: 'er3', keys: receiptKeys('er3') },
    notes: [
      { text: `${e3.no} names ${MAIN.no} and the same producer`, tone: 'ok' },
      { text: `${e3.no} prints ${num(e3.printedNetClean)} kg net clean. Gross less tare less dockage is ${num(e3.netClean)} kg`, tone: 'flag' },
    ],
  },
  {
    id: 'm-er4',
    label: `Reading Elevator Receipt ${e4.no}`,
    ms: 600,
    show: { read: 'er4', keys: receiptKeys('er4') },
    notes: [
      { text: `${e4.no} names ${MAIN.no} and the same producer`, tone: 'ok' },
      { text: `Weights add up: ${num(e4.gross)} less ${num(e4.tare)} less ${num(e4.dockageKg)} is ${num(e4.netClean)} kg`, tone: 'ok' },
    ],
  },
  {
    id: 'm-nav',
    label: `Checking the contract as recorded in NAV`,
    ms: 600,
    show: { read: 'nav', keys: ['n_no', 'n_producer', 'n_commodity', 'n_qty', 'n_price', 'n_period'] },
    notes: [
      { text: 'Producer, grain, quantity and delivery period agree with the signed contract', tone: 'ok' },
      { text: `NAV holds ${cents(NAV_CENTS)}. The signed contract says ${cents(MAIN.cents)}`, tone: 'flag' },
    ],
  },
  {
    id: 'm-loads',
    label: 'Adding the loads against the contract',
    ms: 600,
    show: { panel: 'loads' },
    notes: [
      { text: `All four loads were delivered inside the delivery period`, tone: 'ok' },
      { text: `Running total reaches ${kg(mainTotalKg)}, ${kg(overKg)} above the ${kg(MAIN.maxKg)} maximum`, tone: 'flag' },
    ],
  },
  {
    id: 'm-settle',
    label: 'Working out the settlement',
    ms: 600,
    show: { panel: 'settlement' },
    notes: [
      { text: `Kilograms converted to pounds, priced at the signed ${cents(MAIN.cents)}`, tone: 'ok' },
      { text: `${kg(l4Over)} of the last load and all of ${e2.no} are held for a decision`, tone: 'flag' },
    ],
  },
  {
    id: 'm-raise',
    label: 'Raising what disagrees, and who it goes to',
    ms: 900,
    notes: [{ text: 'Four mismatches raised and routed, each with both papers side by side', tone: 'flag' }],
  },
]

const [c1, c2] = cleanLoads

export const cleanStages: Stage[] = [
  {
    id: 'c-contract',
    label: `Reading the executed contract ${CLEAN.no}`,
    ms: 600,
    show: { read: 'c2-contract', keys: ['c2_no', 'c2_signed', 'c2_producer', 'c2_commodity', 'c2_grade', 'c2_qty', 'c2_price', 'c2_period'] },
    notes: [
      { text: `Contract ${CLEAN.no} with ${CLEAN.producer}, signed ${dmy(CLEAN.signed)}`, tone: 'ok' },
      { text: `Allowed: ${kg(CLEAN.minKg)} to ${kg(CLEAN.maxKg)}`, tone: 'ok' },
    ],
  },
  {
    id: 'c-er1',
    label: `Reading Elevator Receipt ${c1.no}`,
    ms: 600,
    show: { read: c1.id, keys: receiptKeys(c1.id) },
    notes: [
      { text: `${c1.no} names ${CLEAN.no} and the same producer`, tone: 'ok' },
      { text: `Weights add up: ${num(c1.gross)} less ${num(c1.tare)} less ${num(c1.dockageKg)} is ${num(c1.netClean)} kg`, tone: 'ok' },
    ],
  },
  {
    id: 'c-er2',
    label: `Reading Elevator Receipt ${c2.no}`,
    ms: 600,
    show: { read: c2.id, keys: receiptKeys(c2.id) },
    notes: [
      { text: `${c2.no} names ${CLEAN.no} and the same producer`, tone: 'ok' },
      { text: `Weights add up: ${num(c2.gross)} less ${num(c2.tare)} less ${num(c2.dockageKg)} is ${num(c2.netClean)} kg`, tone: 'ok' },
    ],
  },
  {
    id: 'c-nav',
    label: 'Checking the contract as recorded in NAV',
    ms: 1100,
    notes: [{ text: 'Price, quantity and delivery period in NAV agree with the signed contract', tone: 'ok' }],
  },
  {
    id: 'c-loads',
    label: 'Adding the loads against the contract',
    ms: 600,
    show: { panel: 'loads' },
    notes: [{ text: `Running total ${kg(cleanTotalKg)}, inside ${kg(CLEAN.minKg)} to ${kg(CLEAN.maxKg)}`, tone: 'ok' }],
  },
  {
    id: 'c-settle',
    label: 'Working out the settlement',
    ms: 600,
    show: { panel: 'settlement' },
    notes: [{ text: `Priced at the contract ${cents(CLEAN.cents)}. Nothing held`, tone: 'ok' }],
  },
]

const [b1, b2] = blockedLoads

export const blockedStages: Stage[] = [
  {
    id: 'b-er1',
    label: `Reading Elevator Receipt ${b1.no}`,
    ms: 600,
    show: { read: b1.id, keys: receiptKeys(b1.id) },
    notes: [{ text: `${b1.no} names contract ${BLOCKED_REF} for ${b1.producer}`, tone: 'ok' }],
  },
  {
    id: 'b-er2',
    label: `Reading Elevator Receipt ${b2.no}`,
    ms: 600,
    show: { read: b2.id, keys: receiptKeys(b2.id) },
    notes: [{ text: `${b2.no} names the same contract, ${BLOCKED_REF}`, tone: 'ok' }],
  },
  {
    id: 'b-look',
    label: `Looking for contract ${BLOCKED_REF}`,
    ms: 2200,
    notes: [
      { text: `No contract ${BLOCKED_REF} in NAV`, tone: 'flag' },
      { text: 'Not on the contract sheet either', tone: 'flag' },
    ],
  },
  {
    id: 'b-hold',
    label: 'Holding the set instead of guessing',
    ms: 1400,
    notes: [
      { text: 'No price and no quantity to check these loads against, so nothing is worked out', tone: 'flag' },
      { text: 'A message to the coordinator is drafted, for a person to send', tone: 'ok' },
    ],
  },
]
