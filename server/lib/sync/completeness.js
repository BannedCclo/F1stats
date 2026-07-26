// A full grid is ~20 drivers. If a scrape returns far fewer rows, the page
// was probably fetched mid-session (before BBC publishes the final table) or
// mid red-flag suspension — inserting that would poison the DB with a
// permanently "already synced" partial result, since inserts are
// idempotent-by-presence. Below this threshold, callers should skip the
// insert and let the next 5-minute poll try again.
export const MIN_EXPECTED_ROWS = 15
