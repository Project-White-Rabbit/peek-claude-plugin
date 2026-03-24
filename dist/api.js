import { getConfig } from "./config.js";
import { getVersion } from "./version.js";
export async function apiCall(path, body, options) {
    const config = getConfig();
    if (!config.apiKey) {
        return { ok: false, error: "Not authenticated. Run /peek:login first." };
    }
    const fetchPromise = fetch(`${config.serviceUrl}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            "X-Plugin-Version": getVersion(),
        },
        body: JSON.stringify(body),
    }).then(async (response) => {
        if (!response.ok) {
            return { ok: false, error: `API error (${response.status})`, status: response.status };
        }
        const data = (await response.json());
        return { ok: true, data };
    }).catch((err) => {
        return { ok: false, error: String(err) };
    });
    if (!options?.timeoutMs) {
        return fetchPromise;
    }
    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve("timeout"), options.timeoutMs);
    });
    const winner = await Promise.race([fetchPromise, timeoutPromise]);
    if (winner === "timeout") {
        return { ok: false, error: "timeout" };
    }
    return winner;
}
