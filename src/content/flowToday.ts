import type { Flow } from '../lib/types'

// THE CLIENT'S OWN PROCESS, AS IT RUNS TODAY. No step of ours appears anywhere in it.
//
// It starts where the work starts, not where the paperwork starts. An Elevator Receipt arrives
// because a load was delivered, a load is delivered because a contract was signed, and a contract
// exists because somebody bought grain. That purchase is the moment Schlüter & Maack becomes
// liable for a settlement, so the line begins there.
//
// A guess badge sits ONLY on what we filled in ourselves to make the line hold together. What the
// email or the research states (the contract, the Elevator Receipt, matching them, checking
// weights and prices, NAV and the Excel reporting, and what must stay with a person) carries no
// badge. Every badge here has its question in the first group of questions.ts.
export const flow: Flow = {
  readAs: 'Your grain settlement, from the purchase to the payment, as we understand it runs today.',
  note:
    'No step of ours appears anywhere in this diagram. It is your process as we understand it. Tell us where it is wrong, and we will change it before we show you anything else.',
  lanes: [{ id: 'system', short: 'Your process', title: 'Your process', caption: 'Everything on this canvas is yours, today' }],
  phases: [
    {
      id: 't-buy',
      lane: 'system',
      shape: 'terminator',
      title: 'A merchandiser buys grain from a producer',
      summary: 'Price, quantity, grade and delivery period are agreed. This is the moment a settlement becomes owed.',
      assumption: true,
      steps: [],
    },
    {
      id: 't-contract',
      lane: 'system',
      shape: 'document',
      title: 'An executed purchase contract is signed',
      summary: 'One contract for each purchase, with its own contract number.',
      steps: [
        { id: 't-c1', title: 'The parties and the grain', summary: 'The producer, the commodity and the grade the price is quoted on.' },
        { id: 't-c2', title: 'The quantity and the price', summary: 'The tonnes bought, and the price in cents per pound.' },
        { id: 't-c3', title: 'The delivery period', summary: 'The dates the grain is due to arrive in.' },
        {
          id: 't-c4',
          title: 'What is allowed either way',
          summary: 'A tolerance on the quantity, and a discount when a load grades lower. That a contract carries both is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-record',
      lane: 'system',
      shape: 'process',
      title: 'The contract is recorded',
      summary: 'Entered in the merchandise records and in the contract and inventory reporting.',
      systems: ['Dynamics NAV', 'Excel contract report'],
      steps: [
        { id: 't-r1', title: 'Entered in NAV', summary: 'Producer, grain, quantity, price and delivery period.', records: 'Dynamics NAV' },
        { id: 't-r2', title: 'Added to the contract report', summary: 'So delivered so far can be followed against it.', records: 'Excel contract report' },
        {
          id: 't-r3',
          title: 'The price is keyed in by hand',
          summary: 'That the price is typed in rather than imported is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-load',
      lane: 'system',
      shape: 'manual',
      title: 'A load is delivered to the Balgonie elevator',
      summary: 'Each truck is weighed, graded and unloaded. A contract usually takes several loads.',
      steps: [
        {
          id: 't-l1',
          title: 'The truck is weighed in and out',
          summary: 'Gross weight with the grain on, tare weight without it. That this is done on a scale at Balgonie is our assumption.',
          assumption: true,
        },
        {
          id: 't-l2',
          title: 'A sample is graded',
          summary: 'The grade and the dockage come from the sample. Who does it, and how, is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-receipt',
      lane: 'system',
      shape: 'document',
      title: 'An Elevator Receipt is issued',
      summary: 'One receipt for every load, with the weights and the grade on it.',
      steps: [
        { id: 't-e1', title: 'Who, what and when', summary: 'The producer, the commodity, the contract reference and the date.' },
        { id: 't-e2', title: 'The weights', summary: 'Gross, tare, dockage and the net clean weight, in kilograms.' },
        { id: 't-e3', title: 'The grade', summary: 'The grade the load was given.' },
      ],
    },
    {
      id: 't-match',
      lane: 'system',
      shape: 'manual',
      title: 'Each receipt is matched to its contract',
      summary: 'The contract and every receipt delivered against it are read together, one receipt at a time.',
      steps: [
        {
          id: 't-m1',
          title: 'The contract and its receipts are put together',
          summary: 'Somebody collects every receipt for one contract. Who, and when, is our assumption.',
          assumption: true,
        },
        { id: 't-m2', title: 'The contract number is compared', summary: 'The reference on the receipt against the contract.' },
        { id: 't-m3', title: 'The producer and the grain are compared', summary: 'The same producer, the same commodity.' },
        { id: 't-m4', title: 'The delivery date is compared', summary: 'Inside the delivery period on the contract.' },
      ],
    },
    {
      id: 't-check',
      lane: 'system',
      shape: 'manual',
      title: 'Weights, grade and price are checked',
      summary: 'The numbers on the receipts are checked against what the contract says.',
      steps: [
        { id: 't-k1', title: 'The weight adds up', summary: 'Gross less tare less dockage should be the net clean weight.' },
        { id: 't-k2', title: 'The total is inside the contract', summary: 'Every load added up against the contract quantity.' },
        { id: 't-k3', title: 'Kilograms become pounds', summary: 'The receipts are in kilograms, the price is in cents per pound.' },
        { id: 't-k4', title: 'The grade is the one the price assumes', summary: 'The grade on the receipt against the grade on the contract.' },
        {
          id: 't-k5',
          title: 'The price in NAV is the signed price',
          summary: 'The contract price in NAV against the executed contract. That anyone does this today is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-agree',
      lane: 'system',
      shape: 'decision',
      title: 'Does everything agree?',
      summary: 'If the papers agree the settlement can be worked out. If not, a person has to decide first.',
      steps: [
        { id: 't-a1', title: 'Is the quantity inside the contract?', summary: 'The loads added up, against the quantity and what is allowed either way.' },
        { id: 't-a2', title: 'Is the grade the one the price assumes?', summary: 'Every load, against the contract.' },
        { id: 't-a3', title: 'Do the weights and the price agree?', summary: 'On the receipts, and between the contract and NAV.' },
      ],
    },
    {
      id: 't-sort',
      lane: 'system',
      shape: 'manual',
      track: 'down',
      title: 'The merchandiser sorts it out',
      summary: 'Anything that does not agree is decided by a person, and stays with your people.',
      steps: [
        { id: 't-s1', title: 'Amend the contract', summary: 'A quantity or a price changed, by the people who signed it.', responsible: 'Merchandiser' },
        { id: 't-s2', title: 'Agree a price for the extra grain', summary: 'For grain delivered above what the contract allows.', responsible: 'Merchandiser' },
        { id: 't-s3', title: 'Accept a lower grade or a price exception', summary: 'Or refuse it, and take it up with the producer.', responsible: 'Merchandiser' },
        { id: 't-s4', title: 'Settle a dispute with the producer', summary: 'A conversation, not a calculation.', responsible: 'Merchandiser' },
      ],
    },
    {
      id: 't-work',
      lane: 'system',
      shape: 'manual',
      title: 'The settlement is worked out',
      summary: 'Net clean weight in pounds, times the contract price, less any discount for grade.',
      steps: [
        { id: 't-w1', title: 'The weight in pounds', summary: 'Each load, from kilograms.' },
        { id: 't-w2', title: 'Times the contract price', summary: 'In cents per pound, as signed.' },
        { id: 't-w3', title: 'Less any discount for grade', summary: 'Where a load graded lower and that was accepted.' },
        {
          id: 't-w4',
          title: 'Anything undecided is left out',
          summary: 'That a part still in question waits while the rest goes ahead is our assumption.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-enter',
      lane: 'system',
      shape: 'process',
      title: 'The settlement is entered in NAV',
      summary: 'The figures go into the merchandise records and the contract report.',
      systems: ['Dynamics NAV', 'Excel contract report'],
      steps: [
        { id: 't-n1', title: 'The settlement is entered', summary: 'Against the contract and the producer.', records: 'Dynamics NAV' },
        { id: 't-n2', title: 'The contract report is brought up to date', summary: 'Delivered so far, against the contract.', records: 'Excel contract report' },
      ],
    },
    {
      id: 't-release',
      lane: 'system',
      shape: 'manual',
      title: 'The settlement is approved and the payment released',
      summary: 'The final sign-off and the release of the payment stay with a person.',
      steps: [
        { id: 't-p1', title: 'The settlement is approved', summary: 'Settled figures accepted by the person who answers for them.' },
        { id: 't-p2', title: 'The payment is released', summary: 'Only after the approval.' },
      ],
    },
    {
      id: 't-end',
      lane: 'system',
      shape: 'terminator',
      title: 'The producer is paid',
      summary: 'For the loads in the settlement. Anything held waits for its decision.',
      steps: [],
    },
  ],
  edges: [
    { id: 'te-1', source: 't-buy', target: 't-contract', kind: 'seq' },
    { id: 'te-2', source: 't-contract', target: 't-record', kind: 'seq' },
    { id: 'te-3', source: 't-record', target: 't-load', kind: 'seq' },
    { id: 'te-4', source: 't-load', target: 't-receipt', kind: 'seq' },
    { id: 'te-5', source: 't-receipt', target: 't-match', kind: 'seq' },
    { id: 'te-6', source: 't-match', target: 't-check', kind: 'seq' },
    { id: 'te-7', source: 't-check', target: 't-agree', kind: 'seq' },
    { id: 'te-no', source: 't-agree', target: 't-sort', kind: 'down', label: 'no' },
    { id: 'te-yes', source: 't-agree', target: 't-work', kind: 'seq', label: 'yes' },
    // The side card rejoins the line from its RIGHT, as one labelled line into the next card.
    { id: 'te-rejoin', source: 't-sort', target: 't-work', kind: 'seq', label: 'once decided' },
    { id: 'te-8', source: 't-work', target: 't-enter', kind: 'seq' },
    { id: 'te-9', source: 't-enter', target: 't-release', kind: 'seq' },
    { id: 'te-10', source: 't-release', target: 't-end', kind: 'seq' },
  ],
  notes: [
    {
      id: 'tn-purpose',
      col: 0,
      text:
        'Why this view exists.\n\nThis is your process, not a proposal. Nothing on this canvas is something we would do.\n\nWe would rather be corrected here than agreed with. Every card is editable, so change it on the call.\n\nCards with a guess badge are the ones to challenge first.',
    },
    {
      id: 'tn-loads',
      col: 3,
      text:
        'Loads repeat.\n\nA contract usually takes several loads. A load and its receipt happen once for every truck, until the contract is filled.',
    },
  ],
}
