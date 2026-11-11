import type { Flow } from '../lib/types'

// THE CLIENT'S OWN PROCESS, AS IT RUNS TODAY. No step of ours appears anywhere in it.
//
// It starts at the purchase: a merchandiser buys grain from a producer. That is the event that
// creates the contract, the loads, the receipts and finally the settlement, so every step after
// it has a reason to exist.
//
// THE ONE TAG. `assumption: true` renders a single "guess" badge, and it means exactly one thing:
// a step or detail that is in neither the email thread nor the use-case research, and was added
// to fill a gap so the line holds together. Everything those two documents state (the executed
// purchase contract, the Elevator Receipt, extracting producer, commodity, weight, contract
// reference, date and price terms, matching, checking weights, prices and quantities, normalising
// units, flagging mismatches and missing data, NAV and the Excel contract report, and what a
// person keeps) carries NO badge. Nothing else on the diagram explains, hedges or confirms.
// Every badge has a matching question in questions.ts, most important first.
export const flow: Flow = {
  readAs: 'Your grain settlement, from the purchase to the payment, as it runs today.',
  note: 'Your process from the purchase to the payment. Nothing on this view is added by hexaa.',
  lanes: [{ id: 'system', short: 'Your process', title: 'Your process', caption: 'Everything on this view is yours, today' }],
  phases: [
    {
      id: 't-buy',
      lane: 'system',
      shape: 'terminator',
      title: 'A merchandiser buys grain from a producer',
      summary: 'The purchase that creates a contract and, in time, a settlement owed to the producer.',
      steps: [],
    },
    {
      id: 't-contract',
      lane: 'system',
      shape: 'document',
      title: 'An executed purchase contract is signed',
      summary: 'One contract for each purchase, with its own contract number.',
      steps: [
        { id: 't-c1', title: 'The producer and the commodity', summary: 'Who the grain is bought from, and what it is.' },
        { id: 't-c2', title: 'The quantity and the price terms', summary: 'How much is bought, and at what price.' },
        { id: 't-c3', title: 'The delivery period', summary: 'The dates the grain is due to arrive in.', assumption: true },
        {
          id: 't-c4',
          title: 'The grade the price is quoted on',
          summary: 'The grade the contract price assumes, and what a lower grade pays.',
          assumption: true,
        },
        {
          id: 't-c5',
          title: 'A tolerance on the quantity',
          summary: 'How far the delivered total may differ from the quantity bought.',
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
        { id: 't-r1', title: 'Entered in NAV', summary: 'Producer, commodity, quantity and price.', records: 'Dynamics NAV' },
        { id: 't-r2', title: 'Added to the contract report', summary: 'So delivered so far can be followed against it.', records: 'Excel contract report' },
        {
          id: 't-r3',
          title: 'The price is keyed in by hand',
          summary: 'The contract price is typed into NAV rather than imported.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-load',
      lane: 'system',
      shape: 'manual',
      title: 'A load is delivered to the Balgonie elevator',
      summary: 'A truck brings part of the contract to the elevator. A contract usually takes several loads.',
      steps: [
        {
          id: 't-l1',
          title: 'The truck is weighed in and out',
          summary: 'Gross weight with the grain, tare weight without it.',
          assumption: true,
        },
        {
          id: 't-l2',
          title: 'A sample is graded',
          summary: 'The sample gives the grade and the dockage.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-receipt',
      lane: 'system',
      shape: 'document',
      title: 'An Elevator Receipt is issued',
      summary: 'One receipt for every load.',
      steps: [
        { id: 't-e1', title: 'Who, what and when', summary: 'The producer, the commodity, the contract reference and the date.' },
        { id: 't-e2', title: 'The weight', summary: 'The weight of the load that was delivered.' },
        { id: 't-e3', title: 'The grade', summary: 'The grade the load was given.', assumption: true },
      ],
    },
    {
      id: 't-match',
      lane: 'system',
      shape: 'manual',
      title: 'Each receipt is matched to its contract',
      summary: 'Each paper is read, and each receipt is matched to the contract it belongs to.',
      steps: [
        {
          id: 't-m0',
          title: 'Each paper is read for its values',
          summary: 'Producer, commodity, weight, contract reference, date and price terms.',
        },
        {
          id: 't-m1',
          title: 'The contract and its receipts are put together',
          summary: 'Every receipt for one contract, collected in one place.',
          assumption: true,
        },
        { id: 't-m2', title: 'The contract number is compared', summary: 'The reference on the receipt against the contract.' },
        { id: 't-m3', title: 'The producer and the commodity are compared', summary: 'The same producer, the same commodity.' },
        {
          id: 't-m4',
          title: 'The delivery date is compared',
          summary: 'Inside the delivery period on the contract.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-check',
      lane: 'system',
      shape: 'manual',
      title: 'Weights and prices are checked',
      summary: 'The numbers on the receipts are checked against the contract.',
      steps: [
        { id: 't-k1', title: 'The weight adds up', summary: 'The weight is worked out again from the figures on the receipt.' },
        { id: 't-k2', title: 'The total is inside the quantity bought', summary: 'Every load added up against the contract quantity.' },
        { id: 't-k3', title: 'The units are made to match', summary: 'Kilograms on the receipts, pounds in the price.' },
        { id: 't-k4', title: 'The price is the contract price', summary: 'The price used is the price on the executed contract.' },
        {
          id: 't-k5',
          title: 'The grade is the one the price assumes',
          summary: 'The grade on the receipt against the grade on the contract.',
          assumption: true,
        },
        {
          id: 't-k6',
          title: 'The price in NAV is the signed price',
          summary: 'The contract price in NAV against the executed contract.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-agree',
      lane: 'system',
      shape: 'decision',
      title: 'Does everything agree?',
      summary: 'If the papers agree the settlement can be worked out. If not, a person decides first.',
      steps: [
        { id: 't-a1', title: 'Is the quantity inside the contract?', summary: 'The loads added up, against the quantity bought.' },
        { id: 't-a2', title: 'Do the weights and the price agree?', summary: 'On the receipts, and between the contract and NAV.' },
        { id: 't-a3', title: 'Is anything missing, or pointing at the wrong contract?', summary: 'A receipt with no contract on file, or naming a different one.' },
        {
          id: 't-a4',
          title: 'Is the grade the one the price assumes?',
          summary: 'Every load, against the contract.',
          assumption: true,
        },
      ],
    },
    {
      id: 't-sort',
      lane: 'system',
      shape: 'manual',
      track: 'down',
      title: 'The merchandiser sorts it out',
      summary: 'Anything that does not agree is decided by a person.',
      steps: [
        { id: 't-s1', title: 'Amend the contract', summary: 'A quantity or a price changed, by the people who signed it.' },
        { id: 't-s2', title: 'Accept a quality or price exception', summary: 'A lower grade, or grain above the quantity at an agreed price.' },
        { id: 't-s3', title: 'Settle a dispute with the producer', summary: 'A conversation, not a calculation.' },
        { id: 't-s4', title: 'Chase what is missing', summary: 'The contract or the receipt that is not on file.' },
      ],
    },
    {
      id: 't-work',
      lane: 'system',
      shape: 'manual',
      title: 'The settlement is worked out',
      summary: 'The weight delivered, priced at the contract price.',
      steps: [
        { id: 't-w1', title: 'The weight in pounds', summary: 'Each load, converted from kilograms.' },
        { id: 't-w2', title: 'Times the contract price', summary: 'The price on the executed contract.' },
        {
          id: 't-w3',
          title: 'Less a discount for a lower grade',
          summary: 'Where a load graded lower and that was accepted.',
          assumption: true,
        },
        {
          id: 't-w4',
          title: 'Anything undecided is left out',
          summary: 'A part still in question waits while the rest goes ahead.',
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
        { id: 't-p1', title: 'The settlement is approved', summary: 'The figures accepted by the person who answers for them.' },
        { id: 't-p2', title: 'The payment is released', summary: 'Only after the approval.' },
      ],
    },
    {
      id: 't-end',
      lane: 'system',
      shape: 'terminator',
      title: 'The producer is paid',
      summary: 'For the loads in the settlement.',
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
  notes: [],
}
