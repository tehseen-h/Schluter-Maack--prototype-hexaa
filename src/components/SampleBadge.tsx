import { FlaskConical } from 'lucide-react'

/** Persistent, quiet reminder that the data is illustrative, never real records. */
export function SampleBadge() {
  return (
    <span className="chip border-assume/30 bg-assume-soft text-assume">
      <FlaskConical className="h-3.5 w-3.5" />
      Sample data · for demonstration
    </span>
  )
}
