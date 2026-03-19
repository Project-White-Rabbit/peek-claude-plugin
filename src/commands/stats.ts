import { apiCall } from "../api.js"
import { hasCredentials } from "../config.js"

interface StatsResponse {
  rendered: string
}

async function main() {
  if (!hasCredentials()) {
    console.log("Not authenticated. Run /peek:login first.")
    process.exit(1)
  }

  const result = await apiCall<StatsResponse>(
    "/api/plugin/sessions/stats",
    {},
    { timeoutMs: 5000 },
  )

  if (!result.ok) {
    console.log(`Failed to fetch stats: ${result.error}`)
    process.exit(1)
  }

  console.log(result.data.rendered)
}

main()
