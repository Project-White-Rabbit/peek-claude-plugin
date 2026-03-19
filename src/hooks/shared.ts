import type { HookInput } from "../transcript.js"
import { apiCall } from "../api.js"
import { clearCache, getInjectedIds, readCache, trackInjectedIds, writeCache } from "../cache.js"
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
    memoryNumber?: number | null
    updatedAt?: string
    eventCount?: number
    score?: number
    events?: MemoryEvent[]
  }>
  memoryCount: number
  totalMemoryCount?: number
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
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

  const blocks: string[] = []
  for (const m of memories) {
    const blockLines: string[] = []
    const cat = m.category ? ` [${m.category}]` : ""
    blockLines.push(`${m.content}${cat}`)
    if (m.events && m.events.length > 0) {
      for (const e of m.events.slice(0, 3)) {
        const countSuffix =
          e.occurrenceCount && e.occurrenceCount > 1
            ? ` (${e.occurrenceCount}x)`
            : ""
        blockLines.push(
          `    ↳ ${formatShortDate(e.createdAt)}: ${e.content}${countSuffix}`,
        )
      }
      if (m.events.length > 3) {
        blockLines.push(`    ↳ +${m.events.length - 3} more`)
      }
    }
    blocks.push(blockLines.join("\n"))
  }

  return [
    "Relevant memories about the user from the Peek product.",
    "For any memories that are behavioral corrections, preferences, or suggestions YOU MUST FOLLOW THEM:",
    "<memory>",
    "",
    blocks.join("\n\n"),
    "",
    "</memory>",
  ].join("\n")
}

function formatHookNotification(
  memories: MemoryResponse["memories"],
  opts: { fromCache: boolean; verbose: boolean; totalMemoryCount?: number; debug?: boolean; durationMs?: number },
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
  const prefix = opts.debug ? `[Peek][${opts.durationMs != null ? `${opts.durationMs}ms` : "unknown"}]` : "[Peek]"

  const parts = [
    `${prefix} ${memories.length} ${memories.length === 1 ? "memory" : "memories"} injected${cacheStr}${categoryStr}${contextStr}`,
    "",
  ]

  if (opts.verbose) {
    for (const m of memories) {
      const num = m.memoryNumber != null ? `#${m.memoryNumber} ` : ""
      const cat = m.category ?? ""
      const age = m.updatedAt ? relativeTime(m.updatedAt) : ""
      const meta = [cat, age].filter(Boolean).join(", ")
      const suffix = meta ? ` [${meta}]` : ""
      parts.push(`${num}${m.content}${suffix}`)
      if (m.eventCount && m.eventCount > 0) {
        parts.push(
          `    ↳ ${m.eventCount} ${m.eventCount === 1 ? "event" : "events"}`,
        )
      }
      parts.push("")
    }
  }

  return parts.join("\n")
}

