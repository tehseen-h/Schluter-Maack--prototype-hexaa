import type { Exception, FindingSides } from '../lib/types'
import {
  MAIN,
  NAV_CENTS,
  cad,
  cents,
  gradeDiscountDollars,
  kg,
  l4Inside,
  l4Over,
  mainLoads,
  mainTotalKg,
  navGapCents,
  navGapDollars,
  overDollars,
  overKg,
  weightSlipDollars,
} from './figures'

// The mismatches, ranked by what they cost if missed. Four different kinds of problem:
// a price that disagrees between two records, a quantity past the contract's limit, a
// grade below what the price assumes, and a weight that does not add up on its own paper.
//
// Every finding is anchored on the paper carrying the value in question and, where it is a
// disagreement between two papers, `against` is the contract. So the left tab is always
// what arrived or what is recorded, and the right tab is what the contract says.
export const findingSides: FindingSides = {
  specified: 'What we received or recorded',
  evidence: 'What the contract says',
}

const [, e2, e3, e4] = mainLoads

export const exceptions: Exception[] = [
  {
    id: 'ex-nav-price',
    title: 'The price in NAV is lower than the signed contract',
    severity: 'critical',
    detail: `NAV records ${MAIN.no} at ${cents(NAV_CENTS)}. The signed contract says ${cents(MAIN.cents)}, ${navGapCents.toFixed(2)} ¢/lb more. Settled from NAV, the ${kg(mainTotalKg)} delivered would come out about ${cad(navGapDollars)} short for the producer.`,
    suggestion: 'Correct the contract price in NAV. The settlement here is already worked out at the signed price.',
    docId: 'nav',
    fieldKey: 'n_price',
    against: { docId: 'contract', fieldKey: 'c_price', label: `Signed contract ${MAIN.no}` },
    routeTo: 'Merchandising and Logistics Coordinator',
  },
  {
    id: 'ex-over',
    title: 'More grain delivered than the contract allows',
    severity: 'high',
    detail: `The four loads add up to ${kg(mainTotalKg)}. The contract is for ${kg(MAIN.qtyKg)}, ${MAIN.tolPct}% either way, so ${kg(MAIN.maxKg)} at most. Receipt ${e4.no} is the load that crosses it: ${kg(l4Inside)} of it fits, and the last ${kg(l4Over)}, worth about ${cad(overDollars)} at the contract price, has no agreed price.`,
    suggestion: 'Merchandiser decides: amend the contract, agree a spot price for the extra grain, or send it back to the producer. The part inside the maximum is ready.',
    docId: 'er4',
    fieldKey: 'er4_net_clean',
    against: { docId: 'contract', fieldKey: 'c_qty', label: `Signed contract ${MAIN.no}` },
    routeTo: 'Merchandiser',
  },
  {
    id: 'ex-grade',
    title: 'One load graded below what the price assumes',
    severity: 'medium',
    detail: `Receipt ${e2.no} is graded ${e2.grade}. The contract price is quoted on ${MAIN.gradeBasis}, and ${MAIN.gradeDown} is paid ${MAIN.gradeDownCents.toFixed(2)} ¢/lb less. On ${kg(e2.netClean)} that takes about ${cad(gradeDiscountDollars)} off the load.`,
    suggestion: 'Merchandiser accepts the lower grade and the discount, or takes it up with the producer. The load is held until then.',
    docId: 'er2',
    fieldKey: 'er2_grade',
    against: { docId: 'contract', fieldKey: 'c_grade', label: `Signed contract ${MAIN.no}` },
    routeTo: 'Merchandiser',
  },
  {
    id: 'ex-weight',
    title: 'The net clean weight does not add up on one receipt',
    severity: 'low',
    detail: `Receipt ${e3.no}: ${kg(e3.gross)} gross less ${kg(e3.tare)} tare is ${kg(e3.net)}. Less ${kg(e3.dockageKg)} dockage that is ${kg(e3.netClean)} net clean. The receipt prints ${kg(e3.printedNetClean)}, ${kg(e3.printedNetClean - e3.netClean)} higher, about ${cad(weightSlipDollars)} at the contract price. The settlement uses the worked-out weight.`,
    suggestion: 'Ask the Balgonie elevator office to correct the receipt so the paper and the settlement agree.',
    docId: 'er3',
    fieldKey: 'er3_net_clean',
    routeTo: 'Balgonie elevator office',
  },
]
