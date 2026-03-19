import { getConfig, setLoggingLevel } from "../config.js"

const arg = process.argv[2] as string | undefined

if (arg === "off") {
  setLoggingLevel("default")
  console.log("Peek debug logging disabled — logging reset to default.")
  process.exit(0)
}

if (arg === "on" || !arg) {
  setLoggingLevel("debug")
  console.log("Peek debug logging enabled — all hook events logged including 0-memory results and timeouts.")
  process.exit(0)
}

console.error(`Invalid argument "${arg}". Use "on" or "off".`)
process.exit(1)
