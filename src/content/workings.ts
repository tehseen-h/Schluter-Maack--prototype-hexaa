import type { LoadCell, LoadsTable, Settlement, SettlementLine } from '../lib/types'
import {
  CLEAN,
  MAIN,
  cad,
  cents,
  cleanLoads,
  cleanSettlement,
  cleanTotal,
  cleanTotalKg,
  dmyShort,
  dmy,
  heldTotal,
  mainLoads,
  mainSettlement,
  mainTotalKg,
  num,
  overKg,
  preparedTotal,
  readyTotal,
  running,
  type Contract,
  type Receipt,
  type SettleLine,
} from './figures'

// The two worked sections, built from the figures: every load against the contract with a
// running total, and the settlement written out line by line. The main set feeds the Overview
// and its Intake case; the clean set feeds its own Intake case.

const period = (c: Contract) => `${dmy(c.periodFrom).slice(0, 6)} to ${dmy(c.periodTo)}`

function limits(c: Contract) {
  return [
    { label: 'Contract', value: c.no, mono: true },
    { label: 'Producer', value: c.producer },
    { label: 'Quantity', value: `${num(c.qtyKg)} kg, ${c.tolPct}% either way` },
    { label: 'Allowed', value: `${num(c.minKg)} to ${num(c.maxKg)} kg`, mono: true },
    { label: 'Price', value: cents(c.cents), mono: true },
    { label: 'Delivery period', value: period(c) },
  ]
}

const COLUMNS = ['Receipt', 'Delivered', 'Grade', 'Gross kg', 'Tare kg', 'Dockage kg', 'Net clean kg', 'Running total kg']
const FIGURES = [3, 4, 5, 6, 7]

function loadRow(
  r: Receipt,
  total: number,
  c: Contract,
  opts: {
    exceptionId?: string
    status: { label: string; tone: 'ok' | 'flag' }
    grade?: boolean
    weight?: boolean
    over?: boolean
  },
) {
  const cells: (string | LoadCell)[] = [
    r.no,
    dmyShort(r.date),
    opts.grade ? { value: r.grade, off: true, note: `Price assumes ${c.gradeBasis.replace(' Canada', '')}` } : r.grade,
    num(r.gross),
    num(r.tare),
    { value: num(r.dockageKg), note: `${r.dockagePct.toFixed(1)}% of net` },
    opts.weight ? { value: num(r.netClean), off: true, note: `Receipt prints ${num(r.printedNetClean)}` } : num(r.netClean),
    opts.over ? { value: num(total), off: true, note: `${num(c.maxKg)} at most` } : num(total),
  ]
  return { id: r.id, cells, status: opts.status, exceptionId: opts.exceptionId }
}

export const mainLoadsTable: LoadsTable = {
  title: 'Loads against the contract',
  caption:
    'Every Elevator Receipt for this contract, weighed up and added to a running total against what the contract allows. Anything that does not agree is marked in its row.',
  limits: limits(MAIN),
  columns: COLUMNS,
  figureCols: FIGURES,
  rows: [
    loadRow(mainLoads[0], running[0], MAIN, { status: { label: 'Agrees', tone: 'ok' } }),
    loadRow(mainLoads[1], running[1], MAIN, {
      status: { label: 'Grade is lower', tone: 'flag' },
      exceptionId: 'ex-grade',
      grade: true,
    }),
    loadRow(mainLoads[2], running[2], MAIN, {
      status: { label: 'Weight is off', tone: 'flag' },
      exceptionId: 'ex-weight',
      weight: true,
    }),
    loadRow(mainLoads[3], running[3], MAIN, {
      status: { label: 'Over the maximum', tone: 'flag' },
      exceptionId: 'ex-over',
      over: true,
    }),
  ],
  footer: ['Total delivered', '', '', '', '', '', '', { value: num(mainTotalKg), off: true, note: `${num(overKg)} over the maximum` }],
}

export const cleanLoadsTable: LoadsTable = {
  title: 'Loads against the contract',
  caption: 'Every Elevator Receipt for this contract, weighed up against what it allows.',
  limits: limits(CLEAN),
  columns: COLUMNS,
  figureCols: FIGURES,
  rows: cleanLoads.map((r, i) => {
    const t = cleanLoads.slice(0, i + 1).reduce((a, x) => a + x.netClean, 0)
    return loadRow(r, t, CLEAN, { status: { label: 'Agrees', tone: 'ok' } })
  }),
  footer: ['Total delivered', '', '', '', '', '', '', { value: num(cleanTotalKg), note: `Inside ${num(CLEAN.minKg)} to ${num(CLEAN.maxKg)}` }],
}

const toLine = (s: SettleLine, exceptionId?: string): SettlementLine => ({
  id: s.id,
  ref: s.receiptNo,
  what: s.what,
  working: s.working,
  amount: cad(s.amount),
  state: s.state,
  why: s.why,
  exceptionId,
})

export const mainSettlementView: Settlement = {
  title: 'The settlement, worked out',
  caption:
    'Each load turned from kilograms into pounds, priced at the signed contract and added up. A line that disagrees with the contract is held for a person. Nothing here is released.',
  stamp: 'Prepared, not released',
  lines: mainSettlement.map((s) =>
    toLine(s, s.id === 's2' ? 'ex-grade' : s.id === 's3' ? 'ex-weight' : s.id === 's5' ? 'ex-over' : undefined),
  ),
  totals: [
    { label: 'Ready for your release', value: cad(readyTotal), tone: 'ok' },
    { label: 'Held for a decision', value: cad(heldTotal), tone: 'hold' },
    { label: 'Worked out in all', value: cad(preparedTotal) },
  ],
  note: `Priced at the signed ${cents(MAIN.cents)}, not the lower price in NAV. Releasing a payment stays with your team.`,
}

export const cleanSettlementView: Settlement = {
  title: 'The settlement, worked out',
  caption: 'Each load turned from kilograms into pounds, priced at the contract and added up.',
  stamp: 'Prepared, not released',
  lines: cleanSettlement.map((s) => toLine(s)),
  totals: [
    { label: 'Ready for your release', value: cad(cleanTotal), tone: 'ok' },
    { label: 'Held for a decision', value: cad(0) },
  ],
  note: 'Nothing disagreed, so the whole settlement is ready. Releasing a payment stays with your team.',
}
