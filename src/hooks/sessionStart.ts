import { fetchAndFormatStats } from "./sessionStats.js"
import { checkForUpdate } from "../updates.js"

const messages: string[] = []

try {
  const stats = await fetchAndFormatStats()
  if (stats) {
    messages.push(stats)
  }
} catch {}

try {
  const { current, latest, updateAvailable, autoUpdateEnabled } =
    await checkForUpdate()
  if (updateAvailable && latest) {
    const lines = [`[Peek] Update available: v${current} → v${latest}.`]
    if (autoUpdateEnabled) {
      lines.push(`       Auto-update is enabled — restart to apply.`)
    } else {
      lines.push(
        `       Run /peek:update to update, or enable auto-update: /plugin → Marketplaces → peek → Enable auto-update`,
      )
    }
    messages.push(lines.join("\n"))
  }
} catch {}

if (messages.length > 0) {
  process.stdout.write(JSON.stringify({ systemMessage: `\n${messages.join("\n")}` }))
}
