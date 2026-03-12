import { apiCall } from "../api.js";
import { hasCredentials } from "../config.js";
import { parseHookInput } from "../transcript.js";
// SessionStart hook for compaction events.
// Notifies the server to clear injected memory tracking for this session,
// so memories are re-injected after context is summarized.
async function main() {
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    process.env.PEEK_CWD = input.cwd;
    await apiCall("/api/plugin/sessions/reset-injections", {
        sessionId: input.session_id,
    });
}
main().catch(() => {
    // Silent failure
});
