// Defines, for each session type, how long after its scheduled start we
// expect results to be publishable on BBC, and how wide a safety margin to
// poll for before giving up. There is no reliable "session actually ended"
// signal (red flags, restarts, and FIA schedule changes all shift this), so
// instead of predicting an exact end time we open a window a little before
// the nominal end and keep it open well past it — the poller (every 5min)
// just keeps checking until real data shows up or the window closes.
export const SESSION_TYPES = [
  { key: "fp1", dateCol: "fp1_date", timeCol: "fp1_time", table: "fp1", durationMin: 60, preRollMin: 10, bufferMin: 45 },
  { key: "fp2", dateCol: "fp2_date", timeCol: "fp2_time", table: "fp2", durationMin: 60, preRollMin: 10, bufferMin: 45 },
  { key: "fp3", dateCol: "fp3_date", timeCol: "fp3_time", table: "fp3", durationMin: 60, preRollMin: 10, bufferMin: 45 },
  { key: "qualy", dateCol: "qualy_date", timeCol: "qualy_time", table: "classifications", durationMin: 60, preRollMin: 10, bufferMin: 120 },
  { key: "sprintQualy", dateCol: "sprint_qualy_date", timeCol: "sprint_qualy_time", table: "sprint_qualy", durationMin: 45, preRollMin: 10, bufferMin: 90 },
  { key: "sprintRace", dateCol: "sprint_race_date", timeCol: "sprint_race_time", table: "sprint_race", durationMin: 35, preRollMin: 10, bufferMin: 90 },
  { key: "race", dateCol: "race_date", timeCol: "race_time", table: "results", durationMin: 120, preRollMin: 10, bufferMin: 150 },
]

function parseSessionStart(race, sessionType) {
  const date = race[sessionType.dateCol]
  const time = race[sessionType.timeCol]
  if (!date || !time) return null
  const parsed = new Date(`${date}T${time}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Returns the [start, end) polling window for a session, or null if it has no schedule yet. */
export function getSessionWindow(race, sessionType) {
  const start = parseSessionStart(race, sessionType)
  if (!start) return null
  const windowStart = new Date(start.getTime() + (sessionType.durationMin - sessionType.preRollMin) * 60_000)
  const windowEnd = new Date(start.getTime() + (sessionType.durationMin + sessionType.bufferMin) * 60_000)
  return { start, windowStart, windowEnd }
}

export function isWithinWindow(race, sessionType, now = new Date()) {
  const window = getSessionWindow(race, sessionType)
  if (!window) return false
  return now >= window.windowStart && now < window.windowEnd
}
