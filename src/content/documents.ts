import type { SourceDoc } from '../lib/types'
import {
  CLEAN,
  MAIN,
  NAV_CENTS,
  blockedLoads,
  cents,
  cleanLoads,
  dmy,
  mainLoads,
  num,
  type Contract,
  type Receipt,
} from './figures'

// The papers that "come in", drawn as the real thing: a signed purchase contract
// and one Elevator Receipt per truck. Every value that might be flagged has a `key`, on
// both sides of the comparison. All numbers come from figures.ts.

const slash = (c: Contract) => `${c.periodFrom.slice(8)} ${dmy(c.periodFrom).slice(3, 6)} to ${dmy(c.periodTo)}`

/** The executed purchase contract: the paper every receipt is checked against. */
function contractDoc(id: string, k: string, c: Contract): SourceDoc {
  return {
    id,
    name: `Purchase Contract ${c.no}`,
    kind: 'Executed contract',
    format: 'PDF',
    render: {
      heading: 'Schlüter & Maack Canada',
      subheading: 'Producer Purchase Contract',
      meta: [
        { label: 'Contract no', value: c.no, mono: true, key: `${k}_no` },
        { label: 'Date signed', value: dmy(c.signed), key: `${k}_signed` },
        { label: 'Delivery point', value: 'Balgonie elevator, Saskatchewan' },
      ],
      sections: [
        {
          title: 'Parties',
          fields: [
            { key: `${k}_buyer`, label: 'Buyer', value: 'Schlüter & Maack Canada' },
            { key: `${k}_producer`, label: 'Producer (seller)', value: `${c.producer}, ${c.place}` },
          ],
        },
        {
          title: 'What is bought',
          fields: [
            { key: `${k}_commodity`, label: 'Commodity', value: c.commodity },
            {
              key: `${k}_grade`,
              label: 'Grade the price is quoted on',
              value: `${c.gradeBasis}. ${c.gradeDown} is paid ${c.gradeDownCents.toFixed(2)} ¢/lb less.`,
            },
            { key: `${k}_qty`, label: 'Quantity', value: `${num(c.qtyKg)} kg, ${c.tolPct}% either way (${num(c.minKg)} to ${num(c.maxKg)} kg)`, mono: true },
            { key: `${k}_price`, label: 'Price', value: cents(c.cents), mono: true },
            { key: `${k}_period`, label: 'Delivery period', value: slash(c) },
          ],
        },
        {
          title: 'Settlement',
          fields: [
            { key: `${k}_terms`, label: 'Basis', value: 'Net clean weight on the Elevator Receipt, priced per pound, paid once the settlement is approved' },
          ],
        },
      ],
      footer: [
        { label: 'Signed for the producer', value: c.producer.replace(/ (Ltd\.|Inc\.|Co\.)$/, '') },
        { label: 'Signed for the buyer', value: 'Merchandising, Balgonie' },
      ],
    },
  }
}

/** One Elevator Receipt: one truck, weighed, sampled and graded at the elevator. */
function receiptDoc(r: Receipt): SourceDoc {
  const k = r.id
  return {
    id: r.id,
    name: `Elevator Receipt ${r.no}`,
    kind: 'Elevator Receipt',
    format: 'PDF',
    render: {
      heading: 'Schlüter & Maack Canada',
      subheading: 'Elevator Receipt, Balgonie',
      meta: [
        { label: 'Receipt no', value: r.no, mono: true, key: `${k}_no` },
        { label: 'Delivered', value: dmy(r.date), key: `${k}_date` },
        { label: 'Weighed by', value: r.weighmaster },
      ],
      sections: [
        {
          title: 'Delivered by',
          fields: [
            { key: `${k}_producer`, label: 'Producer', value: r.producer },
            { key: `${k}_contract`, label: 'Contract reference', value: r.contractRef, mono: true },
          ],
        },
        {
          title: 'Grain',
          fields: [
            { key: `${k}_commodity`, label: 'Commodity', value: r.commodity },
            { key: `${k}_grade`, label: 'Grade', value: r.grade },
          ],
        },
      ],
      table: {
        columns: ['Gross kg', 'Tare kg', 'Net kg', 'Dockage %', 'Dockage kg', 'Net clean kg'],
        rows: [
          {
            cells: [num(r.gross), num(r.tare), num(r.net), `${r.dockagePct.toFixed(1)}%`, num(r.dockageKg), num(r.printedNetClean)],
            keys: [`${k}_gross`, `${k}_tare`, `${k}_net`, `${k}_dockage_pct`, `${k}_dockage`, `${k}_net_clean`],
            mono: true,
          },
        ],
      },
      footer: [{ label: 'Scale', value: 'Balgonie elevator truck scale' }],
    },
  }
}

export const documents: SourceDoc[] = [
  // ── The main set ──────────────────────────────────────────────────────────
  contractDoc('contract', 'c', MAIN),
  ...mainLoads.map(receiptDoc),

  // The same contract as it sits in NAV. Read by the tool, not added by anyone.
  // Drawn as a plain card of the values read, never as a copy of their screen.
  {
    id: 'nav',
    name: 'Contract as recorded in NAV',
    kind: 'System record',
    format: 'System',
    formatLabel: 'Read from NAV',
    system: {
      source: 'Dynamics NAV',
      status: 'Open',
      note: 'The contract as it is recorded in the merchandise system, read by the tool when the set runs.',
    },
    render: {
      heading: `Contract ${MAIN.no}`,
      subheading: 'As recorded in NAV',
      sections: [
        {
          fields: [
            { key: 'n_no', label: 'Contract no', value: MAIN.no, mono: true },
            { key: 'n_producer', label: 'Producer', value: MAIN.producer },
            { key: 'n_commodity', label: 'Commodity and grade', value: `${MAIN.commodity}, ${MAIN.gradeBasis}` },
            { key: 'n_qty', label: 'Quantity', value: `${num(MAIN.qtyKg)} kg`, mono: true },
            { key: 'n_price', label: 'Price', value: cents(NAV_CENTS), mono: true },
            { key: 'n_period', label: 'Delivery period', value: slash(MAIN) },
          ],
        },
      ],
    },
  },

  // ── The clean set ─────────────────────────────────────────────────────────
  contractDoc('c2-contract', 'c2', CLEAN),
  ...cleanLoads.map(receiptDoc),

  // ── The set with no contract on file ──────────────────────────────────────
  ...blockedLoads.map(receiptDoc),
]
