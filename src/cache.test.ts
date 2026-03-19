import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock os.homedir() so cache files go to a temp directory.
// vi.mock is hoisted, so the module-level constants in cache.ts
// will use the mocked homedir when the module is imported.
let tmpDir: string

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os")
  return {
    ...actual,
    default: {
      ...actual,
      homedir: () => tmpDir,
    },
  }
})

let cacheModule: typeof import("./cache.js")

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "peek-cache-test-"))
  // Re-import to pick up new tmpDir via mocked homedir
  vi.resetModules()
  cacheModule = await import("./cache.js")
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ── Memory cache (writeCache / readCache / clearCache) ──────────────

describe("writeCache + readCache", () => {
  it("round-trips memories through the cache", () => {
    const memories = [
      { id: "m1", content: "preference A" },
      { id: "m2", content: "preference B", category: "coding", score: 0.9 },
    ]
    cacheModule.writeCache(memories)
    const result = cacheModule.readCache()

    expect(result).not.toBeNull()
    expect(result!.memories).toEqual(memories)
    expect(result!.updatedAt).toBeTruthy()
    expect(new Date(result!.updatedAt).getTime()).toBeGreaterThan(0)
  })

  it("overwrites previous cache on subsequent write", () => {
    cacheModule.writeCache([{ id: "m1", content: "old" }])
    cacheModule.writeCache([{ id: "m2", content: "new" }])

    const result = cacheModule.readCache()
    expect(result!.memories).toHaveLength(1)
    expect(result!.memories[0].id).toBe("m2")
  })

  it("creates the directory tree if it does not exist", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    expect(fs.existsSync(cacheDir)).toBe(false)

    cacheModule.writeCache([{ id: "m1", content: "test" }])

    expect(fs.existsSync(cacheDir)).toBe(true)
    expect(cacheModule.readCache()).not.toBeNull()
  })

  it("writes valid JSON ending with a newline", () => {
    cacheModule.writeCache([{ id: "m1", content: "test" }])
    const raw = fs.readFileSync(
      path.join(tmpDir, ".config", "peek", "memory-cache.json"),
      "utf-8",
    )
    expect(raw.endsWith("\n")).toBe(true)
    expect(() => JSON.parse(raw)).not.toThrow()
  })
})

describe("readCache edge cases", () => {
  it("returns null when no cache file exists", () => {
    expect(cacheModule.readCache()).toBeNull()
  })

  it("returns null when cache file contains corrupt JSON", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, "memory-cache.json"), "{{invalid")

    expect(cacheModule.readCache()).toBeNull()
  })

  it("returns null when cache file is empty", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, "memory-cache.json"), "")

    expect(cacheModule.readCache()).toBeNull()
  })
})

describe("writeCache edge cases", () => {
  it("silently no-ops when given a non-array value", () => {
    // @ts-expect-error — testing runtime guard
    cacheModule.writeCache("not an array")
    expect(cacheModule.readCache()).toBeNull()

    // @ts-expect-error — testing runtime guard
    cacheModule.writeCache(null)
    expect(cacheModule.readCache()).toBeNull()

    // @ts-expect-error — testing runtime guard
    cacheModule.writeCache(undefined)
    expect(cacheModule.readCache()).toBeNull()
  })

  it("handles empty array", () => {
    cacheModule.writeCache([])
    const result = cacheModule.readCache()
    expect(result!.memories).toEqual([])
  })
})

describe("clearCache", () => {
  it("removes the cache file", async () => {
    cacheModule.writeCache([{ id: "m1", content: "test" }])
    expect(cacheModule.readCache()).not.toBeNull()

    cacheModule.clearCache()
    // clearCache uses fs.promises.unlink — give it a tick
    await vi.waitFor(() => {
      expect(cacheModule.readCache()).toBeNull()
    })
  })

  it("does not throw when cache file does not exist", () => {
    expect(() => cacheModule.clearCache()).not.toThrow()
  })
})

// ── Session injected tracking (trackInjectedIds / getInjectedIds) ───

describe("getInjectedIds", () => {
  it("returns empty set when no tracking file exists", () => {
    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(0)
  })

  it("returns empty set for an unknown session", () => {
    cacheModule.trackInjectedIds("session-1", ["m1"])
    const ids = cacheModule.getInjectedIds("session-unknown")
    expect(ids.size).toBe(0)
  })

  it("returns empty set when tracking file is corrupt", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, "session-injected.json"), "garbage")

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(0)
  })

  it("returns empty set when tracking file is empty", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, "session-injected.json"), "")

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(0)
  })

  it("returns empty set when session data has malformed shape (ids is not an array)", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(
      path.join(cacheDir, "session-injected.json"),
      JSON.stringify({ sessions: { "session-1": { ids: "not-an-array", lastUpdated: new Date().toISOString() } } }),
    )

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(0)
  })

  it("returns empty set when session data has malformed shape (session value is a string)", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(
      path.join(cacheDir, "session-injected.json"),
      JSON.stringify({ sessions: { "session-1": "bogus" } }),
    )

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(0)
  })
})

