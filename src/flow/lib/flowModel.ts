/**
 * The process-flow document + ONE LEFT-TO-RIGHT LINE layout.
 *
 * Every main card sits on the same horizontal row, in sequence. Two cards
 * leave the line (one lifted, one dropped) for side paths that are genuinely
 * a different route. Who does each step is carried by the card's COLOUR, not
 * by its position, so there are no bands.
 *
 * The initial document is DERIVED from the content pack (src/content/flow.ts,
 * via ../data/process) so the diagram can never describe a process the rest of
 * the app doesn't run. "Reset" rebuilds from there.
 */
import type { FlowSource, LaneId, Step } from '../data/process'
import type { FlowShape } from '../../lib/types'

export type EdgeKind = 'main' | 'branch'

export interface FlowPhase {
  id: string
  lane: LaneId
  title: string
  summary: string
  systems: string[]
  note?: string
  assumption?: boolean
  /** Draw as a standard flowchart symbol instead of an owner card. */
  shape?: FlowShape
  /** Off the line: 'up' lifts it above, 'down' drops it below. */
  track?: 'up' | 'down'
  /**
   * Dragged by hand: how far the card sits from the slot `layout()` gives it.
   * Stored as an offset rather than a position so that opening a card further
   * left, which pushes the line along, carries a moved card with it instead of
   * leaving it behind on top of the line. Absent means "where the line puts it".
   */
  moved?: { dx: number; dy: number }
  steps: Step[]
}

export interface FlowEdgeDef {
  id: string
  source: string
  target: string
  kind: EdgeKind
  label?: string
  sourceHandle?: string | null
  targetHandle?: string | null
  offset?: number
}

export interface FlowNote {
  id: string
  x: number
  y: number
  text: string
  kind?: 'assumption'
}

export interface FlowDoc {
  version: 1
  /** Derived from the content pack, so a saved doc can't outlive the content. */
  stamp?: string
  phases: FlowPhase[]
  edges: FlowEdgeDef[]
  notes: FlowNote[]
  expanded: string[]
}

/* ------------------------------- geometry -------------------------------- */
export const GEO = {
  phaseW: 214,
  phaseH: 182,
  stepW: 292,
  stepH: 124,
  gapX: 32,
  /**
   * The gap after a card whose outgoing MAIN-LINE edge carries a label. A
   * decision labels both its outputs, and one of them runs along the line, so
   * that run has to be wider than the chip or the label lands on the next
   * card.
   */
  labelGapX: 108,
  treeGapX: 44,
  stepGapY: 12,
  /** Clearance between the main line and a card that sits off it. */
  branchGap: 92,
}

/* --------------------------- initial document ---------------------------- */

const seq = (id: string, source: string, target: string, label?: string): FlowEdgeDef => ({
  id,
  source,
  target,
  kind: 'main',
  label,
  sourceHandle: 'h-right',
  targetHandle: 'h-left',
})
// A side card sits directly above or below the card it branches from, so the
// branch is a straight drop into its top, or a straight rise into its bottom.
// Aiming at the left edge would double back as a hook and strand the label.
const down = (id: string, source: string, target: string, label: string, offset?: number): FlowEdgeDef => ({
  id,
  source,
  target,
  kind: 'branch',
  label,
  sourceHandle: 'h-bottom',
  targetHandle: 'h-top',
  offset,
})
const up = (id: string, source: string, target: string, label: string, offset?: number): FlowEdgeDef => ({
  id,
  source,
  target,
  kind: 'branch',
  label,
  sourceHandle: 'h-top',
  targetHandle: 'h-bottom',
  offset,
})

function buildEdges(src: FlowSource): FlowEdgeDef[] {
  return src.edges.map((e) => {
    if (e.kind === 'down') return down(e.id, e.source, e.target, e.label ?? '', e.offset)
    if (e.kind === 'up') return up(e.id, e.source, e.target, e.label ?? '', e.offset)
    return seq(e.id, e.source, e.target, e.label)
  })
}

export const NOTE_W = 268

