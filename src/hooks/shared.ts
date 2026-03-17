import type { HookInput } from "../transcript.js"
import { apiCall } from "../api.js"
import { clearCache, readCache, writeCache } from "../cache.js"
import { type PeekConfig, getConfig, hasCredentials } from "../config.js"
import { parseHookInput } from "../transcript.js"

interface MemoryEvent {
  id: string
  content: string
  occurrenceCount?: number
  createdAt: string
}

interface MemoryResponse {
  memories: Array<{
    id: string
    content: string
    category?: string
    score?: number
    events?: MemoryEvent[]
  }>
  memoryCount: number
  totalMemoryCount?: number
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatMemories(memories: MemoryResponse["memories"]): string {
  if (memories.length === 0) {
    return ""
  }

  const lines: string[] = []
  for (const m of memories) {
    const cat = m.category ? ` [${m.category}]` : ""
    lines.push(`${m.content}${cat}`)
    if (m.events && m.events.length > 0) {
      for (const e of m.events.slice(0, 3)) {
        const countSuffix =
          e.occurrenceCount && e.occurrenceCount > 1
            ? ` (${e.occurrenceCount}x)`
            : ""
        lines.push(
          `    ↳ ${formatShortDate(e.createdAt)}: ${e.content}${countSuffix}`,
        )
      }
      if (m.events.length > 3) {
        lines.push(`    ↳ +${m.events.length - 3} more`)
      }
    }
  }

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
  opts: { fromCache: boolean; totalMemoryCount?: number; hookEventName: string },
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

  const output: Record<string, unknown> = {}
  if (context) {
    output.hookSpecificOutput = {
      hookEventName: opts.hookEventName,
      additionalContext: context,
    }
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
  hookEventName: string
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
      { fromCache: false, totalMemoryCount: result.data.totalMemoryCount, hookEventName: opts.hookEventName },
      config,
    )

    // Confirm delivery so the server marks these memories as injected.
    // Fire-and-forget: if this fails, the memories will simply be re-offered next time.
    if (result.data.memories.length > 0) {
      const memoryIds = result.data.memories.map((m) => m.id)
      apiCall("/api/plugin/memories/confirm", {
        memoryIds,
        sessionId: input.session_id,
      }).catch(() => {})
    }

    return
  }

  // Timeout or error — fall back to cache
  const cached = readCache()
  if (cached && cached.memories.length > 0) {
    emitOutput(cached.memories, { fromCache: true, hookEventName: opts.hookEventName }, config)
    clearCache()

    const memoryIds = cached.memories.map((m) => m.id)
    apiCall("/api/plugin/memories/confirm", {
      memoryIds,
      sessionId: input.session_id,
    }).catch(() => {})
  }
}
