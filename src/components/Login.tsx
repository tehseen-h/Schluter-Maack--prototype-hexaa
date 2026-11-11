import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Clock3 } from 'lucide-react'
import { BrandMark, HexaaWord } from './Brand'
import { daysLeft, formatDay, isExpired, unlock, type Access } from '../lib/access'

/**
 * The front door. White paper with a warm beige texture, one card, nothing
 * else competing for attention. Deliberately quieter than the app behind it:
 * its only jobs are to say what this is, who it is for, until when, and to
 * take the password.
 */

// Fine beige paper grain: fractal noise, tinted warm, tiled.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.63  0 0 0 0 0.53  0 0 0 0 0.38  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`

// A faint linen weave: hairlines both ways, too fine to read as a pattern,
// just enough that the ground looks like paper rather than a flat fill.
const WEAVE =
  'repeating-linear-gradient(0deg, rgba(150,120,80,0.035) 0 1px, transparent 1px 3px),' +
  'repeating-linear-gradient(90deg, rgba(150,120,80,0.03) 0 1px, transparent 1px 4px)'

const DT = 'shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a3937b]'

export function Login({ access, onUnlock }: { access: Access; onUnlock: () => void }) {
  const client = access.preparedFor
  const subtitle = access.about.replace(/[.\s]+$/, '')
  const expired = isExpired(access) && !import.meta.env.DEV
  const devPastExpiry = isExpired(access) && import.meta.env.DEV
  const left = daysLeft(access)

  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(0)
  const [caps, setCaps] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = `Private walkthrough · ${client}`
  }, [client])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !pw.trim()) {
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    setError(false)
    const ok = await unlock(access, pw)
    setBusy(false)
    if (ok) onUnlock()
    else {
      setError(true)
      setShake((n) => n + 1)
      inputRef.current?.select()
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-white px-4 py-10 sm:py-16">
      {/* ── paper ───────────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1100px 700px at 12% -8%, rgba(234,221,198,0.75), transparent 62%),' +
              'radial-gradient(900px 640px at 105% 108%, rgba(238,226,204,0.85), transparent 60%),' +
              'radial-gradient(700px 500px at 88% 4%, rgba(246,238,222,0.6), transparent 70%)',
          }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: WEAVE }} />
        <div className="absolute inset-0 opacity-[0.42] mix-blend-multiply" style={{ backgroundImage: GRAIN, backgroundSize: '240px 240px' }} />
        {/* a hair of vignette keeps the eye on the card */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(176,150,110,0.10))' }} />
      </div>

      <main className="relative w-full max-w-[460px] animate-[loginIn_.7s_cubic-bezier(.2,.7,.2,1)_both]">
        <div
          className="relative overflow-hidden rounded-[22px] border border-[#ebe2d2] bg-white/[0.94] backdrop-blur-[2px]"
          style={{
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 2px rgba(80,60,30,0.06), 0 12px 32px -12px rgba(80,60,30,0.18), 0 40px 80px -40px rgba(80,60,30,0.22)',
          }}
        >
          <div className="h-[3px] bg-gradient-to-r from-navy-800 via-navy-500 to-accent" />

          <div className="px-7 pb-7 pt-7 sm:px-10 sm:pb-9 sm:pt-9">
            {/* brand + status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark size={36} />
                <HexaaWord className="text-[19px]" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e9dfcc] bg-[#fbf7ef] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8a6d3b]">
                <Lock className="h-3 w-3" strokeWidth={2.5} />
                Private
              </span>
            </div>

            {/* what this is */}
            <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-ink">Interactive walkthrough</p>
            <h1 className="mt-2.5 font-display text-[34px] leading-[1.08] tracking-[-0.01em] text-navy-900 sm:text-[38px]">
              A private demo created for <span className="italic text-navy-700">{client}</span>
            </h1>
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">{subtitle}.</p>

            {/* the door */}
            {expired ? (
              <div className="mt-8 rounded-xl border border-[#eadfcb] bg-[#fbf7ef] px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#8a6d3b] ring-1 ring-[#eadfcb]">
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-navy-900">This walkthrough has closed</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      It was available until {formatDay(access.expiresOn)}. If you would like to see it again, ask your contact at hexaa
                      to reopen it.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8" noValidate>
                <label htmlFor="demo-password" className="text-[12px] font-semibold text-navy-900">
                  Access password
                </label>
                <div key={shake} className={`relative mt-2 ${shake ? 'animate-[loginShake_.42s_ease-in-out]' : ''}`}>
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b29a72]" />
                  <input
                    ref={inputRef}
                    id="demo-password"
                    type={show ? 'text' : 'password'}
                    autoFocus
                    autoComplete="current-password"
                    spellCheck={false}
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value)
                      if (error) setError(false)
                    }}
                    onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                    aria-invalid={error}
                    aria-describedby="pw-help"
                    placeholder="Enter your password"
                    className={`h-12 w-full rounded-xl border bg-white pl-10 pr-11 text-[14px] text-navy-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#b9ad98] ${
                      error
                        ? 'border-[#d9867a] shadow-[0_0_0_4px_rgba(217,134,122,0.14)]'
                        : 'border-[#e3d9c6] hover:border-[#d6c8ae] focus:border-accent focus:shadow-[0_0_0_4px_rgb(var(--accent)/0.16)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShow((s) => !s)
                      inputRef.current?.focus()
                    }}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#a8957a] transition-colors hover:bg-[#f6f0e5] hover:text-navy-800"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p id="pw-help" className={`mt-2 min-h-[18px] text-[12px] ${error ? 'text-[#b4533f]' : 'text-[#a3937b]'}`} role={error ? 'alert' : undefined}>
                  {error ? 'That password is not right. Check it and try again.' : caps ? 'Caps Lock is on.' : ''}
                </p>

                <button
                  type="submit"
                  disabled={busy}
                  className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 text-[14px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(19,35,61,0.7)] transition-all duration-200 hover:bg-navy-800 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking
                    </>
                  ) : (
                    <>
                      Open the walkthrough
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* who, by whom, until when: three columns, stacked rows on a phone */}
            <dl className="mt-8 grid grid-cols-1 divide-y divide-[#efe7d8] border-t border-[#efe7d8] sm:grid-cols-3 sm:divide-y-0 sm:pt-5">
              <div className="flex items-baseline justify-between gap-4 py-3 sm:block sm:py-0 sm:pr-3">
                <dt className={DT}>Prepared for</dt>
                <dd className="text-right text-[12.5px] font-semibold leading-snug text-navy-900 sm:mt-1.5 sm:text-left">{client}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3 sm:block sm:border-l sm:border-[#efe7d8] sm:px-3 sm:py-0">
                <dt className={DT}>Prepared by</dt>
                <dd className="text-[12.5px] leading-snug sm:mt-1.5">
                  <HexaaWord />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3 sm:block sm:border-l sm:border-[#efe7d8] sm:py-0 sm:pl-3">
                <dt className={DT}>Available till</dt>
                <dd className="text-right sm:mt-1.5 sm:text-left">
                  <span className="text-[12.5px] font-semibold leading-snug text-navy-900">{formatDay(access.expiresOn, 'short')}</span>
                  <span className={`ml-2 text-[11px] sm:ml-0 sm:mt-0.5 sm:block ${expired ? 'text-[#b4533f]' : 'text-[#a3937b]'}`}>
                    {expired ? 'Closed' : devPastExpiry ? 'Past date (dev only)' : left === 0 ? 'Last day' : left === 1 ? '1 day left' : `${left} days left`}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#a3937b]">
          Confidential. Prepared for discussion with {client} only.
          <br className="hidden sm:block" /> Figures are illustrative sample data.
        </p>
      </main>
    </div>
  )
}