export function noteHeight(text: string): number {
  const lines = text
    .split(String.fromCharCode(10))
    .reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 38)), 0)
  return 54 + lines * 15
}

/**
 * Notes are tucked into the empty corridor to the LEFT of the lifted card,
 * stopping short of the line. Below the diagram is wrong (expanding a card
 * draws steps straight through them); above the whole canvas leaves the page
 * opening on a band of nothing.
 */
function buildNotes(src: FlowSource): FlowNote[] {
  if (!src.notes.length) return []
  const tallest = Math.max(0, ...src.notes.map((n) => noteHeight(n.text)))
  const hasLifted = src.phases.some((p) => p.track === 'up')
  const spineY = hasLifted ? GEO.phaseH + GEO.branchGap : 0
  const top = spineY - tallest - 40
  return src.notes.map((n) => ({
    id: n.id,
    x: n.col * (NOTE_W + 34),
    y: top,
    text: n.text,
    kind: n.kind,
  }))
}

/**
 * A saved document survives every change to the content pack, so anyone who
 * opened an earlier version gets their OLD cards back laid out by the NEW
 * engine, while a fresh origin looks perfect at the same moment. That reads
 * as a broken deployment when it is just the browser remembering. Deriving
 * the key from the content makes it self-invalidating.
 */
export const contentStamp = (src: FlowSource) =>
  [
    src.phases.map((p) => `${p.id}:${p.track ?? 'line'}:${p.shape ?? '-'}:${p.steps.length}`).join(','),
    src.edges.map((e) => `${e.id}:${e.kind}:${e.label ?? ''}`).join(','),
    src.notes.map((n) => n.id).join(','),
  ].join('|')

export function buildInitialDoc(src: FlowSource): FlowDoc {
  return {
    version: 1,
    stamp: contentStamp(src),
    phases: src.phases.map((p) => ({
      id: p.id,
      lane: p.lane,
      title: p.title,
      summary: p.summary,
      systems: p.systems ? [...p.systems] : [],
      assumption: p.assumption,
      shape: p.shape,
      track: p.track,
      steps: p.steps.map((s) => ({ ...s })),
    })),
    edges: buildEdges(src),
    notes: buildNotes(src),
    expanded: [],
  }
}

/* --------------------------------- layout -------------------------------- */
export interface Positioned {
  id: string
  kind: 'phase' | 'step' | 'note'
  x: number
  y: number
  w: number
  h: number
  lane?: LaneId
  phaseId?: string
  ord?: number
}

export interface LayoutResult {
  positions: Record<string, Positioned>
  width: number
  height: number
  childrenOf: Record<string, string[]>
  /** Where every phase would sit if nothing had been dragged. */
  natural: Record<string, { x: number; y: number }>
  /** Phases that have been dragged off their slot. */
  moved: Set<string>
}

/**
 * Space kept clear around a dropped card. Two lines must fit through any gap
 * on their own tracks (each stands 10px off the cards, 22px apart), or a card
 * dropped into a tight spot squeezes its own lines against its neighbours'.
 */
export const CARD_CLEARANCE = 48

export interface LayoutOptions {
  /**
   * The card being dragged right now. It goes exactly where the pointer puts
   * it (snapping it clear of other cards mid-drag would make it jump under the
   * cursor), and the other moved cards ignore it until it is dropped.
   */
  free?: string | null
}

