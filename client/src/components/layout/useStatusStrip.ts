import { useContext, useEffect, type ReactNode } from 'react'
import { StatusStripContext } from './statusStripContext'

/** Registers this route's contextual line in the fixed status strip; clears it on unmount. */
export function useStatusStrip(content: ReactNode) {
  const ctx = useContext(StatusStripContext)

  useEffect(() => {
    ctx?.setContent(content)
    return () => ctx?.setContent(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])
}