function emitOutput(
  memories: MemoryResponse["memories"],
  opts: { fromCache: boolean; totalMemoryCount?: number; hookEventName: string; timedOut?: boolean; errorDetail?: string; durationMs?: number; prependText?: string | null },
  config: PeekConfig,
): void {
  const statusLine = config.showNotification
    ? formatHookNotification(memories, {
        fromCache: opts.fromCache,
        verbose: config.verbose,
        totalMemoryCount: opts.totalMemoryCount,
        debug: config.debug,
        durationMs: opts.durationMs,
      })
    : null

  const context = formatMemories(memories)

  const showDebug = config.debug && (memories.length === 0 || opts.timedOut || opts.errorDetail)
  const debugLines: string[] = []
  if (showDebug) {
    const debugPrefix = `[Peek Debug][${opts.durationMs != null ? `${opts.durationMs}ms` : "unknown"}]`
    if (opts.timedOut && memories.length === 0) {
      debugLines.push(`${debugPrefix} Request timed out — cache empty`)
    } else if (opts.errorDetail) {
      debugLines.push(`${debugPrefix} Error: ${opts.errorDetail}`)
    } else if (memories.length === 0) {
      const alreadyInContext = (opts.totalMemoryCount ?? 0) - memories.length
      if (alreadyInContext === 0) {
        debugLines.push(`${debugPrefix} 0 memories injected (0 returned from search)`)
      }
    }
  }

  const output: Record<string, unknown> = {}
  if (context) {
    output.hookSpecificOutput = {
      hookEventName: opts.hookEventName,
      additionalContext: context,
    }
  }

  const allStatusParts: string[] = []
  if (opts.prependText) {
    allStatusParts.push(opts.prependText)
  }
  allStatusParts.push(...debugLines)
  if (statusLine) {
    allStatusParts.push(statusLine)
  }
  if (allStatusParts.length > 0) {
    output.systemMessage = allStatusParts.join("\n")
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
  prependToSystemMessage?: Promise<string | null>
}

export async function injectMemories(
  opts: InjectMemoriesOptions,
): Promise<void> {
  const config = getConfig()

  if (!hasCredentials()) {
    return
  }

  const input = parseHookInput()
  if (!input) {
    return
  }

  process.env.PEEK_CWD = input.cwd

  const startMs = Date.now()
  const [result, prependText] = await Promise.all([
    apiCall<MemoryResponse>(
      opts.endpoint,
      opts.buildBody(input),
      { timeoutMs: opts.timeoutMs },
    ),
    opts.prependToSystemMessage ?? Promise.resolve(null),
  ])
  const durationMs = Date.now() - startMs

  if (result.ok) {
    const memories = result.data.memories ?? []
    emitOutput(
      memories,
      { fromCache: false, totalMemoryCount: result.data.totalMemoryCount, hookEventName: opts.hookEventName, durationMs, prependText },
      config,
    )

    if (memories.length > 0) {
      const memoryIds = memories.map((m) => m.id)
      try { trackInjectedIds(input.session_id, memoryIds) } catch {}
      apiCall("/api/plugin/memories/confirm", {
        memoryIds,
        sessionId: input.session_id,
      }).catch(() => {})
    }

    return
  }

  // Timeout or error — fall back to cache
  const timedOut = result.error === "timeout"
  const errorDetail = !timedOut ? result.error : undefined
  const cached = readCache()
  let cachedMemories = cached?.memories ?? []

  if (cachedMemories.length > 0) {
    const alreadyInjected = getInjectedIds(input.session_id)
    const totalBeforeFilter = cachedMemories.length
    cachedMemories = cachedMemories.filter((m) => !alreadyInjected.has(m.id))

    if (cachedMemories.length > 0) {
      emitOutput(
        cachedMemories,
        { fromCache: true, totalMemoryCount: totalBeforeFilter, timedOut, errorDetail, hookEventName: opts.hookEventName, durationMs },
        config,
      )

      const memoryIds = cachedMemories.map((m) => m.id)
      try { trackInjectedIds(input.session_id, memoryIds) } catch {}
      apiCall("/api/plugin/memories/confirm", {
        memoryIds,
        sessionId: input.session_id,
      }).catch(() => {})
    } else if (config.debug) {
      emitOutput([], { fromCache: true, totalMemoryCount: totalBeforeFilter, timedOut, errorDetail, hookEventName: opts.hookEventName, durationMs }, config)
    }
    clearCache()
  } else if (config.debug) {
    emitOutput([], { fromCache: false, timedOut, errorDetail, hookEventName: opts.hookEventName, durationMs, prependText }, config)
  }

  // On timeout, the fetch is still in-flight. When it completes, cache the
  // result so the next timeout has fresh data instead of stale memories.
  if (timedOut && "pendingFetch" in result) {
    result.pendingFetch.then((late) => {
      if (late.ok) {
        writeCache(late.data.memories ?? [])
      }
    }).catch(() => {})
  }
}
