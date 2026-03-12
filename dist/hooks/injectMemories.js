import { apiCall } from "../api.js";
import { readCache, writeCache } from "../cache.js";
import { getConfig, hasCredentials } from "../config.js";
import { buildConversationContext, parseHookInput } from "../transcript.js";
// Sync hook: queries for fresh memories, falls back to cache on timeout.
// Outputs memories to stdout for context injection.
const TIMEOUT_MS = 2000;
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
        output.additionalContext = context;
    }
    if (statusLine) {
        output.systemMessage = statusLine;
    }
    if (Object.keys(output).length > 0) {
        process.stdout.write(JSON.stringify(output));
    }
}
async function main() {
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    // Set cwd for config resolution
    process.env.PEEK_CWD = input.cwd;
    const config = getConfig();
    const context = buildConversationContext(input, { contextEntries: 6 });
    if (!context) {
        return;
    }
    const result = await apiCall("/api/plugin/memories/search", context, { timeoutMs: TIMEOUT_MS });
    if (result.ok) {
        writeCache(result.data.memories);
        emitOutput(result.data.memories, { fromCache: false, totalMemoryCount: result.data.totalMemoryCount }, config);
        return;
    }
    // Timeout or error — fall back to cache
    if (result.error === "timeout" || result.error.startsWith("API error")) {
        const cached = readCache();
        if (cached && cached.memories.length > 0) {
            emitOutput(cached.memories, { fromCache: true }, config);
        }
    }
}
main().catch(() => {
    // Silent failure — never block the user
});
