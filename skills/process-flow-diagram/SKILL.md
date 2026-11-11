---
name: process-flow-diagram
description: "Build an interactive, editable process flow diagram in a React + TypeScript app using @xyflow/react. Triggers: 'process flow diagram', 'swimlane diagram', 'pipeline visualization', 'build a process map', 'interactive flowchart', 'one line flow diagram', 'show the client their own workflow', 'flowchart with standard symbols', 'diagram that shows who owns what step', 'build a flow page like the process flow demo'. Produces ONE left-to-right line of phase cards driven by a typed data model (phases, steps, labelled edges), with two switchable views of the same work: the client's own process drawn in standard flowchart symbols, and the same process with the part you would take over marked by ownership colour. Includes off-line branch cards, expandable step trees, cards you can drag anywhere with their lines re-routed clear of every card and line, a live side-panel editor, localStorage persistence stamped against the content, PNG and JSON export/import, and the engine traps that silently break React Flow. Use this whenever the user wants a process/pipeline/workflow map that is explorable and editable rather than a static picture."
disable-model-invocation: false
---

# Interactive Process Flow Diagram

Build a **one-line, collapsible, editable process diagram** on `@xyflow/react`: a single
left-to-right line of phase cards, with at most two cards lifted off the line for the
branches that matter. Clicking a phase fans its granular steps out to the right as a tree.
The whole thing is driven by one typed data file per view, so the diagram can never drift
out of sync with whatever else in the app describes the same process.

Every mechanic here is extracted from a working implementation, not theoretical. Copy the
reference templates and adapt content and tokens, not architecture, unless the user asks
for less.

## The one thing to get right

**If the flow is wrong, everything is wrong.** This is the page a client argues with, and
the page that decides whether they believe you understood their job. Layout polish is worth
nothing if the sequence is wrong, and a sequence you invented is worse than a gap you
admitted to. Spend your effort in that order: sequence, then honesty about what you guessed,
then readability, then looks.

## When to use this

Use this when the user wants a **diagram, not a picture**: something they can click into,
expand, drag cards and notes about, edit live, and export. If they want a static architecture diagram or
a Mermaid chart, that is a different job (see `figma-generate-diagram` /
`artifact-diagramming`). This skill is for a **React page inside an app**, backed by real
component state.

Triggers sound like:
- "a flow diagram showing who does what at each stage"
- "show the client their own workflow first, then where we would help"
- "process map, and I want to click into steps for detail"
- "the diagram should stay in sync with [some other page] automatically"
- "mark which parts are confirmed vs which are our assumption"
- "let me edit the diagram in the app and export it as an image"

## Prerequisites

React + TypeScript (Vite or similar) with Tailwind CSS, **v3 or v4, both supported** (they
need different token setups, see [reference/host-integration.md](reference/host-integration.md)).

```
npm install @xyflow/react html-to-image
```

---

## Layout model: one line, not swimlanes

An earlier version of this skill drew three horizontal ownership bands. **Do not do that.**
Bands force every card into a row by who owns it, which means the reading order stops being
the work order, and a viewer has to reconstruct the sequence from the arrows. On a real
client call that costs you the room.

Instead:

```
  [note] [note]                        ( up card )
                                            |
  (start)->( A )->( B )->( C )->( D )->( E )->( F )->( end )
                    |                   ^
                    v                   |
               ( down card )------------+
```

- **One spine.** Every phase sits on the same horizontal line, left to right, in the order
  the work actually happens.
- **Meaning comes from the card, not its row.** In the ownership view that is the card's
  colour. In the client's-own view it is the flowchart symbol.
- **`track: 'up' | 'down'`** lifts a single card off the spine. Use at most one of each. A
  lifted card claims no column of its own: it is anchored under (or over) the phase that
  branches to it, so the spine never stretches to make room.
- **Notes live in the corridor** left of the lifted cards, which is otherwise dead space.

### Which two cards leave the line

Almost every process has exactly two branches worth drawing, and they carry a **message**,
not detail:

| Track | What it is | Why it earns its place |
|---|---|---|
| `down` | The expensive path | The one that costs real money when it is missed. Usually the value case in a single card. |
| `up` | The quiet path | Nothing disagreed, nobody was interrupted. Clients underrate this one, and it is what makes the rest believable. |

More than one of each and the line stops reading as a line. If a third branch really
matters, it is probably a phase on the spine.

