import { getConfig } from "./config.js"
import { getVersion } from "./version.js"

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

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
      const text = await response.text()
      return { ok: false, error: `API error (${response.status}): ${text}` }
    }
    const data = (await response.json()) as T
    return { ok: true, data }
  }).catch((err): ApiResponse<T> => {
    return { ok: false, error: String(err) }
  })

  if (!options?.timeoutMs) {
    return fetchPromise
  }

  const timeoutPromise = new Promise<ApiResponse<T>>((resolve) => {
    setTimeout(() => resolve({ ok: false, error: "timeout" }), options.timeoutMs)
  })

  return Promise.race([fetchPromise, timeoutPromise])
}
