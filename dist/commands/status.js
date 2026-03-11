import { getConfig, hasCredentials } from "../config.js";
import { checkForUpdate, formatUpdateMessage } from "../updates.js";
async function main() {
    const config = getConfig();
    const { current, latest, updateAvailable } = await checkForUpdate();
    console.log(`Service URL: ${config.serviceUrl}`);
    const versionSuffix = updateAvailable && latest ? ` (${formatUpdateMessage(current, latest)})` : "";
    console.log(`Version: v${current}${versionSuffix}`);
    console.log(`Authenticated: ${hasCredentials() ? "yes" : "no"}`);
    if (!hasCredentials()) {
        console.log("\nRun /peek:login to authenticate.");
        return;
    }
    // Ping the API to check connectivity
    try {
        const response = await fetch(`${config.serviceUrl}/api/plugin/memories/search`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
                "X-Plugin-Version": current,
            },
            body: JSON.stringify({ query: "test" }),
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
            console.log("Connection: healthy");
        }
        else {
            console.log(`Connection: error (${response.status})`);
        }
    }
    catch (err) {
        console.log(`Connection: unreachable (${err instanceof Error ? err.message : String(err)})`);
    }
}
main().catch((err) => {
    console.error("Status check failed:", err.message);
    process.exit(1);
});