### Sequence inside a phase

A phase's `steps` are the granular work. Collapsed, the card shows a count. Expanded, the
steps fan out to the right as a tree, and everything downstream on the spine shifts right to
make room. Steps are where detail belongs, which is what keeps the spine readable.

---

## Two views of the same work

The page holds **two flows** and switches between them from the top right. This is the
single highest-value thing in this skill, and it is not a layout feature, it is a sales
mechanic.

### View 1: "How it runs today". The default.

**The client's own process, with no step of yours anywhere in it.**

Show this first. Because nothing on the canvas is a proposal, there is nothing to argue
with, and every correction they make is worth more to you than agreement. A client who
spends ten minutes fixing your diagram of their job has just told you their job.

Meaning is carried by the **standard flowchart symbol**, not by an ownership colour:

| `shape` | Symbol | Means |
|---|---|---|
| `terminator` | stadium | starts or ends the process |
| `document` | wavy-bottom rectangle | a piece of paper arriving or produced |
| `process` | rectangle | a step inside a system |
| `manual` | trapezoid | work a person does by hand |
| `decision` | diamond | a branch |

That is a convention a technical audience already reads without a key. Show a small legend
anyway, in a corner, because a commercial audience may not.

### View 2: "Where we would help".

**The same work, same order, with the part you would take over in the accent colour.**

Nothing is added to the sequence and nothing removed. Every accent card is a step that
already happens today, and the only change is who performs it. That is what makes the
diagram hard to argue with: it is not a new process, it is the same one with a different
hand on part of it.

Three lanes drive the colour: `system` (them today, unchanged), `ours` (the step you would
do), `human` (they judge and decide). The lane never moves a card off the line, it only
colours it.

### Honesty is a feature

`assumption: true` on a phase or a step renders a **guess badge**. Use it on anything you
inferred or invented to make the diagram hold together: a system name nobody told you, a
frequency, a team, the order of two steps you are not sure about.

Every guess badge needs a matching question in the questions list behind the toolbar button,
so whoever runs the call can ask it without preparing. A guess you admit to gets corrected.
A guess that looks like fact is the one thing that can lose the room.

Sort every card before you draw it:

| Bucket | Source | Treatment |
|---|---|---|
| **Sourced** | Stated by the client, or visible in a file they sent | State it plainly |
| **Inferred** | Follows necessarily from something sourced, or from your research | State it, expect correction |
| **Filled** | Neither. You needed it for the diagram to hold together | `assumption: true` plus a question |

If you cannot say which bucket a card is in, you do not know enough to draw it yet.

---

## Edge readability: a manager should not have to study it

Rules, in priority order. Break them only with a reason.

1. **Every line touches both cards it joins.** A line that stops short of a card reads as a
   different line.
2. **No line crosses another line.** If two must cross, one of them is wrong about where it
   belongs on the spine.
3. **No label sits on another label, or on a line.** Two lines converging on one handle will
   stack their labels: give each edge its own `offset` for the side corridor, and route the
   second one into a different vertex of the target shape.
4. **Label both outputs of a decision.** An unlabelled "yes" is an assumption the viewer has
   to make.
5. **Direction is a second, independent cue.** Colour alone fails for a colourblind viewer
   and fails in a printed PDF. Arrowheads, dash pattern and vertical direction all carry it.
6. **The label chip is filled with its line's colour**, so it belongs to the line visually.
   The main-path stroke is deliberately pale, so main-path labels need their own darker fill
   or they are unreadable.
7. **A legend only when more than one meaning is on screen.** Two legends is clutter.

### Routing

- A **level left-to-right** run is a spine edge: straight.
- A **non-level** run out of the spine goes down or up into a corridor, along it, then into
  the off-line card.
- A **rejoin** leaves an off-line card from its RIGHT edge as a `seq` edge and turns at
  `targetX - 18`, entering the next card on the line from the left. Never rejoin upward from
  the top of a `down` card (see "A side card rejoins from its RIGHT" below).
- Keep **one** loop back per side card. The corridor inset is **per-edge** (`offset`), not
  global, but a second backward loop into the same side card crosses the first whatever
  the insets: move it into a step instead.

---

## Build steps

### 0. Inventory the process that ALREADY exists, before designing anything

Do not design a flow from the brief alone. Read what is already true, in this order:

