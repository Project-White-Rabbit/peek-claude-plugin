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
function formatStatusLine(memories, fromCache, verbose) {
    if (memories.length === 0) {
        return null;
    }
    const categories = [
        ...new Set(memories.map((m) => m.category).filter(Boolean)),
    ];
    const categoryStr = categories.length > 0 ? ` [${categories.join(", ")}]` : "";
    const cacheStr = fromCache ? " (cached)" : "";
    const parts = [
        `[Peek] ${memories.length} ${memories.length === 1 ? "memory" : "memories"} injected${cacheStr}${categoryStr}`,
    ];
    if (verbose) {
        for (const m of memories) {
            const cat = m.category ? ` [${m.category}]` : "";
            parts.push(`  - ${m.content}${cat}`);
        }
    }
    return parts.join("\n");
}
function emitOutput(memories, fromCache, config) {
    const context = formatMemories(memories);
    if (!context) {
        return;
    }
    const statusLine = config.showStatusLine
        ? formatStatusLine(memories, fromCache, config.verbose)
        : null;
    const output = { additionalContext: context };
    if (statusLine) {
        output.systemMessage = statusLine;
    }
    process.stdout.write(JSON.stringify(output));
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
        emitOutput(result.data.memories, false, config);
        return;
    }
    // Timeout or error — fall back to cache
    if (result.error === "timeout" || result.error.startsWith("API error")) {
        const cached = readCache();
        if (cached && cached.memories.length > 0) {
            emitOutput(cached.memories, true, config);
        }
    }
}
main().catch(() => {
    // Silent failure — never block the user
});
