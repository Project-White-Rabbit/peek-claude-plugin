import { apiCall } from "../api.js";
import { readCache, writeCache } from "../cache.js";
import { hasCredentials } from "../config.js";
import { getLatestUserMessage, parseHookInput } from "../transcript.js";
// Sync hook: queries for fresh memories, falls back to cache on timeout.
// Outputs memories to stdout for context injection.
const TIMEOUT_MS = 2000;
function formatMemories(memories) {
    if (memories.length === 0) {
        return "";
    }
    const lines = memories.map((m) => {
        const cat = m.category ? ` [${m.category}]` : "";
        return `- ${m.summary}${cat}`;
    });
    return [
        "<peek-memory>",
        "The following are relevant memories about this user from previous sessions:",
        "",
        ...lines,
        "</peek-memory>",
    ].join("\n");
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
    const userMessage = getLatestUserMessage(input.transcript_path);
    if (!userMessage) {
        return;
    }
    const result = await apiCall("/api/plugin/memories/search", { query: userMessage }, { timeoutMs: TIMEOUT_MS });
    if (result.ok) {
        writeCache(result.data.memories);
        const output = formatMemories(result.data.memories);
        if (output) {
            process.stdout.write(output);
        }
        return;
    }
    // Timeout or error — fall back to cache
    if (result.error === "timeout" || result.error.startsWith("API error")) {
        const cached = readCache();
        if (cached && cached.memories.length > 0) {
            const output = formatMemories(cached.memories);
            if (output) {
                process.stdout.write(output);
            }
        }
    }
}
main().catch(() => {
    // Silent failure — never block the user
});
