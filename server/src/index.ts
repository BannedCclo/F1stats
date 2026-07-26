import { app } from "./app.js"

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`F1 API listening on port ${PORT}`)
})
