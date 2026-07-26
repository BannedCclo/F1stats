import { pool } from "./db.js"

export async function executeQuery(
  sql: string,
  args: any[] = []
): Promise<any> {
  try {
    const { rows } = await pool.query(sql, args)
    return rows
  } catch (error: any) {
    throw new Error("Error executing SQL query: " + error.message)
  }
}
