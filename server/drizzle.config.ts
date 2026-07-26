require("dotenv").config()

import type { Config } from "drizzle-kit"

export default {
  schema: "./db/migrations/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
