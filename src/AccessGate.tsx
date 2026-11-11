import { Suspense, lazy, useEffect, useState } from 'react'
import { access } from './content/access'
import { expiryMoment, hasSession, isExpired, lock } from './lib/access'
import { Login } from './components/Login'

// The demo itself is a separate chunk, fetched only once the door is open, so
// the login page never downloads the client's content. The login page needs
// only access.ts, which carries its own copy of the client name and summary.
const App = lazy(() => import('./App'))

type State = 'checking' | 'locked' | 'open'

export function AccessGate() {
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    let live = true
    hasSession(access).then((ok) => live && setState(ok ? 'open' : 'locked'))
    return () => {
      live = false
    }
  }, [])

  // A tab left open past the last day closes itself at the end of that day.
  useEffect(() => {
    if (state !== 'open' || import.meta.env.DEV) return
    const ms = expiryMoment(access).getTime() - Date.now()
    if (ms <= 0 || ms > 2 ** 31 - 1) return
    const t = window.setTimeout(() => {
      lock(access)
      setState('locked')
    }, ms + 1000)
    return () => window.clearTimeout(t)
  }, [state])

  if (state === 'checking') return <div className="min-h-full bg-white" />
  if (state === 'locked' || (isExpired(access) && !import.meta.env.DEV))
    return <Login access={access} onUnlock={() => setState('open')} />

  return (
    <Suspense fallback={<div className="min-h-full bg-bg" />}>
      <App />
    </Suspense>
  )
}

/** Forget this browser and go back to the login page (used by the sidebar). */
export function lockDemo() {
  lock(access)
  window.location.reload()
}
