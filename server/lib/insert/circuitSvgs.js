import { clientWriter } from "../db.js"
import { REAL_CIRCUIT_SHAPES } from "../circuitSvgs.data.js"

// The API's own circuit archive has duplicate entries for several tracks —
// the same real place under two different circuitIds, one used by recent
// seasons and another by older ones. Backfill the alias circuitId with the
// same shape as the one that's actually curated.
const CIRCUIT_ID_ALIASES = {
  catalunya: "montmelo",
  villeneuve: "gilles_villeneuve",
  rodriguez: "hermanos_rodriguez",
  americas: "austin",
  ricard: "paul_ricard",
  bahrain: "bahrein",
}

export const insertCircuitSvgs = async () => {
  const shapesByCircuitId = { ...REAL_CIRCUIT_SHAPES }

  for (const [aliasId, targetId] of Object.entries(CIRCUIT_ID_ALIASES)) {
    if (REAL_CIRCUIT_SHAPES[targetId]) {
      shapesByCircuitId[aliasId] = REAL_CIRCUIT_SHAPES[targetId]
    }
  }

  for (const [circuitId, shape] of Object.entries(shapesByCircuitId)) {
    const result = await clientWriter.execute({
      sql: `UPDATE Circuits SET SVG_Path = :SVG_Path, SVG_View_Box = :SVG_View_Box WHERE Circuit_ID = :Circuit_ID`,
      args: {
        SVG_Path: shape.path,
        SVG_View_Box: shape.viewBox,
        Circuit_ID: circuitId,
      },
    })

    console.log(
      result.rowsAffected > 0
        ? `Updated SVG for ${circuitId}`
        : `No circuit row found for ${circuitId}, skipped.`
    )
  }
}

insertCircuitSvgs()
