import { Pool, types } from "pg"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name of the current module file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file in the root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") })

// pg parses bigint (COUNT/SUM results) as strings by default to avoid
// precision loss on truly huge values. Our aggregates never get remotely
// close to that range, so parse them as regular numbers instead.
types.setTypeParser(20, (value) => parseInt(value, 10))

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Compatibility shim for the old libSQL-style call convention used across
// the insert/scrap scripts: `.execute({ sql, args })` with named
// (`:Some_Name`) placeholders. Converts to Postgres positional placeholders
// and returns a libSQL-like shape (`rows`, `rowsAffected`) so call sites
// didn't need to change when the database moved from Turso to Postgres.
function toPositional(sql, args) {
  if (Array.isArray(args)) {
    return { text: sql, values: args }
  }

  const values = []
  const text = sql.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
    if (!(name in args)) return match
    values.push(args[name])
    return `$${values.length}`
  })

  return { text, values }
}

async function execute({ sql, args = {} }) {
  const { text, values } = toPositional(sql, args)
  const result = await pool.query(text, values)
  return { rows: result.rows, rowsAffected: result.rowCount }
}

export const client = { execute }
export const clientWriter = { execute }
