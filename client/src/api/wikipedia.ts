import { useQuery } from '@tanstack/react-query'

/**
 * Driver headshots — the F1 API returns no images at all, only a
 * Wikipedia article URL per driver. Wikipedia's REST summary endpoint is
 * free, CORS-open (`Access-Control-Allow-Origin: *`), and usually has an
 * infobox photo for notable/current drivers. Historical or obscure
 * drivers often don't have one — callers must fall back to the monogram
 * when this returns null.
 */

export function extractWikipediaTitle(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('wikipedia.org')) return null
    const match = parsed.pathname.match(/\/wiki\/(.+)$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

interface WikipediaSummary {
  thumbnail?: { source: string; width: number; height: number }
}

async function fetchWikipediaThumbnail(title: string): Promise<string | null> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
  if (!res.ok) return null
  const summary: WikipediaSummary = await res.json()
  return summary.thumbnail?.source ?? null
}

export function useDriverPhoto(wikipediaUrl: string | null | undefined) {
  const title = extractWikipediaTitle(wikipediaUrl)
  return useQuery({
    queryKey: ['wikipedia-photo', title],
    queryFn: () => fetchWikipediaThumbnail(title!),
    enabled: !!title,
    staleTime: Infinity,
    retry: false,
  })
}