export function layout(doc: FlowDoc, opts: LayoutOptions = {}): LayoutResult {
  const positions: Record<string, Positioned> = {}
  const childrenOf: Record<string, string[]> = {}

  const isOpen = (p: FlowPhase) => doc.expanded.includes(p.id) && p.steps.length > 0
  const blockH = (p: FlowPhase) =>
    isOpen(p) ? p.steps.length * GEO.stepH + (p.steps.length - 1) * GEO.stepGapY : GEO.phaseH

  const above = doc.phases.filter((p) => p.track === 'up')
  const below = doc.phases.filter((p) => p.track === 'down')

  // the line sits below whatever the lifted cards need, including their steps
  const upBand = above.length ? Math.max(GEO.phaseH, ...above.map(blockH)) : 0
  const spineY = above.length ? upBand + GEO.branchGap : 0

  let cursor = 0
  let deepestOnLine = GEO.phaseH

  // a card off the line sits directly above or below the card it branches from
  const branchedFrom = new Map<string, string>()
  // ...and a card whose outgoing main-line edge is labelled needs a wider gap
  // after it, or the chip sits on top of the next card
  const needsLabelRoom = new Set<string>()
  for (const e of doc.edges) {
    if (e.sourceHandle === 'h-bottom' || e.sourceHandle === 'h-top') {
      branchedFrom.set(e.target, e.source)
    } else if (e.label) {
      needsLabelRoom.add(e.source)
    }
  }
  // A side card that rejoins the line with a LABELLED edge runs that edge
  // through the gap after the card it hangs off. Left at the narrow default,
  // the run is too short to hold its chip, the chip falls back beside the
  // vertical and crowds the branch label already sitting there.
  for (const e of doc.edges) {
    const anchorOf = branchedFrom.get(e.source)
    if (e.label && e.sourceHandle === 'h-right' && anchorOf) needsLabelRoom.add(anchorOf)
  }
  const gapAfter = (id: string) => (needsLabelRoom.has(id) ? GEO.labelGapX : GEO.gapX)

  for (const phase of doc.phases) {
    // 'down' cards are parked at 0 here and moved in the second pass
    const y = phase.track === 'up' ? 0 : phase.track === 'down' ? 0 : spineY

    // Anchored while collapsed, so the line has no hole in it. Once opened it
    // takes a column of its own, because its steps fan out to the right and
    // would otherwise be drawn over whatever the line puts there.
    const anchor =
      phase.track && !isOpen(phase) ? positions[branchedFrom.get(phase.id) ?? '']?.x : undefined
    const x = anchor ?? cursor

    positions[phase.id] = {
      id: phase.id,
      kind: 'phase',
      x,
      y,
      w: GEO.phaseW,
      h: GEO.phaseH,
      lane: phase.lane,
    }

    if (isOpen(phase)) {
      const childX = x + GEO.phaseW + GEO.treeGapX
      const childIds: string[] = []
      phase.steps.forEach((s, i) => {
        const nodeId = `${phase.id}::${s.id}`
        childIds.push(nodeId)
        positions[nodeId] = {
          id: nodeId,
          kind: 'step',
          x: childX,
          y: y + i * (GEO.stepH + GEO.stepGapY),
          w: GEO.stepW,
          h: GEO.stepH,
          lane: phase.lane,
          phaseId: phase.id,
          ord: i,
        }
      })
      childrenOf[phase.id] = childIds
      if (!phase.track) deepestOnLine = Math.max(deepestOnLine, blockH(phase))
      // only a card ON the line moves the line along
      if (anchor == null) cursor = childX + GEO.stepW + gapAfter(phase.id)
    } else if (anchor == null) {
      cursor += GEO.phaseW + gapAfter(phase.id)
    }
  }

  // The bottom row is placed in a SECOND pass. At a fixed offset instead, the
  // moment a card on the line is expanded its column of steps grows down
  // through the side card and the branch into it crosses all of them.
  const downY = spineY + deepestOnLine + GEO.branchGap
  for (const phase of below) {
    const pos = positions[phase.id]
    if (pos) pos.y = downY
    for (const childId of childrenOf[phase.id] ?? []) {
      const c = positions[childId]
      if (c) c.y += downY
    }
  }

  for (const n of doc.notes) {
    positions[n.id] = { id: n.id, kind: 'note', x: n.x, y: n.y, w: NOTE_W, h: noteHeight(n.text) }
  }

  // Everything above is the line as `layout()` has always drawn it. A card
  // that has been dragged keeps its slot in that line (so nothing else jumps
  // when it moves) and is then shifted by its offset, steps and all.
  const natural: Record<string, { x: number; y: number }> = {}
  for (const p of doc.phases) {
    const pos = positions[p.id]
    if (pos) natural[p.id] = { x: pos.x, y: pos.y }
  }
  const moved = new Set(doc.phases.filter((p) => p.moved && positions[p.id]).map((p) => p.id))
  if (moved.size) placeMoved(doc, positions, childrenOf, moved, opts.free ?? null)

  const all = Object.values(positions)
  const width = Math.max(GEO.phaseW, ...all.map((q) => q.x + q.w))
  const bottom = below.length
    ? downY + Math.max(GEO.phaseH, ...below.map(blockH))
    : spineY + deepestOnLine
  const height = Math.max(bottom, ...all.filter((q) => q.kind !== 'note').map((q) => q.y + q.h))
  return { positions, width, height, childrenOf, natural, moved }
}

