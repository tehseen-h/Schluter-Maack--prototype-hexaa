import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { LaneId, Step } from '../data/process'
import type { FlowShape } from '../../lib/types'
import type { FlowPhase } from '../lib/flowModel'
import { cx } from '../lib/uikit'
import { IconChevronRight, IconInfo, IconLock, IconNote } from '../lib/icons'

/**
 * The four connection points. Two things here are load-bearing, and both were
 * found by trying to draw a link and failing:
 *
 * 1. `z-20`. React Flow's handles are absolutely positioned with no z-index,
 *    and a card's own content wrapper is `relative`, which paints OVER them
 *    and swallows the pointerdown. The connect feature then looks present and
 *    does nothing, with no error anywhere.
 * 2. The `!top-0 / !right-0 / !bottom-0 / !left-0` overrides. React Flow parks
 *    each handle 4px OUTSIDE the node, which a card with `overflow-hidden`
 *    clips away entirely. Sitting them on the border keeps them visible and
 *    grabbable whatever the card does.
 *
 * They are also 12px rather than React Flow's 5px default, and they fade in on
 * card hover: a 5px invisible target is not something anyone finds on a call.
 */
const SIDES: { id: string; pos: Position; cls: string }[] = [
  { id: 'h-top', pos: Position.Top, cls: '!top-0' },
  { id: 'h-right', pos: Position.Right, cls: '!right-0' },
  { id: 'h-bottom', pos: Position.Bottom, cls: '!bottom-0' },
  { id: 'h-left', pos: Position.Left, cls: '!left-0' },
]

const Handles = () => (
  <>
    {SIDES.map((s) => (
      <Handle
        key={s.id}
        id={s.id}
        type="source"
        position={s.pos}
        title="Drag from here to link this card to another"
        className={cx(
          s.cls,
          'z-20 !h-3 !w-3 !border-2 !border-surface !bg-accent opacity-0 shadow-sm',
          'transition-all duration-200 group-hover:opacity-100 hover:!h-4 hover:!w-4',
        )}
      />
    ))}
  </>
)

/* Card colours = WHO does this step. Amber is ours, because the line above
   the canvas promises amber is our part and the cards have to match it.
   Amber needs dark text, so each owner carries its own header text colour. */
const LANE: Record<
  LaneId,
  { band: string; headText: string; border: string; softBorder: string; tint: string; text: string; chip: string }
> = {
  ours: {
    band: 'bg-accent',
    headText: 'text-on-accent',
    border: 'border-accent',
    softBorder: 'border-accent/45',
    tint: 'bg-accent-soft/60',
    text: 'text-accent-ink',
    chip: 'bg-accent text-on-accent',
  },
  system: {
    band: 'bg-theirs',
    headText: 'text-white/95',
    border: 'border-theirs',
    softBorder: 'border-theirs/45',
    tint: 'bg-theirs-soft/60',
    text: 'text-theirs',
    chip: 'bg-theirs text-white',
  },
  human: {
    band: 'bg-human',
    headText: 'text-white/95',
    border: 'border-human',
    softBorder: 'border-human/45',
    tint: 'bg-human-soft/60',
    text: 'text-human',
    chip: 'bg-human text-white',
  },
}

/* ── standard flowchart symbols ──────────────────────────────────────────
   Meaning is carried by the SHAPE, which a technical audience already reads
   without a key, so these deliberately do NOT reuse the ownership colours. */
const SHAPE: Record<FlowShape, { stroke: string; fill: string; label: string; text: string }> = {
  terminator: { stroke: '#5D6B82', fill: '#EBEEF3', label: 'Start / end', text: 'text-theirs' },
  document: { stroke: '#3D6FA5', fill: '#EAF1F9', label: 'Document', text: 'text-[#2C5883]' },
  process: { stroke: '#1B2E4C', fill: '#FFFFFF', label: 'Step', text: 'text-navy-800' },
  manual: { stroke: '#8A5C86', fill: '#F6EDF5', label: 'Done by hand', text: 'text-human' },
  decision: { stroke: '#C08A1E', fill: '#FDF4E0', label: 'Decision', text: 'text-accent-ink' },
}

