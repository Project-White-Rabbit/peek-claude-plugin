import { getConfig, hasCredentials } from "../config.js";
import { checkForUpdate, formatUpdateMessage } from "../updates.js";
async function main() {
    const config = getConfig();
    const { current, latest, updateAvailable } = await checkForUpdate();
    console.log(`Service URL: ${config.serviceUrl}`);
    const versionSuffix = updateAvailable && latest ? ` (${formatUpdateMessage(current, latest)})` : "";
    console.log(`Version: v${current}${versionSuffix}`);
    if (!hasCredentials()) {
        console.log("Status: not authenticated");
        console.log("\nRun /peek:login to authenticate.");
        return;
    }
    let connectionStatus = "authenticated";
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
        if (!response.ok) {
            connectionStatus = `authenticated, connection error (${response.status})`;
        }
    }
    catch (err) {
        connectionStatus = `authenticated, unreachable (${err instanceof Error ? err.message : String(err)})`;
    }
    console.log(`Status: ${connectionStatus}`);
    console.log(`Logging: ${config.showNotification ? "default" : "hidden"}`);
}
main().catch((err) => {
    console.error("Status check failed:", err.message);
    process.exit(1);
});
