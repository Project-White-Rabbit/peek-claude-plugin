import { injectMemories } from "./shared.js"

// SessionStart hook: fetches recent memories and injects them as
// additionalContext so Claude has relevant background from the start.

injectMemories({
  endpoint: "/api/plugin/memories/recent",
  buildBody: (input) => ({
    sessionId: input.session_id,
    cwd: input.cwd,
  }),
  timeoutMs: 2000,
}).catch(() => {
  // Silent failure — never block the user
})
