import { apiCall } from "../api.js";
import { clearCache, readCache, writeCache } from "../cache.js";
import { getConfig, hasCredentials } from "../config.js";
import { parseHookInput } from "../transcript.js";
function formatMemories(memories) {
    if (memories.length === 0) {
        return "";
    }
    const lines = memories.map((m) => {
        const cat = m.category ? ` [${m.category}]` : "";
        return `- ${m.content}${cat}`;
    });
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
    const parts = [
        `[Peek] ${memories.length} ${memories.length === 1 ? "memory" : "memories"} injected${cacheStr}${categoryStr}${contextStr}`,
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
        })
        : null;
    const context = formatMemories(memories);
    const output = {};
    if (context) {
        output.hookSpecificOutput = {
            hookEventName: opts.hookEventName,
            additionalContext: context,
        };
    }
    if (statusLine) {
        output.systemMessage = statusLine;
    }
    if (Object.keys(output).length > 0) {
        process.stdout.write(JSON.stringify(output));
    }
}
export async function injectMemories(opts) {
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    process.env.PEEK_CWD = input.cwd;
    const config = getConfig();
    const result = await apiCall(opts.endpoint, opts.buildBody(input), { timeoutMs: opts.timeoutMs });
    if (result.ok) {
        writeCache(result.data.memories);
        emitOutput(result.data.memories, { fromCache: false, totalMemoryCount: result.data.totalMemoryCount, hookEventName: opts.hookEventName }, config);
        // Confirm delivery so the server marks these memories as injected.
        // Fire-and-forget: if this fails, the memories will simply be re-offered next time.
        if (result.data.memories.length > 0) {
            const memoryIds = result.data.memories.map((m) => m.id);
            apiCall("/api/plugin/memories/confirm", {
                memoryIds,
                sessionId: input.session_id,
            }).catch(() => { });
        }
        return;
    }
    // Timeout or error — fall back to cache
    const cached = readCache();
    if (cached && cached.memories.length > 0) {
        emitOutput(cached.memories, { fromCache: true, hookEventName: opts.hookEventName }, config);
        clearCache();
        const memoryIds = cached.memories.map((m) => m.id);
        apiCall("/api/plugin/memories/confirm", {
            memoryIds,
            sessionId: input.session_id,
        }).catch(() => { });
    }
}
