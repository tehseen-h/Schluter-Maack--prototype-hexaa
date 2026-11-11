# CLAUDE.md, how to turn a lead into a demo with this kit

This repository is a **prebuilt pre-sales demo engine**. For a new lead you do **not**
rebuild the app. You read the lead's documents and **fill in the content pack**
(`src/content/`). Everything else, the shell, the four pages, the simulated pipeline, the
styling, and the **two editable process-flow views**, already exists and is reused as-is.

Read this whole file before writing anything.

---

## 0. How to work: in phases, written down, challenged

A demo is many small decisions that have to agree with each other. Do not do it in one
pass.

- **Write a plan first, outside the repo** (it must not ship): the phases, a fact ledger
  that sorts every fact into sourced / inferred / filled (§1), and the data you will use.
  Tick phases off and keep a log of every conflict you find and *why* it happened.
- **Phases, in this order:** plan and figures, then engine changes (if any), then the
  content pack, then a browser pass on Overview / Intake / Exceptions, then the process
  flow, then a cross-consistency pass over everything, then the walkthrough PDF, then ship.
- **Challenge every phase before the next one starts**, yourself or with a subagent given
  the documents and these instructions: the plan against the documents, every figure
  recomputed independently, the flow audited for sequence, honesty and mapping, and finally
  the whole demo read end to end for contradictions between pages.
- **Work every value out, never type it.** Put the case figures in a small script (prices and
  totals, rates, dates and weekdays, identifiers) so everything ties out except the faults
  you plant on purpose. The client judges the demo by its numbers.

## 1. What you're given for a lead

Usually two files, sometimes three:

1. **Email thread**, the **client's own voice**. What *they* said their problem is. Trust
   this most.
2. **Use-case document**, **our own research and assumptions**, written before any call. It
   is **NOT confirmed fact**. Treat it as our best guess. It is, however, the main source
   you build the demo from. Where the email and the use-case doc disagree, the
   **email wins**.
3. *(Sometimes)* a **file the client sent**, or a **brief** (our own call prep). A real
   client file is strong evidence. The brief is context.

No call transcript exists yet. This demo is what gets shown *on* the first call, to make
our research concrete so the client can confirm or correct it.

You are also told **the GitHub repo** this demo will be pushed to. It is named
`<company-name>-prototype-hexaa` (sometimes `<company-name>-hexaa-prototype`), the same name
as its Vercel address. The part before `-prototype-hexaa` is the **company name** used for
the demo's password (§4b). If no repo name is in the prompt, ask for it before you issue the
password.

### Read with three buckets, not two

Everything you put on screen is one of three things, and you must know which as you write
it. This matters more than anything else in this file, because the whole demo is an
argument that we understood their job, and one confident-sounding invention undoes it.

| Bucket | Where it came from | How to treat it |
|---|---|---|
| **Sourced** | The client said it, or a client file shows it | State it plainly |
| **Inferred** | Our research says it, or it follows necessarily from something sourced | State it, but expect to be corrected |
| **Filled** | Neither. You needed it for the demo to hold together | Mark `assumption: true` and put a question in `questions.ts` |

A "filled" item is not a failure. Gaps are normal before a first call. What is a failure is
a filled item that looks sourced. If you find yourself writing a system name, a team name,
a volume or a frequency that nobody told you, it is filled. Mark it.

Watch `schedule.ts` in particular. A master record is the most confident-looking thing on
the Overview, it is trivially easy to invent whole, and a caption saying "your own working
list" turns a guess into a claim. If you made it up, set `assumption: true` on it and put a
question behind it like any other guess.

---

## 2. Challenge the pattern before you build

This kit fits leads whose work is: **things come in, values are read out, they're
cross-checked, mismatches are flagged for a human**. That covers most leads.