interface Area {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Shift every dragged card by its offset, and keep it off every other card.
 *
 * A card dropped on top of another (or so close that no line could pass
 * between them) is moved to the nearest spot that is clear by
 * CARD_CLEARANCE, searched outward in rings so it lands as close as possible
 * to where it was dropped. Cards on the line never move to make room: the one
 * that was dragged is the one that gives way. Moved cards are settled in
 * document order, each one clear of those before it, so the result never
 * depends on render timing.
 */
function placeMoved(
  doc: FlowDoc,
  positions: Record<string, Positioned>,
  childrenOf: Record<string, string[]>,
  moved: Set<string>,
  free: string | null,
) {
  const blockOf = (id: string): Area => {
    const ids = [id, ...(childrenOf[id] ?? [])]
    const ps = ids.map((k) => positions[k]).filter(Boolean)
    return {
      x1: Math.min(...ps.map((p) => p.x)),
      y1: Math.min(...ps.map((p) => p.y)),
      x2: Math.max(...ps.map((p) => p.x + p.w)),
      y2: Math.max(...ps.map((p) => p.y + p.h)),
    }
  }
  const owner = (p: Positioned) => (p.kind === 'step' ? p.phaseId! : p.id)

  // what stays put: every card that was not dragged, its steps, and the notes
  const fixed: Area[] = Object.values(positions)
    .filter((p) => !moved.has(owner(p)))
    .map((p) => ({ x1: p.x, y1: p.y, x2: p.x + p.w, y2: p.y + p.h }))

  const shift = (id: string, dx: number, dy: number) => {
    for (const k of [id, ...(childrenOf[id] ?? [])]) {
      const p = positions[k]
      if (p) {
        p.x += dx
        p.y += dy
      }
    }
  }

  for (const phase of doc.phases) {
    if (!moved.has(phase.id) || !phase.moved) continue
    const home = blockOf(phase.id)
    let { dx, dy } = phase.moved
    if (phase.id !== free) [dx, dy] = clearSpot(home, fixed, dx, dy)
    shift(phase.id, dx, dy)
    // the card being dragged is not an obstacle for the others yet
    if (phase.id !== free) fixed.push(blockOf(phase.id))
  }
}

const overlaps = (a: Area, b: Area, gap: number) =>
  a.x1 - gap < b.x2 && a.x2 + gap > b.x1 && a.y1 - gap < b.y2 && a.y2 + gap > b.y1

/** The offset nearest to (dx, dy) at which `home` touches nothing in `fixed`. */
function clearSpot(home: Area, fixed: Area[], dx: number, dy: number): [number, number] {
  const fits = (ox: number, oy: number) => {
    const a = { x1: home.x1 + ox, y1: home.y1 + oy, x2: home.x2 + ox, y2: home.y2 + oy }
    return !fixed.some((f) => overlaps(a, f, CARD_CLEARANCE))
  }
  if (fits(dx, dy)) return [dx, dy]
  const STEP = 12
  for (let ring = 1; ring <= 150; ring++) {
    const r = ring * STEP
    let best: [number, number] | null = null
    let bestD = Infinity
    for (let k = -ring; k <= ring; k++) {
      const s = k * STEP
      for (const [ox, oy] of [
        [s, -r],
        [s, r],
        [-r, s],
        [r, s],
      ]) {
        const d = Math.hypot(ox, oy)
        if (d < bestD && fits(dx + ox, dy + oy)) {
          bestD = d
          best = [dx + ox, dy + oy]
        }
      }
    }
    if (best) return best
  }
  return [dx, dy]
}

/* ------------------------------ integrity -------------------------------- */
export interface FlowIssue {
  kind:
    | 'dangling-source'
    | 'dangling-target'
    | 'duplicate-edge-id'
    | 'self-loop'
    | 'orphan-phase'
    | 'unlabelled-branch'
    | 'duplicate-phase-id'
    | 'duplicate-step-id'
  detail: string
}

export function validateFlowDoc(doc: FlowDoc): FlowIssue[] {
  const issues: FlowIssue[] = []
  const phaseIds = new Set<string>()
  const stepIds = new Set<string>()

  for (const p of doc.phases) {
    if (phaseIds.has(p.id))
      issues.push({ kind: 'duplicate-phase-id', detail: `two phases share id "${p.id}"` })
    phaseIds.add(p.id)
    for (const s of p.steps) {
      const key = `${p.id}::${s.id}`
      if (stepIds.has(key))
        issues.push({ kind: 'duplicate-step-id', detail: `two steps share id "${key}"` })
      stepIds.add(key)
    }
  }

  const edgeIds = new Set<string>()
  const connected = new Set<string>()

  for (const e of doc.edges) {
    if (edgeIds.has(e.id))
      issues.push({ kind: 'duplicate-edge-id', detail: `two edges share id "${e.id}"` })
    edgeIds.add(e.id)
    if (!phaseIds.has(e.source))
      issues.push({ kind: 'dangling-source', detail: `edge "${e.id}" starts at "${e.source}"` })
    if (!phaseIds.has(e.target))
      issues.push({ kind: 'dangling-target', detail: `edge "${e.id}" points at "${e.target}"` })
    if (e.source === e.target)
      issues.push({ kind: 'self-loop', detail: `edge "${e.id}" links "${e.source}" to itself` })
    if (e.kind === 'branch' && !e.label?.trim())
      issues.push({
        kind: 'unlabelled-branch',
        detail: `branch "${e.id}" (${e.source} to ${e.target}) has no label`,
      })
    connected.add(e.source)
    connected.add(e.target)
  }

  if (doc.phases.length > 1) {
    for (const p of doc.phases) {
      if (!connected.has(p.id))
        issues.push({ kind: 'orphan-phase', detail: `phase "${p.id}" (${p.title}) has no connections` })
    }
  }

  return issues
}

/* ------------------------------ persistence ------------------------------ */
const keyFor = (src: FlowSource) => `hexaa-presales-flow-${src.id}-v1`

export function loadDoc(src: FlowSource): FlowDoc | null {
  try {
    const raw = localStorage.getItem(keyFor(src))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FlowDoc
    if (parsed?.version !== 1 || !Array.isArray(parsed.phases)) return null
    // a saved doc from an older content pack is discarded, not re-laid-out
    if (parsed.stamp !== contentStamp(src)) return null
    return parsed
  } catch {
    return null
  }
}

export const saveDoc = (src: FlowSource, doc: FlowDoc) => {
  try {
    localStorage.setItem(keyFor(src), JSON.stringify(doc))
  } catch {
    /* storage full or blocked, the diagram still works, it just won't persist */
  }
}

export const clearDoc = (src: FlowSource) => localStorage.removeItem(keyFor(src))

export function parseImported(text: string, src: FlowSource): FlowDoc | null {
  try {
    const d = JSON.parse(text) as FlowDoc
    if (d?.version !== 1) return null
    if (!Array.isArray(d.phases) || !Array.isArray(d.edges) || !Array.isArray(d.notes)) return null
    return {
      version: 1,
      // an import is a deliberate act and should survive a reload
      stamp: contentStamp(src),
      phases: d.phases,
      edges: d.edges,
      notes: d.notes,
      expanded: Array.isArray(d.expanded) ? d.expanded : [],
    }
  } catch {
    return null
  }
}
