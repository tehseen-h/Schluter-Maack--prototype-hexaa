import { useEffect, useRef, useState } from 'react'
import content from './content'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Overview } from './pages/Overview'
import { Intake } from './pages/Intake'
import { Exceptions } from './pages/Exceptions'
import { ProcessFlow } from './pages/ProcessFlow'
import { TITLES, type PageId, type Navigate } from './lib/pages'
export type { PageId, Navigate }

/** Accept "#4F46E5" or "79 70 229" and return an "r g b" triple for --accent. */
function toRgbTriple(input: string): string {
  const hex = input.trim().replace('#', '')
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `${r} ${g} ${b}`
  }
  return input // already a triple like "79 70 229"
}

export default function App() {
  const [page, setPageState] = useState<PageId>('overview')
  // Which finding the Exceptions page should open on, when arriving from a row
  // on the Overview. Cleared on every other navigation so it never goes stale.
  const [focusFinding, setFocusFinding] = useState<string | undefined>()
  const setPage: Navigate = (p, findingId) => {
    setFocusFinding(p === 'exceptions' ? findingId : undefined)
    setPageState(p)
  }
  const [collapsed, setCollapsed] = useState(false)

  // <main> is the scroll container and it stays mounted across pages, so
  // without this you arrive on a new page at the previous page's scroll
  // position, with its first card cut off under the sticky header.
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [page, focusFinding])

  const { project, exceptions } = content

  // Apply an optional per-project accent override from the content pack.
  // project.accent may be "#4F46E5" or "79 70 229"; both are converted to a triple.
  const accentStyle = project.accent
    ? ({ ['--accent' as string]: toRgbTriple(project.accent) } as React.CSSProperties)
    : undefined

  return (
    <div className="flex h-screen overflow-hidden" style={accentStyle}>
      <Sidebar
        page={page}
        setPage={setPage}
        client={project.client}
        exceptionCount={exceptions.length}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={TITLES[page]} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
          {page === 'overview' && <Overview setPage={setPage} />}
          {page === 'intake' && <Intake setPage={setPage} />}
          {page === 'exceptions' && <Exceptions key={focusFinding ?? 'all'} initialId={focusFinding} />}
          {page === 'flow' && <ProcessFlow />}
        </main>
      </div>
    </div>
  )
}
