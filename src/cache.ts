import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const CACHE_DIR = path.join(os.homedir(), ".config", "peek")
const CACHE_FILE = path.join(CACHE_DIR, "memory-cache.json")
const INJECTED_FILE = path.join(CACHE_DIR, "session-injected.json")

export interface CachedMemories {
  memories: Array<{ id: string; content: string; category?: string; score?: number }>
  updatedAt: string
}

export function readCache(): CachedMemories | null {
  try {
    const content = fs.readFileSync(CACHE_FILE, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

export function writeCache(memories: CachedMemories["memories"]): void {
  if (!Array.isArray(memories)) {
    return
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const data: CachedMemories = {
    memories,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify(data, null, 2)}\n`)
}

export function clearCache(): void {
  fs.promises.unlink(CACHE_FILE).catch(() => {})
}

// --- Per-session injected memory tracking ---
// Prevents duplicate injection when falling back to cache or when
// fire-and-forget confirm hasn't completed before the next search.

interface SessionInjectedData {
  sessions: Record<string, { ids: string[]; lastUpdated: string }>
}

function readSessionData(): SessionInjectedData {
  try {
    return JSON.parse(fs.readFileSync(INJECTED_FILE, "utf-8"))
  } catch {
    return { sessions: {} }
  }
}

export function getInjectedIds(sessionId: string): Set<string> {
  try {
    const data = readSessionData()
    const ids = data.sessions[sessionId]?.ids
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

export function trackInjectedIds(sessionId: string, memoryIds: string[]): void {
  if (memoryIds.length === 0) {
    return
  }
  const data = readSessionData()
  const existing = new Set(data.sessions[sessionId]?.ids ?? [])
  for (const id of memoryIds) {
    existing.add(id)
  }
  data.sessions[sessionId] = {
    ids: [...existing],
    lastUpdated: new Date().toISOString(),
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  for (const [sid, session] of Object.entries(data.sessions)) {
    if (new Date(session.lastUpdated).getTime() < cutoff) {
      delete data.sessions[sid]
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(INJECTED_FILE, `${JSON.stringify(data, null, 2)}\n`)
}
