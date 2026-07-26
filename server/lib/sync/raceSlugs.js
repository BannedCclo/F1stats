// Maps this app's race_id (from f1api.dev's own scheme, e.g. "catalunya_2026")
// to the slug BBC Sport uses in its results URL
// (bbc.com/sport/formula1/{year}/{slug}-grand-prix/results). The two schemes
// frequently disagree on multi-word names (underscores vs. hyphens, or a
// different name entirely — e.g. this app's "catalunya" vs. BBC's
// "spanish"), so this can't be derived automatically; each entry below was
// checked against a live BBC results page.
//
// A `null` value means the slug is genuinely unconfirmed (new/renamed race
// on the calendar) — the sync job skips that race and logs a warning
// instead of guessing, so a wrong guess doesn't silently fail forever.
export const RACE_SLUGS = {
  australian_2026: "australian",
  chinese_2026: "chinese",
  japanese_2026: "japanese",
  miami_2026: "miami",
  canadian_2026: "canadian",
  monaco_2026: "monaco",
  // 2026 splits Spain into two events (Barcelona-Catalunya + Madrid); which
  // one BBC brands "Spanish Grand Prix" isn't confirmed yet.
  catalunya_2026: null,
  austrian_2026: "austrian",
  british_2026: "british",
  belgian_2026: "belgian",
  hungarian_2026: "hungarian",
  dutch_2026: "dutch",
  italian_2026: "italian",
  spanish_2026: null,
  azerbaijan_2026: "azerbaijan",
  singapore_2026: "singapore",
  united_states_2026: "united-states",
  mexican_2026: "mexican",
  brazilian_2026: "brazilian",
  las_vegas_2026: "las-vegas",
  qatar_2026: "qatar",
  abu_dhabi_2026: "abu-dhabi",
}
