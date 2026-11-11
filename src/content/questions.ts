import type { QuestionGroup } from '../lib/types'

// The questions to put to the client on the call, behind the Questions button on the Process Flow
// page. The FIRST group is everything the demo guesses at: one question for every guess badge on
// either flow, and one for the contract sheet on the Overview. Below it, what the research could
// not settle. `why` is what we assumed, so whoever runs the call can justify the question cold.
export const questions: QuestionGroup[] = [
  {
    id: 'g-guessed',
    title: 'What we guessed',
    caption: 'Every guess badge on the diagrams and on the Overview is listed here.',
    questions: [
      {
        q: 'Does a settlement start with a merchandiser agreeing a purchase with a producer?',
        why: 'We started the line there because that is when you become liable for a settlement. Nobody told us it is the trigger.',
      },
      {
        q: 'Does a purchase contract carry a tolerance on the quantity and a discount for a lower grade? What are they on a mustard contract?',
        why: 'We used 5 percent either way, and 1.50 cents per pound for No. 2 Canada. Both are placeholders, and the over-delivery and grade checks depend on them.',
      },
      {
        q: 'Is the contract price typed into NAV by hand, or imported from the signed contract?',
        why: 'We showed a price in NAV that disagrees with the contract. That only happens if somebody keys it, so please tell us if it is imported instead.',
      },
      {
        q: 'Is each truck weighed in and out on a scale at Balgonie, with gross and tare on the receipt?',
        why: 'We drew the Elevator Receipt with gross, tare, dockage and net clean weight. We could not see a real one.',
      },
      {
        q: 'Who grades the load, and does the dockage come off on the receipt?',
        why: 'We assumed the grade and the dockage are decided at the elevator, and printed on the receipt.',
      },
      {
        q: 'Who puts a contract and its receipts together, and when: for each load, or once the contract is filled?',
        why: 'The whole check starts from a set of one contract and all its receipts. We do not know who builds that set today, or at what moment.',
      },
      {
        q: 'Does anyone check the price in NAV against the signed contract today?',
        why: 'We show that as a check. If nobody does it today it is new work rather than the same work done by us.',
      },
      {
        q: 'When part of a settlement is in question, is the rest paid, or does the whole settlement wait?',
        why: 'We hold only the lines that disagree and prepare the rest. If the whole set waits, the settlement card changes.',
      },
      {
        q: 'Does your Excel contract report look like the one on the Overview?',
        why: 'The research says contract and inventory reporting lives in Excel. The columns and the status words are our invention.',
      },
    ],
  },
  {
    id: 'g-line',
    title: 'The process itself',
    caption: 'Whether the sequence on screen is the sequence you actually work in.',
    questions: [
      { q: 'Is this the order the work happens in? Which card is in the wrong place?' },
      {
        q: 'Who does this work today: the Merchandising and Logistics Coordinator, or Accounts Payable?',
        why: 'Our research put it in Accounts Payable. Your email copied the coordinator, so we routed the mismatches to merchandising.',
      },
      { q: 'Who approves the settlement and releases the payment?' },
      { q: 'Is a settlement worked out for each load, or once for the whole contract?' },
      { q: 'How do the contract and the receipts reach you: email, scan, paper at the elevator?' },
      { q: 'What happens today when a receipt names a contract nobody can find?' },
    ],
  },
  {
    id: 'g-volume',
    title: 'Volume and cost',
    caption: 'We have estimates from research. We would rather have your numbers.',
    questions: [
      { q: 'How many settlements go through in a month, and does it change through harvest?' },
      { q: 'How long does one take when it goes smoothly, and when it does not?' },
      { q: 'What does it cost when a settlement goes out wrong: an overpayment, a correction, a call with the producer?' },
    ],
  },
  {
    id: 'g-checks',
    title: 'The checks',
    caption: 'Whether these are the right checks.',
    questions: [
      { q: 'Are these the right checks? Is there one you would not want flagged?' },
      { q: 'What check have we missed that you would expect every time?' },
      { q: 'Which grains and contract types do you settle besides mustard?' },
      { q: 'Where should the clean values land: NAV, the Excel report, or both?' },
      { q: 'Is the process the same at Hamburg, or only at Balgonie?' },
    ],
  },
]