describe("trackInjectedIds", () => {
  it("tracks memory IDs for a session and retrieves them", () => {
    cacheModule.trackInjectedIds("session-1", ["m1", "m2"])
    const ids = cacheModule.getInjectedIds("session-1")

    expect(ids.size).toBe(2)
    expect(ids.has("m1")).toBe(true)
    expect(ids.has("m2")).toBe(true)
  })

  it("accumulates IDs across multiple calls for the same session", () => {
    cacheModule.trackInjectedIds("session-1", ["m1", "m2"])
    cacheModule.trackInjectedIds("session-1", ["m3"])

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(3)
    expect(ids.has("m1")).toBe(true)
    expect(ids.has("m2")).toBe(true)
    expect(ids.has("m3")).toBe(true)
  })

  it("deduplicates when the same ID is tracked twice", () => {
    cacheModule.trackInjectedIds("session-1", ["m1", "m2"])
    cacheModule.trackInjectedIds("session-1", ["m2", "m3"])

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(3)
  })

  it("keeps sessions independent", () => {
    cacheModule.trackInjectedIds("session-1", ["m1", "m2"])
    cacheModule.trackInjectedIds("session-2", ["m3", "m4"])

    const ids1 = cacheModule.getInjectedIds("session-1")
    const ids2 = cacheModule.getInjectedIds("session-2")

    expect(ids1.size).toBe(2)
    expect(ids1.has("m1")).toBe(true)
    expect(ids1.has("m3")).toBe(false)

    expect(ids2.size).toBe(2)
    expect(ids2.has("m3")).toBe(true)
    expect(ids2.has("m1")).toBe(false)
  })

  it("is a no-op when given an empty array", () => {
    cacheModule.trackInjectedIds("session-1", [])

    // File should not even be created
    const filePath = path.join(tmpDir, ".config", "peek", "session-injected.json")
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it("creates the directory tree if it does not exist", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    expect(fs.existsSync(cacheDir)).toBe(false)

    cacheModule.trackInjectedIds("session-1", ["m1"])

    expect(fs.existsSync(cacheDir)).toBe(true)
  })

  it("writes valid JSON ending with a newline", () => {
    cacheModule.trackInjectedIds("session-1", ["m1"])
    const raw = fs.readFileSync(
      path.join(tmpDir, ".config", "peek", "session-injected.json"),
      "utf-8",
    )
    expect(raw.endsWith("\n")).toBe(true)
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it("recovers from corrupt tracking file by starting fresh", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, "session-injected.json"), "corrupt!")

    // Should not throw — readSessionData returns empty default
    cacheModule.trackInjectedIds("session-1", ["m1"])

    const ids = cacheModule.getInjectedIds("session-1")
    expect(ids.size).toBe(1)
    expect(ids.has("m1")).toBe(true)
  })
})

describe("24h session pruning", () => {
  it("prunes sessions older than 24 hours", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })

    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const freshTime = new Date().toISOString()

    const data = {
      sessions: {
        "stale-session": { ids: ["m1"], lastUpdated: staleTime },
        "fresh-session": { ids: ["m2"], lastUpdated: freshTime },
      },
    }
    fs.writeFileSync(
      path.join(cacheDir, "session-injected.json"),
      JSON.stringify(data),
    )

    // trackInjectedIds triggers pruning
    cacheModule.trackInjectedIds("new-session", ["m3"])

    // Stale session should be gone
    expect(cacheModule.getInjectedIds("stale-session").size).toBe(0)

    // Fresh session should survive
    const freshIds = cacheModule.getInjectedIds("fresh-session")
    expect(freshIds.size).toBe(1)
    expect(freshIds.has("m2")).toBe(true)

    // New session should exist
    const newIds = cacheModule.getInjectedIds("new-session")
    expect(newIds.has("m3")).toBe(true)
  })

  it("keeps sessions younger than 24 hours", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })

    const recentTime = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

    const data = {
      sessions: {
        "recent-session": { ids: ["m1", "m2"], lastUpdated: recentTime },
      },
    }
    fs.writeFileSync(
      path.join(cacheDir, "session-injected.json"),
      JSON.stringify(data),
    )

    cacheModule.trackInjectedIds("trigger-session", ["m3"])

    const ids = cacheModule.getInjectedIds("recent-session")
    expect(ids.size).toBe(2)
  })

  it("handles edge case where all sessions are stale", () => {
    const cacheDir = path.join(tmpDir, ".config", "peek")
    fs.mkdirSync(cacheDir, { recursive: true })

    const staleTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const data = {
      sessions: {
        "old-1": { ids: ["m1"], lastUpdated: staleTime },
        "old-2": { ids: ["m2"], lastUpdated: staleTime },
      },
    }
    fs.writeFileSync(
      path.join(cacheDir, "session-injected.json"),
      JSON.stringify(data),
    )

    cacheModule.trackInjectedIds("fresh", ["m3"])

    expect(cacheModule.getInjectedIds("old-1").size).toBe(0)
    expect(cacheModule.getInjectedIds("old-2").size).toBe(0)
    expect(cacheModule.getInjectedIds("fresh").size).toBe(1)
  })
})

