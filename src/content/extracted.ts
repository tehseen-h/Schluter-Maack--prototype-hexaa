import type { ExtractedField } from '../lib/types'
import { MAIN, NAV_CENTS, cents, dmy, kg, mainLoads, mainTotalKg, num } from './figures'

// What the tool read off the papers. Each value points back at the paper it came from.
// On this Overview the values sit in the "More detail" tray under the contract grid, because the
// grid and the loads table already show the ones that matter.
const [e1, e2, e3, e4] = mainLoads

export const extracted: ExtractedField[] = [
  { group: 'Contract', label: 'Contract no', value: MAIN.no, mono: true, docId: 'contract', fieldKey: 'c_no', primary: true },
  { group: 'Contract', label: 'Producer', value: MAIN.producer, docId: 'contract', fieldKey: 'c_producer', primary: true },
  { group: 'Contract', label: 'Commodity', value: MAIN.commodity, docId: 'contract', fieldKey: 'c_commodity', primary: true },
  { group: 'Contract', label: 'Signed', value: dmy(MAIN.signed), docId: 'contract', fieldKey: 'c_signed', primary: true },
  { group: 'Contract', label: 'Quantity', value: `${kg(MAIN.qtyKg)}, ${MAIN.tolPct}% either way`, mono: true, docId: 'contract', fieldKey: 'c_qty', primary: false },
  { group: 'Contract', label: 'Price', value: cents(MAIN.cents), mono: true, docId: 'contract', fieldKey: 'c_price', primary: false },

  { group: 'Receipts', label: e1.no, value: `${kg(e1.netClean)} net clean, ${e1.grade}`, mono: true, docId: 'er1', fieldKey: 'er1_net_clean', primary: false },
  { group: 'Receipts', label: e2.no, value: `${kg(e2.netClean)} net clean, ${e2.grade}`, mono: true, docId: 'er2', fieldKey: 'er2_grade', primary: false },
  { group: 'Receipts', label: e3.no, value: `${kg(e3.netClean)} worked out, ${num(e3.printedNetClean)} printed`, mono: true, docId: 'er3', fieldKey: 'er3_net_clean', primary: false },
  { group: 'Receipts', label: e4.no, value: `${kg(e4.netClean)} net clean, ${e4.grade}`, mono: true, docId: 'er4', fieldKey: 'er4_net_clean', primary: false },
  { group: 'Receipts', label: 'All four loads', value: kg(mainTotalKg), mono: true, docId: 'er4', fieldKey: 'er4_net_clean', primary: false },

  { group: 'In NAV', label: 'Price', value: cents(NAV_CENTS), mono: true, docId: 'nav', fieldKey: 'n_price', primary: false },
  { group: 'In NAV', label: 'Quantity', value: `${kg(MAIN.qtyKg)}`, mono: true, docId: 'nav', fieldKey: 'n_qty', primary: false },
]