**Before building, decide if this lead actually fits.** If the real work is fundamentally
different, **stop and say so**, and propose what would fit instead. Only proceed when it
genuinely matches. Then report back, briefly: (1) the lead's core problem in one or two
lines, (2) whether the four-page pattern fits, (3) the domain language you'll use.

Challenge everything in this file the same way. It is a starting point, not a
specification. If something here is wrong for this lead, say so and change it. That goes
for the engine too: personalise sections, not only words. If a lead needs a section the
kit does not have, add it as an **optional** content field whose absence keeps today's
behaviour, so the kit stays a kit (see "Optional pieces" in §4 for the ones that already
exist). What you
must not change is the analysis winning: where this kit and the lead's documents disagree,
**the documents win**.

---

## 3. The rules that make these demos work

- **Simulation only. No real logic.** No backend, no real processing. Results are
  predefined because *you* wrote the sample content and know its outcome. Do **not** build
  integrations or parsers. That is a later phase, out of scope.
- **Make it feel real.** Believable values, sensible pipeline timing, real domain terms.
- **Realistic data, not "fake".** Realistic names and values. Keep the one persistent
  "sample data" badge. Don't scatter the word "sample" everywhere.
- **No metric dashboards.** Show the actual content (values, findings), not counts.
- **Honour the boundaries.** Whatever must stay human goes in `project.boundaries`, and
  nothing on the `ours` lane of the flow may cross them.
- **Use the domain's own words everywhere.** Including the page headings, the table column
  headings and the pipeline stages, all of which are content, not code.
- **Do not simplify into vagueness, and do not inflate into complexity.** A client should
  be able to read any card on any page without a glossary and without a guide.
- **No em dashes or en dashes anywhere.** Use a comma, a full stop or a colon.
  `verify.mjs` fails the build on this.

---

## 4. Your actual task: fill the content pack

Edit only these files. The TypeScript types guide you, and `src/content/README.md` has the
per-file detail.

