import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  FileText,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Circle,
  CircleCheck,
  Database,
  Send,
  Flag,
  FastForward,
  ScanSearch,
  Calculator,
  Scale,
  ListPlus,
} from 'lucide-react'
import content from '../content'
import type { Navigate } from '../lib/pages'
import type { Stage } from '../lib/simulate'
import { FORMAT_LABEL, type IntakeCase, type SourceDoc } from '../lib/types'
import { DocViewer } from '../components/DocViewer'
import { LINE_STEPS, LoadsView, ROW_STEPS, SettlementView, loadsSteps, settlementSteps } from '../components/Loads'

const { cases, pipeline, intakeIntro, documents } = content
const ONE = intakeIntro.docWord?.one ?? 'document'
const MANY = intakeIntro.docWord?.many ?? 'documents'

// ── Live-run timing ──────────────────────────────────────────────────────────
// One clock ticks while a set runs. Each stage owns a number of ticks, worked out from what it
// shows: a paper read field by field, the loads added one row at a time, the settlement written
// out line by line.
const TICK = 30
const READ_TICKS = 9 // ticks the highlight stays on each field while a paper is read
const STEP_TICKS = 2 // ticks per typing step in the loads table and the settlement

function stageTicks(st: Stage, c?: IntakeCase) {
  const base = Math.ceil(st.ms / TICK)
  if (!st.show) return base
  if ('read' in st.show) return Math.max(base, st.show.keys.length * READ_TICKS + 8)
  if (st.show.panel === 'loads') return c?.loads ? loadsSteps(c.loads) * STEP_TICKS + 14 : base
  return c?.settlement ? settlementSteps(c.settlement) * STEP_TICKS + 14 : base
}

/** The label and value of a field in a paper, found by its key, for the typed caption. */
function findField(doc: SourceDoc, key: string): { label: string; value: string } | undefined {
  const r = doc.render
  if (!r) return undefined
  for (const m of [...(r.meta ?? []), ...(r.footer ?? [])]) if (m.key === key) return { label: m.label, value: m.value }
  for (const s of r.sections ?? []) for (const f of s.fields) if (f.key === key) return { label: f.label, value: f.value }
  if (r.table) {
    for (const row of r.table.rows) {
      const ci = row.keys?.indexOf(key) ?? -1
      if (ci >= 0) {
        const cell = row.cells[ci]
        return { label: r.table.columns[ci], value: typeof cell === 'string' ? cell : '' }
      }
    }
  }
  return undefined
}

