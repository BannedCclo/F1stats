/**
 * The API's `total` field reports the size of the current page, not the
 * dataset — never use it to compute page counts. The only reliable signal
 * for "last page" is getting back fewer items than requested. `limit` also
 * silently saturates at 100 server-side, so requesting more never helps.
 */
export const MAX_PAGE_LIMIT = 100
export const DEFAULT_PAGE_SIZE = 25

export function hasNextPage(itemsReturned: number, limit: number): boolean {
  return itemsReturned === limit
}

/** Sweeps every page of a paginated list endpoint into a single array. */
export async function fetchAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<T[]>,
  limit: number = MAX_PAGE_LIMIT,
): Promise<T[]> {
  const all: T[] = []
  let offset = 0

  while (true) {
    const page = await fetchPage(offset, limit)
    all.push(...page)
    if (!hasNextPage(page.length, limit)) break
    offset += limit
  }

  return all
}
