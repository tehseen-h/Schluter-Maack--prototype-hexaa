import type { ReactNode } from 'react'
import {
  ArrowRight,
  ShieldCheck,
  FileText,
  ClipboardList,
  CircleAlert,
  CircleCheck,
  Ban,
  Camera,
  Database,
  ChevronRight,
  ListChecks,
} from 'lucide-react'
import content from '../content'
import { HexaaWord } from '../components/Brand'
import { SeverityBadge, severityRank } from '../components/SeverityBadge'
import { Collapsible } from '../components/Collapsible'
import { LoadsView, SettlementView } from '../components/Loads'
import { TITLES, type Navigate } from '../lib/pages'
import { FORMAT_LABEL, type DocFormat, type ExtractedField, type PackItem, type ScheduleRow } from '../lib/types'

const { project, documents, extracted, exceptions, schedule, comparison, packList, loads, settlement } = content
const docById = (id: string) => documents.find((d) => d.id === id)
const docName = (id: string) => docById(id)?.name ?? id

// Section headings are the client's words, so the content pack can rename them.
const S = {
  pulledOut: project.sections?.pulledOut ?? 'What we pulled out',
  pulledOutCaption:
    project.sections?.pulledOutCaption ?? 'Read from the documents automatically. Every value traces back to its source.',
  needsAttention: project.sections?.needsAttention ?? 'Needs attention',
  // "Review all exceptions" unless the page was renamed; never lower-case a
  // client's page name (it can hold an acronym)
  reviewAll: project.sections?.reviewAll ?? (project.pages?.exceptions ? `Open ${TITLES.exceptions}` : 'Review all exceptions'),
  cameIn: project.sections?.cameIn ?? 'What came in',
  humanControl: project.sections?.humanControl ?? 'Human stays in control',
}

// The Overview is about one case. Documents belonging to the other Intake
// cases stay off this page.
const mainDocs = project.mainDocs
  ? project.mainDocs.map((id) => docById(id)).filter((d): d is NonNullable<typeof d> => !!d)
  : documents

const FORMAT_ICON: Record<DocFormat, typeof FileText> = {
  PDF: FileText,
  Excel: FileText,
  CSV: FileText,
  Word: FileText,
  Image: Camera,
  Photo: Camera,
  System: Database,
}

const SCHEDULE_STATUS_STYLE: Record<ScheduleRow['status'], { cls: string; Icon: typeof CircleCheck }> = {
  clear: { cls: 'text-ok bg-ok-soft border-ok/30', Icon: CircleCheck },
  'needs-review': { cls: 'text-sev-high bg-orange-50 border-orange-200', Icon: CircleAlert },
  blocked: { cls: 'text-sev-critical bg-red-50 border-red-200', Icon: Ban },
}

const PACK_STATUS_STYLE: Record<PackItem['status'], { cls: string; Icon: typeof CircleCheck }> = {
  in: { cls: 'text-ok', Icon: CircleCheck },
  problem: { cls: 'text-sev-high', Icon: CircleAlert },
  missing: { cls: 'text-sev-critical', Icon: Ban },
  elsewhere: { cls: 'text-ink-400', Icon: ShieldCheck },
}

function groupBy<T>(items: T[], key: (t: T) => string) {
  const out: Record<string, T[]> = {}
  for (const it of items) (out[key(it)] ||= []).push(it)
  return out
}

/** Click and keyboard handlers for a row that opens a finding. */
function openable(go: () => void) {
  return {
    onClick: go,
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        go()
      }
    },
  }
}

function GuessChip({ note }: { note?: string }) {
  return (
    <span className="chip border-assume/30 bg-assume-soft py-0.5 text-assume" title={note}>
      guess
    </span>
  )
}

