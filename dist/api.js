import { getConfig } from "./config.js";
export async function apiCall(path, body, options) {
    const config = getConfig();
    if (!config.apiKey) {
        return { ok: false, error: "Not authenticated. Run /peek:login first." };
    }
    const controller = new AbortController();
    const timeoutId = options?.timeoutMs
        ? setTimeout(() => controller.abort(), options.timeoutMs)
        : null;
    try {
        const response = await fetch(`${config.serviceUrl}${path}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) {
            const text = await response.text();
            return { ok: false, error: `API error (${response.status}): ${text}` };
        }
        const data = (await response.json());
        return { ok: true, data };
    }
    catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            return { ok: false, error: "timeout" };
        }
        return { ok: false, error: String(err) };
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
