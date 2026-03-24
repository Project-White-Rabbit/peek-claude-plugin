import { getConfig } from "../config.js"
import { buildConversationContext } from "../transcript.js"
import { injectMemories } from "./shared.js"

// PreToolUse hook: queries for semantically relevant memories
// based on the tool being called and conversation context.

try {
  injectMemories({
    endpoint: "/api/plugin/triggers/search",
    buildBody: (input) => {
      const context = buildConversationContext(input, { contextEntries: 6 })
      return {
        ...context,
        prompt: null,
        hookName: "PreToolUse",
        toolName: input.tool_name,
        toolInput: input.tool_input,
      }
    },
    timeoutMs: 2500,
    hookEventName: "PreToolUse",
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
