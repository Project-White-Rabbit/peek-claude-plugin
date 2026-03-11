import { checkForUpdate } from "../updates.js";
async function main() {
    const { current, latest, updateAvailable } = await checkForUpdate();
    if (updateAvailable && latest) {
        const message = [
            `\n[Peek] Update available: v${current} → v${latest}`,
            `       Update: claude plugin update peek@peek (or /plugin → Installed → peek → Update)`,
            `       Auto-update: /plugin → Marketplaces → peek → Enable auto-update`,
        ].join("\n");
        process.stdout.write(JSON.stringify({ systemMessage: message }));
    }
}
main().catch(() => {
    // Silent failure
});
