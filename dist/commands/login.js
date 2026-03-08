import { exec } from "node:child_process";
import http from "node:http";
import os from "node:os";
import { getConfig, saveCredentials } from "../config.js";
// Opens browser to Peek auth page, starts local callback server,
// waits for redirect with API key, saves credentials.
function openBrowser(url) {
    const platform = os.platform();
    const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} "${url}"`);
}
function findOpenPort() {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.listen(0, () => {
            const addr = server.address();
            if (addr && typeof addr === "object") {
                const port = addr.port;
                server.close(() => resolve(port));
            }
            else {
                reject(new Error("Could not find open port"));
            }
        });
    });
}
async function main() {
    const config = getConfig();
    const port = await findOpenPort();
    console.log("Starting authentication flow...");
    console.log(`Callback server listening on port ${port}`);
    const server = http.createServer((req, res) => {
        // CORS headers — the auth page sends a fetch from a different origin
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        const url = new URL(req.url ?? "/", `http://localhost:${port}`);
        if (url.pathname === "/callback") {
            const token = url.searchParams.get("token");
            if (token) {
                saveCredentials(token);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
                console.log("Authentication successful!");
                setTimeout(() => {
                    server.close();
                    process.exit(0);
                }, 2000);
            }
            else {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "No token received" }));
                console.error("Error: No token in callback");
                setTimeout(() => {
                    server.close();
                    process.exit(1);
                }, 500);
            }
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    server.listen(port, () => {
        const authUrl = `${config.serviceUrl}/auth/claude?port=${port}`;
        console.log(`Opening browser: ${authUrl}`);
        openBrowser(authUrl);
    });
    // Timeout after 2 minutes
    setTimeout(() => {
        console.error("Authentication timed out after 2 minutes.");
        server.close();
        process.exit(1);
    }, 120_000);
}
main().catch((err) => {
    console.error("Login failed:", err.message);
    process.exit(1);
});