```
1. every user-facing stage. Routes are the app's own account of its process
2. the real state machine: status/stage/phase unions and enums
3. every transition: what actually moves an item from one state to the next
4. the domain model and its relationships
5. external systems, tools and integrations named anywhere. These become the
   "not ours" cards, and the chips on them
6. the project's own prose, usually the highest-authority source
```

Write down which bucket (sourced / inferred / filled) each fact came from as you go. Doing
it afterwards does not work: by then everything feels like something you knew.

### 1. Establish the content model, ask before assuming

Confirm with the user: the phases and their order, which two branches leave the line, which
steps sit inside which phase, and, for the ownership view, which phases are theirs and which
are yours. Ask rather than invent. This is the cheapest correction you will ever make.

### 2. Map onto the host project's design system, before writing components

Read the host's token file and Tailwind config. Use its existing colour tokens, radii,
shadow scale and font. A diagram that looks bolted on undermines the content on it.
[reference/host-integration.md](reference/host-integration.md) has the mapping table and the
leaked-colour grep.

### 3. Copy the data contract

[reference/flow-types.template.ts](reference/flow-types.template.ts). The host app and this
skill must declare the **same** shapes or the two silently drift. Key members:

- `FlowPhase`: `id`, `lane`, optional `shape`, `title`, `summary`, `systems[]`, `steps[]`,
  optional `track`, optional `assumption`
- `FlowStep`: `id`, `title`, `summary`, `responsible`, `records`, `notifies`, `note`,
  optional `assumption`
- `FlowEdge`: `id`, `source`, `target`, `kind: 'seq' | 'down' | 'up'`, optional `label`,
  optional `offset`
- `FlowNote`: `id`, `col`, `text`, optional `kind: 'assumption'`
- `Flow`: `lanes`, `phases`, `edges`, `readAs`, `note`, `notes`

### 4. Copy the layout engine and persistence

[reference/flowModel.template.ts](reference/flowModel.template.ts). It owns `GEO` (all
dimensions in one place), `layout()`, note placement, and the localStorage round-trip.

**The layout runs in two passes.** Off-line cards are placed after the spine is measured,
because a `down` card's Y depends on how far the tallest expanded phase reaches. One pass
puts the bottom row inside the spine.

**Stamp the saved document against the content.** Derive a short hash from the content and
check it on load. Otherwise a client opens the page, sees a diagram they edited three weeks
ago against a content pack that has since changed, and it is wrong in a way nobody can see.

### 5. Copy the node components

[reference/flowNodes.template.tsx](reference/flowNodes.template.tsx). It holds the SVG
`ShapeOutline` for each flowchart symbol, the ownership-coloured phase card, the step card
and the note. **Draw the symbols as SVG sized to the node**, not as CSS `clip-path`: a
clipped card cuts off its own text, and a diamond made of CSS borders cannot hold a label.

### 6. Copy the edge component

[reference/flowEdges.template.tsx](reference/flowEdges.template.tsx). Routing, arrowheads
and the label chip.

### 7. Copy the page component

[reference/FlowPage.template.tsx](reference/FlowPage.template.tsx). Toolbar (Collapse /
Expand / Note / More), the view switcher, the questions dropdown, the side-panel editor, the
legend, export and import.

### 8. Copy the adapter

[reference/process-data.template.ts](reference/process-data.template.ts) exposes both flows
to the engine as `FLOW_SOURCES`, so the page switches between them without knowing anything
about the content.

### 9. Wire up styling

[reference/tokens.template.css](reference/tokens.template.css) (Tailwind v3) or
[reference/tokens-tailwind-v4.template.css](reference/tokens-tailwind-v4.template.css), plus
[reference/tailwind.config.snippet.js](reference/tailwind.config.snippet.js).

### 10. Verify in the browser, not by reading the code

Not optional. It is where the real defects live. See below.

---

## Engine traps: these cost real debugging time, do not rediscover them

### Every edge renders as null, with a clean console

**The symptom:** cards appear, no lines at all. No error. React Flow's store still holds
every edge. `document.querySelectorAll('.react-flow__edge').length === 0`.

**The cause:** you gave each node `measured` up front (which the drag handler wants). In
`@xyflow/system`'s `parseHandles`:

```ts
if (!userNode.handles) return !userNode.measured ? undefined : internalNode?.internals.handleBounds
```

