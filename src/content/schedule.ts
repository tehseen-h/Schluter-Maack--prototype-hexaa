import type { ScheduleRow, ScheduleTable } from '../lib/types'
import { cents, sheet, tonnes } from './figures'

// The contract sheet: every open producer contract, with what has been delivered so far
// against it. The status words are worked out in figures.ts from the delivered weight
// against the contract's own limits, not typed here.
//
// We invented the SHAPE of this list for the demo (the research says contract and inventory
// reporting lives in Excel, not what the columns are), so it carries a guess badge.
const STATUS: Record<string, { status: ScheduleRow['status']; label: string }> = {
  over: { status: 'needs-review', label: 'Over the maximum' },
  filled: { status: 'clear', label: 'Filled, inside the limits' },
  filling: { status: 'clear', label: 'Still filling' },
  'not-started': { status: 'clear', label: 'Not started' },
}

export const schedule: ScheduleTable = {
  title: 'Open producer contracts, Balgonie',
  caption:
    'The contract and inventory reporting your team keeps in Excel: each open contract and what has been delivered against it. A contract delivered past its maximum is marked, and opens its mismatch.',
  countNote: 'A selection of the open contracts',
  assumption: true,
  assumptionNote:
    'That the sheet looks like this, with these columns, is our reading of the research. You have not told us what it looks like.',
  columns: {
    ref: 'Contract',
    location: 'Producer',
    detail: 'Grain, quantity and price',
    evidenceRef: 'Delivered so far',
    status: 'Status',
  },
  rows: sheet.map((r): ScheduleRow => ({
    id: r.c.no,
    ref: r.c.no,
    location: r.c.producer,
    detail: `${r.c.commodity}, ${tonnes(r.c.qtyKg)} at ${cents(r.c.cents)}`,
    evidenceRef: tonnes(r.deliveredKg),
    status: STATUS[r.state].status,
    statusLabel: STATUS[r.state].label,
    exceptionId: r.state === 'over' ? 'ex-over' : undefined,
  })),
}