| File | What to put in it |
|---|---|
| `project.ts` | `client`, `subtitle`, `createdBy`, optional `accent` hex, `identity` chips, `boundaries`, `caseSummary`. |
| `documents.ts` | Each incoming document as a faithful "paper". Give any field you'll flag a `key`, **on both sides of a comparison**. |
| `extracted.ts` | Values pulled out. `docId` = provenance, `fieldKey` links to a field, `primary` = visible vs tray. |
| `exceptions.ts` | Flagged problems: `severity`, `detail`, `suggestion`, `routeTo`, `docId`/`fieldKey`, and `against` for the other side. Also `findingSides`, the two words naming those sides on screen. |
| `intake.ts` | `intakeIntro` (including `runLabel`, the client's own word for running the check) plus the intake **cases**: each lists every document it needs. |
| `schedule.ts` | *(optional)* The client's own master record, with its own column headings. Set `assumption: true` on it if you invented the record rather than sourced it. |
| `pipeline.ts` | The simulated stages, in the client's words. |
| `questions.ts` | What to ask on the call. The first group must cover every guess on the flows. |
| `flowToday.ts` | **The client's own process**, flowchart symbols, no step of ours (see §6). |
| `flow.ts` | **The same process with our part marked** (see §6). |

### Optional pieces (use them when the lead needs them)

Every one of these is optional. Leave it out and the page behaves as before.

| Where | Field | What it does |
|---|---|---|
| `project.ts` | `pages` | Renames the four pages in the client's words (sidebar and top bar). |
| `project.ts` | `sections` | Overview headings (`needsAttention`, `needsAttentionNote`, `reviewAll`, `cameIn`, `humanControl`, `pulledOut`, `pulledOutCaption`), Exceptions wording (`findings`, `findingsHint`, `routeLabel`, `approve`, `approved`, `approveNote`). Say what "approve" approves. |
| `project.ts` | `mainDocs` | Which documents the Overview lists, when other Intake cases bring their own. |
| `comparison.ts` | `comparison` | The cross-check as a grid of values: one row per value, one column per source, the disagreeing cell marked, row opens its finding. `mono` per row, `alsoChecked` for checks that passed. Turns on the **wide Overview layout** (three short cards in a row, the grid full width). |
| `comparison.ts` | `packList` | What the set must contain and whether it does (a supplier onboarding checklist, a tender's required documents). Replaces "What came in". Can carry a guess badge. |
| `documents.ts` | `photo`, `system`, `formatLabel` | A paper that arrived as a phone photo is drawn as one (tilted, captioned); a record read from their system is a plain card of values, never a fake copy of their screen. |
| `intake.ts` | `pulled`, `followUp`, `docsHeading`, `docWord`, `reviewLabel` | A record fetched automatically (shown, not added); what happens after the run (values noted back, or a message drafted for a person); whose documents the checklist is; the client's word for a document. |
| `types.ts` / `index.ts` | `loads`, `settlement` | Many units checked against one limit with a running total, then the sum worked out line by line, held lines marked, with a "prepared, not released" stamp. Drawn on the Overview and by the Intake live run. |
| `intake.ts` | `stages`, `loads`, `settlement` on a case | The live run for that case: each paper read field by field with the value typed out, checks arriving as they are made, the loads filled in, the sum written out. Skip button included. Without `stages` the page uses the plain `pipeline` checklist. |

Add `comparison` and `packList` to `index.ts` when you use them. `verify.mjs` checks
their links too, and fails if `comparison.ts` exists but is not in `index.ts`.

Links between pages: a finding in "Needs attention" opens that finding on the Exceptions
page; a master-record row opens its finding only when it has an `exceptionId` (a row with
nothing to show is not a link); a comparison row opens its `exceptionId` the same way.

**The linking rule:** a `fieldKey` in `extracted.ts` / `exceptions.ts` (including inside
`against`) must match a `key` used somewhere in that document's `render` in `documents.ts`
(a section field key, a table cell `keys[]` entry, or a meta/footer key). That powers
click-to-highlight on the Exceptions page. `node verify.mjs` checks this for you.

Don't touch `src/components/`, `src/pages/`, `src/flow/` or `src/lib/` unless the pattern
genuinely doesn't fit and you've flagged it. If you find yourself wanting to hardcode a
client's word into a page, that word belongs in the content pack instead.

### 4b. Lock the demo with its password (required, first thing after you start)

Every demo opens on a login page and only shows the demo after the right password. The
password is **`<company-name>-<hexaa suffix>`**, for example `dg-bevan-insurance-<suffix>`
for the repo `dg-bevan-insurance-prototype-hexaa`. The suffix is hexaa's private part. It
lives **only** on hexaa's machine, in `~/.hexaa/demo-password-suffix`, and it is the whole
secret: anyone with the suffix can work out every demo's password.

Issue the lock with the repo name from the prompt:

```bash
npm run access -- --repo <github repo name or url>
npm run access -- --test <company-name>     # confirms the lock opens
```

This writes `src/content/access.ts`: the client name and summary for the login page (copied
from `project.ts`, so fill `project.ts` first, and **re-run it whenever you change
`project.client` or `project.subtitle`**), the issue date, the last day (14 days later), and a
salted one-way check value. There is no password in it. The dates are part of what is hashed,
so editing a date by hand breaks the password: re-run the command to re-issue. Don't create
or edit `access.ts` by hand.

Rules that keep the suffix secret:

- **Never write the suffix or a full password anywhere**: not in any project file, not in the
  walkthrough PDF, not in a commit message, not in chat, not in a plan. When a person needs
  it, write `<company-name>-<hexaa suffix>`. `npm run access` prints it masked.
- If `~/.hexaa/demo-password-suffix` is missing, **stop and ask** for it to be put there.
  Never put the suffix into the project to work around it.
- `node verify.mjs` fails if the suffix appears in any project file, the build included.

The login page needs no other work. It shows the hexaa logo, "A private demo created for
<client>", the subtitle, prepared for, prepared by, and "Available till" with the days left.
After the right password the browser stays logged in until the last day, and after that day
the page says the walkthrough has closed. A "Lock demo" link in the sidebar logs out.

### Findings: make them four different kinds of problem

Four findings that are each a different failure class (a price disagreement, a quantity
disagreement, an arithmetic error, a terms mismatch) reads as a capable system. Four
variants of one thing reads as a demo with one trick. Rank them so the one that costs most
is at the top, and give every one of them a `suggestion` and a `routeTo`.

### Branding (already done, only the client name changes)
- The logo is the real mark (`public/hexaa-mark.png`) and favicon. Leave both.
- "Created by hexaa" shows automatically in the sidebar and on the Overview hero.
- Set `project.client`. Optionally set `project.accent` to an exact brand hex. The theme is
  warm and light with a navy sidebar and an amber accent. Leave it unless asked.

---

## 5. Sample files

The Intake page loads the documents you defined in `documents.ts` (document-render mode),
so you usually don't need real binary files. If a lead needs a real scan or photo on the
Exceptions page, use image mode on that document (`image.src` plus normalized highlight
`boxes`) and put the image in `public/samples/`.

Model intake as **cases, not files**. A case is a unit of work and lists every document it
needs, and the page will not run until all of them are in. That refusal is itself worth
showing: it is how a client learns the tool will not guess at a partial set. Give at least
one case that needs several documents and one that reads clean.

---

## 6. Process Flow, the most important page

If the flow is wrong, everything is wrong. It is the one page a client will argue with, and
the one that decides whether they believe we understood their job.

The page is **already built** (`src/flow/` plus `src/pages/ProcessFlow.tsx`). You do not
re-create it. It holds **two views of the same work**, switched from the top right, and you
fill both:

**`flowToday.ts`, "How it runs today". The default, and the one to open the call on.**
Their own process, with **no step of ours anywhere in it**. Meaning is carried by the
standard flowchart symbol (`shape`), not by colour: `terminator` starts and ends it,
`document` is a piece of paper, `process` is a step in a system, `manual` is work a person
does by hand, `decision` is a diamond. Because nothing here is a proposal, there is nothing
to argue with, and a correction is worth more to us than agreement.

**Start where their work starts, not where the paperwork starts.** The obvious first card
is "a document arrives", and it is almost always one or two steps too late. Ask what event
*causes* that document to exist, and what makes the client liable for it. A supplier
invoice arrives because somebody raised an order. Carrier papers arrive because a load came
in and had to be given to a subcontractor, which is the moment the client became the
principal and took on the risk. Beginning there does two things: the client recognises his
own trigger immediately, and the reason the whole process exists is on screen instead of
assumed. If you genuinely cannot source the trigger, draw your best guess and badge it:
that is a better first question than a missing first step.

**`flow.ts`, "Where we would help".** The same work as one left-to-right line, with the
part we would take over on the `ours` lane in the accent colour. Nothing is added to the
sequence and nothing removed. Every accent card is a step that already happens today, and
the only change is who performs it. That is what makes it hard to argue with.

**Derive this file FROM `flowToday.ts`. Do not write it separately.** This is the easiest
and most damaging mistake available here, and it does not look like a mistake: both files
pass every check on their own while describing two different processes. The whole mechanic
is that the client corrects his own line and then recognises it again with your layer on
it. A step he just agreed to that has quietly vanished breaks that in the first ten
seconds.

So: open `flowToday.ts`, take its phases in order, and for each one decide only **who does
it**. Keep their start, their end, and their branch, in the same places. You are allowed to
split one of their cards into two or three when it is genuinely several different checks,
and to add the quiet "nothing to raise" card, which has no equivalent today. Nothing else.

Then **write the mapping out** as a table, their step against yours, before you call it
done. It takes two minutes, it is the thing that forces the alignment, and it belongs in
the walkthrough PDF anyway. `node verify.mjs` reports steps of theirs with no counterpart
in yours, but it is a word-overlap heuristic: it catches a card that vanished, not a card
that drifted.

Both files share one model:

- `phases`, each on a lane (`system` / `ours` / `human`), with `summary`, optional `systems`
  chips, and `steps`. Order left to right is the order the work happens in.
- `track: 'up' | 'down'` lifts a card off the line. Use **at most one of each**, and give
  both a message rather than detail: `down` is the expensive path, the one that costs real
  money when it is missed; `up` is the common outcome where nothing disagreed and nobody
  was interrupted. Clients underrate the `up` one.
  An off-line card takes its **column from its place in the `phases` array**, not from the
  edge that reaches it. So if you move a branch, move the card too, next to the phase it now
  hangs off. Leave it behind and the arrow runs backwards across the canvas into a gap in
  the spine, which reads as a fault in the client's process rather than in your file.
- `edges`: `seq` along the line, `down` / `up` to an off-line card. Label every branch. A
  decision labels **both** its outputs.
- **A side card rejoins the line from its RIGHT edge**, as a labelled `seq` edge into the
  next card. Never rejoin with an `up` edge from the top of a `down` card: that retraces the
  drop coming into the same point, one line drawn over another. Keep **one** loop back: a
  second backward arrow into the same side card from further along always crosses the
  first. Put "not approved, goes back" as a step inside the card instead.
- `assumption: true` on anything you inferred or filled. It renders a guess badge, and
  every guess badge needs a matching question in the first group of `questions.ts`.
- `notes`, one or two short ones, tucked in the corridor left of the line. The list of
  what you guessed does **not** belong in a note: it is the first group of `questions.ts`,
  which the Questions drawer highlights at the top.

In the app the client can expand phases, click any card to edit it, add and delete phases,
steps, notes and connections, drag notes and cards about, and export or import PNG and
JSON. All of that is already wired. Do it live on the call.

Dragging works like this: a press on empty canvas pans the view; a press on a card drags
that card only, and its lines follow it, re-routed clear of every other card and never on
top of another line. A card dropped on another settles beside it. **More, Put cards back in
line** undoes every move (or **Put back in line** on one card, in the editor). A move is
live state, kept in the browser and in an exported file; it never changes the content
pack, so you still describe the order of the work in `phases`, not by dragging.

The page keeps the viewer's place: it opens on the whole line; opening a card's steps
zooms to them and closing it returns exactly to where the viewer was; clicking a card opens
the editor without moving the canvas (unless the card would sit behind the panel, in which
case it is nudged into sight and the nudge is undone on close).

The Questions drawer is a working list for the call: each question can be **answered**
(a box opens, the answer is saved) or **removed** (with "bring them back"), and both are
kept in `sessionStorage` for the browser session, shared by both views. Reset on the
diagram does not clear them. **Export file** asks whether to include the questions and
answers (ticked by default); importing that file brings them back, matched by question
text, so a file exported before the list changed never puts an answer on the wrong
question.

**The skill** is bundled at `skills/process-flow-diagram/`. You only need it if you have to
change the diagram *component itself*, which is rare and which carries real traps. For a
normal project, filling the two content files is enough.

---

## 7. Build and check the app

```bash
npm install
npm run typecheck      # must pass
npm run build          # must pass
npm run dev            # click through all four pages
```

- Overview reads as *their* process. Primary values visible, detail in the tray. No dead
  space when the tray is open.
- Intake: a case will not run until every document it needs is in, and the result is
  visible without hunting for it.
- Exceptions: clicking a finding highlights the exact field, and a two-sided finding shows
  both sides. Findings can be edited and approved.
- Process Flow: opens on **How it runs today**. Every line touches both cards it joins, no
  line crosses another, no label sits on another label or on a line, and every branch is
  labelled.
- Process Flow, **as a live tool**, because this page gets edited in front of the client.
  Draw a link by dragging one card's handle onto another. Click a card and change the thing
  that carries the meaning on that view: the flowchart symbol on *How it runs today*, the
  ownership lane on *Where we would help*. Add and delete a step, a card, a note and a
  connection. Export the file, import it back, then reset.
- Process Flow, **keeps the viewer's place**: zoom and pan somewhere, open a card's steps,
  close them, and confirm you are back exactly where you were. Same for opening and closing
  the editor. The page itself opens on the whole line.
- Process Flow, **questions**: answer one, remove one, reload, both are still there.
  Export with the questions ticked, check the file carries them, import it back.
- **No two lines touch or cross**, including with every phase expanded one at a time. The
  bundled skill's `verify-flow.mjs` checks this; a rejoin from the top of a side card is the
  usual cause.
- Process Flow, **dragging cards**: drag a card below the line, onto another card, and above
  the line. Its lines follow, clear of every card and of every other line, and a card dropped
  on another settles beside it. A click still opens the editor and empty canvas still pans.
  Reload, the card is still there; "Put cards back in line" restores the original exactly.
  The bundled skill's `verify-drag.mjs` runs all of this on both views. Both checkers sign in
  themselves: run them with `DEMO_COMPANY=<company-name>`.

Then look at it in a browser yourself. Screenshot each page. The layout defects that matter
(a card hidden behind a scroll position, a label struck through by a line) do not show up
in a type check.

---

## 8. Create the walkthrough PDF (for whoever runs the call)

After the app is right, produce a **short, good-looking PDF** (use the `pdf` skill). It is
for the person on the call: clear, to the point, no jargon.

Write it for somebody who has **never heard of this client**, because that is who usually
picks it up: a colleague covering the call, or you in three weeks. Two sections earn their
place before anything else, and both take ten minutes:

- **Who this is about.** What the company does, who the named people are, which systems are
  theirs, and why the problem lands on them rather than on somebody upstream.
- **The words on screen.** If the demo uses the client's own vocabulary, and it should, then
  a short glossary is the difference between a readable document and an unreadable one.

Then:

1. **The problem we identified**, two or three sentences from the use-case doc and email.
   Where the client has said something in their own words, quote it.
2. **What we built**, one line.
3. **Each page, in short.** For every page name each section and say in one line what it is
   and why it's there.
4. **The process flow, in depth.** Explain the flow as prose, and visualise it a **second,
   different way** from the app, so the reader sees the same logic twice rather than a
   screenshot twice. Include the **mapping table**, their step against yours, from §6. It is
   the single most useful thing on the page for whoever runs the call, and building it is
   what proves the two views actually agree.
5. **Walkthrough**: the order to open things on the call and, most important, **the
   questions where we need the client to confirm** our assumptions. These are the ones in
   `questions.ts`. Make them explicit and easy to read.

---

## 9. Verify at the very end (required)

```bash
node verify.mjs
```

It checks: content is no longer the example, every `fieldKey` and `docId` resolves, both
flows are real and `flowToday` genuinely contains no step of ours, every guess badge has a
question behind it, no long dashes, a PDF exists, the build ran, the password lock is issued
for this client and not expired, and hexaa's password suffix is in no file. Fix every
**FAIL**. Then confirm the lock once more: `npm run access -- --test <company-name>`.

Then **the semantic verify**, the part a script can't do:

- Open the built app and the PDF side by side. Confirm the PDF describes **every page and
  every section that actually exists**, nothing missing, nothing described that isn't there.
- Confirm the **process flow** in the PDF matches the phases in `flow.ts` and `flowToday.ts`.
- Confirm the walkthrough's confirmation questions cover the real assumptions in the
  content.

Only call the project done when the mechanical checks pass and the PDF and app agree. Then
it's ready for GitHub and Vercel (`npm run build`, deploy `/dist`, `vercel.json` is already
in place).
