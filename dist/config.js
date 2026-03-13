import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const DEFAULT_SERVICE_URL = "https://www.gopeek.ai";
const CONFIG_DIR = path.join(os.homedir(), ".config", "peek");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
function getServiceUrl() {
    // Priority: env var → project .peek.json → global config → default
    if (process.env.PEEK_SERVICE_URL) {
        return process.env.PEEK_SERVICE_URL;
    }
    const cwd = process.env.PEEK_CWD ?? process.cwd();
    const projectConfig = readJsonFile(path.join(cwd, ".peek.json"));
    if (projectConfig?.serviceUrl &&
        typeof projectConfig.serviceUrl === "string") {
        return projectConfig.serviceUrl;
    }
    const globalConfig = readJsonFile(CONFIG_FILE);
    if (globalConfig?.serviceUrl && typeof globalConfig.serviceUrl === "string") {
        return globalConfig.serviceUrl;
    }
    return DEFAULT_SERVICE_URL;
}
function getApiKey() {
    if (process.env.PEEK_API_KEY) {
        return process.env.PEEK_API_KEY;
    }
    const creds = readJsonFile(CREDENTIALS_FILE);
    if (creds?.apiKey && typeof creds.apiKey === "string") {
        return creds.apiKey;
    }
    return null;
}
function getShowStatusLine() {
    const globalConfig = readJsonFile(CONFIG_FILE);
    if (globalConfig?.showStatusLine === false) {
        return false;
    }
    return true;
}
function getVerbose() {
    if (process.env.PEEK_VERBOSE === "false" || process.env.PEEK_VERBOSE === "0") {
        return false;
    }
    if (process.env.PEEK_VERBOSE === "true" || process.env.PEEK_VERBOSE === "1") {
        return true;
    }
    const globalConfig = readJsonFile(CONFIG_FILE);
    if (globalConfig?.verbose === false) {
        return false;
    }
    return true;
}
export function getConfig() {
    return {
        serviceUrl: getServiceUrl(),
        apiKey: getApiKey(),
        showStatusLine: getShowStatusLine(),
        verbose: getVerbose(),
    };
}
export function setShowStatusLine(value) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const existing = readJsonFile(CONFIG_FILE) ?? {};
    existing.showStatusLine = value;
    fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`);
}
export function setVerbose(value) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const existing = readJsonFile(CONFIG_FILE) ?? {};
    existing.verbose = value;
    fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`);
}
export function setLoggingLevel(level) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const existing = readJsonFile(CONFIG_FILE) ?? {};
    existing.showStatusLine = level !== "none";
    existing.verbose = level === "verbose";
    fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`);
}
export function getLoggingLevel() {
    const config = readJsonFile(CONFIG_FILE);
    if (config?.showStatusLine === false) {
        return "none";
    }
    if (config?.verbose === false) {
        return "default";
    }
    return "verbose";
}
export function saveCredentials(apiKey) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify({ apiKey }, null, 2)}\n`);
}
export function deleteCredentials() {
    try {
        fs.unlinkSync(CREDENTIALS_FILE);
    }
    catch {
        // already gone
    }
}
export function hasCredentials() {
    return getApiKey() !== null;
}
export { CONFIG_DIR, CREDENTIALS_FILE };
