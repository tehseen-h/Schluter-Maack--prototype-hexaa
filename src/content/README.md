# The content pack

This folder is **the only thing that changes per client**. Edit these files, keep the
TypeScript types (they guide you and catch mistakes), and the whole demo re-skins itself.

Everything a client would recognise as *their own wording* lives here, including page
headings, table column headings and pipeline stage names. If you want to hardcode a
client's word into a page component, it belongs here instead.

| File | Holds |
|---|---|
| `project.ts` | Identity and branding: `client`, `subtitle`, `createdBy`, optional `accent` hex, `identity` chips, `boundaries` (human-retains), `caseSummary`. |
| `documents.ts` | The documents that come in, each rendered as a faithful "paper". Give a `key` to any field you'll flag. |
| `extracted.ts` | Values pulled out. `docId` = provenance, `fieldKey` links to a field, `primary` decides visible vs tray. |
| `exceptions.ts` | Flagged problems: `severity`, `detail`, `suggestion`, `routeTo`, `docId`/`fieldKey`, and `against` for the other side of a mismatch. Also exports `findingSides`, the two words that name those sides on the tabs. |
| `intake.ts` | `intakeIntro` (the page heading and `runLabel`, the button word, both in their words) and the **cases**: each lists every document it needs before it can run. |
| `schedule.ts` | *Optional.* The client's own master record, with its own title, caption and column headings. Set `assumption: true` plus an `assumptionNote` if you invented the record instead of sourcing it: it renders a guess badge, like the flows. Delete the file and the `schedule` key in `index.ts` if there is no such record. |
| `pipeline.ts` | The simulated stages the Intake page steps through, in the client's words. |
| `questions.ts` | Grouped questions for the call, behind the Questions button on the Process Flow page. |
| `flowToday.ts` | **The client's own process**, drawn with standard flowchart symbols, with no step of ours anywhere in it. The Process Flow page opens on this. |
| `flow.ts` | **The same work with our part marked**, as one left-to-right line. |
| `comparison.ts` | *Optional, create it when needed.* `comparison` (the cross-check as a grid of values, one column per source; turns on the wide Overview layout) and `packList` (what the set must contain, and whether it does). Add both to `index.ts`. |
| `figures.ts` | *Optional, recommended when the case has numbers.* Every weight, price, total, date and weekday worked out in code, with the planted faults listed in one place. Other content files import from it, so nothing is typed twice and everything ties out. Check it with `node --experimental-strip-types --no-warnings scripts/check-figures.mjs`. |
| `workings.ts` | *Optional.* Builds `loads` and `settlement` (below) from the figures. |
| `access.ts` | *Generated, never edited by hand.* The password lock: login-page name and summary, issue date, last day, and a one-way check value. Issue it with `npm run access -- --repo <github repo>` (CLAUDE.md section 4b), and re-issue after changing `project.client` or `project.subtitle`. Contains no password. |
| `index.ts` | Assembles everything into one `ContentPack`. Don't edit beyond adding or removing an optional section. |

**Many units against one limit, and the sum worked out (optional).** `loads` is a table of units
(truck loads, shipments) with a running total against a limit, and `settlement` is the sum worked out
from them line by line, with a stamp saying what it is not (for example "Prepared, not released").
Both are drawn on the Overview when present and by the live run on the Intake page. Give an Intake
case `stages` (with `show: { read, keys }` or `show: { panel }` and `notes`) plus its own `loads` and
`settlement` and the run reads each paper field by field, adds the loads and writes the sum out.
Without `stages` the page steps through the plain `pipeline` checklist, as before.
`node verify.mjs` bundles the content pack with esbuild, so documents built from a figures file are
checked too, and every key a stage reads must exist in that document.

Optional fields on the existing files, all with today's behaviour as the default:
`project.pages` / `project.sections` / `project.mainDocs` (the client's own page names and
headings, and which documents the Overview lists), `photo` / `system` / `formatLabel` on a
document (phone photos drawn as photos, a system record as a plain card), and `pulled` /
`followUp` / `docsHeading` / `docWord` / `reviewLabel` in `intake.ts`. The types in
`src/lib/types.ts` document each one.

