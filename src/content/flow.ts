import type { Flow } from '../lib/types'

// THE SAME PROCESS, WITH AI ON TOP OF IT. Built from flowToday.ts card for card: the same start,
// the same end, the same branch, the same titles, and every step of theirs is still here under
// the same title. Two things change, and both are visible on the diagram:
//
//   1. WHO does a step. Card colour: grey is yours and unchanged, amber is a step that is yours
//      today and is now done by AI, plum is a decision that stays with your people.
//   2. WHAT is added. Inside an amber card, a step with no counterpart on "How it runs today"
//      is something AI adds around your step (read NAV, write the mismatch up, show the sum).
//      Each says so in its "who" line.
//
// How AI meets their system is on the cards: `systems` chips say which system a card touches, and
// each step's "records" line says whether it only reads (NAV) or writes (the status record in NAV,
// the Excel contract report), and which demo page shows it.
//
// The guess badge means the same single thing as on the other view, and sits on the same steps.
export const flow: Flow = {
  readAs: 'Your process, left to right. Amber steps are done by AI instead of by hand. Steps that appear only on this view are what AI adds.',
  note: 'AI never releases a payment, amends a contract or accepts a grade or a price. It reads, matches, checks, works out and hands over. People decide and release.',
  lanes: [
    { id: 'system', short: 'You today', title: 'You today', caption: 'Your step, unchanged' },
    { id: 'ours', short: 'hexaa does it', title: 'hexaa does it', caption: 'Your step, done by AI, plus what AI adds' },
    { id: 'human', short: 'You decide', title: 'You decide', caption: 'Your people decide and release' },
  ],
  phases: [
    {
      id: 'p-buy',
      lane: 'system',
      title: 'A merchandiser buys grain from a producer',
      summary: 'The purchase that creates a contract and, in time, a settlement owed to the producer.',
      steps: [],
    },
    {
      id: 'p-contract',
      lane: 'system',
      title: 'An executed purchase contract is signed',
      summary: 'One contract for each purchase, with its own contract number.',
      steps: [
        { id: 's-c1', title: 'The producer and the commodity', summary: 'Who the grain is bought from, and what it is.' },
        { id: 's-c2', title: 'The quantity and the price terms', summary: 'How much is bought, and at what price.' },
        { id: 's-c3', title: 'The delivery period', summary: 'The dates the grain is due to arrive in.', assumption: true },
        {
          id: 's-c4',
          title: 'The grade the price is quoted on',
          summary: 'The grade the contract price assumes, and what a lower grade pays.',
          assumption: true,
        },
        {
          id: 's-c5',
          title: 'A tolerance on the quantity',
          summary: 'How far the delivered total may differ from the quantity bought.',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-record',
      lane: 'system',
      title: 'The contract is recorded',
      summary: 'Entered in the merchandise records and in the contract and inventory reporting.',
      systems: ['Dynamics NAV', 'Excel contract report'],
      steps: [
        { id: 's-r1', title: 'Entered in NAV', summary: 'Producer, commodity, quantity and price.', records: 'Dynamics NAV' },
        { id: 's-r2', title: 'Added to the contract report', summary: 'So delivered so far can be followed against it.', records: 'Excel contract report' },
        {
          id: 's-r3',
          title: 'The price is keyed in by hand',
          summary: 'The contract price is typed into NAV rather than imported.',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-load',
      lane: 'system',
      title: 'A load is delivered to the Balgonie elevator',
      summary: 'A truck brings part of the contract to the elevator. A contract usually takes several loads.',
      steps: [
        {
          id: 's-l1',
          title: 'The truck is weighed in and out',
          summary: 'Gross weight with the grain, tare weight without it.',
          assumption: true,
        },
        {
          id: 's-l2',
          title: 'A sample is graded',
          summary: 'The sample gives the grade and the dockage.',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-receipt',
      lane: 'system',
      title: 'An Elevator Receipt is issued',
      summary: 'One receipt for every load.',
      steps: [
        { id: 's-e1', title: 'Who, what and when', summary: 'The producer, the commodity, the contract reference and the date.' },
        { id: 's-e2', title: 'The weight', summary: 'The weight of the load that was delivered.' },
        { id: 's-e3', title: 'The grade', summary: 'The grade the load was given.', assumption: true },
      ],
    },
    {
      id: 'p-match',
      lane: 'ours',
      title: 'Each receipt is matched to its contract',
      summary: 'AI reads each paper and matches each receipt to its contract as the papers arrive.',
      systems: ['Dynamics NAV (read only)'],
      steps: [
        {
          id: 's-m0',
          title: 'Each paper is read for its values',
          summary: 'Producer, commodity, weight, contract reference, date and price terms, read from the contract and every receipt.',
          responsible: 'hexaa, instead of by hand',
          records: 'Intake page',
        },
        {
          id: 's-mn',
          title: 'The contract is read from NAV',
          summary: 'The contract as recorded in NAV is read, and never changed.',
          responsible: 'Added by hexaa',
          records: 'Reads NAV',
        },
        {
          id: 's-m1',
          title: 'The contract and its receipts are put together',
          summary: 'Each receipt is attached to its contract as it comes in, so nobody collects them.',
          responsible: 'hexaa, instead of by hand',
          assumption: true,
        },
        { id: 's-m2', title: 'The contract number is compared', summary: 'The reference on the receipt against the contract.', responsible: 'hexaa, instead of by hand' },
        { id: 's-m3', title: 'The producer and the commodity are compared', summary: 'The same producer, the same commodity.', responsible: 'hexaa, instead of by hand' },
        {
          id: 's-m4',
          title: 'The delivery date is compared',
          summary: 'Inside the delivery period on the contract.',
          responsible: 'hexaa, instead of by hand',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-check',
      lane: 'ours',
      title: 'Weights and prices are checked',
      summary: 'AI checks every number on every receipt against the contract.',
      systems: ['Dynamics NAV (read only)'],
      steps: [
        { id: 's-k1', title: 'The weight adds up', summary: 'Worked out again from the figures on the receipt, every receipt.', responsible: 'hexaa, instead of by hand' },
        {
          id: 's-k2',
          title: 'The total is inside the quantity bought',
          summary: 'Every load added to a running total against the contract quantity.',
          responsible: 'hexaa, instead of by hand',
          records: 'Overview page',
        },
        { id: 's-k3', title: 'The units are made to match', summary: 'Kilograms converted once, the same way every time.', responsible: 'hexaa, instead of by hand' },
        { id: 's-k4', title: 'The price is the contract price', summary: 'The price used is the price on the executed contract.', responsible: 'hexaa, instead of by hand' },
        {
          id: 's-k5',
          title: 'The grade is the one the price assumes',
          summary: 'The grade on the receipt against the grade on the contract.',
          responsible: 'hexaa, instead of by hand',
          assumption: true,
        },
        {
          id: 's-k6',
          title: 'The price in NAV is the signed price',
          summary: 'The contract price in NAV against the executed contract.',
          responsible: 'hexaa, instead of by hand',
          records: 'Reads NAV',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-agree',
      lane: 'ours',
      title: 'Does everything agree?',
      summary: 'AI decides what agrees. What agrees goes straight on. What does not is written up and sent to a person.',
      steps: [
        { id: 's-a1', title: 'Is the quantity inside the contract?', summary: 'The loads added up, against the quantity bought.', responsible: 'hexaa, instead of by hand' },
        { id: 's-a2', title: 'Do the weights and the price agree?', summary: 'On the receipts, and between the contract and NAV.', responsible: 'hexaa, instead of by hand' },
        {
          id: 's-a3',
          title: 'Is anything missing, or pointing at the wrong contract?',
          summary: 'A receipt with no contract on file, or naming a different one.',
          responsible: 'hexaa, instead of by hand',
        },
        {
          id: 's-a4',
          title: 'Is the grade the one the price assumes?',
          summary: 'Every load, against the contract.',
          responsible: 'hexaa, instead of by hand',
          assumption: true,
        },
        {
          id: 's-an1',
          title: 'Everything that agrees goes straight on',
          summary: 'Nobody is interrupted when nothing disagrees.',
          responsible: 'Added by hexaa',
        },
        {
          id: 's-an2',
          title: 'A mismatch is written up with both papers',
          summary: 'What is wrong, what it costs, and both papers side by side, worst first.',
          responsible: 'Added by hexaa',
          records: 'Mismatches page',
        },
        {
          id: 's-an3',
          title: 'It is sent to the person who can decide it',
          summary: 'Merchandising for a contract question, the elevator office for a receipt.',
          responsible: 'Added by hexaa',
          notifies: 'The decider',
        },
      ],
    },
    {
      id: 'p-sort',
      lane: 'human',
      track: 'down',
      title: 'The merchandiser sorts it out',
      summary: 'Anything that does not agree is decided by a person.',
      steps: [
        { id: 's-s1', title: 'Amend the contract', summary: 'A quantity or a price changed, by the people who signed it.', responsible: 'Your team' },
        { id: 's-s2', title: 'Accept a quality or price exception', summary: 'A lower grade, or grain above the quantity at an agreed price.', responsible: 'Your team' },
        { id: 's-s3', title: 'Settle a dispute with the producer', summary: 'A conversation, not a calculation.', responsible: 'Your team' },
        { id: 's-s4', title: 'Chase what is missing', summary: 'The contract or the receipt that is not on file.', responsible: 'Your team' },
        {
          id: 's-sn1',
          title: 'A suggested next step comes with it',
          summary: 'AI suggests what to do. A person decides, and AI never acts on it.',
          responsible: 'Added by hexaa',
        },
      ],
    },
    {
      id: 'p-work',
      lane: 'ours',
      title: 'The settlement is worked out',
      summary: 'AI works the sum out: pounds, priced at the contract, added up line by line.',
      steps: [
        { id: 's-w1', title: 'The weight in pounds', summary: 'Each load, converted from kilograms.', responsible: 'hexaa, instead of by hand' },
        { id: 's-w2', title: 'Times the contract price', summary: 'The price on the executed contract, never the figure in NAV.', responsible: 'hexaa, instead of by hand' },
        {
          id: 's-w3',
          title: 'Less a discount for a lower grade',
          summary: 'Where a load graded lower and that was accepted.',
          responsible: 'hexaa, instead of by hand',
          assumption: true,
        },
        {
          id: 's-w4',
          title: 'Anything undecided is left out',
          summary: 'A part still in question is held, and the rest is prepared.',
          responsible: 'hexaa, instead of by hand',
          assumption: true,
        },
        {
          id: 's-wn1',
          title: 'The sum is shown line by line',
          summary: 'Each load priced and added up, marked ready or held, with what has to be decided.',
          responsible: 'Added by hexaa',
          records: 'Overview page',
        },
      ],
    },
    {
      id: 'p-enter',
      lane: 'ours',
      title: 'The settlement is entered in NAV',
      summary: 'AI sends the clean values into NAV and the contract report, marked ready or held.',
      systems: ['Dynamics NAV', 'Excel contract report'],
      steps: [
        {
          id: 's-n1',
          title: 'The settlement is entered',
          summary: 'Against the contract and the producer.',
          responsible: 'hexaa, instead of by hand',
          records: 'Writes NAV',
        },
        {
          id: 's-n2',
          title: 'The contract report is brought up to date',
          summary: 'Delivered so far, against the contract.',
          responsible: 'hexaa, instead of by hand',
          records: 'Writes Excel',
        },
        {
          id: 's-nn1',
          title: 'What is sent is a status record, never a payment',
          summary: 'Ready or held. Releasing a payment is a separate step that stays with a person.',
          responsible: 'Added by hexaa',
        },
      ],
    },
    {
      id: 'p-release',
      lane: 'human',
      title: 'The settlement is approved and the payment released',
      summary: 'The final sign-off and the release of the payment stay with a person.',
      steps: [
        { id: 's-p1', title: 'The settlement is approved', summary: 'The figures accepted by the person who answers for them.', responsible: 'Your team' },
        { id: 's-p2', title: 'The payment is released', summary: 'Only after the approval.', responsible: 'Your team' },
      ],
    },
    {
      id: 'p-end',
      lane: 'system',
      title: 'The producer is paid',
      summary: 'For the loads in the settlement.',
      steps: [],
    },
  ],
  edges: [
    { id: 'e-1', source: 'p-buy', target: 'p-contract', kind: 'seq' },
    { id: 'e-2', source: 'p-contract', target: 'p-record', kind: 'seq' },
    { id: 'e-3', source: 'p-record', target: 'p-load', kind: 'seq' },
    { id: 'e-4', source: 'p-load', target: 'p-receipt', kind: 'seq' },
    { id: 'e-5', source: 'p-receipt', target: 'p-match', kind: 'seq' },
    { id: 'e-6', source: 'p-match', target: 'p-check', kind: 'seq' },
    { id: 'e-7', source: 'p-check', target: 'p-agree', kind: 'seq' },
    // The branch leaves from the same card as on their diagram. Both outputs are labelled.
    { id: 'e-no', source: 'p-agree', target: 'p-sort', kind: 'down', label: 'something disagrees' },
    { id: 'e-yes', source: 'p-agree', target: 'p-work', kind: 'seq', label: 'everything agrees' },
    { id: 'e-rejoin', source: 'p-sort', target: 'p-work', kind: 'seq', label: 'once decided' },
    { id: 'e-8', source: 'p-work', target: 'p-enter', kind: 'seq' },
    { id: 'e-9', source: 'p-enter', target: 'p-release', kind: 'seq' },
    { id: 'e-10', source: 'p-release', target: 'p-end', kind: 'seq' },
  ],
  notes: [],
}
