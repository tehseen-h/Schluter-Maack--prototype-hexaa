import type { QuestionGroup } from '../lib/types'

// The questions for the call, behind the Questions button on the Process Flow page. Ordered from the
// most important to the least, within each group and across them.
//
// The FIRST group is one question for every guess badge on either flow and on the Overview (the
// badge marks a step that is in neither the email nor the research). `why` says why the answer
// matters, so whoever runs the call can justify the question without preparing.
export const questions: QuestionGroup[] = [
  {
    id: 'g-guessed',
    title: 'The guessed steps',
    caption: 'Each guess badge on the diagrams and on the Overview, most important first.',
    questions: [
      {
        q: 'Is a load graded, and does the price change with the grade?',
        why: 'The demo prices No. 1 Canada and pays No. 2 Canada 1.50 cents per pound less. The grade check, the grade mismatch and the discount line all depend on it.',
      },
      {
        q: 'Who puts a contract and its receipts together, and when: for each load, or once the contract is filled?',
        why: 'Every check starts from one contract and all its receipts. This is the step the tool takes over first.',
      },
      {
        q: 'Does a contract carry a tolerance on the quantity? What is it on a mustard contract?',
        why: 'The demo uses 5 percent either way. The over-delivery mismatch depends on it.',
      },
      {
        q: 'When part of a settlement is in question, is the rest paid, or does the whole settlement wait?',
        why: 'The demo holds only the lines that disagree and prepares the rest.',
      },
      {
        q: 'Is the contract price typed into NAV by hand? Does anyone check it against the signed contract?',
        why: 'The demo shows a price in NAV that differs from the signed contract. That only happens if the price is keyed.',
      },
      {
        q: 'Does a contract have a delivery period, and is a load dated outside it a problem?',
        why: 'The demo checks each receipt date against a delivery period.',
      },
      {
        q: 'Is each truck weighed in and out on a scale at Balgonie, with gross and tare on the receipt?',
        why: 'The demo works the net weight out from gross, tare and dockage.',
      },
      {
        q: 'Does your Excel contract report look like the one on the Overview?',
        why: 'The columns and the status words on the Overview are filled in.',
      },
    ],
  },
  {
    id: 'g-who',
    title: 'Who and how',
    caption: 'Who does the work, and how it moves.',
    questions: [
      {
        q: 'Who does this work today: the Merchandising and Logistics Coordinator, or Accounts Payable?',
        why: 'It decides who receives the mismatches. The demo sends them to merchandising.',
      },
      { q: 'Who approves the settlement and releases the payment?' },
      { q: 'Is this the order the work happens in? Which card is in the wrong place?' },
      { q: 'Is there a step on the line you would not want AI anywhere near?' },
      { q: 'Is a settlement worked out for each load, or once for the whole contract?' },
      { q: 'How do the contract and the receipts reach you: email, scan, paper at the elevator?' },
      { q: 'What happens today when a receipt names a contract nobody can find?' },
    ],
  },
  {
    id: 'g-checks',
    title: 'The checks',
    caption: 'Whether these are the right checks.',
    questions: [
      { q: 'Are these the right checks? Is there one you would not want flagged?' },
      { q: 'What check is missing that you would expect every time?' },
      { q: 'Where should the clean values land: NAV, the Excel report, or both?' },
      { q: 'Which grains and contract types do you settle besides mustard?' },
      { q: 'Is the process the same at Hamburg, or only at Balgonie?' },
    ],
  },
  {
    id: 'g-volume',
    title: 'Volume and cost',
    caption: 'Last, because the answers do not change the diagram.',
    questions: [
      { q: 'How many settlements go through in a month, and does it change through harvest?' },
      { q: 'How long does one take when it goes smoothly, and when it does not?' },
      { q: 'What does it cost when a settlement goes out wrong: an overpayment, a correction, a call with the producer?' },
    ],
  },
]
