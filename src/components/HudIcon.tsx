/**
 * Inline SVG HUD icons. The design system forbids emoji/dingbat glyphs as
 * structural iconography — they render inconsistently across platforms and
 * read as decoration instead of instrumentation.
 */
export type HudIconName =
  | 'search'
  | 'telemetry'
  | 'radar'
  | 'status'
  | 'close'
  | 'center'
  | 'check'
  | 'download'

export default function HudIcon({ name }: { name: HudIconName }) {
  const common = {
    className: 'hud-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      )
    case 'telemetry':
      return (
        <svg {...common}>
          <path d="M2 12h4l2.5-7 4 14 2.5-7h7" />
        </svg>
      )
    case 'radar':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
          <path d="M12 12 19.5 4.5" />
        </svg>
      )
    case 'status':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      )
    case 'close':
      return (
        <svg {...common}>
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      )
    case 'center':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="M4 12.5 9.5 18 20 6.5" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3v11" />
          <path d="m7 9.5 5 5 5-5" />
          <path d="M4 19.5h16" />
        </svg>
      )
  }
}
