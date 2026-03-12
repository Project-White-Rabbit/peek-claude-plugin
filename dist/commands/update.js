import { execSync } from "node:child_process";
import { checkForUpdate } from "../updates.js";
async function main() {
    const { current, latest, updateAvailable } = await checkForUpdate();
    if (!updateAvailable || !latest) {
        console.log(`Peek v${current} is already up to date.`);
        return;
    }
    console.log(`Update available: v${current} → v${latest}`);
    console.log("Updating marketplace...");
    try {
        execSync("claude plugin marketplace update peek", {
            stdio: "inherit",
        });
    }
    catch {
        console.error("Failed to update marketplace. Is the 'peek' marketplace registered?");
        console.error("You can add it with: claude plugin marketplace add Project-White-Rabbit/peek-claude-plugin");
        process.exit(1);
    }
    console.log("Updating plugin...");
    try {
        execSync("claude plugin update peek@peek", {
            stdio: "inherit",
        });
    }
    catch {
        console.error("Failed to update plugin.");
        process.exit(1);
    }
    console.log(`\nPeek updated to v${latest}. Restart Claude Code to apply the update.`);
}
main().catch((err) => {
    console.error("Update failed:", err.message);
    process.exit(1);
});
