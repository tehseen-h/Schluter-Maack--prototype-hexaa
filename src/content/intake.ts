import type { IntakeCase, IntakeIntro } from '../lib/types'
import {
  BLOCKED_REF,
  CLEAN,
  MAIN,
  blockedLoads,
  blockedTotalKg,
  cad,
  cents,
  cleanLb,
  cleanLoads,
  cleanTotal,
  cleanTotalKg,
  dmy,
  kg,
  lbs,
  mainLoads,
} from './figures'
import { blockedStages, cleanStages, mainStages } from './pipeline'
import { cleanLoadsTable, cleanSettlementView, mainLoadsTable, mainSettlementView } from './workings'

// Intake: a settlement set is one producer contract and every Elevator Receipt delivered against
// it. A case lists every paper it needs and will not run until all of them are in. That refusal
// is the point: the tool never works out a settlement from half a set.
export const intakeIntro: IntakeIntro = {
  title: 'Bring a settlement in',
  runLabel: 'Check the settlement',
  reviewLabel: 'Review the mismatches',
  docsHeading: 'Papers in this set',
  docWord: { one: 'paper', many: 'papers' },
  caption:
    'A settlement set is one producer contract and every Elevator Receipt delivered against it. Add each paper, then check it. Nothing is read until the whole set is in.',
}

const er = (id: string, no: string) => ({ docId: id, label: `Elevator Receipt ${no}`, format: 'PDF' as const })

export const cases: IntakeCase[] = [
  {
    id: 'case-main',
    name: `Contract ${MAIN.no}: ${MAIN.producer}, four loads`,
    note: 'The main set. The signed contract and the four Elevator Receipts delivered against it. Needs all five papers before it can run.',
    pulled: {
      label: `Contract ${MAIN.no} as recorded in NAV`,
      note: 'Read from your system when the set runs. Nobody adds it.',
    },
    docs: [
      { docId: 'contract', label: `Executed purchase contract ${MAIN.no}`, format: 'PDF' },
      ...mainLoads.map((r) => er(r.id, r.no)),
    ],
    outcome: 'exceptions',
    resultTitle: 'Read and checked: four mismatches held for review',
    resultBody:
      'Every receipt was matched to its contract, and the contract was read against NAV. Four mismatches were raised, worst first, each with both papers beside it. The settlement is worked out, with the lines that disagree held for a person.',
    stages: mainStages,
    loads: mainLoadsTable,
    settlement: mainSettlementView,
  },
  {
    id: 'case-clean',
    name: `Contract ${CLEAN.no}: ${CLEAN.producer}, two loads`,
    note: 'A set that reads clean. The signed contract and both receipts. Shows what is sent on when nothing disagrees.',
    pulled: {
      label: `Contract ${CLEAN.no} as recorded in NAV`,
      note: 'Read from your system when the set runs. Nobody adds it.',
    },
    docs: [
      { docId: 'c2-contract', label: `Executed purchase contract ${CLEAN.no}`, format: 'PDF' },
      ...cleanLoads.map((r) => er(r.id, r.no)),
    ],
    outcome: 'clean',
    resultTitle: 'Read and checked: nothing to raise',
    resultBody:
      'Both receipts name the contract, the weights add up, the grade is the one the price assumes and NAV agrees with the signed contract. The whole settlement is ready for your team to release.',
    stages: cleanStages,
    loads: cleanLoadsTable,
    settlement: cleanSettlementView,
    followUp: {
      title: 'Prepared for NAV and the contract sheet',
      caption: 'The values the tool would send on. Your team releases the payment.',
      badge: 'Prepared, not released',
      rows: [
        { label: 'Contract', value: CLEAN.no, mono: true },
        { label: 'Producer', value: CLEAN.producer },
        { label: 'Delivered, net clean', value: `${kg(cleanTotalKg)} (${lbs(cleanLb)})`, mono: true },
        { label: 'Price', value: cents(CLEAN.cents), mono: true },
        { label: 'Settlement', value: cad(cleanTotal), mono: true },
        { label: 'Contract sheet', value: `Delivered so far ${kg(cleanTotalKg)}, filled inside the limits` },
      ],
    },
  },
  {
    id: 'case-blocked',
    name: `Receipts naming ${BLOCKED_REF}: ${blockedLoads[0].producer}`,
    note: 'Two receipts, and no contract anywhere on file. Shows the tool holding a set instead of guessing.',
    pulled: {
      label: `Contract ${BLOCKED_REF}`,
      note: 'Looked up in NAV and on the contract sheet when the set runs.',
    },
    docs: blockedLoads.map((r) => er(r.id, r.no)),
    outcome: 'blocked',
    resultTitle: `Held: there is no contract ${BLOCKED_REF} on file`,
    resultBody: `Both receipts name a contract that is not in NAV or on the contract sheet, so there is no price or quantity to check ${kg(blockedTotalKg)} against. Nothing was worked out. A message is drafted for a person to send.`,
    stages: blockedStages,
    followUp: {
      title: 'Message drafted for the coordinator',
      caption: 'Written, not sent. A person reads it and sends it.',
      badge: 'Draft, not sent',
      message: `To: Merchandising and Logistics Coordinator
Subject: Two receipts name contract ${BLOCKED_REF}, and it is not on file

Receipts ${blockedLoads[0].no} (${dmy(blockedLoads[0].date)}) and ${blockedLoads[1].no} (${dmy(blockedLoads[1].date)}) from ${blockedLoads[0].producer} both name contract ${BLOCKED_REF}. It is not in NAV or on the contract sheet, so nothing has been checked or worked out. ${kg(blockedTotalKg)} has been delivered across the two loads.

Could you send the signed contract, or confirm the reference on the receipts? Once it is on file the set can be checked straight away.`,
    },
  },
]
