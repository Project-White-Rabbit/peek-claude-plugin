import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const CACHE_DIR = path.join(os.homedir(), ".config", "peek")
const CACHE_FILE = path.join(CACHE_DIR, "memory-cache.json")

export interface CachedMemories {
  memories: Array<{ content: string; category?: string; score?: number }>
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
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const data: CachedMemories = {
    memories,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify(data, null, 2)}\n`)
}
