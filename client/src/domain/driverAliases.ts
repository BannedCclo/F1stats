/**
 * The API's own driver archive has duplicate entries for the same real
 * person under two different driverIds — confirmed by cross-referencing
 * every season's drivers-championship standings: for each pair below, one
 * ID never appears in any season's results (an orphaned duplicate) while
 * the other is the one actually used. Found via: shared Wikipedia URL
 * (Barrichello/Barrichelo, Zhou/Guanyu, Magnussen), and matching birthday
 * with a near-identical surname (de la Rosa).
 *
 * Maps the orphaned duplicate -> the canonical, actually-used id. Drivers
 * lists filter out the orphaned side entirely; nothing needs remapping for
 * results/stats since the orphaned id never appears in season data.
 */
export const DRIVER_ID_ALIASES: Record<string, string> = {
  barrichelo: 'barrichello', // Rubens Barrichello — misspelled duplicate (missing an "l")
  de_la_rosa: 'rosa', // Pedro de la Rosa — unused duplicate id
  guanyu: 'zhou', // Zhou Guanyu — duplicate with name/surname fields swapped
  magnussen: 'kevin_magnussen', // Kevin Magnussen — duplicate with a DD/MM/YYYY birthday instead of ISO
}

export function isOrphanedDriverId(id: string | null | undefined): boolean {
  return !!id && id in DRIVER_ID_ALIASES
}

/** Drops the orphaned half of each known duplicate pair from a driver list. */
export function dedupeDrivers<T extends { driverId?: string }>(drivers: T[]): T[] {
  return drivers.filter((d) => !isOrphanedDriverId(d.driverId))
}
