import { clientWriter } from "../db.js"

// Driver/constructor standings were originally seeded from f1api.dev
// (server/lib/populate), a different upstream than the BBC scrape this sync
// pipeline uses for individual session results. The two disagree on some
// current-season numbers, so standings recompute here from this app's own
// `results`/`sprint_race` rows — the same data a race page already shows —
// instead of trusting a separate external source to stay in sync with it.
// A sprint race's points count toward the totals; its win does not count
// toward the classic "wins" column (only a main Grand Prix win does).

async function fetchDriverTotals(championshipId) {
  const { rows } = await clientWriter.execute({
    sql: `
      WITH combined AS (
        SELECT r.driver_id, r.team_id, r.points_obtained AS points, (r.finishing_position = 1) AS is_win
        FROM results r JOIN races ra ON ra.race_id = r.race_id
        WHERE ra.championship_id = :championship_id
        UNION ALL
        SELECT sr.driver_id, sr.team_id, sr.points_obtained AS points, false AS is_win
        FROM sprint_race sr JOIN races ra ON ra.race_id = sr.race_id
        WHERE ra.championship_id = :championship_id
      )
      SELECT driver_id,
             (SELECT team_id FROM combined c2 WHERE c2.driver_id = combined.driver_id AND c2.team_id IS NOT NULL ORDER BY team_id LIMIT 1) AS team_id,
             SUM(COALESCE(points, 0)) AS points,
             SUM(CASE WHEN is_win THEN 1 ELSE 0 END) AS wins
      FROM combined
      WHERE driver_id IS NOT NULL
      GROUP BY driver_id`,
    args: { championship_id: championshipId },
  })
  return rows
}

async function fetchConstructorTotals(championshipId) {
  const { rows } = await clientWriter.execute({
    sql: `
      WITH combined AS (
        SELECT r.team_id, r.points_obtained AS points, (r.finishing_position = 1) AS is_win
        FROM results r JOIN races ra ON ra.race_id = r.race_id
        WHERE ra.championship_id = :championship_id
        UNION ALL
        SELECT sr.team_id, sr.points_obtained AS points, false AS is_win
        FROM sprint_race sr JOIN races ra ON ra.race_id = sr.race_id
        WHERE ra.championship_id = :championship_id
      )
      SELECT team_id,
             SUM(COALESCE(points, 0)) AS points,
             SUM(CASE WHEN is_win THEN 1 ELSE 0 END) AS wins
      FROM combined
      WHERE team_id IS NOT NULL
      GROUP BY team_id`,
    args: { championship_id: championshipId },
  })
  return rows
}

function rankByPoints(rows) {
  return [...rows]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((row, index) => ({ ...row, position: index + 1 }))
}

export async function recomputeDriverStandings(championshipId) {
  const ranked = rankByPoints(await fetchDriverTotals(championshipId))

  for (const row of ranked) {
    await clientWriter.execute({
      sql: `
        INSERT INTO driver_classifications (championship_id, driver_id, team_id, points, position, wins)
        VALUES (:championship_id, :driver_id, :team_id, :points, :position, :wins)
        ON CONFLICT (championship_id, driver_id)
        DO UPDATE SET team_id = :team_id, points = :points, position = :position, wins = :wins`,
      args: {
        championship_id: championshipId,
        driver_id: row.driver_id,
        team_id: row.team_id ?? null,
        points: row.points,
        position: row.position,
        wins: row.wins,
      },
    })
  }

  return ranked.length
}

export async function recomputeConstructorStandings(championshipId) {
  const ranked = rankByPoints(await fetchConstructorTotals(championshipId))

  for (const row of ranked) {
    await clientWriter.execute({
      sql: `
        INSERT INTO constructors_classifications (championship_id, team_id, points, position, wins)
        VALUES (:championship_id, :team_id, :points, :position, :wins)
        ON CONFLICT (championship_id, team_id)
        DO UPDATE SET points = :points, position = :position, wins = :wins`,
      args: {
        championship_id: championshipId,
        team_id: row.team_id,
        points: row.points,
        position: row.position,
        wins: row.wins,
      },
    })
  }

  return ranked.length
}
