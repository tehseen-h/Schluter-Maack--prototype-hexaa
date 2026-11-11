import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/** Secondary / less-important content the client can open only if they want. */
export function Collapsible({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string
  count?: number
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-ink-700 transition-colors hover:text-ink-900"
      >
        <span className="flex items-center gap-2">
          {title}
          {count != null && <span className="text-ink-500">({count})</span>}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="fade-in pb-1">{children}</div>}
    </div>
  )
}
