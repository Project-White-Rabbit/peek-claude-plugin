import { fetchAndFormatStats } from "./sessionStats.js"

try {
  const stats = await fetchAndFormatStats()
  if (stats) {
    process.stdout.write(JSON.stringify({ systemMessage: `\n${stats}` }))
  }
} catch {}
