import { apiCall } from "../api.js";
import { hasCredentials, setShowStats } from "../config.js";
const subcommand = process.argv[2];
if (subcommand === "on") {
    setShowStats(true);
    console.log("Peek session stats enabled — weekly analytics shown at session start.");
    process.exit(0);
}
if (subcommand === "off") {
    setShowStats(false);
    console.log("Peek session stats disabled — no analytics shown at session start.");
    process.exit(0);
}
async function main() {
    if (!hasCredentials()) {
        console.log("Not authenticated. Run /peek:login first.");
        process.exit(1);
    }
    const result = await apiCall("/api/plugin/sessions/stats", {}, { timeoutMs: 5000 });
    if (!result.ok) {
        console.log(`Failed to fetch stats: ${result.error}`);
        process.exit(1);
    }
    console.log(result.data.rendered);
}
main();
