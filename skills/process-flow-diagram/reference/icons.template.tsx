/** Plain inline-SVG icons, zero dependencies (from the process-flow skill). */
interface P {
  className?: string
  size?: number
}

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconChevronRight = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
export const IconClose = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconDownload = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v11" />
    <path d="m7.5 10 4.5 4 4.5-4" />
    <path d="M4.5 20h15" />
  </svg>
)
export const IconReset = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5V10h5.5" />
  </svg>
)
export const IconImage = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m3.5 17.5 5-5 4.5 4.5 3-3 4.5 4.5" />
  </svg>
)
export const IconFile = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
  </svg>
)
export const IconPlus = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconTrash = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)
export const IconNote = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 4h16v11l-5 5H4Z" />
    <path d="M20 15h-5v5" />
  </svg>
)
export const IconMenu = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="5" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="12" cy="19" r="1.4" />
  </svg>
)
export const IconCollapse = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 4.5 4.5 9M4.5 4.5h4.5v4.5" />
    <path d="M15 19.5 19.5 15M19.5 19.5H15V15" />
  </svg>
)
export const IconExpand = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 9.5V4.5H9.5" />
    <path d="M19.5 14.5v5h-5" />
    <path d="M4.5 4.5 10 10M19.5 19.5 14 14" />
  </svg>
)
export const IconInfo = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.7h.01" />
  </svg>
)
export const IconLock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
)
