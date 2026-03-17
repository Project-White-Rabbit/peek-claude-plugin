import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const DEFAULT_SERVICE_URL = "https://www.gopeek.ai";
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".config", "peek");
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, "config.json");
const GLOBAL_CREDENTIALS_FILE = path.join(GLOBAL_CONFIG_DIR, "credentials.json");
function getCwd() {
    return process.env.PEEK_CWD ?? process.cwd();
}
function getProjectDir() {
    return path.join(getCwd(), ".peek");
}
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
function getConfigData() {
    return (readJsonFile(path.join(getProjectDir(), "config.json")) ??
        readJsonFile(GLOBAL_CONFIG_FILE) ??
        {});
}
function getCredentialsData() {
    return (readJsonFile(path.join(getProjectDir(), "credentials.json")) ??
        readJsonFile(GLOBAL_CREDENTIALS_FILE) ??
        {});
}
function getServiceUrl() {
    if (process.env.PEEK_SERVICE_URL) {
        return process.env.PEEK_SERVICE_URL;
    }
    const config = getConfigData();
    return typeof config.serviceUrl === "string"
        ? config.serviceUrl
        : DEFAULT_SERVICE_URL;
}
function getApiKey() {
    if (process.env.PEEK_API_KEY) {
        return process.env.PEEK_API_KEY;
    }
    const creds = getCredentialsData();
    return typeof creds.apiKey === "string" ? creds.apiKey : null;
}
function getShowNotification() {
    const config = getConfigData();
    if (config.showNotification === false) {
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
    const config = getConfigData();
    if (config.verbose === false) {
        return false;
    }
    return true;
}
function getDebug() {
    if (process.env.PEEK_DEBUG === "true" || process.env.PEEK_DEBUG === "1") {
        return true;
    }
    const config = getConfigData();
    return config.debug === true;
}
export function getConfig() {
    return {
        serviceUrl: getServiceUrl(),
        apiKey: getApiKey(),
        showNotification: getShowNotification(),
        verbose: getVerbose(),
        debug: getDebug(),
    };
}
export function setShowNotification(value) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    const existing = readJsonFile(GLOBAL_CONFIG_FILE) ?? {};
    existing.showNotification = value;
    fs.writeFileSync(GLOBAL_CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`);
}
export function setVerbose(value) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    const existing = readJsonFile(GLOBAL_CONFIG_FILE) ?? {};
    existing.verbose = value;
    fs.writeFileSync(GLOBAL_CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`);
}
export function setLoggingLevel(level) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    const existing = readJsonFile(GLOBAL_CONFIG_FILE) ?? {};
    existing.showNotification = level !== "none";
    existing.verbose = level === "verbose" || level === "debug";
    existing.debug = level === "debug";
    fs.writeFileSync(GLOBAL_CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`);
}
export function getLoggingLevel() {
    const config = getConfigData();
    if (config.debug === true) {
        return "debug";
    }
    if (config.showNotification === false) {
        return "none";
    }
    if (config.verbose === false) {
        return "default";
    }
    return "verbose";
}
export function saveCredentials(apiKey) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(GLOBAL_CREDENTIALS_FILE, `${JSON.stringify({ apiKey }, null, 2)}\n`);
}
export function deleteCredentials() {
    try {
        fs.unlinkSync(GLOBAL_CREDENTIALS_FILE);
    }
    catch {
        // already gone
    }
}
export function hasCredentials() {
    return getApiKey() !== null;
}
export { GLOBAL_CONFIG_DIR as CONFIG_DIR, GLOBAL_CREDENTIALS_FILE as CREDENTIALS_FILE };
