import type { Flow } from '../lib/types'

// THE SAME PROCESS, WITH THE PART WE WOULD TAKE OVER MARKED. Derived from flowToday.ts, card for
// card: the same start, the same end, the same branch, the same titles. Only WHO does each step
// changes, shown by the card colour.
//
//   You today     unchanged: the purchase, the contract, the load, the receipt, the payment
//   hexaa does it matching, checking, deciding what agrees, working out the settlement, sending the
//                 clean values into NAV
//   You decide    what a person must decide: a mismatch, and the release
//
// Nothing is added to the sequence and nothing is removed. The guess badges are the same ones as
// on the client's own view, on the same steps, because those are the steps we filled in.
export const flow: Flow = {
  readAs: 'Your process, left to right. The accent colour is the part we would do for you.',
  note:
    'Not one accent card releases a payment, amends a contract or accepts a grade or a price. They read, match, check and work out. Your people decide and release.',
  lanes: [
    { id: 'system', short: 'You today', title: 'You today', caption: 'Already happens, unchanged' },
    { id: 'ours', short: 'hexaa does it', title: 'hexaa does it', caption: 'The same step, done for you' },
    { id: 'human', short: 'You decide', title: 'You decide', caption: 'Your people judge and release' },
  ],
  phases: [
    {
      id: 'p-buy',
      lane: 'system',
      title: 'A merchandiser buys grain from a producer',
      summary: 'Price, quantity, grade and delivery period are agreed. This is the moment a settlement becomes owed.',
      assumption: true,
      steps: [],
    },
    {
      id: 'p-contract',
      lane: 'system',
      title: 'An executed purchase contract is signed',
      summary: 'One contract for each purchase, with its own contract number.',
      steps: [
        { id: 's-c1', title: 'The parties and the grain', summary: 'The producer, the commodity and the grade the price is quoted on.' },
        { id: 's-c2', title: 'The quantity and the price', summary: 'The tonnes bought, and the price in cents per pound.' },
        { id: 's-c3', title: 'The delivery period', summary: 'The dates the grain is due to arrive in.' },
        {
          id: 's-c4',
          title: 'What is allowed either way',
          summary: 'A tolerance on the quantity, and a discount when a load grades lower. That a contract carries both is our assumption.',
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
        { id: 's-r1', title: 'Entered in NAV', summary: 'Producer, grain, quantity, price and delivery period.', records: 'Dynamics NAV' },
        { id: 's-r2', title: 'Added to the contract report', summary: 'So delivered so far can be followed against it.', records: 'Excel contract report' },
        {
          id: 's-r3',
          title: 'The price is keyed in by hand',
          summary: 'That the price is typed in rather than imported is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-load',
      lane: 'system',
      title: 'A load is delivered to the Balgonie elevator',
      summary: 'Each truck is weighed, graded and unloaded. A contract usually takes several loads.',
      steps: [
        {
          id: 's-l1',
          title: 'The truck is weighed in and out',
          summary: 'Gross weight with the grain on, tare weight without it. That this is done on a scale at Balgonie is our assumption.',
          assumption: true,
        },
        {
          id: 's-l2',
          title: 'A sample is graded',
          summary: 'The grade and the dockage come from the sample. Who does it, and how, is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-receipt',
      lane: 'system',
      title: 'An Elevator Receipt is issued',
      summary: 'One receipt for every load, with the weights and the grade on it.',
      steps: [
        { id: 's-e1', title: 'Who, what and when', summary: 'The producer, the commodity, the contract reference and the date.' },
        { id: 's-e2', title: 'The weights', summary: 'Gross, tare, dockage and the net clean weight, in kilograms.' },
        { id: 's-e3', title: 'The grade', summary: 'The grade the load was given.' },
      ],
    },
    {
      id: 'p-match',
      lane: 'ours',
      title: 'Each receipt is matched to its contract',
      summary: 'We read the contract and every receipt as it arrives and match them. Open to see how.',
      steps: [
        {
          id: 's-m1',
          title: 'The contract and its receipts are put together',
          summary: 'Each receipt is attached to its contract as it comes in, so nobody gathers them. Today who gathers them, and when, is our assumption.',
          responsible: 'hexaa, as each paper arrives',
          assumption: true,
        },
        { id: 's-m2', title: 'The contract number is compared', summary: 'The reference on the receipt against the contract.', responsible: 'hexaa, every receipt' },
        { id: 's-m3', title: 'The producer and the grain are compared', summary: 'The same producer, the same commodity.', responsible: 'hexaa, every receipt' },
        { id: 's-m4', title: 'The delivery date is compared', summary: 'Inside the delivery period on the contract.', responsible: 'hexaa, every receipt' },
      ],
    },
    {
      id: 'p-check',
      lane: 'ours',
      title: 'Weights, grade and price are checked',
      summary: 'Every number on every receipt, against what the contract says. Open to see how.',
      steps: [
        { id: 's-k1', title: 'The weight adds up', summary: 'Worked out again from gross, tare and dockage, never taken on trust.', responsible: 'hexaa, every receipt', records: 'Net clean, worked out' },
        { id: 's-k2', title: 'The total is inside the contract', summary: 'Every load added to a running total against the quantity and what is allowed either way.', responsible: 'hexaa, every load' },
        { id: 's-k3', title: 'Kilograms become pounds', summary: 'Converted once, the same way every time, to match a price in cents per pound.', responsible: 'hexaa, every load' },
        { id: 's-k4', title: 'The grade is the one the price assumes', summary: 'The grade on the receipt against the grade on the contract.', responsible: 'hexaa, every load' },
        {
          id: 's-k5',
          title: 'The price in NAV is the signed price',
          summary: 'The contract price in NAV read against the executed contract. That anyone does this today is our assumption.',
          responsible: 'hexaa, read from NAV',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-agree',
      lane: 'ours',
      title: 'Does everything agree?',
      summary: 'Anything that disagrees is written up with both papers beside it, worst first, and sent to the right person.',
      steps: [
        { id: 's-a1', title: 'Is the quantity inside the contract?', summary: 'The loads added up, against the quantity and what is allowed either way.', responsible: 'hexaa' },
        { id: 's-a2', title: 'Is the grade the one the price assumes?', summary: 'Every load, against the contract.', responsible: 'hexaa' },
        { id: 's-a3', title: 'Do the weights and the price agree?', summary: 'On the receipts, and between the contract and NAV.', responsible: 'hexaa', notifies: 'The person who can decide it' },
      ],
    },
    {
      id: 'p-sort',
      lane: 'human',
      track: 'down',
      title: 'The merchandiser sorts it out',
      summary: 'The same branch as on your own diagram. Your people decide, with both papers in front of them.',
      steps: [
        { id: 's-s1', title: 'Amend the contract', summary: 'A quantity or a price changed, by the people who signed it.', responsible: 'Merchandiser' },
        { id: 's-s2', title: 'Agree a price for the extra grain', summary: 'For grain delivered above what the contract allows.', responsible: 'Merchandiser' },
        { id: 's-s3', title: 'Accept a lower grade or a price exception', summary: 'Or refuse it, and take it up with the producer.', responsible: 'Merchandiser' },
        { id: 's-s4', title: 'Settle a dispute with the producer', summary: 'A conversation, not a calculation.', responsible: 'Merchandiser' },
      ],
    },
    {
      id: 'p-work',
      lane: 'ours',
      title: 'The settlement is worked out',
      summary: 'Every load turned into pounds, priced at the signed contract and added up. Open to see how.',
      steps: [
        { id: 's-w1', title: 'The weight in pounds', summary: 'Each load, from kilograms.', responsible: 'hexaa' },
        { id: 's-w2', title: 'Times the contract price', summary: 'In cents per pound, as signed, never the figure in NAV.', responsible: 'hexaa' },
        { id: 's-w3', title: 'Less any discount for grade', summary: 'Where a load graded lower and that was accepted.', responsible: 'hexaa' },
        {
          id: 's-w4',
          title: 'Anything undecided is left out',
          summary: 'A part still in question is held, and the rest is prepared. Today that a part waits while the rest goes ahead is our assumption.',
          responsible: 'hexaa, held for a person',
          assumption: true,
        },
      ],
    },
    {
      id: 'p-enter',
      lane: 'ours',
      title: 'The settlement is entered in NAV',
      summary: 'The clean values go into NAV and the contract report, marked ready or held. Open to see how.',
      systems: ['Dynamics NAV', 'Excel contract report'],
      steps: [
        { id: 's-n1', title: 'The settlement is entered', summary: 'Against the contract and the producer, as a status record. It is not a payment.', responsible: 'hexaa', records: 'Dynamics NAV' },
        { id: 's-n2', title: 'The contract report is brought up to date', summary: 'Delivered so far, against the contract.', responsible: 'hexaa', records: 'Excel contract report' },
      ],
    },
    {
      id: 'p-release',
      lane: 'human',
      title: 'The settlement is approved and the payment released',
      summary: 'The final sign-off and the release of the payment stay with a person.',
      steps: [
        { id: 's-p1', title: 'The settlement is approved', summary: 'Settled figures accepted by the person who answers for them.', responsible: 'Your team' },
        { id: 's-p2', title: 'The payment is released', summary: 'Only after the approval. Never by the tool.', responsible: 'Your team' },
      ],
    },
    {
      id: 'p-end',
      lane: 'system',
      title: 'The producer is paid',
      summary: 'For the loads in the settlement. Anything held waits for its decision.',
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
  notes: [
    {
      id: 'n-today',
      col: 0,
      text:
        'Today and after.\n\nToday a person gathers each contract with its receipts and checks every weight, grade and price by eye, then works the settlement out.\n\nAfter: the same reading and checking still happens. When nothing disagrees, the set goes straight on to the settlement and nobody is interrupted.',
    },
    {
      id: 'n-line',
      col: 3,
      text:
        'The line we do not cross.\n\nNothing in the accent colour releases a payment, amends a contract or accepts a grade or a price.\n\nThose stay with your people, on the right of the line.',
    },
  ],
}
