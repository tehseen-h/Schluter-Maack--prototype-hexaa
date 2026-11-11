import { ChevronRight, CircleAlert, CircleCheck, Hand, Stamp } from 'lucide-react'
import type { LoadCell, LoadsTable, Settlement } from '../lib/types'

// Two optional sections of the content pack, drawn once and used twice: on the
// Overview (complete), and on the Intake page while a case runs (`reveal` is a count of
// typing steps, so values appear the way a person would key them in).

/** Steps one row, or one settlement line, takes to appear in the live run. */
export const ROW_STEPS = 9
export const LINE_STEPS = 9
export const loadsSteps = (t: LoadsTable) => t.rows.length * ROW_STEPS + 4
export const settlementSteps = (s: Settlement) => s.lines.length * LINE_STEPS + 6

const cellOf = (c: string | LoadCell): LoadCell => (typeof c === 'string' ? { value: c } : c)

/** Part of a string, by fraction, with whether it is still being typed. */
function typed(text: string, frac: number): { text: string; typing: boolean } {
  if (frac >= 1) return { text, typing: false }
  if (frac <= 0) return { text: '', typing: false }
  return { text: text.slice(0, Math.max(1, Math.round(text.length * frac))), typing: true }
}
const clamp = (x: number) => Math.max(0, Math.min(1, x))

/** Keys the Enter and Space presses the way a button does. */
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

