// The flow data contract. The host app and this skill MUST declare the same
// shapes, or the two drift and the diagram silently stops matching its content.
// Copy this block into the host'''s types module.

// ── Process flow (one left-to-right line) ──────────────────────────────────────
// This shape matches the `process-flow-diagram` skill exactly, so a per-project
// session can run that skill to change the diagram component with NO data
// rework. Two content files use it: flowToday.ts (the client's own process,
// drawn in flowchart symbols) and flow.ts (the same work with our part marked).

/** Which ownership lane a phase belongs to (drives its colour + boundary read). */
export type LaneKind = 'ours' | 'system' | 'human'

export interface FlowLane {
  id: LaneKind
  /** e.g. "You today", "hexaa does it", "You decide". */
  title: string
  caption: string
  /** Two or three words, used on the key and on every card header. */
  short?: string
}

/** A granular step inside a phase, only visible once its phase is expanded. */
export interface FlowStep {
  id: string
  title: string
  summary?: string
  /** who or what is responsible. */
  responsible?: string
  /** what this step records / produces. */
  records?: string
  /** who gets notified. */
  notifies?: string
  /** a note with the reason or source, editable live in the diagram panel. */
  note?: string
  /** inferred/invented rather than confirmed → renders a "guess" badge. */
  assumption?: boolean
}

/**
 * Standard flowchart symbol. Used by the "how it runs today" view, where the
 * symbol carries the meaning instead of an ownership colour.
 */
export type FlowShape = 'terminator' | 'process' | 'decision' | 'document' | 'manual'

export interface FlowPhase {
  id: string
  /** WHO does this step. Carried by the card colour, not by its position. */
  lane: LaneKind
  /** Draw this card as a standard flowchart symbol instead of an owner card. */
  shape?: FlowShape
  title: string
  summary: string
  /** tool / system names shown as chips on the collapsed card. */
  systems?: string[]
  assumption?: boolean
  /**
   * Where the card sits. Left out, it sits on the single left to right line.
   * 'up' lifts it above the line and 'down' drops it below.
   */
  track?: 'up' | 'down'
  steps: FlowStep[]
}

/** An edge between phases: `seq` = along the line; `down`/`up` = labelled side path. */
export interface FlowEdge {
  id: string
  source: string
  target: string
  kind: 'seq' | 'down' | 'up'
  label?: string
  /** Reserved for spacing two side paths that would otherwise collide. */
  offset?: number
}

/** A sticky note seeded on the canvas. `col` is its column in the note row. */
export interface FlowNote {
  id: string
  col: number
  text: string
  kind?: 'assumption'
}

export interface Flow {
  /** The key: who each colour means. Not bands. */
  lanes: FlowLane[]
  /** Document order is left to right order. */
  phases: FlowPhase[]
  edges: FlowEdge[]
  /** One short line for the toolbar: how to read the diagram. */
  readAs?: string
  /** The boundary sentence. */
  note?: string
  notes?: FlowNote[]
}

/** One question to put to the client, with why it is worth asking. */
export interface ClientQuestion {
  q: string
  /** Optional: the reason, usually what we assumed and why it matters. */
  why?: string
}

export interface QuestionGroup {
  id: string
  title: string
  caption?: string
  questions: ClientQuestion[]
}

/** The full content pack the engine consumes. */
