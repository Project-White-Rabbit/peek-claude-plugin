import { apiCall } from "../api.js"
import { hasCredentials, getConfig } from "../config.js"

interface StatsResponse {
  rendered: string
  memoriesInjected: number
  prevMemoriesInjected: number
  manualSteers: number
  prevManualSteers: number
}

export async function fetchAndFormatStats(): Promise<string | null> {
  const config = getConfig()
  if (!config.showStats || !hasCredentials()) {
    return null
  }

  const result = await apiCall<StatsResponse>(
    "/api/plugin/sessions/stats",
    {},
    { timeoutMs: 3000 },
  )

  if (!result.ok) {
    return null
  }

  return result.data.rendered
}
