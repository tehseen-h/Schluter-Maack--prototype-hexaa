import { useEffect, useRef, type ReactNode } from 'react'
import { Camera, Database, FileText } from 'lucide-react'
import { FORMAT_LABEL, type DocRender, type SourceDoc } from '../lib/types'

/** A highlightable value. Gets a stable id so the viewer can scroll to it. */
function HL({
  k,
  active,
  mono,
  children,
}: {
  k?: string
  active?: boolean
  mono?: boolean
  children: ReactNode
}) {
  return (
    <span
      id={k ? `fld-${k}` : undefined}
      className={`hl px-0.5 ${mono ? 'mono' : ''} ${active ? 'hl-active' : ''}`}
    >
      {children}
    </span>
  )
}

/**
 * Renders a source document as a faithful, styled "paper". Any field can be
 * highlighted by passing its `activeKey`, used by the Exceptions page to link
 * a finding to the exact spot it came from.
 *
 * Four looks, one data shape:
 *   paper   a clean PDF page
 *   photo   the same page, as a phone photo of it (tilted, shadowed, captioned)
 *   system  a record read from the client's own system, not a paper at all
 *   image   a real scan with highlight boxes (normalized coordinates)
 */
export function DocViewer({ doc, activeKey }: { doc: SourceDoc; activeKey?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeKey) return
    const pane = scrollRef.current
    const el = document.getElementById(`fld-${activeKey}`)
    if (!pane || !el) return
    // Scroll the DOCUMENT PANE only. `el.scrollIntoView()` walks every
    // scrollable ancestor, so on mount it also scrolled the whole page and
    // pushed the first finding up underneath the sticky header. Measured from
    // bounding boxes rather than offsetTop, because the photo look wraps the
    // paper in a positioned, rotated frame and offsetTop then counts from it.
    const t = setTimeout(() => {
      const paneBox = pane.getBoundingClientRect()
      const elBox = el.getBoundingClientRect()
      const top = elBox.top - paneBox.top + pane.scrollTop - pane.clientHeight / 2 + elBox.height / 2
      pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }, 60)
    return () => clearTimeout(t)
  }, [activeKey, doc.id])

  const r = doc.render
  const HeaderIcon = doc.system ? Database : doc.photo ? Camera : FileText

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-4 py-2.5">
        <HeaderIcon className="h-4 w-4 shrink-0 text-ink-500" />
        <span className="truncate text-sm font-medium text-ink-800">{doc.name}</span>
        <span className="chip shrink-0 border-line bg-surface text-ink-500">{doc.formatLabel ?? FORMAT_LABEL[doc.format]}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto bg-surface-sunken p-5">
        {doc.image ? (
          /* IMAGE MODE, real scan/image with overlay highlight boxes */
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-lg border border-line bg-white shadow-card">
            <img src={doc.image.src} alt={doc.name} className="block w-full" />
            {doc.image.boxes?.map((b) => (
              <div
                key={b.fieldKey}
                className={`hl absolute ${b.fieldKey === activeKey ? 'hl-active' : ''}`}
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  width: `${b.w * 100}%`,
                  height: `${b.h * 100}%`,
                }}
              />
            ))}
          </div>
        ) : r && doc.system ? (
          <SystemScreen doc={doc} r={r} activeKey={activeKey} />
        ) : r && doc.photo ? (
          <PhotoFrame caption={doc.photo.caption} tilt={doc.photo.tilt}>
            <Paper r={r} activeKey={activeKey} photo />
          </PhotoFrame>
        ) : r ? (
          <Paper r={r} activeKey={activeKey} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            No preview available for this document.
          </div>
        )}
      </div>
    </div>
  )
}

