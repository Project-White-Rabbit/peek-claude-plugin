import { apiCall } from "../api.js"
import { writeCache } from "../cache.js"
import { hasCredentials } from "../config.js"
import { buildConversationContext, parseHookInput } from "../transcript.js"

// Async hook: sends prompt + context to server for analysis.
// Server analyzes for dissatisfaction, saves memories, returns fresh memories for cache.

interface PromptResponse {
  memories: Array<{ id: string; content: string; category?: string; score?: number }>
  memoryCount: number
  savedMemory: { id: string; content: string } | null
}

async function main() {
  if (!hasCredentials()) {
    return
  }

  const input = parseHookInput()
  if (!input) {
    return
  }

  process.env.PEEK_CWD = input.cwd

  const context = buildConversationContext(input, { contextEntries: 10 })
  if (!context) {
    return
  }

  const result = await apiCall<PromptResponse>(
    "/api/plugin/prompt",
    context,
  )

  if (result.ok) {
    writeCache(result.data.memories)
  }
}

main().catch(() => {
  // Silent failure — async hook, nobody is waiting
})
