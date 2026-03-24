import { apiCall } from "../api.js";
import { hasCredentials } from "../config.js";
import { buildConversationContext, parseHookInput } from "../transcript.js";
async function main() {
    if (!hasCredentials()) {
        return;
    }
    const input = parseHookInput();
    if (!input) {
        return;
    }
    process.env.PEEK_CWD = input.cwd;
    const context = buildConversationContext(input, { contextEntries: 10 });
    if (!context) {
        return;
    }
    const result = await apiCall("/api/plugin/prompt", context);
    if (!result.ok) {
        return;
    }
}
main().catch(() => {
    // Silent failure — async hook, nobody is waiting
});
