import { LayoutGrid, Inbox, AlertTriangle, Workflow, ChevronsLeft, Lock } from 'lucide-react'
import { BrandMark, HexaaWord } from './Brand'
import { TITLES, type PageId } from '../lib/pages'
import { access } from '../content/access'
import { lock } from '../lib/access'

const ITEMS: { id: PageId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: TITLES.overview, icon: LayoutGrid },
  { id: 'intake', label: TITLES.intake, icon: Inbox },
  { id: 'exceptions', label: TITLES.exceptions, icon: AlertTriangle },
  { id: 'flow', label: TITLES.flow, icon: Workflow },
]

export function Sidebar({
  page,
  setPage,
  client,
  exceptionCount,
  collapsed,
  onToggle,
}: {
  page: PageId
  setPage: (p: PageId) => void
  client: string
  exceptionCount: number
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside
      className={[
        'flex shrink-0 flex-col bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 text-slate-300 transition-[width] duration-300 ease-smooth',
        collapsed ? 'w-[72px]' : 'w-[256px]',
      ].join(' ')}
    >
      {/* Brand header — mark + client name + "Created by hexaa" */}
      <div className={`flex items-start gap-3 px-4 py-4 ${collapsed ? 'justify-center px-0' : ''}`}>
        <BrandMark size={collapsed ? 38 : 40} />
        {!collapsed && (
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="line-clamp-2 text-[15px] font-bold leading-tight text-white">{client}</div>
            <div className="mt-0.5 text-[11.5px] text-slate-400">
              Created by <HexaaWord onDark className="text-[12px]" />
            </div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={`flex-1 space-y-1 py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        {ITEMS.map((it) => {
          const Icon = it.icon
          const active = page === it.id
          return (
            <button
              key={it.id}
              onClick={() => setPage(it.id)}
              title={collapsed ? it.label : undefined}
              className={[
                'group flex w-full items-center rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-on-accent' : 'text-slate-400 group-hover:text-white'}`} />
              {!collapsed && <span className="flex-1 text-left">{it.label}</span>}
              {!collapsed && it.id === 'exceptions' && exceptionCount > 0 && (
                <span
                  className={`num rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-on-accent/15 text-on-accent' : 'bg-white/15 text-slate-100'
                  }`}
                >
                  {exceptionCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Mock-up for
          </div>
          <div className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-slate-200">{client}</div>
          {/* Back to the login page and forget this browser, e.g. on a shared screen. */}
          <button
            type="button"
            onClick={() => {
              lock(access)
              window.location.reload()
            }}
            title="Lock the demo on this browser"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 -ml-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
          >
            <Lock className="h-3 w-3" /> Lock demo
          </button>
        </div>
      )}
    </aside>
  )
}
