import { apiCall } from "../api.js";
import { clearCache, readCache, writeCache } from "../cache.js";
import { getConfig, hasCredentials } from "../config.js";
import { parseHookInput } from "../transcript.js";
function formatShortDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}
function formatMemories(memories) {
    if (memories.length === 0) {
        return "";
    }
    const lines = [];
    for (const m of memories) {
        const cat = m.category ? ` [${m.category}]` : "";
        lines.push(`${m.content}${cat}`);
        if (m.events && m.events.length > 0) {
            for (const e of m.events.slice(0, 3)) {
                const countSuffix = e.occurrenceCount && e.occurrenceCount > 1
                    ? ` (${e.occurrenceCount}x)`
                    : "";
                lines.push(`    ↳ ${formatShortDate(e.createdAt)}: ${e.content}${countSuffix}`);
            }
            if (m.events.length > 3) {
                lines.push(`    ↳ +${m.events.length - 3} more`);
            }
        }
    }
    return [
        "Relevant memories about the user from the Peek product.",
        "For any memories that are behavioral corrections, preferences, or suggestions YOU MUST FOLLOW THEM:",
        "<memory>",
        ...lines,
        "</memory>",
    ].join("\n");
}
function formatStatusLine(memories, opts) {
    const alreadyInContext = opts.totalMemoryCount != null ? opts.totalMemoryCount - memories.length : 0;
    if (memories.length === 0 && alreadyInContext === 0) {
        return null;
    }
    const categories = [
        ...new Set(memories.map((m) => m.category).filter(Boolean)),
    ];
    const categoryStr = categories.length > 0 ? ` [${categories.join(", ")}]` : "";
    const cacheStr = opts.fromCache ? " (cached)" : "";
    const contextStr = alreadyInContext > 0
        ? ` (${alreadyInContext} already in context)`
        : "";
    const prefix = opts.debug ? `[Peek][${opts.durationMs != null ? `${opts.durationMs}ms` : "unknown"}]` : "[Peek]";
    const parts = [
        `${prefix} ${memories.length} ${memories.length === 1 ? "memory" : "memories"} injected${cacheStr}${categoryStr}${contextStr}`,
    ];
    if (opts.verbose) {
        for (const m of memories) {
            const cat = m.category ? ` [${m.category}]` : "";
            parts.push(`  - ${m.content}${cat}`);
        }
    }
    return parts.join("\n");
}
function emitOutput(memories, opts, config) {
    const statusLine = config.showStatusLine
        ? formatStatusLine(memories, {
            fromCache: opts.fromCache,
            verbose: config.verbose,
            totalMemoryCount: opts.totalMemoryCount,
            debug: config.debug,
            durationMs: opts.durationMs,
        })
        : null;
    const context = formatMemories(memories);
    const showDebug = config.debug && (memories.length === 0 || opts.timedOut || opts.errorDetail);
    const debugLines = [];
    if (showDebug) {
        const debugPrefix = `[Peek Debug][${opts.durationMs != null ? `${opts.durationMs}ms` : "unknown"}]`;
        if (opts.timedOut && memories.length === 0) {
            debugLines.push(`${debugPrefix} Request timed out — cache empty`);
        }
        else if (opts.errorDetail) {
            debugLines.push(`${debugPrefix} Error: ${opts.errorDetail}`);
        }
        else if (memories.length === 0) {
            const alreadyInContext = (opts.totalMemoryCount ?? 0) - memories.length;
            if (alreadyInContext === 0) {
                debugLines.push(`${debugPrefix} 0 memories injected (0 returned from search)`);
            }
        }
    }
    const output = {};
    if (context) {
        output.hookSpecificOutput = {
            hookEventName: opts.hookEventName,
            additionalContext: context,
        };
    }
    const allStatusParts = [...debugLines];
    if (statusLine) {
        allStatusParts.push(statusLine);
    }
    if (allStatusParts.length > 0) {
        output.systemMessage = allStatusParts.join("\n");
    }
    if (Object.keys(output).length > 0) {
        process.stdout.write(JSON.stringify(output));
    }
}
export async function injectMemories(opts) {
    const config = getConfig();
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    process.env.PEEK_CWD = input.cwd;
    const startMs = Date.now();
    const result = await apiCall(opts.endpoint, opts.buildBody(input), { timeoutMs: opts.timeoutMs });
    const durationMs = Date.now() - startMs;
    if (result.ok) {
        const memories = result.data.memories ?? [];
        writeCache(memories);
        emitOutput(memories, { fromCache: false, totalMemoryCount: result.data.totalMemoryCount, hookEventName: opts.hookEventName, durationMs }, config);
        // Confirm delivery so the server marks these memories as injected.
        // Fire-and-forget: if this fails, the memories will simply be re-offered next time.
        if (memories.length > 0) {
            const memoryIds = memories.map((m) => m.id);
            apiCall("/api/plugin/memories/confirm", {
                memoryIds,
                sessionId: input.session_id,
            }).catch(() => { });
        }
        return;
    }
    // Timeout or error — fall back to cache
    const timedOut = result.error === "timeout";
    const errorDetail = !timedOut ? result.error : undefined;
    const cached = readCache();
    const cachedMemories = cached?.memories ?? [];
    if (cachedMemories.length > 0) {
        emitOutput(cachedMemories, { fromCache: true, timedOut, errorDetail, hookEventName: opts.hookEventName, durationMs }, config);
        clearCache();
        const memoryIds = cachedMemories.map((m) => m.id);
        apiCall("/api/plugin/memories/confirm", {
            memoryIds,
            sessionId: input.session_id,
        }).catch(() => { });
    }
    else if (config.debug) {
        emitOutput([], { fromCache: false, timedOut, errorDetail, hookEventName: opts.hookEventName, durationMs }, config);
    }
}
