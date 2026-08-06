import type { CSSProperties, ReactNode } from 'react'
import Signature from './Signature'
import SocialIcon from './SocialIcon'

interface FooterProps {
  /** Logo/brand mark shown at the top. Each site supplies its own. */
  logo: ReactNode
  /** Footer background. Defaults to the theme's panel surface (flips with light/dark). */
  backgroundColor?: string
  /** Footer text color. Defaults to the theme's readout tone (flips with light/dark). */
  textColor?: string
  /** Entire left half. Free for the site — the footer doesn't style it. */
  children: ReactNode
}

interface ContactLink {
  icon: 'instagram' | 'email' | 'linkedin' | 'github'
  label: string
  href: string
  text: string
}

const contactLinks: ContactLink[] = [
  {
    icon: 'instagram',
    label: 'Instagram:',
    href: 'https://www.instagram.com/not_cecelo/',
    text: '@not_cecelo',
  },
  {
    icon: 'email',
    label: 'Email:',
    href: 'https://mail.google.com/mail/u/0/?fs=1&tf=cm&source=mailto&to=marcelosg909@gmail.com',
    text: 'marcelosg909@gmail.com',
  },
  {
    icon: 'linkedin',
    label: 'LinkedIn:',
    href: 'https://www.linkedin.com/in/marcelo-santos-34aa98264/',
    text: 'Marcelo Guimarães',
  },
  {
    icon: 'github',
    label: 'GitHub:',
    href: 'https://github.com/BannedCclo',
    text: 'BannedCclo',
  },
]

/**
 * Shared footer, same design used across every site: split in half, the
 * left side is whatever the site wants (see `children`), the right side is
 * always this same signature + social block. Background/text default to
 * this project's theme tokens so it flips with the light/dark toggle like
 * the rest of the page — pass the props to override on other sites.
 */
export default function Footer({ logo, backgroundColor, textColor, children }: FooterProps) {
  const style: CSSProperties = {
    backgroundColor: backgroundColor ?? 'var(--color-panel)',
    color: textColor ?? 'var(--color-readout)',
  }

  return (
    <footer style={style} className="border-t border-hairline pt-12 pb-12">
      <div className="mx-auto flex max-w-[1600px] justify-center px-4 sm:px-6">{logo}</div>

      <div className="mx-auto mt-12 flex max-w-[1600px] flex-wrap justify-center gap-x-8 gap-y-10 px-4 sm:px-6">
        <div className="flex min-w-[260px] flex-1 basis-[260px] flex-col items-center border-b border-hairline pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-8">
          {children}
        </div>

        <div className="flex min-w-[260px] flex-1 basis-[260px] flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-data text-xs text-dim">Designed and developed by Marcelo Guimarães</p>
            <Signature className="w-40 text-readout sm:w-56" />
          </div>

          <ul className="mx-auto grid w-fit grid-cols-[auto_auto] gap-x-3 gap-y-2 font-data text-xs">
            {contactLinks.map(({ icon, label, href, text }) => (
              <li key={href} className="contents">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-dim">
                  <SocialIcon name={icon} className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" />
                  <span className="hidden md:inline">{label} </span>
                </span>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-left hover:text-accent md:text-right"
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
