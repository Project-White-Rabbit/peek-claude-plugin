import { apiCall } from "../api.js";
import { hasCredentials } from "../config.js";
import { getRecentContext, parseHookInput } from "../transcript.js";
// SessionStart hook for compaction events (async: true).
// Notifies the server to clear injected memory tracking for this session,
// so memories are re-injected after context is summarized.
// Also saves the compaction summary to the database.
//
// Potential race condition: if the user sends a prompt before this completes,
// the search route may still filter out previously-injected memories for that
// one prompt. Self-correcting on the next prompt after the reset finishes.
async function main() {
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    process.env.PEEK_CWD = input.cwd;
    const recentContext = getRecentContext(input.transcript_path, 50);
    const summary = recentContext.length > 0 ? recentContext.join("\n") : null;
    await apiCall("/api/plugin/sessions/reset-injections", {
        sessionId: input.session_id,
        summary,
    });
}
main().catch(() => {
    // Silent failure
});
