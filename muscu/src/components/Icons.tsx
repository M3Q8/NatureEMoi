import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, strokeWidth = 2, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconDumbbell = (p: P) => <Svg {...p}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></Svg>
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Svg>
export const IconChart = (p: P) => <Svg {...p}><path d="M4 4v16h16" /><path d="M8 14l3.5-3.5 3 3L20 8" /></Svg>
export const IconSliders = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Svg>
)
export const IconPlus = (p: P) => <Svg strokeWidth={2.6} {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconMinus = (p: P) => <Svg strokeWidth={2.6} {...p}><path d="M5 12h14" /></Svg>
export const IconCheck = (p: P) => <Svg strokeWidth={2.6} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
export const IconUndo = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>
export const IconRepeat = (p: P) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
    <path d="M20 4v5h-5" />
    <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
    <path d="M4 20v-5h5" />
  </Svg>
)
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></Svg>
export const IconTrophy = (p: P) => (
  <Svg {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </Svg>
)
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Svg>
export const IconChevronRight = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M9 6l6 6-6 6" /></Svg>
export const IconChevronLeft = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M15 6l-6 6 6 6" /></Svg>
export const IconChevronDown = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M6 9l6 6 6-6" /></Svg>
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></Svg>
export const IconUpload = (p: P) => <Svg {...p}><path d="M12 15V4M7 9l5-5 5 5" /><path d="M5 20h14" /></Svg>
export const IconPlay = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
)
export const IconArrowUp = (p: P) => <Svg strokeWidth={2.8} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>
export const IconArrowDown = (p: P) => <Svg strokeWidth={2.8} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>
export const IconPencil = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Svg>
export const IconShield = (p: P) => <Svg {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /></Svg>
export const IconTimer = (p: P) => <Svg {...p}><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M12 2.5V6" /></Svg>
export const IconClose = (p: P) => <Svg strokeWidth={2.6} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const IconNote = (p: P) => <Svg {...p}><path d="M5 4h10l4 4v12H5z" /><path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" /></Svg>
export const IconPlates = (p: P) => <Svg {...p}><path d="M2.5 12h19" /><rect x="6" y="6" width="3" height="12" rx="1" /><rect x="15" y="6" width="3" height="12" rx="1" /></Svg>
export const IconTarget = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></Svg>
export const IconScale = (p: P) => <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8.5 9a5 5 0 0 1 7 0l-2 2.5" /></Svg>
export const IconArrowUpDown = (p: P) => <Svg {...p}><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" /></Svg>
