import "dotenv/config"
import cors from "cors"
import express from "express"
import { rateLimitMiddleware } from "./middleware/rateLimit"
import championshipsRouter from "./routes/championships"
import circuitsRouter from "./routes/circuits"
import compareRouter from "./routes/compare"
import driversRouter from "./routes/drivers"
import racesRouter from "./routes/races"
import seasonsRouter from "./routes/seasons"
import teamsRouter from "./routes/teams"

const app = express()

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

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`F1 API listening on port ${PORT}`)
})