// ── The loads, one row each, checked against the limit ───────────────────────
export function LoadsView({
  table,
  reveal,
  onOpen,
}: {
  table: LoadsTable
  reveal?: number
  onOpen?: (exceptionId: string) => void
}) {
  const n = table.columns.length
  const fig = new Set(table.figureCols ?? [])
  const live = reveal != null
  const footerShown = !live || reveal! >= table.rows.length * ROW_STEPS + 1

  return (
    <div>
      {/* The limit everything below is checked against. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {table.limits.map((k) => (
          <div key={k.label} className="min-w-0 rounded-lg border border-line bg-surface-muted px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{k.label}</div>
            <div className={`mt-0.5 text-[13px] font-semibold leading-snug text-ink-900 ${k.mono ? 'mono' : ''}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[800px] text-[13px]">
          <thead>
            <tr className="bg-surface-muted text-left text-[11px] text-ink-500">
              {table.columns.map((c, i) => (
                <th key={c} className={`whitespace-nowrap px-2 py-2 font-semibold ${fig.has(i) ? 'text-right' : ''}`}>
                  {c}
                </th>
              ))}
              <th className="whitespace-nowrap px-2 py-2 font-semibold">Check</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => {
              const t = live ? reveal! - ri * ROW_STEPS : ROW_STEPS
              if (t <= 0) {
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td colSpan={n + 1} className="px-3 py-2.5">
                      <span className="inline-block h-3 w-24 rounded bg-surface-sunken/80" />
                    </td>
                  </tr>
                )
              }
              const go = row.exceptionId && onOpen ? () => onOpen(row.exceptionId!) : undefined
              const flagged = row.status.tone === 'flag'
              const done = t >= ROW_STEPS - 1
              return (
                <tr
                  key={row.id}
                  {...(go ? openable(go) : {})}
                  className={`border-t border-line ${go ? 'cursor-pointer transition-colors hover:bg-accent-soft/40' : ''}`}
                >
                  {row.cells.map((raw, ci) => {
                    const c = cellOf(raw)
                    const frac = live ? clamp((t - (ci * (ROW_STEPS - 3)) / n) / 1.6) : 1
                    const v = typed(c.value, frac)
                    return (
                      <td key={ci} className={`px-2 py-2 align-top ${fig.has(ci) ? 'text-right' : ''}`}>
                        {frac > 0 && (
                          <span
                            className={`inline-block whitespace-nowrap ${fig.has(ci) || ci === 0 ? 'mono' : ''} ${
                              c.off && frac >= 1
                                ? 'rounded bg-red-50 px-1 py-0.5 font-semibold text-sev-critical ring-1 ring-red-200'
                                : ci === 0
                                  ? 'font-medium text-ink-900'
                                  : 'text-ink-900'
                            } ${v.typing ? 'typing-caret' : ''}`}
                          >
                            {v.text}
                          </span>
                        )}
                        {c.note && frac >= 1 && (
                          <div className={`mt-0.5 text-[11px] leading-snug ${c.off ? 'text-sev-critical' : 'text-ink-500'}`}>{c.note}</div>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 align-top">
                    {done && (
                      <span
                        className={`chip fade-in py-0.5 text-left leading-tight ${
                          flagged ? 'border-orange-200 bg-orange-50 text-sev-high' : 'border-ok/30 bg-ok-soft text-ok'
                        }`}
                      >
                        {flagged ? <CircleAlert className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
                        {row.status.label}
                        {go && flagged && <ChevronRight className="-mr-1 h-3 w-3" />}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {table.footer && footerShown && (
              <tr className="fade-in border-t-2 border-line-strong bg-surface-muted/60">
                {table.footer.map((raw, ci) => {
                  const c = cellOf(raw)
                  return (
                    <td key={ci} className={`px-2 py-2 align-top ${fig.has(ci) ? 'text-right' : ''}`}>
                      <span
                        className={`inline-block whitespace-nowrap text-[12.5px] font-semibold ${fig.has(ci) ? 'mono' : ''} ${
                          c.off ? 'rounded bg-red-50 px-1 py-0.5 text-sev-critical ring-1 ring-red-200' : 'text-ink-800'
                        }`}
                      >
                        {c.value}
                      </span>
                      {c.note && <div className="mt-0.5 text-[11px] font-normal text-ink-500">{c.note}</div>}
                    </td>
                  )
                })}
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── The sum, worked out line by line ─────────────────────────────────────────
export function SettlementView({
  s,
  reveal,
  onOpen,
}: {
  s: Settlement
  reveal?: number
  onOpen?: (exceptionId: string) => void
}) {
  const live = reveal != null
  const totalsShown = !live || reveal! >= s.lines.length * LINE_STEPS + 1

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_130px_96px] gap-3 bg-surface-muted px-3 py-2 text-[11px] font-semibold text-ink-500 md:grid">
          <span>Line</span>
          <span>How it was worked out</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        {s.lines.map((ln, i) => {
          const t = live ? reveal! - i * LINE_STEPS : LINE_STEPS
          if (t <= 0) {
            return (
              <div key={ln.id} className="border-t border-line px-3 py-2.5">
                <span className="inline-block h-3 w-24 rounded bg-surface-sunken/80" />
              </div>
            )
          }
          const held = ln.state === 'held'
          const ref = typed(ln.ref, live ? clamp(t / 1.5) : 1)
          const what = typed(ln.what, live ? clamp((t - 1) / 2.5) : 1)
          const working = typed(ln.working, live ? clamp((t - 3) / 2.5) : 1)
          const amt = typed(ln.amount, live ? clamp((t - 5.5) / 2) : 1)
          const done = t >= LINE_STEPS - 1
          const go = ln.exceptionId && onOpen ? () => onOpen(ln.exceptionId!) : undefined
          return (
            <div
              key={ln.id}
              {...(go ? openable(go) : {})}
              className={`border-t border-line px-3 py-2.5 ${held ? 'bg-amber-50/60' : ''} ${
                go ? 'cursor-pointer transition-colors hover:bg-accent-soft/40' : ''
              }`}
            >
              <div className="grid grid-cols-1 items-start gap-x-3 gap-y-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_130px_96px]">
                <div className="min-w-0">
                  <div className={`mono text-[12px] font-medium text-ink-900 ${ref.typing ? 'typing-caret' : ''}`}>{ref.text}</div>
                  <div className={`text-[13px] leading-snug text-ink-700 ${what.typing ? 'typing-caret' : ''}`}>{what.text}</div>
                </div>
                <div className={`mono text-[12.5px] leading-snug text-ink-600 ${working.typing ? 'typing-caret' : ''}`}>{working.text}</div>
                <div className={`mono whitespace-nowrap text-[13.5px] font-semibold text-ink-900 md:text-right ${amt.typing ? 'typing-caret' : ''}`}>
                  {amt.text}
                </div>
                <div className="md:text-right">
                  {done && (
                    <span
                      className={`chip fade-in whitespace-nowrap py-0.5 ${
                        held ? 'border-orange-200 bg-orange-50 text-sev-high' : 'border-ok/30 bg-ok-soft text-ok'
                      }`}
                    >
                      {held ? <Hand className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
                      {held ? 'Held' : 'Ready'}
                    </span>
                  )}
                </div>
              </div>
              {held && ln.why && t >= LINE_STEPS - 1 && (
                <div className="fade-in mt-1 text-[12px] leading-snug text-sev-high">{ln.why}</div>
              )}
            </div>
          )
        })}

        {totalsShown && (
          <div className="fade-in border-t-2 border-line-strong bg-surface-muted/60 px-3 py-3">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                {s.totals.map((tt) => (
                  <div key={tt.label}>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">{tt.label}</div>
                    <div
                      className={`mono mt-0.5 text-[16px] font-semibold ${
                        tt.tone === 'ok' ? 'text-ok' : tt.tone === 'hold' ? 'text-sev-high' : 'text-ink-900'
                      }`}
                    >
                      {tt.value}
                    </div>
                  </div>
                ))}
              </div>
              <span className="chip border-navy-500/25 bg-surface text-navy-700">
                <Stamp className="h-3.5 w-3.5" />
                {s.stamp}
              </span>
            </div>
            {s.note && <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{s.note}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
