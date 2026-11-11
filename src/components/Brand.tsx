// Hexaa brand assets. The h. mark is the real logo (transparent PNG in /public).
// Replace /public/hexaa-mark.png to change it everywhere.

/**
 * The h. mark. The asset already carries its own rounded corners and its own
 * warm ground, so it needs no tile behind it, just a soft edge so it does not
 * look pasted onto the navy sidebar.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/hexaa-mark.png"
      alt="hexaa"
      className="shrink-0 rounded-[22%] shadow-sm ring-1 ring-black/5"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}

/** The "hexaa." wordmark: navy (or white on dark) with the amber dot. */
export function HexaaWord({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${onDark ? 'text-white' : 'text-navy-900'} ${className}`}>
      hexaa<span className="text-accent">.</span>
    </span>
  )
}

/** "Created by hexaa." credit line. */
export function CreatedByHexaa({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1 text-xs ${onDark ? 'text-slate-300' : 'text-ink-3'}`}>
      Created by <HexaaWord onDark={onDark} className="text-[13px]" />
    </span>
  )
}
