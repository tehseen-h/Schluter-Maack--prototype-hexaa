import { PanelLeft } from 'lucide-react'
import { SampleBadge } from './SampleBadge'

export function TopBar({ title, onToggleSidebar }: { title: string; onToggleSidebar: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/85 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title="Toggle sidebar"
          className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <PanelLeft className="h-[18px] w-[18px]" />
        </button>
        <h1 className="text-sm font-semibold text-ink-800">{title}</h1>
      </div>
      <SampleBadge />
    </header>
  )
}