A node that has `measured` but no `handles` **never gets the DOM measuring pass** that
records handle geometry. `internals.handleBounds` stays `undefined`, `getEdgePosition()`
returns `null`, and `EdgeWrapper` renders `null` for every edge.

**The fix:** declare the handles explicitly on every node.

```ts
const handlesFor = (w: number, h: number) =>
  ([['h-top', Position.Top, w / 2, 0], ['h-right', Position.Right, w, h / 2],
    ['h-bottom', Position.Bottom, w / 2, h], ['h-left', Position.Left, 0, h / 2]] as const)
  .flatMap(([id, position, x, y]) =>
    (['source', 'target'] as const).map((type) => ({ id, type, position, x, y, width: 1, height: 1 })))

const sized = (w: number, h: number) => ({
  width: w, height: h, measured: { width: w, height: h }, handles: handlesFor(w, h),
})
```

### A link can never be drawn, and nothing says why

**The symptom:** the connect feature is wired (`onConnect`, `nodesConnectable`,
`ConnectionMode.Loose`), the handles are in the DOM, and dragging from one to another does
nothing at all. No error, no connection line, no toast.

**Two causes, and a build usually has both:**

1. **The card's content paints over the handles.** React Flow's handles are absolutely
   positioned with no z-index. A card's content wrapper is `relative`, so it wins the
   stacking contest and swallows every pointerdown. Hit-test it to be sure:
   `document.elementFromPoint(x, y)` over a handle returns the content div, not the handle.
2. **`overflow-hidden` on the card clips them away.** React Flow parks each handle 4px
   *outside* the node.

**The fix**, both at once:

```tsx
const SIDES = [
  { id: 'h-top', pos: Position.Top, cls: '!top-0' },
  { id: 'h-right', pos: Position.Right, cls: '!right-0' },
  { id: 'h-bottom', pos: Position.Bottom, cls: '!bottom-0' },
  { id: 'h-left', pos: Position.Left, cls: '!left-0' },
]
// z-20 beats the content wrapper; !top-0 and friends bring the handle inside the
// clip; 12px because React Flow's 5px default is not a target anyone can hit.
className={cx(s.cls, 'z-20 !h-3 !w-3 !border-2 !border-surface !bg-accent opacity-0',
              'transition-all duration-200 group-hover:opacity-100 hover:!h-4 hover:!w-4')}
```

Verify it by actually drawing a link, not by reading the props. Every prop can be correct
while the feature does nothing.

### A branch label with its own line through it

`labelAnchor` naturally picks the longest HORIZONTAL run, because a chip sitting just above
a horizontal line reads cleanly. Two cases break that, and both are common:

- **No horizontal run at all.** A branch dropping straight out of a decision is one vertical
  segment. Nudging the chip up keeps it on the line, because up *is* along the line. Fall
  back to the longest VERTICAL run and push the chip out to the **side** instead.
- **A horizontal run too short to hold the chip.** The run between a decision's vertex and
  the next card is only the column gap, and a chip centred on 32px of line spills over the
  card at each end. Treat a run under about 46px as if there were none.

```ts
if (best && bestLen >= 46) return { ...best, vertical: false }
// ...otherwise the longest vertical run, flagged:
transform: anchor.vertical
  ? `translate(calc(-100% - 9px), -50%) translate(${anchor.x}px, ${anchor.y}px)`
  : `translate(-50%, calc(-100% - 6px)) translate(${anchor.x}px, ${anchor.y}px)`
```

Then give the layout room for the other half of the problem: a card whose outgoing
main-line edge carries a label needs a wider gap after it than one that does not.

```ts
const gapAfter = (id: string) => (needsLabelRoom.has(id) ? GEO.labelGapX : GEO.gapX)
```

### The side panel eats a third of the canvas: keep the viewer's place

Opening the editor takes ~360px off the canvas. An earlier version of this skill re-fitted
the whole line on every open and close. **Do not.** On a real call the viewer has zoomed
into the part they are discussing, clicks a card to correct it, and lands back at the whole
line every time, dragging back again and again.

Keyed on the panel being open (never on the selection), do only this: if the card being
edited would end up behind the panel, nudge the canvas just enough to keep it in sight, and
remember the nudge. On close, undo exactly that nudge. No nudge, no movement.

