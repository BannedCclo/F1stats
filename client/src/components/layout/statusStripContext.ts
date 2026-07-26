import { createContext, type ReactNode } from 'react'

export interface StatusStripContextValue {
  setContent: (content: ReactNode) => void
}

export const StatusStripContext = createContext<StatusStripContextValue | null>(null)
