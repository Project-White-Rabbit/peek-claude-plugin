import { apiCall } from "../api.js";
import { hasCredentials, getConfig } from "../config.js";
export async function fetchAndFormatStats() {
    const config = getConfig();
    if (!config.showStats || !hasCredentials()) {
        return null;
    }
    const result = await apiCall("/api/plugin/memories/stats", {}, { timeoutMs: 3000 });
    if (!result.ok) {
        return null;
    }
    return result.data.rendered;
}