/** A clean page: heading, meta, sections, table, footer. */
function Paper({ r, activeKey, photo }: { r: DocRender; activeKey?: string; photo?: boolean }) {
  return (
    <div
      className={`mx-auto max-w-2xl rounded-lg border p-7 ${
        photo ? 'border-[#e6e0d2] bg-[#fdfcf8]' : 'border-line bg-white shadow-card'
      }`}
    >
      <div className="flex items-start justify-between gap-6 border-b border-line pb-4">
        <div>
          <div className="text-lg font-bold tracking-tight text-ink-900">{r.heading}</div>
          {r.subheading && <div className="section-eyebrow mt-1">{r.subheading}</div>}
        </div>
        {r.meta && (
          <div className="shrink-0 space-y-1 text-right">
            {r.meta.map((m) => (
              <div key={m.label} className="text-xs">
                <span className="text-ink-500">{m.label}: </span>
                <HL k={m.key} active={!!m.key && m.key === activeKey} mono={m.mono}>
                  {m.value}
                </HL>
              </div>
            ))}
          </div>
        )}
      </div>

      {r.sections?.map((sec, i) => (
        <div key={i} className="mt-4">
          {sec.title && <div className="section-eyebrow mb-2">{sec.title}</div>}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {sec.fields.map((f) => (
              <div key={f.key} className="text-sm">
                <div className="text-xs text-ink-500">{f.label}</div>
                <div className="text-ink-900">
                  <HL k={f.key} active={f.key === activeKey} mono={f.mono}>
                    {f.value}
                  </HL>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {r.table && <DocTable r={r} activeKey={activeKey} />}

      {r.footer && (
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-sm space-y-1.5">
            {r.footer.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink-500">{f.label}</span>
                <HL k={f.key} active={!!f.key && f.key === activeKey} mono={f.mono}>
                  {f.value}
                </HL>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * A cell that reads as a figure: an amount, a quantity, a rate, a code of
 * digits. Only those get the monospaced face and right alignment, so a
 * description or a label in a mono row stays in the normal face, left aligned.
 */
const isFigure = (cell: string) => /^[\s(£$€-]*[\d][\d,.\s]*[%)]?\s*$/.test(cell)
/** A short code with digits in it (a part number, a reference): mono, not right-aligned. */
const isCode = (cell: string) => /^[A-Za-z0-9][A-Za-z0-9\-/.]{1,15}$/.test(cell) && /\d/.test(cell)

function DocTable({ r, activeKey }: { r: DocRender; activeKey?: string }) {
  if (!r.table) return null
  // a column whose every filled cell is a figure gets a right-aligned heading
  const figureCol = r.table.columns.map((_, ci) => {
    const cells = r.table!.rows.filter((x) => x.mono).map((x) => x.cells[ci]).filter((c) => c && c.trim())
    return cells.length > 0 && cells.every(isFigure)
  })
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="bg-surface-muted text-left text-xs text-ink-500">
            {r.table.columns.map((c, ci) => (
              <th key={c || ci} className={`px-2.5 py-2 font-semibold ${figureCol[ci] ? 'whitespace-nowrap text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.table.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-line">
              {row.cells.map((cell, ci) => {
                const key = row.keys?.[ci] ?? undefined
                return (
                  <td
                    key={ci}
                    className={`px-2.5 py-2 ${row.mono && isFigure(cell) ? 'mono whitespace-nowrap text-right' : row.mono && isCode(cell) ? 'mono whitespace-nowrap' : ''}`}
                  >
                    <HL k={key || undefined} active={!!key && key === activeKey}>
                      {cell}
                    </HL>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * A phone photo of a page: the page sits slightly askew on a desk, with a
 * soft glare across it and a strip saying where the photo came from. The page
 * inside is the same rendered paper, so every highlight still lands.
 */
function PhotoFrame({ caption, tilt = -1.1, children }: { caption: string; tilt?: number; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-600">
        <Camera className="h-3.5 w-3.5 shrink-0 text-accent-ink" />
        <span>{caption}</span>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-[#d9d2c4] via-[#cfc7b8] to-[#c4bcab] px-5 py-6">
        <div
          className="relative"
          style={{
            transform: `rotate(${tilt}deg)`,
            boxShadow: '0 18px 30px -12px rgba(40,30,15,.45), 0 4px 10px rgba(40,30,15,.18)',
            borderRadius: 8,
          }}
        >
          {children}
          {/* glare: a soft diagonal sheen, never over the text strongly enough to hide it */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg"
            style={{
              background:
                'linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,.38) 50%, rgba(255,255,255,0) 62%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * A record read from the client's own system. Deliberately a plain card of the
 * values, not an imitation of their screen: they know what their system looks
 * like, and a made-up one invites "that is not ours".
 */
function SystemScreen({ doc, r, activeKey }: { doc: SourceDoc; r: DocRender; activeKey?: string }) {
  const sys = doc.system!
  const Field = ({ label, value, k, mono }: { label: string; value: string; k?: string; mono?: boolean }) => (
    <div className="rounded-md border border-line bg-surface-muted/60 px-2.5 py-1.5">
      <div className="text-[10.5px] text-ink-500">{label}</div>
      <div className="text-sm text-ink-900">
        <HL k={k} active={!!k && k === activeKey} mono={mono}>
          {value}
        </HL>
      </div>
    </div>
  )
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-ink-600">
          <Database className="h-3.5 w-3.5 shrink-0 text-navy-600" />
          <span className="truncate">{sys.source}</span>
        </div>
        {sys.status && (
          <span className="chip shrink-0 border-navy-500/20 bg-navy-500/5 py-0.5 text-navy-700">{sys.status}</span>
        )}
      </div>

      <div className="p-5 pt-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-base font-bold tracking-tight text-ink-900">{r.heading}</div>
            {r.subheading && <div className="mt-0.5 text-xs text-ink-500">{r.subheading}</div>}
          </div>
          {r.meta && (
            <div className="shrink-0 space-y-1 text-right">
              {r.meta.map((m) => (
                <div key={m.label} className="text-xs">
                  <span className="text-ink-500">{m.label}: </span>
                  <HL k={m.key} active={!!m.key && m.key === activeKey} mono={m.mono}>
                    {m.value}
                  </HL>
                </div>
              ))}
            </div>
          )}
        </div>

        {r.sections?.map((sec, i) => (
          <div key={i} className="mt-4">
            {sec.title && <div className="section-eyebrow mb-2">{sec.title}</div>}
            <div className="grid grid-cols-2 gap-2">
              {sec.fields.map((f) => (
                <Field key={f.key} label={f.label} value={f.value} k={f.key} mono={f.mono} />
              ))}
            </div>
          </div>
        ))}

        {r.table && <DocTable r={r} activeKey={activeKey} />}

        {r.footer && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {r.footer.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} k={f.key} mono={f.mono} />
            ))}
          </div>
        )}

        {sys.note && <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-500">{sys.note}</p>}
      </div>
    </div>
  )
}
