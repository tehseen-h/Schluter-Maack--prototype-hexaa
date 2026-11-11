import type { ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ------------------------------- Button ---------------------------------- */
type Variant = 'default' | 'primary' | 'quiet' | 'danger'

export function Button({
  children,
  onClick,
  title,
  size = 'md',
  variant = 'default',
  active = false,
}: {
  children: ReactNode
  onClick?: () => void
  title?: string
  size?: 'sm' | 'md'
  variant?: Variant
  active?: boolean
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors duration-150'
  const sz = size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-3 py-2 text-sm'
  const styles: Record<Variant, string> = {
    default: cx(
      'border border-line bg-surface text-ink hover:bg-surface-2',
      active && 'bg-surface-2 border-line-strong',
    ),
    quiet: 'text-ink-2 hover:bg-surface-2',
    primary: 'bg-navy-800 text-white hover:bg-navy-700',
    danger: 'border border-high/30 bg-high-soft text-high hover:bg-high/10',
  }
  return (
    <button type="button" onClick={onClick} title={title} className={cx(base, sz, styles[variant])}>
      {children}
    </button>
  )
}

/* -------------------------------- Badge ---------------------------------- */
type Tone = 'neutral' | 'navy' | 'theirs' | 'human' | 'medium' | 'accent'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: 'border-line bg-surface-2 text-ink-2',
    navy: 'border-navy-800/25 bg-navy-800/10 text-navy-800',
    theirs: 'border-theirs/30 bg-theirs-soft text-theirs',
    human: 'border-human/30 bg-human-soft text-human',
    medium: 'border-medium/35 bg-medium-soft text-medium',
    accent: 'border-accent/35 bg-accent-soft text-accent-ink',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/* --------------------------------- Note ---------------------------------- */
export function Note({ children, tone = 'boundary' }: { children: ReactNode; tone?: 'boundary' }) {
  void tone
  return (
    <div className="rounded-lg border border-medium/40 bg-medium-soft p-3 text-[11px] leading-relaxed text-medium">
      {children}
    </div>
  )
}
