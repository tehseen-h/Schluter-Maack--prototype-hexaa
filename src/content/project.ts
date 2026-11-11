import type { Project } from '../lib/types'
import { MAIN, kg, mainLoads, mainTotalKg } from './figures'

// Schlüter & Maack Canada. The identity chips and the summary are what a reader sees first,
// so they say what this demo is about in the client's own words: a producer contract, the
// Elevator Receipts delivered against it, and a settlement that must not be paid until it
// agrees.
export const project: Project = {
  client: 'Schlüter & Maack Canada',
  subtitle:
    'Grain settlement: each producer contract checked against its Elevator Receipts, before anyone settles it',
  createdBy: 'Created by Hexaa',
  caseSummary: `One producer contract and the ${mainLoads.length} Elevator Receipts delivered against it at Balgonie, read and checked for price, quantity, grade and weight. What disagrees is held for a person to decide, and the settlement is worked out and ready for release.`,
  identity: [
    { label: 'Contract', value: MAIN.no, mono: true },
    { label: 'Producer', value: MAIN.producer },
    { label: 'Grain', value: `${MAIN.commodity}, ${MAIN.gradeBasis}` },
    { label: 'Delivered', value: `${mainLoads.length} loads, ${kg(mainTotalKg)}` },
    { label: 'Status', value: 'Held for your review' },
  ],
  boundaries: [
    'Releasing a settlement or a payment stays with your team. The tool prepares the figures and never pays anyone.',
    'Changing a contract stays with the merchandiser. The tool never alters a contract, or its price or quantity in NAV.',
    'Accepting a lower grade or a price exception is a person’s call. Anything outside the contract’s own terms is held, never guessed.',
    'Disputes with a producer stay with your team. The tool shows both papers and suggests a next step.',
  ],
  pages: {
    overview: 'Settlement Overview',
    intake: 'Bring a Settlement In',
    exceptions: 'Mismatches to Review',
    flow: 'How Settlements Run',
  },
  sections: {
    pulledOut: 'What we read off the papers',
    needsAttention: 'Mismatches to review',
    needsAttentionNote:
      'Nothing is settled while these are open. Each one goes to the person who can decide it, with both papers side by side.',
    reviewAll: 'Open the mismatches',
    cameIn: 'Papers in this settlement',
    humanControl: 'What stays with your team',
    approve: 'Confirm this flag',
    approved: 'Flag confirmed',
    approveNote:
      'Confirming a flag passes it on, with its evidence, to the person it goes to. It does not release a payment, change a contract or accept a grade or a price.',
    findings: 'Mismatches',
    findingsHint: 'Click a mismatch to see both papers · edit or confirm each one',
    routeLabel: 'Goes to',
  },
  mainDocs: ['contract', 'er1', 'er2', 'er3', 'er4', 'nav'],
}
