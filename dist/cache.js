import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const CACHE_DIR = path.join(os.homedir(), ".config", "peek");
const CACHE_FILE = path.join(CACHE_DIR, "memory-cache.json");
export function readCache() {
    try {
        const content = fs.readFileSync(CACHE_FILE, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
export function writeCache(memories) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const data = {
        memories,
        updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CACHE_FILE, `${JSON.stringify(data, null, 2)}\n`);
}
export function clearCache() {
    fs.promises.unlink(CACHE_FILE).catch(() => { });
}