/** The outline, drawn to the node's exact box so the geometry stays true. */
function ShapeOutline({ shape, w, h }: { shape: FlowShape; w: number; h: number }) {
  const c = SHAPE[shape]
  const sw = 2
  const i = sw / 2
  let el: JSX.Element
  if (shape === 'terminator') {
    el = <rect x={i} y={i} width={w - sw} height={h - sw} rx={(h - sw) / 2} ry={(h - sw) / 2} />
  } else if (shape === 'decision') {
    el = <polygon points={`${w / 2},${i} ${w - i},${h / 2} ${w / 2},${h - i} ${i},${h / 2}`} />
  } else if (shape === 'manual') {
    // trapezoid, the standard symbol for a manual operation
    const inset = Math.min(30, w * 0.14)
    el = <polygon points={`${inset},${i} ${w - inset},${i} ${w - i},${h - i} ${i},${h - i}`} />
  } else if (shape === 'document') {
    const wave = 14
    const b = h - i
    el = (
      <path
        d={`M ${i},${i} L ${w - i},${i} L ${w - i},${b - wave}
            C ${w * 0.75},${b - wave + wave * 1.5} ${w * 0.55},${b - wave - wave * 1.2} ${w * 0.5},${b - wave + 2}
            C ${w * 0.4},${b - wave + wave * 1.6} ${w * 0.2},${b - wave - wave * 0.9} ${i},${b - wave + 4} Z`}
      />
    )
  } else {
    el = <rect x={i} y={i} width={w - sw} height={h - sw} rx={4} />
  }
  return (
    <svg width={w} height={h} className="pointer-events-none absolute inset-0" aria-hidden>
      <g fill={c.fill} stroke={c.stroke} strokeWidth={sw} strokeLinejoin="round">
        {el}
      </g>
    </svg>
  )
}

