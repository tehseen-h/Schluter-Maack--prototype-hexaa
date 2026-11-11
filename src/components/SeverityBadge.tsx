import type { Severity } from '../lib/types'

const MAP: Record<Severity, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'text-sev-critical bg-red-50 border-red-200' },
  high: { label: 'High', cls: 'text-sev-high bg-orange-50 border-orange-200' },
  medium: { label: 'Medium', cls: 'text-sev-medium bg-amber-50 border-amber-200' },
  low: { label: 'Low', cls: 'text-sev-low bg-cyan-50 border-cyan-200' },
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = MAP[severity]
  return (
    <span className={`chip ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

export const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}
