import { getLoggingLevel, setLoggingLevel } from "../config.js";
const LEVELS = ["none", "default", "verbose"];
const DESCRIPTIONS = {
    none: "no status line or memory details shown",
    default: "status line shown, individual memories hidden",
    verbose: "status line + individual memories shown",
};
const level = process.argv[2];
if (!level) {
    const current = getLoggingLevel();
    const desc = DESCRIPTIONS[current] ?? current;
    console.log(`Current logging level: ${current} — ${desc}`);
    console.log();
    console.log("Available levels:");
    for (const l of LEVELS) {
        const marker = l === current ? " (current)" : "";
        console.log(`  ${l} — ${DESCRIPTIONS[l]}${marker}`);
    }
    console.log();
    console.log("Usage: node logging.js <level>");
    process.exit(0);
}
if (!LEVELS.includes(level)) {
    console.error(`Invalid level "${level}". Must be one of: ${LEVELS.join(", ")}`);
    process.exit(1);
}
setLoggingLevel(level);
console.log(`Peek logging set to ${level} — ${DESCRIPTIONS[level]}.`);
