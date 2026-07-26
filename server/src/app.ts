import "dotenv/config"
import cors from "cors"
import express from "express"
import { types } from "pg"
import { rateLimitMiddleware } from "./middleware/rateLimit.js"

// pg parses bigint (COUNT/SUM results) as strings by default to avoid
// precision loss on truly huge values. Our aggregates never get remotely
// close to that range, so parse them as regular numbers instead.
types.setTypeParser(20, (value) => parseInt(value, 10))

import championshipsRouter from "./routes/championships.js"
import circuitsRouter from "./routes/circuits.js"
import compareRouter from "./routes/compare.js"
import driversRouter from "./routes/drivers.js"
import racesRouter from "./routes/races.js"
import seasonsRouter from "./routes/seasons.js"
import teamsRouter from "./routes/teams.js"

export const app = express()

app.use(
  "/api",
  cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 300,
  })
)

app.use("/api", rateLimitMiddleware)

app.use("/api", circuitsRouter)
app.use("/api", driversRouter)
app.use("/api", teamsRouter)
app.use("/api", championshipsRouter)
app.use("/api", seasonsRouter)
app.use("/api", compareRouter)
app.use("/api", racesRouter)
