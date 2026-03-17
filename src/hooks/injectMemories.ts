import { getConfig } from "../config.js"
import { buildConversationContext } from "../transcript.js"
import { injectMemories } from "./shared.js"

// UserPromptSubmit hook: queries for semantically relevant memories
// based on the current conversation context.

try {
  injectMemories({
    endpoint: "/api/plugin/memories/search",
    buildBody: (input) => {
      const context = buildConversationContext(input, { contextEntries: 6 })
      if (!context) {
        return { sessionId: input.session_id }
      }
      return context
    },
    timeoutMs: 2500,
    hookEventName: "UserPromptSubmit",
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