```ts
const panelShift = useRef(0)
useEffect(() => {
  const t = setTimeout(() => {
    const vp = rfRef.current.getViewport()
    if (!panelOpen) {                       // closing: undo our own nudge only
      if (panelShift.current) glide({ ...vp, x: vp.x - panelShift.current })
      panelShift.current = 0
      return
    }
    const dx = overlapOfSelectedCardWithPanel()   // 0 when the card is in sight
    if (dx) { panelShift.current = dx; glide({ ...vp, x: vp.x + dx }) }
  }, 230)
  return () => clearTimeout(t)
}, [panelOpen])
```

The same rule for a card's steps: opening them zooms to the steps (good, a focused view),
so **remember the viewport before the first card was opened** and glide back to it when
that card is closed. Collapse, Expand and the fit button forget it and show the whole line.
The page itself opens on the whole line.

Two smaller ones in the same panel:

- **Reset its scroll on every new selection.** Otherwise "Add step" lands the person halfway
  down the new step's form with the title field above the fold.
- **Name a connection by the CARDS it joins**, not by their ids. `t-query to t-approve`
  means nothing to a client.

### Keep the mirrored node state, and keep forwarding changes to it

It is tempting to drop `useNodesState` and pass computed nodes straight to `<ReactFlow>`. On
12.11.3 that drops every edge. Removing the `onNodesChange` forwarding instead makes React
Flow re-emit changes forever and **freezes the tab**. Keep both: mirrored state, with
`onNodesChange` forwarded into it.

### Spine edges vanish when a phase expands

The edges memo must be keyed on the **registered** node set (the mirrored `nodes`), not on
the computed layout. Otherwise the edges are rebuilt against nodes React Flow has not
registered yet, and it discards an edge whose endpoints are not registered without
reconsidering it while the edges array keeps its identity. The spine silently empties.

```ts
const nodeSetKey = useMemo(() => nodes.map((n) => n.id).join('|'), [nodes])
const edges = useMemo(() => buildEdges(doc), [doc, nodeSetKey])
```

### Branch labels are struck through by the lines

The edge label renderer sits under the edge SVGs by default.

```css
.react-flow__edgelabel-renderer { z-index: 6; }
```

### Two labels stacked on top of each other

Two edges converging on the same handle put their labels in the same place. Route the second
into a **different vertex** of the target shape (a decision has four), and give each edge its
own corridor `offset`. Different-looking offset numbers do not guarantee different positions:
work out where each run will actually sit before assuming they are apart.

### Main-path labels are unreadable

The spine stroke is deliberately pale so the branches stand out. A label chip filled with
that pale colour disappears. Give main-path labels their own dark fill:

```ts
labelColor: branch ? colour : cssVar('--navy', '#1b2a44')
```

### A side card rejoins from its RIGHT, and the gap must hold its label

Rejoining with an `up` edge from the top of a `down` card retraces the branch line that
drops into that same point: two lines on one segment, which the edge checks above do not
catch. Rejoin with a labelled `seq` edge from the side card's right edge into the next card
on the line. Keep **one** loop back; a second backward arrow into the same side card from
further along always crosses the first.

That rejoin runs through the gap after the card the side card hangs off, which is the
narrow default unless widened. Widen it whenever a side card's rejoin carries a label, or
the chip falls back beside the vertical and crowds the branch label already there:

```ts
for (const e of doc.edges) {
  const anchorOf = branchedFrom.get(e.source)
  if (e.label && e.sourceHandle === 'h-right' && anchorOf) needsLabelRoom.add(anchorOf)
}
```

### The questions are a working list on the call

Each question can be answered (a box opens, the answer is saved) or removed (with a way to
bring them back). Keep both in `sessionStorage`, stamped against the question text so a
changed list never shows old answers against new questions, and shared by both views
([reference/questionState.template.ts](reference/questionState.template.ts)). The first
group is every guess on the diagram: highlight it at the top. **Export file** opens a small
dialog, "include the questions and their answers", ticked by default; import restores them.

### Dragging a card: the lines follow it

A press on empty canvas pans the view; a press on a card drags **that card**, and every
line attached to it follows without breaking the flow. Four pieces make that work, and each
one replaced something that looked fine and was not.

1. **A draggable card is what stops the pan.** React Flow gives a draggable node the
   `nopan` class, so `draggable: true` on phase nodes is the whole switch. Set
   `nodeDragThreshold={5}` so a click that wobbles is still a click (it opens the editor),
   and `selectNodesOnDrag={false}` so a drag does not select.
