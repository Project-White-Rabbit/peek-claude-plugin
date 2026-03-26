import { apiCall } from "../api.js";
import { CREDENTIALS_FILE, deleteCredentials, hasCredentials, } from "../config.js";
async function main() {
    if (!hasCredentials()) {
        console.log("Not logged in — no credentials to remove.");
        return;
    }
    await apiCall("/api/plugin/logout", {}).catch(() => { });
    deleteCredentials();
    console.log(`Credentials removed from ${CREDENTIALS_FILE}`);
    console.log("Logged out of Peek.");
}
main();
