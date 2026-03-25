import { apiCall } from "../api.js"
import { hasCredentials } from "../config.js"
import { buildConversationContext, parseHookInput } from "../transcript.js"

// Async hook: sends tool call data to server for tracking.
// Fire-and-forget — no memory extraction, just saves the data.

async function main() {
  if (!hasCredentials()) {
    return
  }

  const input = parseHookInput()
  if (!input) {
    return
  }

  process.env.PEEK_CWD = input.cwd

  const context = buildConversationContext(input, { contextEntries: 6 })

  await apiCall("/api/plugin/tool-call", {
    ...context,
    toolName: input.tool_name,
    toolInput: input.tool_input,
    hookEventName: input.hook_event_name,
  })
}

main().catch(() => {
  // Silent failure — async hook, nobody is waiting
})
