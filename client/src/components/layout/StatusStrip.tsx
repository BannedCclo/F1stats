import { useState, type ReactNode } from 'react'
import { StatusStripContext } from './statusStripContext'

interface StatusStripProviderProps {
  children: ReactNode
}

/**
 * The fixed bar that closes the pit-wall frame at the bottom of the viewport.
 * Functional, not decorative: whatever route is active registers its own
 * contextual line here (round + circuit + countdown on Home, record count on
 * a list, entity summary on a detail page) via useStatusStrip. Empty by
 * default so a route that has nothing to say just leaves the strip blank
 * rather than showing stale content from the previous page.
 */
export function StatusStripProvider({ children }: StatusStripProviderProps) {
  const [content, setContent] = useState<ReactNode>(null)

  return (
    <StatusStripContext.Provider value={{ setContent }}>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-9 max-w-[1600px] items-center gap-2 overflow-x-auto px-4 font-data text-xs uppercase tracking-wide text-dim sm:px-6">
          {content}
        </div>
      </div>
    </StatusStripContext.Provider>
  )
}