/** A card drawn as a flowchart symbol. Used by the "how it runs today" view. */
function ShapePhaseNode({ d, selected }: { d: PhaseData; selected?: boolean }) {
  const p = d.phase
  const shape = p.shape as FlowShape
  const c = SHAPE[shape]
  const canExpand = p.steps.length > 0
  const isDiamond = shape === 'decision'
  // the diamond only has room for text across its middle band
  const pad = isDiamond ? 'px-[18%] py-[26%]' : shape === 'terminator' ? 'px-6' : 'px-3 py-2.5'

  return (
    <div
      style={{ width: d.w, height: d.h }}
      className={cx('group theme-t relative', selected && 'drop-shadow-[0_0_0_4px_rgba(224,164,59,0.30)]')}
    >
      <ShapeOutline shape={shape} w={d.w} h={d.h} />
      <Handles />
      <div className={cx('relative flex h-full w-full flex-col items-center justify-center text-center', pad)}>
        {!isDiamond && shape !== 'terminator' && (
          <span className={cx('mb-1 text-[8.5px] font-bold uppercase tracking-[0.12em]', c.text)}>
            {c.label}
          </span>
        )}
        <p className={cx('shrink-0 font-bold leading-tight tracking-tight text-ink',
                         isDiamond ? 'line-clamp-4 text-[11.5px]' : 'line-clamp-3 text-[12.5px]')}>
          {p.title}
        </p>
        {!isDiamond && p.summary && (
          <p className="mt-1 line-clamp-3 shrink-0 text-[10px] leading-relaxed text-ink-2">{p.summary}</p>
        )}
        {p.assumption && (
          <span className="mt-1 inline-flex items-center gap-1 rounded border border-medium/45 bg-medium-soft px-1.5 py-[1px] text-[9px] font-semibold text-medium">
            <IconInfo size={9} /> guess
          </span>
        )}
      </div>

      {canExpand && (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation()
            d.onToggle()
          }}
          title={d.expanded ? 'Close the detail' : 'Open the detail'}
          className={cx(
            'nodrag absolute -top-2 right-2 flex h-[19px] items-center gap-1 rounded-full border bg-surface px-1.5 text-[9px] font-bold uppercase tracking-wider shadow-sm transition-colors duration-200',
            c.text,
          )}
          style={{ borderColor: c.stroke }}
        >
          {d.expanded ? 'Close' : `${p.steps.length} steps`}
          <IconChevronRight size={11} className={cx('transition-transform duration-300', d.expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}

interface PhaseData {
  phase: FlowPhase
  expanded: boolean
  onToggle: () => void
  w: number
  h: number
  laneShort: string
}

export function PhaseNode({ data, selected }: NodeProps) {
  const d = data as unknown as PhaseData
  const p = d.phase
  if (p.shape) return <ShapePhaseNode d={d} selected={selected} />
  const c = LANE[p.lane]
  const canExpand = p.steps.length > 0

  return (
    <div
      style={{ width: d.w, height: d.h }}
      className={cx(
        'group theme-t relative flex flex-col overflow-hidden rounded-xl border-2 bg-surface shadow-panel transition-all duration-200 ease-smooth',
        c.border,
        selected && 'ring-4 ring-accent/30',
      )}
    >
      <Handles />
      <div className={cx('flex items-center justify-between gap-2 px-2.5 py-[5px]', c.band)}>
        <span className={cx('text-[9.5px] font-bold uppercase tracking-widest', c.headText)}>
          {d.laneShort}
        </span>
        {canExpand && (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation()
              d.onToggle()
            }}
            title={d.expanded ? 'Close the detail' : 'See how this is done'}
            className={cx(
              'nodrag flex shrink-0 items-center justify-center gap-1 rounded transition-colors duration-200',
              p.lane === 'ours'
                ? 'h-[18px] bg-on-accent px-1.5 font-bold text-accent shadow-sm hover:bg-on-accent/85'
                : 'h-[18px] w-[18px] bg-white/25 text-white hover:bg-white/40',
            )}
          >
            {p.lane === 'ours' && (
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {d.expanded ? 'Close' : 'How?'}
              </span>
            )}
            <IconChevronRight size={13} className={cx('transition-transform duration-300 ease-smooth', d.expanded && 'rotate-180')} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 shrink-0 text-[13.5px] font-bold leading-tight tracking-tight text-ink">
          {p.title}
        </p>
        <p className="mt-1 line-clamp-3 shrink-0 text-[10.5px] leading-relaxed text-ink-2">{p.summary}</p>
        <div className="flex-1" />
        <div className="mt-1.5 flex shrink-0 flex-wrap items-center gap-1">
          {p.systems.slice(0, 3).map((s) => (
            <span key={s} className="rounded border border-line bg-surface-2 px-1.5 py-[1px] text-[9.5px] font-semibold text-ink-2">
              {s}
            </span>
          ))}
          {p.assumption && (
            <span className="inline-flex items-center gap-1 rounded border border-medium/45 bg-medium-soft px-1.5 py-[1px] text-[9.5px] font-semibold text-medium">
              <IconInfo size={9} /> guess
            </span>
          )}
          {canExpand && !d.expanded && (
            <span className={cx('num ml-auto text-[9.5px] font-bold', c.text)}>{p.steps.length} steps</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as { step: Step; lane: LaneId; w: number; h: number; ord: number }
  const s = d.step
  const c = LANE[d.lane]

  return (
    <div
      style={{ width: d.w, height: d.h, animationDelay: `${d.ord * 32}ms` }}
      className={cx(
        'group theme-t animate-fade-right relative flex flex-col overflow-hidden rounded-lg border-2 bg-surface p-2.5 shadow-panel transition-all duration-200 ease-smooth',
        c.softBorder,
        selected && 'ring-4 ring-accent/30',
      )}
    >
      <Handles />
      <div className="flex items-start gap-2">
        <span className={cx('num mt-[1px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded text-[9.5px] font-bold', c.chip)}>
          {d.ord + 1}
        </span>
        <p className="min-w-0 flex-1 text-[12px] font-bold leading-tight tracking-tight text-ink">{s.title}</p>
        {s.assumption ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded border border-medium/45 bg-medium-soft px-1 py-[1px] text-[9px] font-semibold text-medium">
            <IconInfo size={8} /> guess
          </span>
        ) : (
          s.note && <IconNote size={10} className="mt-[2px] shrink-0 text-ink-3" />
        )}
      </div>
      <p className="mt-1 line-clamp-2 shrink-0 text-[10px] leading-relaxed text-ink-2">{s.summary}</p>
      <div className="flex-1" />
      {(s.responsible || s.records || s.notifies) && (
        <div className="mt-1 shrink-0 border-t border-line pt-1.5">
          {s.responsible && (
            <p className="truncate text-[9.5px] text-ink-3">
              <span className="font-bold text-ink-2">who</span> · {s.responsible}
            </p>
          )}
          {(s.records || s.notifies) && (
            <div className="grid grid-cols-2 gap-x-2">
              {s.records && (
                <p className="truncate text-[9.5px] text-ink-3">
                  <span className="font-bold text-ink-2">records</span> · {s.records}
                </p>
              )}
              {s.notifies && (
                <p className="truncate text-[9.5px] text-ink-3">
                  <span className="font-bold text-ink-2">tells</span> · {s.notifies}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function NoteNode({ data, selected }: NodeProps) {
  const d = data as unknown as { text: string; kind?: 'assumption'; h?: number; w?: number }
  const isAssumption = d.kind === 'assumption'
  return (
    <div
      style={{ width: d.w ?? 268, minHeight: d.h }}
      className={cx(
        'group theme-t relative rounded-lg border-2 p-3 shadow-pop transition-all duration-200',
        isAssumption ? 'border-medium bg-medium-soft' : 'border-line-strong bg-surface-2',
        selected && 'ring-4 ring-accent/30',
      )}
    >
      <Handles />
      <div className="mb-1.5 flex items-center gap-1.5">
        {isAssumption ? <IconLock size={12} className="text-medium" /> : <IconNote size={12} className="text-ink-3" />}
        <span className={cx('text-[9.5px] font-bold uppercase tracking-widest', isAssumption ? 'text-medium' : 'text-ink-3')}>
          {isAssumption ? 'Confirm this' : 'Note'}
        </span>
      </div>
      <p className={cx('whitespace-pre-wrap text-[10.5px] leading-relaxed', isAssumption ? 'text-medium' : 'text-ink-2')}>
        {d.text}
      </p>
    </div>
  )
}

export const nodeTypes = { phase: PhaseNode, step: StepNode, note: NoteNode }
