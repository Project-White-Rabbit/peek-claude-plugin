import { getConfig } from "./config.js"
import { getVersion } from "./version.js"

type ApiSuccess<T> = { ok: true; data: T }
type ApiError = { ok: false; error: string; status?: number }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export async function apiCall<T>(
  path: string,
  body: unknown,
  options?: { timeoutMs?: number },
): Promise<ApiResponse<T>> {
  const config = getConfig()
  if (!config.apiKey) {
    return { ok: false, error: "Not authenticated. Run /peek:login first." }
  }

  const fetchPromise = fetch(`${config.serviceUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "X-Plugin-Version": getVersion(),
    },
    body: JSON.stringify(body),
  }).then(async (response): Promise<ApiResponse<T>> => {
    if (!response.ok) {
      return { ok: false, error: `API error (${response.status})`, status: response.status }
    }
    const data = (await response.json()) as T
    return { ok: true, data }
  }).catch((err): ApiResponse<T> => {
    return { ok: false, error: String(err) }
  })

  if (!options?.timeoutMs) {
    return fetchPromise
  }

  const timeoutPromise = new Promise<"timeout">((resolve) => {
    setTimeout(() => resolve("timeout"), options.timeoutMs)
  })

  const winner = await Promise.race([fetchPromise, timeoutPromise])

  if (winner === "timeout") {
    return { ok: false as const, error: "timeout" }
  }

  return winner
}
