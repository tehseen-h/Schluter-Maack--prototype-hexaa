// Adapter: exposes the content pack's flows in the shape the diagram engine
// expects. There are TWO of them and the page switches between them:
//
//   'today'  the client's own process, no step of ours in it, drawn with standard
//            flowchart symbols. This is the one to open the call on.
//   'hexaa'  the same work as one line, with the part we would take over
//            marked in amber.
//
// Filling the two content files is all a per-project session has to do.
import { flow as flowHexaa } from '../../content/flow'
import { flow as flowToday } from '../../content/flowToday'
import type { LaneKind, FlowStep, FlowPhase, FlowEdge, FlowNote, Flow } from '../../lib/types'

export type LaneId = LaneKind
export type Step = FlowStep
export type Phase = FlowPhase

export type FlowVariant = 'today' | 'hexaa'

export interface FlowSource {
  id: FlowVariant
  /** Shown on the view switcher. */
  tab: string
  /** One line under the switcher / in the toolbar. */
  readAs?: string
  note?: string
  lanes: { id: LaneId; title: string; caption: string; short?: string }[]
  phases: Phase[]
  edges: FlowEdge[]
  notes: FlowNote[]
  /** true when cards carry flowchart symbols rather than owner colours. */
  symbols: boolean
}

function toSource(id: FlowVariant, tab: string, f: Flow, symbols: boolean): FlowSource {
  return {
    id,
    tab,
    readAs: f.readAs,
    note: f.note,
    lanes: f.lanes.map((l) => ({ id: l.id, title: l.title, caption: l.caption, short: l.short })),
    phases: f.phases,
    edges: f.edges,
    notes: f.notes ?? [],
    symbols,
  }
}

export const FLOW_SOURCES: Record<FlowVariant, FlowSource> = {
  today: toSource('today', 'How it runs today', flowToday, true),
  hexaa: toSource('hexaa', 'Where we would help', flowHexaa, false),
}

export const FLOW_VARIANTS: FlowVariant[] = ['today', 'hexaa']

export const laneLabel = (src: FlowSource, id: LaneId) =>
  src.lanes.find((l) => l.id === id)?.title ?? id

export const laneShort = (src: FlowSource, id: LaneId) => {
  const l = src.lanes.find((x) => x.id === id)
  return l?.short ?? l?.title.split(/[, -]/)[0] ?? id
}
