import { buildConversationContext } from "../transcript.js";
import { injectMemories } from "./shared.js";
// UserPromptSubmit hook: queries for semantically relevant memories
// based on the current conversation context.
injectMemories({
    endpoint: "/api/plugin/memories/search",
    buildBody: (input) => {
        const context = buildConversationContext(input, { contextEntries: 6 });
        if (!context) {
            return { sessionId: input.session_id };
        }
        return context;
    },
    timeoutMs: 2000,
    hookEventName: "UserPromptSubmit",
}).catch(() => {
    // Silent failure — never block the user
});