2. **Store an offset, not a position.** `FlowPhase.moved = { dx, dy }` is the distance from
   the slot `layout()` gives the card. `layout()` places the line exactly as before (a moved
   card keeps its slot, so nothing else jumps), then shifts each moved card and its steps.
   An offset rather than an x/y means opening a card further left, which pushes the line
   along, carries the moved card with it instead of leaving it on top of the line.
3. **A dropped card gives way, never the line.** While a card is in hand it follows the
   pointer exactly (`layout(doc, { free: dragId })`). On drop it is settled clear of every
   other card by `CARD_CLEARANCE` (48px: two lines on their own tracks must fit through any
   gap), searched outward in rings so it lands nearest to where it was dropped, and the
   settled offset is written back so the saved file says where the card really is.
   **Put cards back in line** (More menu, and per card in the editor) clears the offsets.
4. **Lines through a router, but only where the hand-tuned route no longer fits.** A line
   keeps its hand-tuned route while neither card has moved and it stays 8px clear of every
   other card. Every other line goes to [reference/router.template.ts](reference/router.template.ts):
   A* over a sparse orthogonal grid (card borders, corridor centres, a comfort track 28px
   off each card, a parallel track 22px beside every existing line), with costs in this
   order: through a card (impossible), on top of a line (900+), a crossing or running under
   a label (420 each), two lines ending in line with each other within 40px (380, they read
   as one line), off-centre attachment (90, only to avoid sharing a point), bends (34). Lines
   already drawn go first, then the main line, then side paths.

Traps found by testing, not by reading:

- **Route, then label, then fix.** A label placed straight after its own line cannot see
  the lines routed after it. Route every line, place every label, then re-route once any
  line that still runs under a label.
- **A region edge is a wall.** The search is limited to the region around the two cards. If
  cells beyond the region count as free, a card straddling its edge loses its outside half
  and a line runs along the edge straight through the card.
- **Two neighbours share their gap.** Each stub out of a card is half the free run to the
  next card, the far end card included, or two cards 32px apart get stubs that overlap.
- **The "N steps" chip sits 8px proud of the card.** Treat it as part of the card for lines
  and labels, or a label lands on it.
- **Keep the drag frame cheap.** While a card is in hand only its own lines are re-routed;
  the rest keep their last route unless the card now sits across one, and the label fix-up
  waits for the drop. Measured on the example: 2 to 5ms routing per frame.
- **Mark router-drawn lines** (`className: 'rerouted'`) so a test can prove that with nothing
  moved, nothing was re-routed.

A crossing is sometimes forced: a card dropped into a pocket that other lines enclose
cannot be reached without crossing one. The router then crosses once, on the cheapest
line. [reference/verify-drag.mjs](reference/verify-drag.mjs) reports those as WARN, to be
judged on the screenshot.

### `seq` edges must be able to carry a label

A decision labels **both** its outputs, and one of them continues along the spine. If your
`seq` helper drops labels, half of every decision goes unlabelled.

---

## Other gotchas, learned the hard way

- **A label centred on its anchor point has the line drawn through the text.** Anchor the
  label's box just *above* the point. And the no-horizontal-segment fallback must be the
  path's true midpoint, not `pts[Math.floor(pts.length / 2)]`: on a two-point path that
  index returns the target's own endpoint, which sits on the target card's border.
- **`fitView` is inert here.** It only fits nodes whose dimensions React Flow measured
  itself, and in a fully custom layout it never records them. Compute the viewport from your
  own layout bounds via `getNodesBounds()` and `getViewportForBounds()`, then `setViewport()`.
- **`setViewport`'s `duration` option does not animate here.** Drive the transition from your
  own timer, and use `setInterval`, not `requestAnimationFrame`, so it still completes if the
  tab is not focused.
- **`useReactFlow()` returns a new object every render.** Never put it in a `useEffect`
  dependency array. Wrap it in a ref, or the effect re-runs every render and clears its own
  timer before it can fire.
- **`ConnectionMode.Loose`** is what lets one handle act as both source and target, needed
  since every node exposes four generic handles rather than fixed ports.
- **React Flow's handle coordinates are unreliable in a custom layout** (paths measured 3px
  outside the source and 13px short of the target), and `!important` position utilities on a
  `<Handle>` make it worse. Drive edge endpoints from your own layout.
