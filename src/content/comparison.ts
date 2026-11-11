import type { Comparison } from '../lib/types'
import { MAIN, NAV_CENTS, cents, dmy, mainLoads, num } from './figures'

// The contract as signed, against the same contract as it sits in NAV. The price row is the
// one that disagrees. What the check passed is listed under "also checked".
const period = `${dmy(MAIN.periodFrom).slice(0, 6)} to ${dmy(MAIN.periodTo)}`
const first = mainLoads[0]
const last = mainLoads[mainLoads.length - 1]

export const comparison: Comparison = {
  title: 'The contract, signed against NAV',
  caption:
    'Before any load is counted, the signed contract is read against the same contract in NAV. A difference here would put every load on the wrong price.',
  columns: [
    { docId: 'contract', label: 'Signed contract' },
    { docId: 'nav', label: 'In NAV' },
  ],
  emptyLabel: 'not in NAV',
  agreeLabel: 'Agree',
  rows: [
    {
      label: 'Producer',
      cells: [
        { value: MAIN.producer, fieldKey: 'c_producer' },
        { value: MAIN.producer, fieldKey: 'n_producer' },
      ],
    },
    {
      label: 'Commodity',
      cells: [
        { value: `${MAIN.commodity}, ${MAIN.gradeBasis}`, fieldKey: 'c_commodity' },
        { value: `${MAIN.commodity}, ${MAIN.gradeBasis}`, fieldKey: 'n_commodity' },
      ],
    },
    {
      label: 'Quantity',
      mono: true,
      cells: [
        { value: `${num(MAIN.qtyKg)} kg`, fieldKey: 'c_qty' },
        { value: `${num(MAIN.qtyKg)} kg`, fieldKey: 'n_qty' },
      ],
    },
    {
      label: 'Price',
      mono: true,
      exceptionId: 'ex-nav-price',
      offLabel: `${(MAIN.cents - NAV_CENTS).toFixed(2)} ¢/lb apart`,
      cells: [
        { value: cents(MAIN.cents), fieldKey: 'c_price' },
        { value: cents(NAV_CENTS), fieldKey: 'n_price', off: true },
      ],
    },
    {
      label: 'Delivery period',
      cells: [
        { value: period, fieldKey: 'c_period' },
        { value: period, fieldKey: 'n_period' },
      ],
    },
  ],
  alsoChecked: [
    `All four receipts name contract ${MAIN.no} and the same producer, ${MAIN.producer.replace(/\.$/, '')}.`,
    `Every load was delivered inside the delivery period, from ${dmy(first.date).slice(0, 6)} to ${dmy(last.date).slice(0, 6)}.`,
    'Kilograms on the receipts were converted to pounds, to match a price quoted in cents per pound.',
  ],
}
