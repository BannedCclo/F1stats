type SocialIconName = 'instagram' | 'email' | 'linkedin' | 'github'

interface SocialIconProps {
  name: SocialIconName
  className?: string
}

/**
 * Small line-icon glyphs for the footer's social links. Hand-drawn instead of
 * pulled from an icon font/CDN — this project has no icon library and no
 * external asset CDNs (see index.html), so a few inline paths keep it that
 * way rather than introducing one just for four footer links.
 */
export default function SocialIcon({ name, className }: SocialIconProps) {
  const shared = {
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  switch (name) {
    case 'instagram':
      return (
        <svg {...shared}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'email':
      return (
        <svg {...shared}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...shared}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
          <line x1="8" y1="11" x2="8" y2="17" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <path d="M12 13.5c0-1.5 1-2.5 2.5-2.5S17 12 17 13.5V17" />
        </svg>
      )
    case 'github':
      return (
        <svg {...shared}>
          <path d="m8 6-5 6 5 6" />
          <path d="m16 6 5 6-5 6" />
        </svg>
      )
  }
}