- **`pathOptions` is not on React Flow's base `Edge` type**, even though the built-in
  smoothstep edge reads it at runtime. Widen locally:
  `type FlowEdge = Edge & { pathOptions?: {...} }`.
- **Edge colours do not follow a theme toggle on their own.** Strokes are SVG attributes read
  from CSS variables at render time. Watch the class with a `MutationObserver` and bump a
  counter the edge memo depends on.
- **`html-to-image` logs two console errors on any page using a cross-origin webfont
  stylesheet.** Pass `skipFonts: true`. It could never have embedded those faces anyway.
- **A fixed-height card needs every text block line-clamped.** The layout assigns the height,
  so an unclamped title that wraps one extra line pushes the bottom row out of the box. Clamp
  the title *and* the summary, with `overflow-hidden` as a backstop.
- **`truncate` does nothing inside a `flex-wrap` row.** Each item takes its natural width and
  wraps instead. Use a grid so each cell is width-constrained.
- **Do not measure card overflow with `scrollHeight - clientHeight`.** The handles sit 5px
  outside every edge on purpose, so that comparison reports a constant false `+10px`. Measure
  the real content children, skipping `.react-flow__handle`.
- **`layout()` stays the one source of positions, even for a dragged card.** A note's drag
  is written back as its x/y; a phase's drag is written back as an OFFSET from its slot
  (`moved`), never as a free position, and steps stay `draggable: false`. Write a card's
  raw position into React Flow's state alone and it fights the layout engine on the next
  render. See "Dragging a card: the lines follow it" above.
- **Give notes an estimated height** and feed the same number to the layout, the fit maths
  and the node's `minHeight`, or what React Flow fits to drifts from what is rendered.
- **Version the localStorage schema** (`version: 1`, checked on load) so a future `FlowDoc`
  change does not crash on old state. Fall back to rebuilding from the data file.
- **Tailwind v4: `@theme` does not cascade into `.dark`.** Light values go in `@theme`, dark
  values are plain custom-property overrides on the dark selector.
- **Tailwind v4: unlayered CSS beats layered CSS**, regardless of specificity. That is what
  lets bare `.react-flow__*` overrides win against @xyflow's stylesheet, but it also means
  any other bare rule silently overrides every matching utility in the app. Keep them narrow.
- **Do not use `text-white` on an accent band** if the host has an on-accent token. In a dark
  theme the accent often becomes light, and white on light is unreadable.

---

## Verify in the browser

Reading the code will not find these. Load the page and assert geometry.

```js
// every edge rendered at all
document.querySelectorAll('.react-flow__edge').length
// should equal the edge count in the data. 0 means the handles trap above.

// cross-check against the serialized markup: the live NodeList has been seen to
// disagree with what is actually painted
document.body.innerHTML.match(/react-flow__edge /g)?.length

// spine count matches phase count
document.querySelectorAll('[data-phase]').length

// endpoints touch both cards: for each edge path, its first and last point should
//   fall within a few px of a node's bounding box
// no crossings: no two path segments from different edges may intersect
// no label overlap: no two edge labels may overlap
```

[reference/verify-flow.mjs](reference/verify-flow.mjs) has these as runnable checks.

**Then look at the screenshots.** Assertions catch layout regressions a glance does not;
reading the images catches colour collisions, ragged edges and label crowding that no
assertion catches. Every genuinely embarrassing defect in this skill's history was found by
looking, not by asserting. Screenshot **both views** at a normal window size and check:

- [ ] Every line touches both cards it joins
- [ ] No line crosses another
- [ ] No label sits on a line or on another label
- [ ] Both outputs of every decision are labelled
- [ ] The line reads left to right in work order, with no backtracking except the rejoin
- [ ] Guess badges appear on exactly the cards you could not source
- [ ] The legend matches the symbols or colours actually on screen
- [ ] Expanding the widest phase does not push a lifted card into the spine
- [ ] Collapse, Expand, reset, export and import all still work afterwards
- [ ] A link can actually be DRAWN between two cards, by dragging one handle to another
- [ ] Clicking a card opens the editor, and the editor can change the thing that CARRIES
      THE MEANING on that view: the flowchart symbol on the client's-own view, the
      ownership lane on the other. A client who cannot correct it will just say "no"