export function Intake({ setPage }: { setPage: Navigate }) {
  const [activeCase, setActiveCase] = useState<IntakeCase | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [tick, setTick] = useState(0)

  const stages = activeCase?.stages ?? pipeline
  const durations = useMemo(() => stages.map((s) => stageTicks(s, activeCase ?? undefined)), [stages, activeCase])
  const starts = useMemo(() => {
    let acc = 0
    return durations.map((d) => {
      const s = acc
      acc += d
      return s
    })
  }, [durations])
  const total = durations.reduce((a, b) => a + b, 0)
  const finished = running && tick >= total
  let stage = 0
  if (finished) stage = stages.length
  else starts.forEach((s, i) => tick >= s && (stage = i))
  // The set only runs once EVERY paper it needs is in.
  const allAdded = activeCase != null && added.size === activeCase.docs.length
  const live = !!activeCase?.stages

  useEffect(() => {
    if (!running || finished) return
    const t = setInterval(() => setTick((x) => x + 1), TICK)
    return () => clearInterval(t)
  }, [running, finished])

  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!running) return
    let el: HTMLElement | null = topRef.current
    while (el && el.scrollHeight <= el.clientHeight) el = el.parentElement
    el?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [running, finished])

  function openCase(c: IntakeCase) {
    setActiveCase(c)
    setAdded(new Set())
    setRunning(false)
    setTick(0)
  }
  function toggleDoc(docId: string) {
    setAdded((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }
  function run() {
    setTick(0)
    setRunning(true)
  }
  function reset() {
    setActiveCase(null)
    setAdded(new Set())
    setRunning(false)
    setTick(0)
  }

  const pct = running ? Math.min(100, Math.round((tick / Math.max(total, 1)) * 100)) : 0
  const clock: Clock = { stages, durations, starts, tick, stage, finished }

  const nextButtons = activeCase && (
    <>
      {activeCase.outcome === 'exceptions' && (
        <button onClick={() => setPage('exceptions')} className="btn-accent">
          {intakeIntro.reviewLabel ?? 'Review the flags'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
      {activeCase.outcome !== 'exceptions' && !activeCase.followUp && (
        <button onClick={() => setPage('overview')} className="btn-accent">
          Open the results
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
      <button onClick={reset} className="btn-ghost">
        <RotateCcw className="h-4 w-4" />
        Bring another set in
      </button>
    </>
  )

  const banner = activeCase && (
    <ResultBanner
      tone={activeCase.outcome === 'clean' ? 'ok' : 'warn'}
      icon={activeCase.outcome === 'clean' ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      title={activeCase.resultTitle}
      body={activeCase.resultBody}
    />
  )

  return (
    <div
      ref={topRef}
      className={`fade-in mx-auto space-y-5 p-6 ${running && live ? (finished ? 'max-w-6xl' : 'max-w-7xl') : 'max-w-4xl'}`}
    >
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{intakeIntro.title}</h2>
        {!running && <p className="mt-1 text-sm text-ink-600">{intakeIntro.caption}</p>}
      </div>

      {/* ── 1. Pick a set ─────────────────────────────────────────────────── */}
      {!activeCase && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cases.map((c) => (
            <div key={c.id} className="card card-pad card-hover flex flex-col">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-snug text-ink-900">{c.name}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="chip border-line bg-surface-muted text-ink-500">
                      {c.docs.length} {c.docs.length === 1 ? ONE : MANY} to add
                    </span>
                    {c.pulled && (
                      <span className="chip border-navy-500/20 bg-navy-500/5 text-navy-700">
                        <Database className="h-3 w-3" />
                        {c.pulled.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{c.note}</p>
              <button onClick={() => openCase(c)} className="btn-accent mt-4 w-full">
                Open this set
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. Add every paper. It will not start until they are all in ──── */}
      {activeCase && !running && (
        <div className="card card-pad fade-in">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900">{activeCase.name}</div>
              <div className="mt-0.5 text-xs text-ink-500">
                Add every {ONE} below. Nothing is read until {activeCase.docs.length === 2 ? 'both are' : `all ${activeCase.docs.length} are`} in.
              </div>
            </div>
            <button onClick={reset} className="btn-ghost shrink-0">
              <RotateCcw className="h-4 w-4" />
              Pick another set
            </button>
          </div>

          {/* A record the check fetches by itself: shown, so nobody wonders where the other
              side of the comparison comes from, but never counted as a paper to add. */}
          {activeCase.pulled && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-navy-500/20 bg-navy-500/5 px-3 py-2.5">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink-900">{activeCase.pulled.label}</div>
                {activeCase.pulled.note && <div className="text-xs text-ink-500">{activeCase.pulled.note}</div>}
              </div>
              <span className="chip shrink-0 border-navy-500/20 bg-surface text-navy-700">Automatic</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="section-eyebrow">{intakeIntro.docsHeading ?? 'Papers'}</div>
            {added.size < activeCase.docs.length && (
              <button
                onClick={() => setAdded(new Set(activeCase.docs.map((d) => d.docId)))}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
              >
                <ListPlus className="h-3.5 w-3.5" />
                Add them all
              </button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {activeCase.docs.map((d) => {
              const isAdded = added.has(d.docId)
              return (
                <button
                  key={d.docId}
                  onClick={() => toggleDoc(d.docId)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    isAdded ? 'border-accent/40 bg-accent-soft/50' : 'border-line hover:bg-surface-muted'
                  }`}
                >
                  {isAdded ? (
                    <CircleCheck className="h-5 w-5 shrink-0 text-accent-ink" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-ink-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-900">{d.label}</div>
                  </div>
                  <span className="chip border-line bg-surface-muted text-ink-500">{FORMAT_LABEL[d.format]}</span>
                  <span className={`w-12 text-right text-xs font-medium ${isAdded ? 'text-accent-ink' : 'text-ink-500'}`}>
                    {isAdded ? 'Added' : 'Add'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className={`text-xs ${allAdded ? 'text-ok' : 'text-ink-500'}`}>
              {allAdded
                ? `${activeCase.docs.length === 2 ? 'Both' : `All ${activeCase.docs.length}`} ${MANY} in. Ready to check.`
                : `${added.size} of ${activeCase.docs.length} ${MANY} added. ${activeCase.docs.length - added.size} still needed before it can start.`}
            </span>
            <button onClick={run} disabled={!allAdded} className="btn-accent disabled:cursor-not-allowed disabled:opacity-40">
              {intakeIntro.runLabel ?? 'Run the check'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. The live run ───────────────────────────────────────────────── */}
      {activeCase && running && !finished && (
        <div className={live ? 'grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]' : ''}>
          <div className={`card card-pad fade-in ${live ? 'lg:sticky lg:top-4' : ''}`}>
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-snug text-ink-900">{activeCase.name}</div>
                <div className="text-xs text-ink-500">Working…</div>
              </div>
              <div className="mono text-sm font-semibold text-ink-700">{pct}%</div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-accent transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
            </div>

            <div className="mt-3 space-y-0.5">
              {stages.map((st, i) => {
                const done = i < stage
                const current = i === stage
                return (
                  <div
                    key={st.id}
                    className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13px] leading-snug ${current ? 'bg-accent-soft' : ''}`}
                  >
                    <span
                      className={`mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                        done ? 'bg-accent text-on-accent' : current ? 'text-accent-ink' : 'text-ink-400'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3" />
                      ) : current ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className={done || current ? 'text-ink-900' : 'text-ink-400'}>{st.label}</span>
                  </div>
                )
              })}
            </div>

            <FoundSoFar {...clock} />

            <button onClick={() => setTick(total)} className="btn-ghost mt-3 w-full text-xs">
              <FastForward className="h-3.5 w-3.5" />
              Skip to the result
            </button>
          </div>

          {live && <LivePanel {...clock} c={activeCase} />}
        </div>
      )}

      {/* ── 4. Done: the result, then everything it worked out ───────────── */}
      {activeCase && running && finished && (
        <div className="space-y-5">
          <div className="card card-pad fade-in">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-snug text-ink-900">{activeCase.name}</div>
                <div className="text-xs text-ink-500">Done</div>
              </div>
              <div className="mono text-sm font-semibold text-ink-700">100%</div>
            </div>
            <div className="mt-4">
              {banner}
              {activeCase.followUp && <FollowUp f={activeCase.followUp} />}
              <div className="mt-4 flex flex-wrap gap-2">{nextButtons}</div>
            </div>
          </div>

          {activeCase.loads && (
            <div className="card card-pad fade-in">
              <div className="mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-accent-ink" />
                <div className="text-sm font-semibold text-ink-900">{activeCase.loads.title}</div>
              </div>
              <LoadsView table={activeCase.loads} onOpen={(id) => setPage('exceptions', id)} />
            </div>
          )}
          {activeCase.settlement && (
            <div className="card card-pad fade-in">
              <div className="mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-accent-ink" />
                <div className="text-sm font-semibold text-ink-900">{activeCase.settlement.title}</div>
              </div>
              <SettlementView s={activeCase.settlement} onOpen={(id) => setPage('exceptions', id)} />
            </div>
          )}

          <FoundSoFar {...clock} />
        </div>
      )}
    </div>
  )
}

interface Clock {
  stages: Stage[]
  durations: number[]
  starts: number[]
  tick: number
  stage: number
  finished: boolean
}

/** Check results as they arrive, gathered across every stage so far. */
function FoundSoFar({ stages, durations, starts, tick, finished }: Clock) {
  const shown: { text: string; tone?: 'ok' | 'flag' }[] = []
  stages.forEach((st, i) => {
    if (!st.notes?.length) return
    const elapsed = tick - starts[i]
    if (elapsed <= 0 && !finished) return
    const n = st.notes.length
    st.notes.forEach((note, j) => {
      if (finished || elapsed >= ((j + 1) / (n + 1)) * durations[i]) shown.push(note)
    })
  })
  if (!shown.length) return null
  return (
    <div className={finished ? 'card card-pad fade-in' : 'mt-3 border-t border-line pt-3'}>
      <div className="section-eyebrow mb-1.5">{finished ? 'Everything it found along the way' : 'Found so far'}</div>
      <ul className={finished ? 'grid grid-cols-1 gap-x-8 gap-y-1.5 lg:grid-cols-2' : 'space-y-1.5'}>
        {shown.map((n) => (
          <li key={n.text} className="fade-in flex items-start gap-2 text-[12.5px] leading-snug">
            {n.tone === 'flag' ? (
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sev-high" />
            ) : (
              <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
            )}
            <span className={n.tone === 'flag' ? 'font-medium text-ink-900' : 'text-ink-600'}>{n.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** What the run is doing right now: a paper being read, the loads added, the sum written out. */
function LivePanel({ stages, starts, tick, stage, c }: Clock & { c: IntakeCase }) {
  // The panel shows the most recent stage that had something to show.
  let si = stage
  while (si > 0 && !stages[si]?.show) si--
  const st = stages[si]
  const show = st?.show
  const onNoShow = !stages[stage]?.show
  const elapsed = Math.max(0, tick - (starts[si] ?? 0))

  let header = 'Getting ready'
  let Icon = ScanSearch
  let caption: ReactNode = null
  let body: ReactNode = <div className="h-[max(380px,min(560px,calc(100vh-190px)))]" />

  if (show && 'read' in show) {
    const doc = documents.find((d) => d.id === show.read)
    const fi = Math.min(Math.floor(elapsed / READ_TICKS), show.keys.length - 1)
    const key = show.keys[fi]
    const f = doc ? findField(doc, key) : undefined
    header = `Reading ${doc?.name ?? ''}`
    if (f) caption = <ReadCaption label={f.label} value={f.value} frac={Math.min(1, (elapsed - fi * READ_TICKS) / (READ_TICKS * 0.65))} />
    body = doc ? (
      <div className="h-[max(380px,min(560px,calc(100vh-190px)))]">
        <DocViewer doc={doc} activeKey={key} />
      </div>
    ) : null
  } else if (show && 'panel' in show && show.panel === 'loads' && c.loads) {
    const reveal = Math.min(Math.floor(elapsed / STEP_TICKS), loadsSteps(c.loads))
    const ri = Math.min(Math.floor(reveal / ROW_STEPS), c.loads.rows.length - 1)
    const row = c.loads.rows[ri]
    Icon = Scale
    header = 'Adding the loads against the contract'
    caption = row && reveal > 0 && (
      <WorkCaption lead="Adding" text={`${row.cells.length ? (typeof row.cells[0] === 'string' ? row.cells[0] : row.cells[0].value) : ''} to the running total, and checking it against the contract`} />
    )
    body = <LoadsView table={c.loads} reveal={reveal} />
  } else if (show && 'panel' in show && show.panel === 'settlement' && c.settlement) {
    const reveal = Math.min(Math.floor(elapsed / STEP_TICKS), settlementSteps(c.settlement))
    const li = Math.min(Math.floor(reveal / LINE_STEPS), c.settlement.lines.length - 1)
    const ln = c.settlement.lines[li]
    Icon = Calculator
    header = 'Working out the settlement'
    caption = ln && reveal > 0 && <WorkCaption lead="Working out" text={`${ln.ref}: ${ln.working}`} />
    body = <SettlementView s={c.settlement} reveal={reveal} />
  }

  // A stage with nothing of its own to show keeps the last view and says what it is doing.
  if (onNoShow && stages[stage]) {
    caption = <WorkCaption lead="Now" text={stages[stage].label} />
  }

  return (
    <div className="card card-pad fade-in">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <Icon className="h-4 w-4 text-accent-ink" />
          <span className="text-sm font-semibold text-ink-900">{header}</span>
        </div>
        <span className="text-[11px] text-ink-400">Live</span>
      </div>
      {caption}
      {body}
    </div>
  )
}

/** The value being read, written out as it is picked up: the "AI writing" line. */
function ReadCaption({ label, value, frac }: { label: string; value: string; frac: number }) {
  const shown = value.slice(0, Math.max(1, Math.round(value.length * Math.max(0, Math.min(1, frac)))))
  const typing = frac < 1
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2 text-[12.5px]">
      <span className="text-ink-500">Reading</span>
      <span className="font-medium text-ink-800">{label}</span>
      <ArrowRight className="h-3 w-3 text-ink-400" />
      <span className={`mono font-semibold text-ink-900 ${typing ? 'typing-caret' : ''}`}>{shown}</span>
    </div>
  )
}

function WorkCaption({ lead, text }: { lead: string; text: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2 text-[12.5px]">
      <span className="text-ink-500">{lead}</span>
      <span className="font-medium text-ink-900">{text}</span>
    </div>
  )
}

/** What happens next: values prepared for their system, or a message drafted for a person. */
function FollowUp({ f }: { f: NonNullable<IntakeCase['followUp']> }) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-surface-muted/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {f.message ? <Send className="h-4 w-4 text-accent-ink" /> : <Database className="h-4 w-4 text-accent-ink" />}
          {f.title}
        </div>
        {f.badge && <span className="chip border-line bg-surface text-ink-600">{f.badge}</span>}
      </div>
      {f.caption && <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.caption}</p>}
      {f.rows && (
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {f.rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-4 px-3 py-2 text-sm">
              <span className="text-ink-600">{r.label}</span>
              <span className={`text-right font-medium text-ink-900 ${r.mono ? 'mono text-[13px]' : ''}`}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {f.message && (
        <div className="mt-3 whitespace-pre-line rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink-800">
          {f.message}
        </div>
      )}
    </div>
  )
}

function ResultBanner({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'ok' | 'warn'
  icon: React.ReactNode
  title: string
  body: string
}) {
  const cls = tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'
  return (
    <div className={`flex gap-3 rounded-lg border p-3.5 ${cls}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-semibold leading-snug">{title}</div>
        <div className="mt-1 text-[13px] leading-relaxed opacity-90">{body}</div>
      </div>
    </div>
  )
}
