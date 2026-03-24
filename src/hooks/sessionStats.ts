import { apiCall } from "../api.js"
import { hasCredentials, getConfig } from "../config.js"

interface WeeklyStats {
  weekLabel: string
  weekStartDate: string
  prompts: number
  steers: number
  injections: number
  steerRate: number
  steerRateTrend: string
}

interface StatsResponse {
  rendered: string
  weeks: WeeklyStats[]
}

export async function fetchAndFormatStats(): Promise<string | null> {
  const config = getConfig()
  if (!config.showStats || !hasCredentials()) {
    return null
  }

  const result = await apiCall<StatsResponse>(
    "/api/plugin/memories/stats",
    {},
    { timeoutMs: 3000 },
  )

  if (!result.ok) {
    return null
  }

  return result.data.rendered
}