- [ ] Opening and closing the editor leaves the viewer where they were (a card behind the
      panel is nudged into sight, and the nudge is undone on close)
- [ ] Opening a card's steps and closing it returns to exactly the previous viewport
- [ ] No two lines touch or cross, with every phase expanded one at a time
- [ ] A question can be answered and removed, both survive a reload, and the exported
      file carries them when ticked
- [ ] A press on empty canvas pans; a press on a card drags only that card, and a click
      still opens the editor
- [ ] A dragged card's lines follow it: clear of every card, never on top of another
      line, labels clear; dropped on another card, it settles clear of it
- [ ] With nothing moved, no line is router-drawn; "Put cards back in line" restores the
      original diagram exactly; a moved card survives a reload

[reference/verify-drag.mjs](reference/verify-drag.mjs) runs all of the drag checks above.

---

## Dimensions travel with the layout

Every size lives in one `GEO` object in the layout engine. Changing a card's padding in CSS
without changing `GEO` makes the layout wrong in a way that looks like an edge-routing bug.
If a card needs to be bigger, change `GEO`.

```ts
const GEO = {
  phaseW: 214, phaseH: 182,
  stepW: 292, stepH: 124,
  gapX: 32, treeGapX: 44, stepGapY: 12,
  branchGap: 92,
}
```

Step cards are **wide and short** on purpose: they sit in a single column with no sibling
competing for width, so their detail rows run horizontally rather than stacking.

---

## Keep it simple

The temptation with a diagram engine is to add: more lanes, more branches, more badges, more
colours. Resist it. The diagram exists to be understood in about fifteen seconds by somebody
who has never seen it, while another person talks over it. Every element that does not serve
that is working against it.

A client should be able to read any card without a glossary, and follow any line without
tracing it with a finger.

The assumption-flagging convention is worth keeping outside a sales context. Any diagram
where part of the content is inferred benefits from a visually distinct treatment: it turns
"we might be wrong here" into something the viewer can act on rather than something they
have to notice unaided.

---

## File manifest

| File | What it is |
|---|---|
| [reference/host-integration.md](reference/host-integration.md) | **Read first.** Semantic-class mapping, Tailwind v3 vs v4 setup, leaked-colour grep |
| [reference/flow-types.template.ts](reference/flow-types.template.ts) | The data contract. Host and skill must agree |
| [reference/flowModel.template.ts](reference/flowModel.template.ts) | `GEO`, one-line layout, tracks, notes, content stamp, persistence |
| [reference/flowNodes.template.tsx](reference/flowNodes.template.tsx) | Flowchart symbols, phase / step / note cards |
| [reference/flowEdges.template.tsx](reference/flowEdges.template.tsx) | Routing, arrowheads, filled label chips |
| [reference/router.template.ts](reference/router.template.ts) | Orthogonal router and label placement for lines around dragged cards |
| [reference/FlowPage.template.tsx](reference/FlowPage.template.tsx) | The full screen: toolbar, view switcher, questions, canvas, editor, export/import |
| [reference/process-data.template.ts](reference/process-data.template.ts) | Adapter exposing both flows to the engine |
| [reference/questionState.template.ts](reference/questionState.template.ts) | The questions drawer's answers and removals, in sessionStorage |
| [reference/verify-flow.mjs](reference/verify-flow.mjs) | Runnable checks for every line and label rule above |
| [reference/verify-drag.mjs](reference/verify-drag.mjs) | Runnable checks for dragging cards: pan, click, drag, drop, reload, put back |
| [reference/demo-login.mjs](reference/demo-login.mjs) | Gets both checkers past a login page (`DEMO_COMPANY`), and opens the flow tab |
| [reference/ui-kit.template.tsx](reference/ui-kit.template.tsx) | Minimal shared primitives. Skip if the host has equivalents |
| [reference/icons.template.tsx](reference/icons.template.tsx) | Inline-SVG icons, zero deps. Skip if the host has an icon library |
| [reference/tokens.template.css](reference/tokens.template.css) | Tokens for Tailwind v3 (RGB triples) |
| [reference/tokens-tailwind-v4.template.css](reference/tokens-tailwind-v4.template.css) | Tokens for Tailwind v4 |
| [reference/tailwind.config.snippet.js](reference/tailwind.config.snippet.js) | Tailwind v3 `theme.extend` block |
