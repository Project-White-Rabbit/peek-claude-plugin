import type { HookInput } from "../transcript.js"
import { apiCall } from "../api.js"
import { readCache, writeCache } from "../cache.js"
import { type PeekConfig, getConfig, hasCredentials } from "../config.js"
import { parseHookInput } from "../transcript.js"

interface MemoryResponse {
  memories: Array<{ content: string; category?: string; score?: number }>
  memoryCount: number
  totalMemoryCount?: number
}

function formatMemories(memories: MemoryResponse["memories"]): string {
  if (memories.length === 0) {
    return ""
  }

  const lines = memories.map((m) => {
    const cat = m.category ? ` [${m.category}]` : ""
    return `- ${m.content}${cat}`
  })

  return [
    "Relevant memories about the user from the Peek product.",
    "For any memories that are behavioral corrections, preferences, or suggestions YOU MUST FOLLOW THEM:",
    "<memory>",
    ...lines,
    "</memory>",
  ].join("\n")
}

function formatStatusLine(
  memories: MemoryResponse["memories"],
  opts: { fromCache: boolean; verbose: boolean; totalMemoryCount?: number },
): string | null {
  const alreadyInContext =
    opts.totalMemoryCount != null ? opts.totalMemoryCount - memories.length : 0

  if (memories.length === 0 && alreadyInContext === 0) {
    return null
  }

  const categories = [
    ...new Set(memories.map((m) => m.category).filter(Boolean)),
  ]
  const categoryStr =
    categories.length > 0 ? ` [${categories.join(", ")}]` : ""
  const cacheStr = opts.fromCache ? " (cached)" : ""
  const contextStr =
    alreadyInContext > 0
      ? ` (${alreadyInContext} already in context)`
      : ""

  const parts = [
    `[Peek] ${memories.length} ${memories.length === 1 ? "memory" : "memories"} injected${cacheStr}${categoryStr}${contextStr}`,
  ]

  if (opts.verbose) {
    for (const m of memories) {
      const cat = m.category ? ` [${m.category}]` : ""
      parts.push(`  - ${m.content}${cat}`)
    }
  }

  return parts.join("\n")
}

function emitOutput(
  memories: MemoryResponse["memories"],
  opts: { fromCache: boolean; totalMemoryCount?: number },
  config: PeekConfig,
): void {
  const statusLine = config.showStatusLine
    ? formatStatusLine(memories, {
        fromCache: opts.fromCache,
        verbose: config.verbose,
        totalMemoryCount: opts.totalMemoryCount,
      })
    : null

  const context = formatMemories(memories)

  const output: Record<string, string> = {}
  if (context) {
    output.additionalContext = context
  }
  if (statusLine) {
    output.systemMessage = statusLine
  }

  if (Object.keys(output).length > 0) {
    process.stdout.write(JSON.stringify(output))
  }
}

export interface InjectMemoriesOptions {
  endpoint: string
  buildBody: (input: HookInput) => object
  timeoutMs: number
}

export async function injectMemories(
  opts: InjectMemoriesOptions,
): Promise<void> {
  if (!hasCredentials()) {
    return
  }

  const input = parseHookInput()
  if (!input) {
    return
  }

  process.env.PEEK_CWD = input.cwd

  const config = getConfig()

  const result = await apiCall<MemoryResponse>(
    opts.endpoint,
    opts.buildBody(input),
    { timeoutMs: opts.timeoutMs },
  )

  if (result.ok) {
    writeCache(result.data.memories)
    emitOutput(
      result.data.memories,
      { fromCache: false, totalMemoryCount: result.data.totalMemoryCount },
      config,
    )
    return
  }

  // Timeout or error — fall back to cache
  const cached = readCache()
  if (cached && cached.memories.length > 0) {
    emitOutput(cached.memories, { fromCache: true }, config)
  }
}
