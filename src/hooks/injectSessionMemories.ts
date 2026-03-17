import { getConfig } from "../config.js"
import { injectMemories } from "./shared.js"

// SessionStart hook: fetches recent memories and injects them as
// additionalContext so Claude has relevant background from the start.

try {
  injectMemories({
    endpoint: "/api/plugin/memories/recent",
    buildBody: (input) => ({
      sessionId: input.session_id,
      cwd: input.cwd,
    }),
    timeoutMs: 2000,
    hookEventName: "SessionStart",
  }).catch((err) => {
    if (getConfig().debug) {
      process.stdout.write(JSON.stringify({
        systemMessage: `[Peek Debug] hook crashed: ${err instanceof Error ? err.message : String(err)}`,
      }))
    }
  })
} catch (err) {
  try {
    if (getConfig().debug) {
      process.stdout.write(JSON.stringify({
        systemMessage: `[Peek Debug] hook sync crash: ${err instanceof Error ? err.message : String(err)}`,
      }))
    }
  } catch {}
}
