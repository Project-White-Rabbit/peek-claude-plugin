import { apiCall } from "../api.js";
import { writeCache } from "../cache.js";
import { hasCredentials } from "../config.js";
import { getLatestUserMessage, getRecentContext, getRecentToolNames, parseHookInput, } from "../transcript.js";
async function main() {
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    process.env.PEEK_CWD = input.cwd;
    const userMessage = input.prompt ?? getLatestUserMessage(input.transcript_path);
    if (!userMessage) {
        return;
    }
    const recentContext = getRecentContext(input.transcript_path, 10);
    const toolsUsed = getRecentToolNames(input.transcript_path);
    const result = await apiCall("/api/plugin/prompt", {
        prompt: userMessage,
        context: recentContext,
        toolsUsed,
        sessionId: input.session_id,
        cwd: input.cwd,
    });
    if (result.ok) {
        writeCache(result.data.memories);
    }
}
main().catch(() => {
    // Silent failure — async hook, nobody is waiting
});