// ── Integration: cache + tracking don't interfere ───────────────────

describe("cache and tracking coexistence", () => {
  it("memory cache and session tracking use separate files", () => {
    cacheModule.writeCache([{ id: "m1", content: "cached" }])
    cacheModule.trackInjectedIds("session-1", ["m1"])

    // Both should be independently readable
    expect(cacheModule.readCache()!.memories[0].id).toBe("m1")
    expect(cacheModule.getInjectedIds("session-1").has("m1")).toBe(true)

    // Clearing cache should not affect tracking
    cacheModule.clearCache()
    expect(cacheModule.getInjectedIds("session-1").has("m1")).toBe(true)
  })

  it("simulates the exact bug scenario: cache fallback with dedup", () => {
    const memories = [
      { id: "m1", content: "preference A", category: "coding" },
      { id: "m2", content: "preference B" },
    ]

    // 1. First call succeeds → cache written, IDs tracked
    cacheModule.writeCache(memories)
    cacheModule.trackInjectedIds("session-1", ["m1", "m2"])

    // 2. Second call times out → read cache → filter by tracked IDs
    const cached = cacheModule.readCache()!
    const alreadyInjected = cacheModule.getInjectedIds("session-1")
    const filtered = cached.memories.filter((m) => !alreadyInjected.has(m.id))

    // All memories should be filtered out — no duplicates
    expect(filtered).toHaveLength(0)
  })

  it("simulates partial overlap: some cached memories are new", () => {
    cacheModule.writeCache([
      { id: "m1", content: "old" },
      { id: "m2", content: "old" },
      { id: "m3", content: "new" },
    ])
    cacheModule.trackInjectedIds("session-1", ["m1", "m2"])

    const cached = cacheModule.readCache()!
    const alreadyInjected = cacheModule.getInjectedIds("session-1")
    const filtered = cached.memories.filter((m) => !alreadyInjected.has(m.id))

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe("m3")
  })

  it("simulates cross-session: session B gets cache from session A", () => {
    // Session A caches memories and tracks them
    cacheModule.writeCache([
      { id: "m1", content: "A's memory" },
      { id: "m2", content: "A's memory" },
    ])
    cacheModule.trackInjectedIds("session-A", ["m1", "m2"])

    // Session B times out, falls back to cache (written by A)
    const cached = cacheModule.readCache()!
    const alreadyInjected = cacheModule.getInjectedIds("session-B")

    // Session B has no tracked IDs — these are new to B
    const filtered = cached.memories.filter((m) => !alreadyInjected.has(m.id))
    expect(filtered).toHaveLength(2)
  })
})

// ── Stress / robustness ─────────────────────────────────────────────

describe("robustness", () => {
  it("handles many sessions without corruption", () => {
    for (let i = 0; i < 50; i++) {
      cacheModule.trackInjectedIds(`session-${i}`, [`m-${i}-a`, `m-${i}-b`])
    }

    for (let i = 0; i < 50; i++) {
      const ids = cacheModule.getInjectedIds(`session-${i}`)
      expect(ids.size).toBe(2)
      expect(ids.has(`m-${i}-a`)).toBe(true)
      expect(ids.has(`m-${i}-b`)).toBe(true)
    }
  })

  it("handles many IDs in a single session", () => {
    const memoryIds = Array.from({ length: 200 }, (_, i) => `m-${i}`)
    cacheModule.trackInjectedIds("big-session", memoryIds)

    const ids = cacheModule.getInjectedIds("big-session")
    expect(ids.size).toBe(200)
    expect(ids.has("m-0")).toBe(true)
    expect(ids.has("m-199")).toBe(true)
  })

  it("handles session IDs with special characters", () => {
    const weirdId = "session/with:special@chars#and spaces"
    cacheModule.trackInjectedIds(weirdId, ["m1"])
    expect(cacheModule.getInjectedIds(weirdId).has("m1")).toBe(true)
  })

  it("handles concurrent-like rapid writes to the same session", () => {
    // Simulate rapid sequential writes (as would happen from fast prompts)
    cacheModule.trackInjectedIds("rapid", ["m1"])
    cacheModule.trackInjectedIds("rapid", ["m2"])
    cacheModule.trackInjectedIds("rapid", ["m3"])
    cacheModule.trackInjectedIds("rapid", ["m4"])
    cacheModule.trackInjectedIds("rapid", ["m5"])

    const ids = cacheModule.getInjectedIds("rapid")
    expect(ids.size).toBe(5)
  })
})
