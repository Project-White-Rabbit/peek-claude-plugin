import { fetchAndFormatStats } from "./sessionStats.js";
import { checkForUpdate } from "../updates.js";
const messages = [];
try {
    const stats = await fetchAndFormatStats();
    if (stats) {
        messages.push(stats);
    }
}
catch { }
try {
    const { current, latest, updateAvailable } = await checkForUpdate();
    if (updateAvailable && latest) {
        messages.push([
            `[Peek] Update available: v${current} → v${latest}.`,
            `       Run /peek:update to update, or enable auto-update: /plugin → Marketplaces → peek → Enable auto-update`,
        ].join("\n"));
    }
}
catch { }
if (messages.length > 0) {
    process.stdout.write(JSON.stringify({ systemMessage: `\n${messages.join("\n")}` }));
}
