import { useEffect, useState } from 'react'
import { CornerDownRight, Pencil, Check, X, ThumbsUp, RotateCcw } from 'lucide-react'
import content from '../content'
import { DocViewer } from '../components/DocViewer'
import { SeverityBadge, severityRank } from '../components/SeverityBadge'
import type { Exception, Severity } from '../lib/types'

const { documents, exceptions, findingSides, project } = content
const APPROVE = project.sections?.approve ?? 'Approve'
const FINDINGS = project.sections?.findings ?? 'Findings'
const FINDINGS_HINT = project.sections?.findingsHint ?? 'Click a finding to see it in the document · edit or approve inline'
const ROUTE = project.sections?.routeLabel ?? 'Routed to'
const APPROVED = project.sections?.approved ?? 'Approved'

// The two words naming each side of a mismatch are client-facing, so they come
// from the content pack. These defaults only apply when a project leaves them out.
const SIDE_SPECIFIED = findingSides?.specified ?? 'Specified'
const SIDE_EVIDENCE = findingSides?.evidence ?? 'Evidence'

type Edits = Partial<Pick<Exception, 'title' | 'detail' | 'suggestion' | 'routeTo' | 'severity'>>

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

export function Exceptions({ initialId }: { initialId?: string } = {}) {
  // Findings are ranked once, from the content pack's own severity, editing
  // a severity in-session updates the badge but doesn't reshuffle the list
  // under the reviewer mid-review.
  const [sorted] = useState(() => [...exceptions].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]))
  // Arriving from a row on the Overview opens that row's own finding.
  const [selectedId, setSelectedId] = useState(
    () => sorted.find((e) => e.id === initialId)?.id ?? sorted[0]?.id,
  )
  const [side, setSide] = useState<'specified' | 'evidence'>('specified')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Edits>({})
  // Local, in-session only, this is a simulation with no backend, so an
  // edit or an approval is UI state, not a write to any real record.
  const [overrides, setOverrides] = useState<Record<string, Edits>>({})
  const [approved, setApproved] = useState<Record<string, boolean>>({})

  const selectedBase = sorted.find((e) => e.id === selectedId) ?? sorted[0]
  const selected = selectedBase ? { ...selectedBase, ...overrides[selectedBase.id] } : undefined

  useEffect(() => setSide('specified'), [selectedId])

  // When a row on the Overview sent us here, bring that finding into view:
  // the fourth card can sit below the fold on a laptop screen.
  useEffect(() => {
    if (!initialId) return
    const t = setTimeout(() => {
      document.getElementById(`finding-${initialId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 120)
    return () => clearTimeout(t)
  }, [initialId])

  const specifiedDoc = documents.find((d) => d.id === selected?.docId)
  const evidenceDoc = selected?.against ? documents.find((d) => d.id === selected.against?.docId) : undefined
  const showingEvidence = side === 'evidence' && evidenceDoc
  const activeDoc = showingEvidence ? evidenceDoc : specifiedDoc
  const activeKey = showingEvidence ? selected?.against?.fieldKey : selected?.fieldKey

  function startEdit(ex: Exception) {
    setEditingId(ex.id)
    setDraft({ title: ex.title, detail: ex.detail, suggestion: ex.suggestion, routeTo: ex.routeTo, severity: ex.severity })
  }
  function saveEdit(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...draft } }))
    setEditingId(null)
  }
  function cancelEdit() {
    setEditingId(null)
  }
  function toggleApprove(id: string) {
    setApproved((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-5 p-6 lg:grid-cols-2">
      {/* Left: the original document(s) */}
      <div className="lg:sticky lg:top-6">
        {selected?.against && (
          <div className="mb-2 flex gap-1.5">
            <button
              onClick={() => setSide('specified')}
              className={`chip cursor-pointer border-line ${
                side === 'specified' ? 'bg-navy-800 text-white border-navy-800' : 'bg-surface-muted text-ink-600'
              }`}
            >
              {SIDE_SPECIFIED} · {specifiedDoc?.kind ?? specifiedDoc?.name}
            </button>
            <button
              onClick={() => setSide('evidence')}
              className={`chip cursor-pointer border-line ${
                side === 'evidence' ? 'bg-navy-800 text-white border-navy-800' : 'bg-surface-muted text-ink-600'
              }`}
            >
              {SIDE_EVIDENCE} · {selected?.against?.label ?? evidenceDoc?.kind ?? evidenceDoc?.name}
            </button>
          </div>
        )}
        <div className="h-[calc(100vh-7.5rem)] min-h-[420px]">
          {activeDoc && <DocViewer doc={activeDoc} activeKey={activeKey} />}
        </div>
      </div>

      {/* Right: the findings */}
      <div>
        <div className="mb-3">
          <div className="section-eyebrow">{FINDINGS}</div>
          <p className="mt-1 text-xs text-ink-500">{FINDINGS_HINT}</p>
        </div>

        <div className="space-y-3">
          {sorted.map((base) => {
            const ex = { ...base, ...overrides[base.id] }
            const active = ex.id === selectedId
            const isEditing = editingId === ex.id
            const isApproved = !!approved[ex.id]

            if (isEditing) {
              return (
                <div key={ex.id} className="card p-4 ring-2 ring-accent/40">
                  <div className="space-y-2.5">
                    <EditField label="Title">
                      <input
                        className={inputCls}
                        value={draft.title ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Severity">
                      <div className="flex gap-1.5">
                        {SEVERITIES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setDraft((d) => ({ ...d, severity: s }))}
                            className={`chip cursor-pointer border-line capitalize ${
                              draft.severity === s ? 'bg-navy-800 text-white border-navy-800' : 'bg-surface-muted text-ink-600'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </EditField>
                    <EditField label="Detail">
                      <textarea
                        rows={4}
                        className={`${inputCls} resize-y leading-relaxed`}
                        value={draft.detail ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Suggested next action">
                      <textarea
                        rows={2}
                        className={`${inputCls} resize-y leading-relaxed`}
                        value={draft.suggestion ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, suggestion: e.target.value }))}
                      />
                    </EditField>
                    <EditField label={ROUTE}>
                      <input
                        className={inputCls}
                        value={draft.routeTo ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, routeTo: e.target.value }))}
                      />
                    </EditField>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-line pt-3">
                    <button onClick={() => saveEdit(ex.id)} className="btn-accent">
                      <Check className="h-4 w-4" /> Save
                    </button>
                    <button onClick={cancelEdit} className="btn-ghost">
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={ex.id}
                id={`finding-${ex.id}`}
                className={`card w-full p-4 text-left transition-all ${
                  active ? 'ring-2 ring-accent/40' : 'card-hover'
                } ${isApproved ? 'opacity-70' : ''}`}
              >
                <button onClick={() => setSelectedId(ex.id)} className="block w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold leading-snug text-ink-900">{ex.title}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isApproved && (
                        <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">
                          <Check className="h-3 w-3" /> {APPROVED}
                        </span>
                      )}
                      <SeverityBadge severity={ex.severity} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{ex.detail}</p>
                  {ex.suggestion && (
                    <div className="mt-2 flex gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink-600">
                      <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span>
                        <span className="font-semibold text-ink-700">Suggested: </span>
                        {ex.suggestion}
                      </span>
                    </div>
                  )}
                  {ex.routeTo && (
                    <div className="mt-2 text-[11px] text-ink-500">
                      {ROUTE} <span className="font-semibold text-ink-700">{ex.routeTo}</span>
                    </div>
                  )}
                </button>
                <div className="mt-3 flex gap-2 border-t border-line pt-2.5">
                  <button
                    onClick={() => startEdit(ex)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-surface-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleApprove(ex.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      isApproved ? 'text-emerald-700 hover:bg-emerald-50' : 'text-ink-600 hover:bg-surface-muted'
                    }`}
                  >
                    {isApproved ? <RotateCcw className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                    {isApproved ? 'Reopen' : APPROVE}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {project.sections?.approveNote && (
          <p className="mt-3 text-xs leading-relaxed text-ink-500">{project.sections.approveNote}</p>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-line bg-surface-muted px-2.5 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-accent/50 focus:bg-surface'

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">{label}</span>
      {children}
    </label>
  )
}
