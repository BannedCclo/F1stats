import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'f1stats-query-cache',
})

/**
 * Bump this whenever a fix changes what a `staleTime: Infinity` query
 * returns (e.g. the driver dedup/alias fixes). Persisted caches are keyed
 * to this string — changing it discards every returning visitor's stale
 * cache in one shot, instead of silently serving pre-fix data forever.
 */
export const CACHE_BUSTER = 'v2-driver-dedup'

/** Years before the current season are immutable — cache them forever. */
export function staleTimeForYear(year: number): number {
  const currentYear = new Date().getFullYear()
  return year < currentYear ? Infinity : 5 * 60 * 1000
}