## The one rule that trips people up

**`fieldKey` must match a `key` in that document.** A `fieldKey` used in `extracted.ts` or
`exceptions.ts`, including inside `against`, has to correspond to a `key` somewhere in the
matching document's `render` in `documents.ts`:

- a `key` on a section field, **or**
- an entry in a table row's `keys[]` array (same position as the cell), **or**
- a `key` on a `meta` or `footer` item.

That link is what makes "click a finding, highlight the exact spot in the document" work.
If a highlight doesn't fire, the keys don't match.

### Both sides, or the finding is half a finding

A finding that says two papers disagree needs a `key` on **both** values, and an `against`
pointing at the second one. That is what drives the two tabs on the Exceptions page, so a
client sees the disagreement without clicking anything.

Name those tabs yourself, with `findingSides` in `exceptions.ts`. "Specified" and
"Evidence" are only the fallback, and they suit a spec-versus-build job; for an invoice
against its order, "What we were billed" and "What we ordered and received" is what the
client would say. Check which document actually lands on which side before you write the
words: `specified` labels the `docId` tab, and `docId` is usually the paper carrying the
*wrong* value, because that is where `fieldKey` has to highlight. `against.label` overrides
the document name on the other tab, so use it to name the exact paper ("Purchase order
PO-4471") rather than its kind.

```ts
// documents.ts, on the invoice
{ cells: [..., '4.20', ...], keys: [..., 'l2_unit', ...] }
// documents.ts, on the order
{ cells: [..., '3.80', ...], keys: [..., 'po_l2_unit', ...] }

// exceptions.ts
docId: 'invoice', fieldKey: 'l2_unit',
against: { docId: 'po', fieldKey: 'po_l2_unit', label: 'Purchase order PO-4471' },
```

## Field-key checklist for a new document

1. In `documents.ts`, give every value you might flag a `key`.
2. In `extracted.ts`, reference those keys via `fieldKey` (and set `docId`).
3. In `exceptions.ts`, point each finding at `docId` + `fieldKey`, plus `against` where
   there is a second side.
4. Run `npm run dev`, open **Exceptions**, click each finding, confirm it highlights and
   that both tabs show the right paper.
5. Run `node verify.mjs`. It resolves every link mechanically.

## Guesses

Anything you inferred or invented to make the demo hold together gets `assumption: true` on
the flow card **or on `schedule.ts`**, and a matching question in the **first** group of
`questions.ts`. The master record is the one people forget: it looks like the client's own
sheet, so an invented one reads as fact. A guess you
admit to gets corrected on the call, which is worth more than agreement. A guess that looks
like fact is the one thing that can lose the room.

## The two flows are one line, drawn twice

`flow.ts` is `flowToday.ts` with ownership colour on it. Same start, same end, same branch,
same order. You may split one of their cards into several when it is really several checks,
and add the quiet "nothing to raise" card. Nothing else. Write the mapping out, their step
against yours, before you call it done. `node verify.mjs` flags steps of theirs that have
no counterpart in yours.

**Moving a branch means moving the card.** A `track: 'up'` or `track: 'down'` card takes its
column from where it sits in the `phases` array, not from the edge that points at it. Change
the edge alone and the card stays in its old column: the branch arrow then runs backwards
across the canvas and leaves a hole in the spine, which looks like a mistake in the process
rather than a mistake in the file. Keep the off-spine card next to its branch point in the
array, and it lands directly above or below it.

## Comparison cells link too

A `comparison` cell's `fieldKey` should be a key in the document of its own column, and
its value a faithful (possibly shortened) copy of that document's value. A row with an
`exceptionId` opens that finding, and needs one cell per column. `verify.mjs` checks that
every key exists in some document and that every finding id resolves; that a key sits in
its own column's document is yours to check.

## Copy rules

- No em dashes or en dashes anywhere. `verify.mjs` fails on them.
- Plain words for status, never counts. No metric dashboards.
- Say what a step *is*, not what category it belongs to. "Matching the invoice to its
  order" beats "Document classification".