export function Overview({ setPage }: { setPage: Navigate }) {
  const sortedExceptions = [...exceptions].sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

  return (
    <div className="fade-in mx-auto max-w-6xl space-y-5 p-6">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="card card-pad relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy-800 via-navy-500 to-accent" />
        <div className="pt-1">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">{project.client}</h2>
          <div className="mt-1 text-xs text-ink-3">
            Created by <HexaaWord className="text-[13px]" />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-700">{project.subtitle}</p>
        </div>
        {/* The case at a glance: one even row of equal cells. Wrapped chips of
            different widths, right-aligned, read as scattered bubbles. */}
        <div
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--facts),minmax(0,1fr))]"
          style={{ ['--facts' as string]: Math.min(Math.max(project.identity.length, 1), 5) } as React.CSSProperties}
        >
          {project.identity.map((k) => (
            <div key={k.label} className="min-w-0 rounded-lg border border-line bg-surface-muted px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{k.label}</div>
              <div className={`mt-0.5 text-sm font-semibold leading-snug text-ink-900 ${k.mono ? 'mono' : ''}`}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
        {project.caseSummary && (
          <p className="mt-4 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-700">
            {project.caseSummary}
          </p>
        )}
      </div>

      {comparison ? (
        <>
          {/* WIDE layout, used when there is a comparison grid: three short
              cards side by side, then the wide sections at full width, where
              a table of values has room to read. */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <NeedsAttentionCard setPage={setPage} sorted={sortedExceptions} stretch />
            {packList ? <PackListSection setPage={setPage} /> : <CameInSection />}
            <HumanControlCard className="md:col-span-2 xl:col-span-1" />
          </div>
          <ComparisonSection setPage={setPage} />
          {loads && <LoadsSection setPage={setPage} />}
          {settlement && <SettlementSection setPage={setPage} />}
          {schedule && <ScheduleSection setPage={setPage} />}
        </>
      ) : (
        /* CLASSIC layout: the values and the master record in the wide
           column, the three short cards stacked in the rail. items-start
           stops either column from stretching. */
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <PulledOutSection />
            {loads && <LoadsSection setPage={setPage} />}
            {settlement && <SettlementSection setPage={setPage} />}
            {schedule && <ScheduleSection setPage={setPage} />}
          </div>
          <div className="space-y-5">
            <NeedsAttentionCard setPage={setPage} sorted={sortedExceptions} />
            {packList ? <PackListSection setPage={setPage} /> : <CameInSection />}
            <HumanControlCard />
          </div>
        </div>
      )}
    </div>
  )
}

/** The findings, worst first, each opening on the Exceptions page. */
function NeedsAttentionCard({
  setPage,
  sorted,
  stretch = false,
}: {
  setPage: Navigate
  sorted: typeof exceptions
  stretch?: boolean
}) {
  return (
    <section className={`card card-pad ${stretch ? 'flex flex-col' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="section-eyebrow">{S.needsAttention}</div>
        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-sev-critical">
          {exceptions.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {sorted.slice(0, 4).map((ex) => (
          <div
            key={ex.id}
            {...openable(() => setPage('exceptions', ex.id))}
            className="cursor-pointer rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium leading-snug text-ink-900">{ex.title}</span>
              <SeverityBadge severity={ex.severity} />
            </div>
          </div>
        ))}
      </div>
      <div className={stretch ? 'flex-1' : ''}>
        {project.sections?.needsAttentionNote && (
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2.5 text-[13px] leading-relaxed text-ink-700">
            {project.sections.needsAttentionNote}
          </p>
        )}
      </div>
      <button onClick={() => setPage('exceptions')} className="btn-ghost mt-3 w-full">
        {S.reviewAll}
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  )
}

/** What the tool never does: the human-retains boundaries. */
function HumanControlCard({ className = '' }: { className?: string }) {
  return (
    <section className={`card card-pad ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <div className="section-eyebrow">{S.humanControl}</div>
      </div>
      <ul className="mt-3 space-y-2.5">
        {project.boundaries.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug text-ink-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {b}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── The cross-check, as a grid of values ─────────────────────────────────────
function ComparisonSection({ setPage }: { setPage: Navigate }) {
  const c = comparison!
  const emptyLabel = c.emptyLabel ?? 'not on this paper'
  const agreeLabel = c.agreeLabel ?? 'Agrees'
  let lastGroup: string | undefined

  return (
    <section className="card card-pad">
      <div className="section-eyebrow">{c.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{c.caption}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <colgroup>
            <col className="w-[16%]" />
            {c.columns.map((col) => (
              <col key={col.docId} />
            ))}
            <col className="w-[164px]" />
          </colgroup>
          <thead>
            <tr className="bg-surface-muted text-left align-bottom">
              <th className="px-3 py-2.5" />
              {c.columns.map((col) => {
                const d = docById(col.docId)
                const Icon = d ? FORMAT_ICON[d.format] : FileText
                return (
                  <th key={col.docId} className="px-3 py-2.5 font-semibold">
                    <div className="text-xs text-ink-800">{col.label}</div>
                    {d && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-normal text-ink-500">
                        <Icon className="h-3 w-3" />
                        {d.formatLabel ?? FORMAT_LABEL[d.format]}
                      </div>
                    )}
                  </th>
                )
              })}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row, ri) => {
              const rows: ReactNode[] = []
              if (row.group && row.group !== lastGroup) {
                lastGroup = row.group
                rows.push(
                  <tr key={`g-${row.group}-${ri}`} className="border-t border-line bg-surface-muted/50">
                    <td
                      colSpan={c.columns.length + 2}
                      className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500"
                    >
                      {row.group}
                    </td>
                  </tr>,
                )
              }
              const off = row.cells.some((x) => x?.off)
              const go = row.exceptionId ? () => setPage('exceptions', row.exceptionId) : undefined
              rows.push(
                <tr
                  key={`${row.group ?? ''}|${row.label}|${ri}`}
                  {...(go ? openable(go) : {})}
                  className={`border-t border-line ${go ? 'cursor-pointer transition-colors hover:bg-accent-soft/40' : ''}`}
                >
                  <td className="px-3 py-2 text-xs font-medium text-ink-600">{row.label}</td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-3 py-2 align-middle">
                      {cell ? (
                        <span
                          className={`${row.mono ? 'mono whitespace-nowrap text-[13px]' : 'break-words text-[13px]'} ${
                            cell.off
                              ? 'rounded bg-red-50 px-1 py-0.5 font-semibold text-sev-critical ring-1 ring-red-200'
                              : 'text-ink-900'
                          }`}
                        >
                          {cell.value}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-ink-400">{emptyLabel}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {off ? (
                      <span className="chip whitespace-nowrap border-orange-200 bg-orange-50 py-0.5 text-sev-high">
                        {row.offLabel ?? 'Disagrees'}
                        {go && <ChevronRight className="-mr-1 h-3 w-3" />}
                      </span>
                    ) : (
                      <span className="chip whitespace-nowrap border-ok/30 bg-ok-soft py-0.5 text-ok">
                        <CircleCheck className="h-3 w-3" />
                        {agreeLabel}
                      </span>
                    )}
                  </td>
                </tr>,
              )
              return rows
            })}
          </tbody>
        </table>
      </div>
      {c.rows.some((r) => r.exceptionId) && (
        <p className="mt-2 text-[11px] text-ink-400">Click a row that disagrees to open it on the {TITLES.exceptions} page.</p>
      )}

      {c.alsoChecked && c.alsoChecked.length > 0 && (
        <div className="mt-4 rounded-lg border border-ok/25 bg-ok-soft/40 px-4 py-3">
          <div className="text-xs font-semibold text-ink-700">Also checked, and fine</div>
          <ul className="mt-1.5 space-y-1">
            {c.alsoChecked.map((t) => (
              <li key={t} className="flex gap-2 text-[13px] leading-snug text-ink-700">
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {extracted.length > 0 && (
        <div className="mt-3">
          <Collapsible title="More detail" count={extracted.length}>
            <DetailTray fields={extracted} />
          </Collapsible>
        </div>
      )}
    </section>
  )
}

// ── Many units against one limit, then the sum worked out (optional) ────────
function LoadsSection({ setPage }: { setPage: Navigate }) {
  const t = loads!
  return (
    <section className="card card-pad">
      <div className="section-eyebrow">{t.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.caption}</p>
      <div className="mt-4">
        <LoadsView table={t} onOpen={(id) => setPage('exceptions', id)} />
      </div>
      {t.rows.some((r) => r.exceptionId) && (
        <p className="mt-2 text-[11px] text-ink-400">Click a row that was flagged to open it on the {TITLES.exceptions} page.</p>
      )}
    </section>
  )
}

function SettlementSection({ setPage }: { setPage: Navigate }) {
  const s = settlement!
  return (
    <section className="card card-pad">
      <div className="section-eyebrow">{s.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.caption}</p>
      <div className="mt-4">
        <SettlementView s={s} onOpen={(id) => setPage('exceptions', id)} />
      </div>
    </section>
  )
}

/** The less important values, grouped, each with the paper it came from. */
function DetailTray({ fields }: { fields: ExtractedField[] }) {
  const groups = groupBy(fields, (f) => f.group)
  return (
    <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
      {Object.entries(groups).map(([group, fs]) => (
        <div key={group}>
          <div className="mb-1.5 text-xs font-semibold text-ink-600">{group}</div>
          <div className="divide-y divide-line rounded-lg border border-line">
            {fs.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-ink-600">{f.label}</span>
                <span className={`text-right text-ink-900 ${f.mono ? 'mono text-[13px]' : ''}`}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Fallback when there is no comparison: value cards per group ─────────────
function PulledOutSection() {
  const primary = extracted.filter((f) => f.primary)
  const secondary = extracted.filter((f) => !f.primary)
  const primaryGroups = groupBy(primary, (f) => f.group)
  return (
    <section className="card card-pad">
      <div className="section-eyebrow">{S.pulledOut}</div>
      <p className="mt-1 text-xs text-ink-500">{S.pulledOutCaption}</p>
      <div className="mt-4 space-y-5">
        {Object.entries(primaryGroups).map(([group, fields]) => (
          <div key={group}>
            <div className="mb-2 text-xs font-semibold text-ink-600">{group}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fields.map((f) => (
                <div key={f.label} className="rounded-lg border border-line bg-surface-muted px-3 py-2.5">
                  <div className="text-[11px] text-ink-500">{f.label}</div>
                  <div className={`mt-0.5 text-sm font-semibold text-ink-900 ${f.mono ? 'mono' : ''}`}>{f.value}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-400">
                    <FileText className="h-3 w-3" />
                    {docName(f.docId)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {secondary.length > 0 && (
        <div className="mt-4">
          <Collapsible title="More detail" count={secondary.length}>
            <DetailTray fields={secondary} />
          </Collapsible>
        </div>
      )}
    </section>
  )
}

// ── What the pack must contain, and whether it does ─────────────────────────
function PackListSection({ setPage }: { setPage: Navigate }) {
  const p = packList!
  return (
    <section className="card card-pad flex flex-col">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-accent" />
        <div className="section-eyebrow">{p.title}</div>
        {p.assumption && <GuessChip note={p.assumptionNote} />}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{p.caption}</p>
      {p.assumption && p.assumptionNote && (
        <p className="mt-1 text-xs leading-relaxed text-assume">{p.assumptionNote}</p>
      )}
      <div className="mt-3 space-y-2">
        {p.items.map((it) => {
          const st = PACK_STATUS_STYLE[it.status]
          const d = it.docId ? docById(it.docId) : undefined
          const go = it.exceptionId ? () => setPage('exceptions', it.exceptionId) : undefined
          return (
            <div
              key={it.label}
              {...(go ? openable(go) : {})}
              className={`flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 ${
                go ? 'cursor-pointer transition-colors hover:border-accent/40 hover:bg-accent-soft/30' : ''
              }`}
            >
              <st.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${st.cls}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium leading-snug text-ink-900">{it.label}</span>
                  {d && <span className="shrink-0 text-[10.5px] text-ink-400">{d.formatLabel ?? FORMAT_LABEL[d.format]}</span>}
                </div>
                <div className={`mt-0.5 text-xs ${it.status === 'in' || it.status === 'elsewhere' ? 'text-ink-500' : st.cls}`}>
                  {it.statusLabel}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CameInSection() {
  return (
    <section className="card card-pad">
      <div className="section-eyebrow">{S.cameIn}</div>
      <div className="mt-3 space-y-2">
        {mainDocs.map((d) => {
          const Icon = FORMAT_ICON[d.format]
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink-900">{d.name}</div>
                <div className="text-[11px] text-ink-500">{d.kind}</div>
              </div>
              <span className="chip border-line bg-surface-muted text-ink-500">{d.formatLabel ?? FORMAT_LABEL[d.format]}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── The client's own wider list (optional) ──────────────────────────────────
// An amount or a count reads best right-aligned; a reference does not.
const isFigure = (v: string) => /^\s*(?:GBP|USD|EUR)?[\s(£$€-]*\d[\d,.\s]*[%)]?\s*$/.test(v)

function ScheduleSection({ setPage }: { setPage: Navigate }) {
  const s = schedule!
  const refIsFigure = s.rows.length > 0 && s.rows.every((r) => isFigure(r.evidenceRef))
  return (
    <section className="card card-pad">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" />
          <div className="section-eyebrow">{s.title}</div>
          {s.assumption && <GuessChip note={s.assumptionNote} />}
        </div>
        {s.countNote && <p className="text-xs text-ink-500">{s.countNote}</p>}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.caption}</p>
      {s.assumption && s.assumptionNote && <p className="mt-1 text-xs leading-relaxed text-assume">{s.assumptionNote}</p>}
      {/* overflow-x-auto, not overflow-hidden: a table wider than its container
          must scroll, never silently lose its last column. */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted text-left text-xs text-ink-500">
              <th className="whitespace-nowrap px-3 py-2 font-semibold">{s.columns.ref}</th>
              <th className="px-3 py-2 font-semibold">{s.columns.location}</th>
              <th className="px-3 py-2 font-semibold">{s.columns.detail}</th>
              <th className={`whitespace-nowrap px-3 py-2 font-semibold ${refIsFigure ? 'text-right' : ''}`}>{s.columns.evidenceRef}</th>
              <th className="px-3 py-2 font-semibold">{s.columns.status}</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row) => {
              const st = SCHEDULE_STATUS_STYLE[row.status]
              // Only a row with a finding behind it opens anything. A flagged row
              // with nothing to show on the next page reads as a broken link.
              const go = row.exceptionId ? () => setPage('exceptions', row.exceptionId) : undefined
              return (
                <tr
                  key={row.id}
                  {...(go ? openable(go) : {})}
                  className={go ? 'cursor-pointer transition-colors hover:bg-accent-soft/40' : undefined}
                >
                  <td className="whitespace-nowrap border-t border-line px-3 py-2 font-medium text-ink-900 mono text-[13px]">
                    {row.ref}
                  </td>
                  <td className="border-t border-line px-3 py-2 text-ink-700">{row.location}</td>
                  <td className="border-t border-line px-3 py-2 text-ink-700">{row.detail}</td>
                  <td className={`whitespace-nowrap border-t border-line px-3 py-2 text-ink-700 mono text-[13px] ${refIsFigure ? 'text-right' : ''}`}>
                    {row.evidenceRef}
                  </td>
                  <td className="border-t border-line px-3 py-2">
                    <span className={`chip whitespace-nowrap ${st.cls}`}>
                      <st.Icon className="h-3 w-3" />
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {s.rows.some((r) => r.exceptionId) && (
        <p className="mt-2 text-[11px] text-ink-400">
          Click a flagged row to open it on the {TITLES.exceptions} page.
        </p>
      )}
    </section>
  )
}
